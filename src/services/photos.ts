import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { getSupabase, rpc } from '@/services/client';
import type { PhotoKind, PickupPhoto } from '@/types/models';

const BUCKET = 'pickup-photos';
const MAX_DIMENSION = 1600;

export type LocalPhoto = { uri: string; width?: number; height?: number };

/** Downscales large camera images and re-encodes as JPEG before upload. */
async function compress(photo: LocalPhoto): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  const w = photo.width ?? 0;
  const h = photo.height ?? 0;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    context.resize(w >= h ? { width: MAX_DIMENSION, height: null } : { width: null, height: MAX_DIMENSION });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  return saved.uri;
}

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

/**
 * Compresses, uploads to private storage at <job>/<kind>/<file>, then registers
 * the photo through add_pickup_photo (which re-checks the caller's rights).
 */
export async function uploadPickupPhoto(jobId: string, kind: PhotoKind, photo: LocalPhoto): Promise<PickupPhoto> {
  const uri = await compress(photo);
  const bytes = await readBytes(uri);
  const path = `${jobId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await getSupabase().storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  return rpc<PickupPhoto>('add_pickup_photo', { p_job_id: jobId, p_kind: kind, p_storage_path: path });
}

export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(error.message);
  const entries: [string, string][] = [];
  for (const d of data) {
    if (d.path && d.signedUrl) entries.push([d.path, d.signedUrl]);
  }
  return Object.fromEntries(entries);
}
