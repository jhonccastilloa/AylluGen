import { config } from "../../shared/constants/config";
import type { ILogger } from "../../shared/logging/Logger";
import { createLogger } from "./createLogger";

export const logger: ILogger = createLogger(config.logging);
