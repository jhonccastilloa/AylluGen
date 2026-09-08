import type { TFunction } from 'i18next';
import { z } from 'zod';

const isValidInputDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const candidateDate = new Date(year, month - 1, day);
  const isSameDate =
    candidateDate.getFullYear() === year &&
    candidateDate.getMonth() === month - 1 &&
    candidateDate.getDate() === day;

  if (!isSameDate) {
    return false;
  }

  return candidateDate <= new Date();
};

export const createRegisterAnimalFormSchema = (t: TFunction) =>
  z.object({
    crotal: z.string().trim().min(1, t('registerAnimal.incompleteDataMessage')),
    sex: z.enum(['MALE', 'FEMALE']),
    speciesSelectionId: z
      .string()
      .trim()
      .min(1, t('registerAnimal.incompleteDataMessage')),
    birthDate: z
      .string()
      .refine(value => !value.trim() || isValidInputDate(value), {
        message: t('registerAnimal.invalidDateMessage'),
      }),
    isFounder: z.boolean(),
    fatherId: z.string(),
    motherId: z.string(),
  });

export type RegisterAnimalFormValues = z.infer<
  ReturnType<typeof createRegisterAnimalFormSchema>
>;
