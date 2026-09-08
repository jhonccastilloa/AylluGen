import "reflect-metadata";
import "dotenv/config";
import App from "./server";

const app = new App();
app.listen();
