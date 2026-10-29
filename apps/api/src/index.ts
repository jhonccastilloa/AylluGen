import "reflect-metadata";
import "dotenv/config";
import { buildContainer } from "./composition/container";
import { buildInfrastructure } from "./composition/infrastructure";
import App from "./server";

const infrastructure = buildInfrastructure();
const container = buildContainer(infrastructure);
const app = new App(container.controllers);
app.listen();
