import { z } from "zod";

export const createSpecieSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
});
