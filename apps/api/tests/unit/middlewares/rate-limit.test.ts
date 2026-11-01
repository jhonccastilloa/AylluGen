import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

test.each(["development", "test", "production"])(
  "rate limits only in production: %s",
  async (environment) => {
    const previous = process.env.NODE_ENV;
    let middleware!: typeof import("../../../src/presentation/middlewares/rate-limit.middleware");
    try {
      process.env.NODE_ENV = environment;
      jest.isolateModules(() => {
        middleware = require("../../../src/presentation/middlewares/rate-limit.middleware");
      });
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
    const app = express();
    app.get("/general", middleware.generalLimiter, (_req, res) =>
      res.sendStatus(200),
    );
    app.get("/auth", middleware.authLimiter, (_req, res) =>
      res.sendStatus(200),
    );
    const server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      for (const [route, limit] of [
        ["general", 100],
        ["auth", 5],
      ] as const) {
        for (let index = 0; index <= limit; index++) {
          const response = await fetch(`${base}/${route}`);
          const body = await response.text();
          expect(response.status).toBe(
            environment === "production" && index === limit ? 429 : 200,
          );
          expect(response.headers.has("X-RateLimit-Limit")).toBe(false);
          if (environment === "production") {
            expect(response.headers.get("RateLimit")).toBeTruthy();
            expect(response.headers.get("RateLimit-Policy")).toBeTruthy();
            if (index === limit) {
              expect(JSON.parse(body)).toEqual({
                error: expect.any(String),
                code: "RATE_LIMIT_EXCEEDED",
              });
              expect(response.headers.get("Content-Type")).toContain(
                "application/json",
              );
              expect(
                Number(response.headers.get("Retry-After")),
              ).toBeGreaterThan(0);
            }
          } else {
            expect(response.headers.has("RateLimit")).toBe(false);
          }
        }
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);
