import { config as configEnv } from "dotenv";
import express from "express";
import routes from "./routes";
import bodyParser from "body-parser";
import Whatsapp from "./services/whatsapp";

configEnv();

const app = express();
app.use(bodyParser.json());
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
