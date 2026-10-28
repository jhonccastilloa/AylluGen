import { z } from "zod";

export const createSpecieSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const updateSpecieSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
  })
  .refine(
    (input) => input.name !== undefined || input.description !== undefined,
    { message: "Debes enviar al menos un campo para actualizar la especie." },
  );

export const specieIdSchema = z.uuid();
