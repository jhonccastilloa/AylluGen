import type { AuthRequest } from "../../presentation/middlewares/auth.middleware";
import { UnauthenticatedError } from "../../presentation/errors/UnauthenticatedError";

const validateUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthenticatedError("Usuario no autenticado");
  return userId;
};

export default validateUserId;
