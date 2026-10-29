/** Missing authentication context at the HTTP boundary. */
export class UnauthenticatedError extends Error {
  constructor(message: string = "Usuario no autenticado.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}
