import {
  parseAmount,
  pickupSchema,
  registerProfileSchema,
  resetConfirmSchema,
  signUpSchema,
  ticketSchema,
} from '@/validation/schemas';

const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.path.join('.'));

describe('signUpSchema', () => {
  it('accepts a valid sign-up', () => {
    expect(signUpSchema.safeParse({ email: ' ama@example.com ', password: 'clean2026', confirmPassword: 'clean2026' }).success).toBe(true);
  });
  it('rejects weak or mismatched passwords and bad emails', () => {
    expect(issues(signUpSchema.safeParse({ email: 'nope', password: 'short', confirmPassword: 'x' }))).toEqual(
      expect.arrayContaining(['email', 'password', 'confirmPassword']),
    );
    expect(issues(signUpSchema.safeParse({ email: 'a@b.co', password: 'onlyletters', confirmPassword: 'onlyletters' }))).toEqual([
      'password',
    ]);
  });
});

describe('resetConfirmSchema', () => {
  it('requires a numeric code', () => {
    expect(issues(resetConfirmSchema.safeParse({ code: 'abc', password: 'clean2026', confirmPassword: 'clean2026' }))).toEqual(['code']);
    expect(resetConfirmSchema.safeParse({ code: '123456', password: 'clean2026', confirmPassword: 'clean2026' }).success).toBe(true);
  });
});

describe('registerProfileSchema', () => {
  const base = { fullName: 'Ama Mensah', phone: '024 123 4567', organizationName: '', vehicleType: null, vehiclePlate: '' };

  it('accepts a customer', () => {
    expect(registerProfileSchema.safeParse({ ...base, role: 'customer' }).success).toBe(true);
  });
  it('requires a vehicle for collectors', () => {
    expect(issues(registerProfileSchema.safeParse({ ...base, role: 'collector' }))).toEqual(['vehicleType']);
    expect(registerProfileSchema.safeParse({ ...base, role: 'collector', vehicleType: 'tricycle' }).success).toBe(true);
  });
  it('requires a business name for partners', () => {
    expect(issues(registerProfileSchema.safeParse({ ...base, role: 'partner' }))).toEqual(['organizationName']);
  });
  it('rejects non-Ghana phone numbers', () => {
    expect(issues(registerProfileSchema.safeParse({ ...base, role: 'customer', phone: '+234 803 123 4567' }))).toEqual(['phone']);
  });
  it('cannot be used to register dispatch', () => {
    expect(registerProfileSchema.safeParse({ ...base, role: 'ops' }).success).toBe(false);
  });
});

describe('pickupSchema', () => {
  const valid = {
    localityCode: 'kasoa',
    address: '12 Market Road',
    landmark: '',
    latitude: 5.53,
    longitude: -0.42,
    wasteCategory: 'household',
    serviceCategory: 'basic',
    notes: '',
    timing: 'asap',
    paymentMethod: 'cash',
  };
  it('accepts a complete request', () => {
    expect(pickupSchema.safeParse(valid).success).toBe(true);
  });
  it('flags missing steps', () => {
    expect(issues(pickupSchema.safeParse({ ...valid, address: ' ', wasteCategory: '', serviceCategory: '' }))).toEqual([
      'address',
      'wasteCategory',
      'serviceCategory',
    ]);
  });
  it('does not accept card payments yet', () => {
    expect(pickupSchema.safeParse({ ...valid, paymentMethod: 'card' }).success).toBe(false);
  });
});

describe('misc', () => {
  it('parses amounts', () => {
    expect(parseAmount('30')).toBe(30);
    expect(parseAmount('30,5')).toBe(30.5);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
  it('requires a meaningful support message', () => {
    expect(ticketSchema.safeParse({ category: 'complaint', message: 'bad' }).success).toBe(false);
  });
});
