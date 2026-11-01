import express, { Application } from "express";
import type { Server } from "node:http";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./infrastructure/openapi/index";
import { config } from "./shared/constants/config";
import {
  makeErrorHandler,
  notFoundHandler,
} from "./presentation/middlewares/http-error.middleware";
import { generalLimiter } from "./presentation/middlewares/rate-limit.middleware";
import helmet from "helmet";
import { makeRequestLogger } from "./presentation/middlewares/request-logger.middleware";
import type { ILogger } from "./shared/logging/Logger";
import { createRoutes } from "./presentation/routes";
import type { IContainerControllers } from "./composition/container";

class App {
  private app: Application;
  private stopping = false;

  constructor(
    private readonly controllers: IContainerControllers,
    private readonly logger: ILogger,
    private readonly shutdown: () => Promise<void>,
  ) {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(makeRequestLogger(this.logger));
    this.app.use(cors());
    this.app.use(
      helmet({
        contentSecurityPolicy: config.isProd ? undefined : false,
      }),
    );
    this.app.use(generalLimiter);
    this.app.use("/api/sync/v2", express.json({ limit: "2mb" }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    this.app.use("/api", createRoutes(this.controllers));
    this.app.get("/", (_req, res) => {
      res.json({ message: "Ayllu Gen API - Clean Architecture" });
    });
  }

  private initializeSwagger(): void {
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(makeErrorHandler(this.logger));
  }

  public listen(): void {
    const server = this.app.listen(config.port, () => {
      const server = `http://localhost:${config.port}`;
      this.logger.info("app.started", {
        url: server,
        docsUrl: `${server}/api-docs`,
      });
    });
    process.on("SIGINT", () => void this.stop(server, "SIGINT"));
    process.on("SIGTERM", () => void this.stop(server, "SIGTERM"));
  }

  private async stop(server: Server, signal: NodeJS.Signals): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    this.logger.info("app.stopping", { signal });
    const timeout = setTimeout(() => {
      this.logger.error("app.shutdown.timeout");
      process.exit(1);
    }, 30_000);
    timeout.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await this.shutdown();
      clearTimeout(timeout);
      process.exit(0);
    } catch (error) {
      this.logger.error("app.shutdown.failed", { error });
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
