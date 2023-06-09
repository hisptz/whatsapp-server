import Joi from "joi";

export const messagePayloadSchema = Joi.object({
  to: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .pattern(/individual|group/)
          .required()
          .label("type of contact"),
        number: Joi.string().required().label("contact number"),
      })
    )
    .required()
    .label("contact details"),
  message: Joi.object({
    type: Joi.string()
      .pattern(/image|chat|document|video|audio/)
      .required()
      .label("type of message"),
    id: Joi.string().optional(),
    text: Joi.string().optional(),
    image: Joi.string().optional(),
    file: Joi.string().optional(),
  })
    .required()
    .label("message"),
});
