import { z } from "zod";
import { SpeciesCode } from "@ayllugen/core/species/code";
import { SpeciesDescription } from "@ayllugen/core/species/description";
import { SpeciesName } from "@ayllugen/core/species/name";

// Canonical persisted/wire values: no transformations during push or pull.
export const speciesCodeSchema = z.string().superRefine((value, ctx) => {
  const message = SpeciesCode.issue(value);
  if (message) ctx.addIssue({ code: "custom", message });
});
export const speciesNameSchema = z.string().superRefine((value, ctx) => {
  const message = SpeciesName.issue(value);
  if (message) ctx.addIssue({ code: "custom", message });
});
export const speciesDescriptionSchema = z
  .string()
  .nullable()
  .superRefine((value, ctx) => {
    const message = SpeciesDescription.issue(value);
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
