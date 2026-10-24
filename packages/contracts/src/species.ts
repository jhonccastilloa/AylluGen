import { z } from "zod";

// Persisted/wire values are checked without transforming them during push or pull.
export const speciesCodeSchema = z.string().refine(
  (value) => value.length >= 2 && value.length <= 30 && /^[A-Z0-9_]+$/.test(value),
  "El código debe tener entre 2 y 30 caracteres: mayúsculas, números o guion bajo.",
);
export const speciesNameSchema = z.string().refine(
  (value) => value.trim().length >= 2 && value.length <= 80,
  "El nombre debe tener entre 2 y 80 caracteres.",
);
export const speciesDescriptionSchema = z
  .string()
  .nullable()
  .refine(
    (value) => value === null || value.length <= 200,
    "La descripción no puede exceder 200 caracteres.",
  );
export const speciesFieldsSchema = z.object({
  code: speciesCodeSchema,
  name: speciesNameSchema,
  description: speciesDescriptionSchema,
});

// Commands are normalized and business-validated by the shared use cases.
export const createSpeciesInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});
export const updateSpeciesInputSchema = createSpeciesInputSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    { message: "Debe enviar al menos un campo para actualizar." },
  );
