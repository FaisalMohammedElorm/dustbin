import { z } from 'zod';

import { isValidGhanaPhone } from '@/domain/phone';

const email = z.string().trim().min(1, { error: 'Enter your email address.' }).pipe(z.email({ error: 'Enter a valid email address.' }));

const newPassword = z
  .string()
  .min(8, { error: 'Use at least 8 characters.' })
  .regex(/[A-Za-z]/, { error: 'Include at least one letter.' })
  .regex(/[0-9]/, { error: 'Include at least one number.' });

const ghanaPhone = z
  .string()
  .trim()
  .min(1, { error: 'Enter your phone number.' })
  .refine(isValidGhanaPhone, { error: 'Enter a valid Ghana number, e.g. 024 123 4567.' });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: 'Enter your password.' }),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({ email, password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { error: 'Passwords do not match.', path: ['confirmPassword'] });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const resetRequestSchema = z.object({ email });
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export const resetConfirmSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6,8}$/, { error: 'Enter the code from the email.' }),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { error: 'Passwords do not match.', path: ['confirmPassword'] });
export type ResetConfirmValues = z.infer<typeof resetConfirmSchema>;

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export const vehicleTypes = ['bicycle', 'tricycle', 'medium_truck', 'large_truck'] as const;

export const registerProfileSchema = z
  .object({
    role: z.enum(['customer', 'collector', 'partner']),
    fullName: z.string().trim().min(2, { error: 'Enter your full name.' }).max(120),
    phone: ghanaPhone,
    organizationName: z.string().trim().max(160),
    vehicleType: z.enum(vehicleTypes).nullable(),
    vehiclePlate: z.string().trim().max(20),
  })
  .superRefine((v, ctx) => {
    if (v.role === 'collector' && !v.vehicleType) {
      ctx.addIssue({ code: 'custom', path: ['vehicleType'], message: 'Choose your vehicle.' });
    }
    if (v.role === 'partner' && v.organizationName.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['organizationName'], message: 'Enter your business name.' });
    }
  });
export type RegisterProfileValues = z.infer<typeof registerProfileSchema>;

export const editProfileSchema = z.object({
  fullName: z.string().trim().min(2, { error: 'Enter your full name.' }).max(120),
  phone: ghanaPhone,
  organizationName: z.string().trim().max(160),
});
export type EditProfileValues = z.infer<typeof editProfileSchema>;

export const collectorDetailsSchema = z.object({
  vehicleType: z.enum(vehicleTypes),
  vehiclePlate: z.string().trim().max(20),
  serviceArea: z.string().trim().max(120),
});
export type CollectorDetailsValues = z.infer<typeof collectorDetailsSchema>;

// ---------------------------------------------------------------------------
// Pickup request wizard
// ---------------------------------------------------------------------------
export const pickupSchema = z.object({
  localityCode: z.string().min(1, { error: 'Choose your area.' }),
  address: z.string().trim().min(3, { error: 'Enter the pickup address.' }).max(300),
  landmark: z.string().trim().max(200),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  wasteCategory: z.string().min(1, { error: 'Choose what needs collecting.' }),
  serviceCategory: z.string().min(1, { error: 'Choose a collection service.' }),
  notes: z.string().trim().max(500),
  timing: z.enum(['asap', 'today_pm', 'tomorrow_am', 'tomorrow_pm', 'day_after_am']),
  paymentMethod: z.enum(['cash', 'mobile_money']),
});
export type PickupValues = z.infer<typeof pickupSchema>;

/** Fields validated before leaving each wizard step. */
export const PICKUP_STEP_FIELDS: (keyof PickupValues)[][] = [
  ['localityCode', 'address', 'landmark'],
  ['wasteCategory'],
  ['serviceCategory'],
  ['notes', 'timing', 'paymentMethod'],
  [],
];

export const savedAddressSchema = z.object({
  label: z.string().trim().min(1, { error: 'Give this address a name.' }).max(40),
  localityCode: z.string().min(1, { error: 'Choose the area.' }),
  address: z.string().trim().min(3, { error: 'Enter the address.' }).max(300),
  landmark: z.string().trim().max(200),
});
export type SavedAddressValues = z.infer<typeof savedAddressSchema>;

// ---------------------------------------------------------------------------
// Support, money, drop-offs
// ---------------------------------------------------------------------------
export const ticketSchema = z.object({
  category: z.enum(['complaint', 'missed_pickup', 'payment', 'damage', 'account', 'other']),
  message: z.string().trim().min(10, { error: 'Tell us a little more (at least 10 characters).' }).max(2000),
});
export type TicketValues = z.infer<typeof ticketSchema>;

/** Accepts "30", "30.5", "30,50"; returns a positive amount or null. */
export function parseAmount(input: string): number | null {
  const n = Number(input.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null;
}

export const amountSchema = z.object({
  amount: z.string().refine((v) => parseAmount(v) !== null, { error: 'Enter an amount greater than 0.' }),
});
export type AmountValues = z.infer<typeof amountSchema>;

export const dropoffSchema = z.object({
  partnerId: z.string().min(1, { error: 'Choose a recycling partner.' }),
  material: z.enum(['plastic', 'metal', 'paper', 'glass', 'organic', 'e_waste', 'mixed']),
  weight: z.string().refine((v) => parseAmount(v) !== null, { error: 'Enter a weight greater than 0.' }),
  notes: z.string().trim().max(500),
});
export type DropoffValues = z.infer<typeof dropoffSchema>;
