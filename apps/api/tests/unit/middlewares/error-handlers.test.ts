import {
  ConflictError,
  ZodValidationError,
  ValidationError,
  AuthenticationError,
} from "../../../src/shared/errors/AppError";
import {
  ZodValidationErrorHandler,
  AppErrorHandler,
} from "../../../src/presentation/middlewares/error-handlers/index";

describe("Error Handlers", () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      url: "/test",
      method: "GET",
      id: "test-id",
      logger: {
        error: jest.fn(),
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("ZodValidationErrorHandler", () => {
    let handler: ZodValidationErrorHandler;

    beforeEach(() => {
      handler = new ZodValidationErrorHandler();
    });

    it("should handle ZodValidationError correctly", () => {
      const error = new ZodValidationError([
        { path: ["field"], message: "Required" },
      ]);

      handler.handle(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: error.message,
          code: "VALIDATION_ERROR",
          details: error.errors,
        }),
      );
    });
  });

  describe("AppErrorHandler", () => {
    let handler: AppErrorHandler;

    beforeEach(() => {
      handler = new AppErrorHandler();
    });

    it("should handle ConflictError correctly", () => {
      const error = new ConflictError("Resource already exists");

      handler.handle(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Resource already exists",
          code: "CONFLICT",
        }),
      );
    });

    it("should handle AuthenticationError correctly", () => {
      const error = new AuthenticationError("Invalid credentials");

      handler.handle(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Invalid credentials",
          code: "AUTHENTICATION_ERROR",
        }),
      );
    });

    it("should handle ValidationError correctly", () => {
      const error = new ValidationError("Validation failed");

      handler.handle(error, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
        }),
      );
    });
  });
});
