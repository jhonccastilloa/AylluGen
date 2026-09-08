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
  );

const dniSchema = z
  .string()
  .length(8, "El DNI debe tener exactamente 8 caracteres")
  .regex(/^\d+$/, "El DNI debe contener solo números")
  .describe("Documento Nacional de Identidad");

export const registerSchema = z
  .object({
    dni: dniSchema,
    password: passwordSchema,
  })
  .openapi({
    example: {
      dni: "12345678",
      password: "Password123!",
    },
  });

export const loginSchema = z
  .object({
    dni: dniSchema,
    password: z.string().describe("Contraseña del usuario"),
  })
  .openapi({
    example: {
      dni: "12345678",
      password: "Password123!",
    },
  });

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().describe("Token de refresco"),
  })
  .openapi({
    example: {
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
  });

export const logoutSchema = z
  .object({
    refreshToken: z.string().describe("Token de refresco"),
  })
  .openapi({
    example: {
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    },
  });

export const authResponseSchema = z
  .object({
    accessToken: z.string().describe("Token de acceso JWT"),
    refreshToken: z.string().describe("Token de refresco"),
    user: z.object({
      id: z.string().uuid().describe("Identificador único del usuario"),
      dni: z.string().describe("Documento Nacional de Identidad"),
      createdAt: z.date().describe("Fecha de creación del usuario"),
      updatedAt: z.date().describe("Fecha de última actualización"),
    }),
  })
  .openapi({
    example: {
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      user: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        dni: "12345678",
        createdAt: "2026-02-03T00:00:00.000Z",
        updatedAt: "2026-02-03T00:00:00.000Z",
      },
    },
  });

export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;
export type LogoutInputDTO = z.infer<typeof logoutSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
