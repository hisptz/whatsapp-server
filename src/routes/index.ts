import { Router } from "express";
import { messagePayloadSchema } from "../schema";
import Whatsapp from "../services/whatsapp";
import whatsapp from "../services/whatsapp";

const router: Router = Router();

router.post(`/send`, async (req, res) => {
  const data = req.body;
  if (data) {
    const { value, warning, error } = messagePayloadSchema.validate(data);

    if (error) {
      res.statusMessage = `${error}`;
      res.sendStatus(400);
      return;
    }
    if (warning) {
      console.warn(warning);
    }
    try {
      const response = await Whatsapp.sendMessage(value);
      res.status(200).json(response);
    } catch (e: any) {
      console.error(e);
      res.status(500).json(e);
    }
  } else {
    res.statusMessage = "Invalid payload: No data received";
    res.sendStatus(400);
    return;
  }
});

router.get("/groups", async (req, res) => {
  try {
    const groups = await Whatsapp.getAllGroups();
    res.status(200).send({ groups });
  } catch (error) {
    const errorCode = 500;
    res.status(errorCode).send({ status: "Error", message: `${error}` });
  }
});

router.get("/ping", async (req, res) => {
  try {
    const status = await whatsapp.isConnetionOnline();
    res.status(200).send({
      status: status ? "online" : "offline",
      message: "OK",
      timestamp: Date.now(),
    });
  } catch (error) {
    const errorCode = 500;
    res.status(errorCode).send({ status: "Error", message: `${error}` });
  }
});

export default router;
