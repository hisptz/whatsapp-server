import {Router} from "express";
import {messagePayloadSchema} from "../schema";
import Whatsapp from "../services/whatsapp";

const router: Router = Router();

router.post(`/send`, async (req, res) => {
    const data = req.body;

    if (data) {
        const {value, warning, error} = messagePayloadSchema.validate(data);

        if (error) {
            res.statusMessage = `${error}`;
            res.sendStatus(400);
            return;
        }
        if (warning) {
            console.warn(warning)
        }
        console.info(`Data captured: ${JSON.stringify(value)}`);
        try {
            const response = await Whatsapp.sendMessage(value);
            console.log(response);
            res.status(200).json(response)
        } catch (e: any) {
            console.error(e)
            res.status(500).json(e);
        }
    } else {
        res.statusMessage = "Invalid payload: No data received";
        res.sendStatus(400);
        return;
    }
})


export default router;
