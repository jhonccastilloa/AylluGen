import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(50);
const sexSchema = z.enum(["MALE", "FEMALE"]);
const statusSchema = z.enum(["ACTIVE", "SOLD", "DECEASED"]);
const dateSchema = z.iso.date().nullable();

export const animalIdSchema = z.uuid();
export const createAnimalSchema = z.strictObject({
  code: identifierSchema,
  crotal: identifierSchema.nullable().optional(),
  speciesId: z.uuid(),
  sex: sexSchema,
  birthDate: dateSchema.optional(),
  fatherId: z.uuid().nullable().optional(),
  motherId: z.uuid().nullable().optional(),
  status: statusSchema.optional(),
  exitDate: dateSchema.optional(),
});
export const updateAnimalSchema = createAnimalSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    { message: "Debe enviar al menos un campo para actualizar." },
  );
export const animalPaginationSchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .default(0),
});
export const animalQuerySchema = animalPaginationSchema.extend({
  speciesId: z.uuid().optional(),
  sex: sexSchema.optional(),
  status: z.enum(["ACTIVE", "SOLD", "DECEASED", "ALL"]).default("ACTIVE"),
  search: z.string().trim().max(50).optional(),
});

export const animalResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  crotal: z.string().nullable(),
  speciesId: z.uuid(),
  sex: sexSchema,
  birthDate: dateSchema,
  fatherId: z.uuid().nullable(),
  motherId: z.uuid().nullable(),
  isFounder: z.boolean(),
  status: statusSchema,
  exitDate: dateSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const animalDetailResponseSchema = animalResponseSchema.extend({
  father: animalResponseSchema.nullable(),
  mother: animalResponseSchema.nullable(),
});
export const animalPageResponseSchema = z.object({
  animals: z.array(animalResponseSchema),
  total: z.number().int().min(0),
});
