import { z } from "zod";
import { userResponseSchema } from "../../../user/presentation/http/userSchema";

const dni = z
  .string()
  .regex(/^\d{8}$/, "El DNI debe contener exactamente 8 dígitos.");
const password = z.string().min(1).max(128);
export const registerSchema = z.object({ dni, password });
export const loginSchema = z.object({ dni, password });
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});
export const changePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
});
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userResponseSchema,
});
