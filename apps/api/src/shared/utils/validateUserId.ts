import { AuthRequest } from "@presentation/middlewares";
import { AuthenticationError } from "@shared/errors/AppError";

const validateUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) throw new AuthenticationError("Usuario no autenticado");
  return userId;
};

export default validateUserId;
