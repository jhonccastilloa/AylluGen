import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña no puede exceder 128 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(
    /[^A-Za-z0-9]/,
    "Debe contener al menos un carácter especial (!@#$%^&*)",
  )
  .optional();

export const userResponseSchema = z
  .object({
    id: z.string().uuid().describe("Identificador único del usuario"),
    dni: z.string().describe("Documento Nacional de Identidad"),
    createdAt: z.date().describe("Fecha de creación del usuario"),
    updatedAt: z.date().describe("Fecha de última actualización"),
  })
  .openapi({
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      dni: "12345678",
      createdAt: "2026-02-03T00:00:00.000Z",
      updatedAt: "2026-02-03T00:00:00.000Z",
    },
  });

export const updateUserSchema = z
  .object({
    password: passwordSchema,
  })
  .openapi({
    example: {
      password: "NewPassword123!",
    },
  });

export const userIdParamSchema = z.object({
  userId: z
    .uuid("El id del usuario debe ser un UUID válido")
    .describe("Identificador único del usuario"),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
