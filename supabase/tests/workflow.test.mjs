// Database integration test: applies supabase/migrations to PGlite (in-process
// Postgres) behind a minimal Supabase shim (auth.uid(), roles, storage, realtime
// publication), then exercises the job workflow, concurrency and RLS as
// different users. Run with: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const db = new PGlite({ extensions: { pgcrypto } });

const shim = `
create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to authenticated; grant all on storage.objects to authenticated;
create publication supabase_realtime;
`;

let failures = 0;
const ok = (msg) => console.log('  ok  ', msg);
const bad = (msg) => { failures++; console.log('  FAIL', msg); };

async function as(user, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false);`);
  if (user) await db.exec('set role authenticated;');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}
async function expectOk(label, user, sql, params) {
  try { const r = await as(user, sql, params); ok(label); return r; }
  catch (e) { bad(`${label}: ${e.message}`); return null; }
}
async function expectErr(label, user, sql, params, pattern) {
  try { await as(user, sql, params); bad(`${label}: expected an error`); }
  catch (e) { (pattern && !pattern.test(e.message)) ? bad(`${label}: wrong error "${e.message}"`) : ok(`${label} → "${e.message}"`); }
}

await db.exec(shim);
for (const f of fs.readdirSync(migrationsDir).sort()) {
  const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8').replace(/create extension[^;]*;/gi, '');
  try { await db.exec(sql); console.log('migration applied:', f); }
  catch (e) { console.log('MIGRATION ERROR in', f, '\n', e.message, e.position ? `at ${e.position}` : ''); process.exit(1); }
}

const U = {
  cust: '11111111-1111-1111-1111-111111111111',
  cust2: '22222222-2222-2222-2222-222222222222',
  col: '33333333-3333-3333-3333-333333333333',
  col2: '44444444-4444-4444-4444-444444444444',
  ops: '55555555-5555-5555-5555-555555555555',
  truck: '66666666-6666-6666-6666-666666666666',
};
for (const id of Object.values(U)) await db.query('insert into auth.users (id) values ($1)', [id]);

console.log('\n# Registration');
await expectOk('customer registers', U.cust, `select register_profile('customer','Ama Mensah','+233241234567')`);
await expectOk('second customer registers', U.cust2, `select register_profile('customer','Kofi Owusu','+233201234567')`);
await expectOk('collector registers', U.col, `select register_profile('collector','Yaw Boateng','+233551234567',null,'tricycle','GR 1234-24')`);
await expectOk('collector 2 registers', U.col2, `select register_profile('collector','Kwame Asare','+233271234567',null,'tricycle')`);
await expectOk('truck collector registers', U.truck, `select register_profile('collector','Esi Truck','+233261234567',null,'medium_truck')`);
await expectErr('cannot self-register ops', U.ops, `select register_profile('ops','Mallory','+233241111111')`, [], /cannot be self-registered/);
await expectErr('invalid phone rejected', U.ops, `select register_profile('customer','Bad Phone','0241234567')`);
await expectOk('ops registers as customer', U.ops, `select register_profile('customer','Dispatch Lead','+233241111111')`);
await db.query(`update public.profiles set role='ops' where id=$1`, [U.ops]);
await expectErr('customer cannot change own role', U.cust, `update profiles set role='ops' where id=auth.uid()`, [], /permission denied/);

console.log('\n# Pickup request');
const reqSql = `select * from create_pickup_request($1::uuid,'household','basic','kasoa','12 Market Rd','Near Total',5.53,-0.42,'bags by gate',null,'cash')`;
const created = await expectOk('customer creates request', U.cust, reqSql, ['aaaaaaaa-0000-0000-0000-000000000001']);
const job = created?.rows[0];
console.log('    ref', job?.reference, 'estimate', job?.estimate_min_ghs, '-', job?.estimate_max_ghs);
const again = await expectOk('retried submission is idempotent', U.cust, reqSql, ['aaaaaaaa-0000-0000-0000-000000000001']);
again?.rows[0]?.id === job?.id ? ok('same job returned') : bad('duplicate job created');
await expectErr('unserved locality rejected', U.cust,
  `select create_pickup_request(gen_random_uuid(),'household','basic','accra','x addr',null,null,null,null,null,'cash')`, [], /violates|serve/);
await expectErr('collector cannot create request', U.col,
  `select create_pickup_request(gen_random_uuid(),'household','basic','kasoa','x addr',null,null,null,null,null,'cash')`, [], /Only customers/);
await expectErr('customer cannot update job directly', U.cust, `update jobs set status='completed' where id=$1 returning id`, [job.id]);
const other = await as(U.cust2, 'select count(*)::int n from jobs');
other.rows[0].n === 0 ? ok('other customer sees 0 jobs') : bad('RLS leak to other customer');
const colSees = await as(U.col, 'select count(*)::int n from jobs');
colSees.rows[0].n === 0 ? ok('collector cannot select open job rows directly') : bad('open job rows visible to collector');

console.log('\n# Verification gating');
(await as(U.col, 'select count(*)::int n from available_jobs()')).rows[0].n === 0 ? ok('unverified collector sees no jobs') : bad('unverified sees jobs');
await expectErr('unverified cannot go online', U.col, 'select set_availability(true)', [], /verified/);
await expectErr('unverified cannot claim', U.col, 'select claim_job($1)', [job.id], /not eligible/);
await expectErr('collector cannot approve self', U.col, `select set_collector_status($1,'approved')`, [U.col], /Only dispatch/);
for (const c of [U.col, U.col2, U.truck]) await as(U.ops, `select set_collector_status($1,'approved')`, [c]);
ok('dispatch approved collectors');
await expectOk('collector goes online', U.col, 'select set_availability(true)');
await expectOk('collector 2 goes online', U.col2, 'select set_availability(true)');
await expectOk('truck goes online', U.truck, 'select set_availability(true)');
const avail = await as(U.col, 'select * from available_jobs()');
avail.rows.length === 1 && avail.rows[0].approx_latitude === 5.53 ? ok('approved collector sees job, rounded coords') : bad('available_jobs: ' + JSON.stringify(avail.rows));
'address' in (avail.rows[0] ?? {}) ? bad('address leaked in available_jobs') : ok('address withheld from open listing');
(await as(U.truck, 'select count(*)::int n from available_jobs()')).rows[0].n === 0 ? ok('medium truck does not see Basic jobs') : bad('vehicle filter broken');

console.log('\n# Atomic claim');
await expectOk('collector 1 claims', U.col, 'select claim_job($1)', [job.id]);
await expectErr('collector 2 loses the race', U.col2, 'select claim_job($1)', [job.id], /already been taken/);
(await as(U.col2, 'select count(*)::int n from jobs')).rows[0].n === 0 ? ok('loser cannot read the job') : bad('loser reads job');
(await as(U.col, 'select count(*)::int n from jobs')).rows[0].n === 1 ? ok('winner reads the job') : bad('winner cannot read job');
(await as(U.cust, 'select count(*)::int n from profiles')).rows[0].n === 2 ? ok('customer can now see collector profile') : bad('customer profile visibility');

console.log('\n# Workflow transitions');
await expectErr('cannot skip to arrived', U.col, `select advance_job($1,'arrived')`, [job.id], /not available/);
await expectErr('other collector cannot advance', U.col2, `select advance_job($1,'en_route')`, [job.id], /not available/);
await expectOk('en route', U.col, `select advance_job($1,'en_route')`, [job.id]);
await expectOk('arrived (with location)', U.col, `select advance_job($1,'arrived',5.531,-0.421)`, [job.id]);
await expectErr('collecting needs before photo', U.col, `select advance_job($1,'collecting')`, [job.id], /before-collection photo/);
await expectErr('photo path must match job/kind', U.col, `select add_pickup_photo($1,'before','wrong/before/x.jpg')`, [job.id], /Invalid photo path/);
await expectErr('after photo not allowed yet', U.col, `select add_pickup_photo($1,'after',$2)`, [job.id, `${job.id}/after/a.jpg`], /while collecting/);
await expectOk('before photo registered', U.col, `select add_pickup_photo($1,'before',$2)`, [job.id, `${job.id}/before/b.jpg`]);
await expectOk('collecting', U.col, `select advance_job($1,'collecting')`, [job.id]);
await expectErr('complete needs after photo', U.col, `select advance_job($1,'completed')`, [job.id], /after-collection photo/);
await expectOk('after photo registered', U.col, `select add_pickup_photo($1,'after',$2)`, [job.id, `${job.id}/after/a.jpg`]);
await expectOk('completed', U.col, `select advance_job($1,'completed')`, [job.id]);
await expectErr('customer cannot cancel completed job', U.cust, `select cancel_job($1,'changed mind')`, [job.id], /no longer be cancelled/);

console.log('\n# Payments, ratings, stats, notifications');
await expectErr('customer cannot record payment', U.cust, `select record_payment($1,30,'cash',null)`, [job.id], /Not allowed/);
await expectErr('card cannot be recorded manually', U.col, `select record_payment($1,30,'card',null)`, [job.id], /provider/);
await expectOk('collector records cash payment', U.col, `select record_payment($1,30,'cash',null)`, [job.id]);
(await as(U.cust, 'select status from payments')).rows[0]?.status === 'successful' ? ok('customer sees payment') : bad('payment not visible');
await expectOk('dispatch sets final amount', U.ops, 'select set_final_amount($1, 30)', [job.id]);
await expectOk('customer rates', U.cust, 'select rate_job($1, 5::smallint, $2)', [job.id, 'Great']);
await expectErr('cannot rate twice', U.cust, 'select rate_job($1, 4::smallint, null)', [job.id], /cannot be rated/);
const stats = await expectOk('collector stats', U.col, 'select * from collector_stats()');
console.log('    ', JSON.stringify(stats?.rows[0]));
await expectErr('collector cannot read others stats', U.col, 'select * from collector_stats($1)', [U.col2], /Not allowed/);
const notes = await as(U.cust, 'select title from notifications order by created_at');
console.log('    customer notifications:', notes.rows.map((r) => r.title).join(' | '));
notes.rows.length >= 5 ? ok('customer received status notifications') : bad('notifications missing');
(await as(U.col2, 'select count(*)::int n from notifications')).rows[0].n === 0 ? ok('no notifications leak to other collector') : bad('notification leak');
await expectOk('mark notifications read', U.cust, 'select mark_notifications_read()');

console.log('\n# Dispatch assignment, decline, cancel, failure');
const j2 = (await as(U.cust, `select * from create_pickup_request(gen_random_uuid(),'commercial','premium','kasoa','Shop 4 Station',null,null,null,null,null,'mobile_money')`)).rows[0];
await expectErr('cannot assign tricycle to Premium', U.ops, 'select assign_job($1,$2)', [j2.id, U.col], /not verified for this service/);
await expectOk('assign truck to Premium', U.ops, 'select assign_job($1,$2)', [j2.id, U.truck]);
await expectOk('truck declines assignment', U.truck, `select decline_job($1,'too far')`, [j2.id]);
(await as(U.ops, 'select status from jobs where id=$1', [j2.id])).rows[0].status === 'pending' ? ok('declined job back to pending') : bad('decline did not requeue');
(await as(U.truck, 'select count(*)::int n from available_jobs()')).rows[0].n === 0 ? ok('declined job hidden from decliner') : bad('declined job still listed');
await expectOk('reassign and accept', U.ops, 'select assign_job($1,$2)', [j2.id, U.truck]);
await expectOk('truck accepts assignment', U.truck, 'select accept_assignment($1)', [j2.id]);
await expectOk('truck reports problem', U.truck, `select report_problem($1,'Gate locked')`, [j2.id]);
await expectOk('dispatch reopens', U.ops, 'select reopen_job($1)', [j2.id]);
await expectOk('customer reschedules', U.cust, `select reschedule_job($1, now() + interval '1 day')`, [j2.id]);
await expectOk('customer cancels pending', U.cust, `select cancel_job($1,'No longer needed')`, [j2.id]);
const j3 = (await as(U.cust, `select * from create_pickup_request(gen_random_uuid(),'construction','industrial','kasoa','Site B',null,null,null,null,null,'cash')`)).rows[0];
j3.quote_required && j3.estimate_min_ghs === null ? ok('industrial request flagged quote-required, no price') : bad('industrial pricing');
(await as(U.truck, 'select count(*)::int n from available_jobs() where id=$1', [j3.id])).rows[0].n === 0 ? ok('quote-only jobs not self-claimable') : bad('quote job listed');

console.log('\n# Storage policies');
await expectOk('customer uploads to own open job', U.cust, `insert into storage.objects (bucket_id,name) values ('pickup-photos',$1)`, [`${j3.id}/customer/p1.jpg`]);
await expectErr('customer cannot upload before-photo', U.cust, `insert into storage.objects (bucket_id,name) values ('pickup-photos',$1)`, [`${j3.id}/before/p1.jpg`], /row-level security/);
await expectErr('other customer cannot upload', U.cust2, `insert into storage.objects (bucket_id,name) values ('pickup-photos',$1)`, [`${j3.id}/customer/x.jpg`], /row-level security/);
(await as(U.cust2, `select count(*)::int n from storage.objects`)).rows[0].n === 0 ? ok('other customer cannot read photos') : bad('photo read leak');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
