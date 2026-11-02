import { Prisma } from "../../../src/infrastructure/database/prisma/generated/client";
import { mapHttpError } from "../../../src/presentation/errors/mapHttpError";

describe("global Prisma error policy", () => {
  test.each([
    new Prisma.PrismaClientKnownRequestError("private details", {
      code: "P2024",
      clientVersion: "7.10.0",
    }),
    new Prisma.PrismaClientValidationError("private query", {
      clientVersion: "7.10.0",
    }),
    new Prisma.PrismaClientInitializationError(
      "private connection",
      "7.10.0",
      "P1001",
    ),
    new Prisma.PrismaClientUnknownRequestError("unknown failure", {
      clientVersion: "7.10.0",
    }),
    { code: "P2002", message: "not a Prisma error" },
    Object.assign(new Error("not a Prisma error"), { code: "P2025" }),
  ])("keeps technical and unrecognized failures as generic 500s", (error) => {
    expect(mapHttpError(error)).toEqual({
      statusCode: 500,
      body: {
        error: "Error interno del servidor.",
        code: "INTERNAL_SERVER_ERROR",
      },
    });
  });
});
