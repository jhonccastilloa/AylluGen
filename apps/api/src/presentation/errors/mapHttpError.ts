import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { DomainError } from "@ayllugen/core/errors/domain";
import type { DomainErrorKind } from "@ayllugen/core/errors/domain";
import { UnauthenticatedError } from "./UnauthenticatedError";
import type { HttpErrorResponse } from "./HttpErrorResponse";
import { Prisma } from "../../infrastructure/database/prisma/generated/client";

const statusByKind = {
  validation: 400,
  not_found: 404,
  conflict: 409,
  unauthenticated: 401,
} satisfies Record<DomainErrorKind, number>;

export function mapHttpError(error: unknown): HttpErrorResponse {
  if (error instanceof DomainError) {
    return {
      statusCode: statusByKind[error.kind],
      body: { error: error.message, code: error.code },
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: "Datos de entrada inválidos.",
        code: "VALIDATION_ERROR",
        details: error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
        })),
      },
    };
  }

  if (error instanceof UnauthenticatedError) {
    return {
      statusCode: 401,
      body: { error: error.message, code: "AUTHENTICATION_ERROR" },
    };
  }
  if (error instanceof JsonWebTokenError) {
    const expired = error instanceof TokenExpiredError;
    return {
      statusCode: 401,
      body: {
        error: expired ? "Token expirado." : "Token inválido.",
        code: expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      },
    };
  }

  // Express/body-parser errors: only recognize specific transport failures.
  if (error instanceof Error && "type" in error && "status" in error) {
    if (error.type === "entity.parse.failed" && error.status === 400) {
      return {
        statusCode: 400,
        body: { error: "JSON inválido.", code: "INVALID_JSON" },
      };
    }
    if (error.type === "entity.too.large" && error.status === 413) {
      return {
        statusCode: 413,
        body: {
          error: "El cuerpo de la solicitud es demasiado grande.",
          code: "PAYLOAD_TOO_LARGE",
        },
      };
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return {
          statusCode: 409,
          body: {
            error: "Ya existe un registro con esos datos.",
            code: "RESOURCE_CONFLICT",
          },
        };
      case "P2003":
        return {
          statusCode: 409,
          body: {
            error:
              "La operación entra en conflicto con registros relacionados.",
            code: "RELATION_CONFLICT",
          },
        };
      case "P2025":
        return {
          statusCode: 404,
          body: {
            error: "No se encontró un registro necesario para la operación.",
            code: "RESOURCE_NOT_FOUND",
          },
        };
    }
  }

  return {
    statusCode: 500,
    body: {
      error: "Error interno del servidor.",
      code: "INTERNAL_SERVER_ERROR",
    },
  };
}
