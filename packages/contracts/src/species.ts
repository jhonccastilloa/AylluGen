import { z } from "zod";
import {
  speciesCodeIssue,
  speciesNameIssue,
  speciesDescriptionIssue,
} from "@ayllugen/core/species/rules";

// Canonical persisted/wire values: no transformations during push or pull.
export const speciesCodeSchema = z.string().superRefine((value, ctx) => {
  const message = speciesCodeIssue(value);
  if (message) ctx.addIssue({ code: "custom", message });
});
export const speciesNameSchema = z.string().superRefine((value, ctx) => {
  const message = speciesNameIssue(value);
  if (message) ctx.addIssue({ code: "custom", message });
});
export const speciesDescriptionSchema = z
  .string()
  .nullable()
  .superRefine((value, ctx) => {
    const message = speciesDescriptionIssue(value);
    if (message) ctx.addIssue({ code: "custom", message });
  });
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
