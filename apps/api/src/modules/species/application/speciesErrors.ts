import { SpeciesError } from "@ayllugen/core/species/errors";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/AppError";

export function rethrowSpeciesError(error: unknown): never {
  if (error instanceof SpeciesError) {
    if (error.code === "SPECIES_NOT_FOUND")
      throw new NotFoundError(error.message);
    if (error.code === "SPECIES_DUPLICATE")
      throw new ConflictError(error.message);
    throw new ValidationError(error.message);
  }
  throw error;
}
