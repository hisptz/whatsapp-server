import { config as configEnv } from "dotenv";
import { apiKeyAuth } from "@vpriem/express-api-key-auth";

import express from "express";
import routes from "./routes";
import bodyParser from "body-parser";
import Whatsapp from "./services/whatsapp";
import helmet from "helmet";

configEnv();

const app = express();

app.use(apiKeyAuth(/^API_KEY/));
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
  })
);

app.use(bodyParser.json({ limit: "50mb" }));
const port = process.env.PORT ?? 4000;

app.use(`/`, routes);

Whatsapp.init()
  .then((status) => {
    app.listen(port, () => {
      console.info(`Whatsapp server started at port ${port}`);
    });
  })
  .catch((error) => {
    console.error(`Could not start whatsapp server: ${error}`);
  });
