import { z } from 'zod';
import type { TFunction } from 'i18next';

const createDniSchema = (t: TFunction) =>
  z.string().trim().regex(/^\d{8}$/, t('validation.dniExact'));

export const createSignInSchema = (t: TFunction) =>
  z.object({
    dni: createDniSchema(t),
    password: z.string().trim().min(1, t('validation.passwordRequired')),
  });

export const createSignUpSchema = (t: TFunction) =>
  z
    .object({
      dni: createDniSchema(t),
      password: z.string().trim().min(8, t('validation.passwordMin')),
      confirmPassword: z
        .string()
        .trim()
        .min(1, t('validation.confirmPasswordRequired')),
    })
    .refine(data => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordsMismatch'),
    });

export interface SignInFormValues {
  dni: string;
  password: string;
}

export interface SignUpFormValues {
  dni: string;
  password: string;
  confirmPassword: string;
}
