import express, { Application } from "express";
import cors from "cors";
// import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./infrastructure/config/swagger";
import { config } from "./shared/constants/config";
import {
  errorHandler,
  notFoundHandler,
} from "./presentation/middlewares/error.middleware";
// import { requestLogger } from "./presentation/middlewares/request-logger.middleware";
// import { generalLimiter } from "./presentation/middlewares/rate-limit.middleware";
import routes from "./presentation/routes";
import helmet from "helmet";
import { requestLogger } from "@presentation/middlewares";

class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors());
    this.app.use(
      helmet({
        contentSecurityPolicy: config.isProd ? undefined : false,
      }),
    );
    // this.app.use(generalLimiter);
    this.app.use("/api/sync/v2", express.json({ limit: "2mb" }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    this.app.use("/api", routes);
    this.app.get("/", (_req, res) => {
      res.json({ message: "Ayllu Gen API - Clean Architecture" });
    });
  }

  private initializeSwagger(): void {
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public listen(): void {
    const server = this.app.listen(config.port, () => {
      const server = `http://localhost:${config.port}`;
      console.log(`🚀 Server deployed at: ${server}`);
      console.log(`📝 View docs at: ${server}/api-docs`);
    });
    // Manejar Ctrl + C
    process.on("SIGINT", () => {
      console.log("Shutting down server...");
      server.close(() => process.exit(0));
    });

    process.on("SIGTERM", () => {
      console.log("Process terminated");
      server.close(() => process.exit(0));
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
