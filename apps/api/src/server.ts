import express, { Application } from "express";
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

  constructor(
    private readonly controllers: IContainerControllers,
    private readonly logger: ILogger,
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
    // Manejar Ctrl + C
    process.on("SIGINT", () => {
      this.logger.info("app.stopping", { signal: "SIGINT" });
      server.close(() => process.exit(0));
    });

    process.on("SIGTERM", () => {
      this.logger.info("app.stopping", { signal: "SIGTERM" });
      server.close(() => process.exit(0));
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
