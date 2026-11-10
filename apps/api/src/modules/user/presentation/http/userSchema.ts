import { z } from "zod";

export const userResponseSchema = z.object({
  id: z.uuid(),
  dni: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
