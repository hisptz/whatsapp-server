import { create, CreateOptions, Whatsapp } from "@wppconnect-team/wppconnect";
import { compact, find, isEmpty, map } from "lodash";
import axios from "axios";
import {
  ContactType,
  GroupIdentifier,
  WhatsappMessagePayload,
  WhatsappMessageResponse,
} from "../interfaces";
import { messagePayloadSchema } from "../schema";

class WhatsappService {
  whatsapp?: Whatsapp;
  session: string = "whatsapp-session";
  options?: CreateOptions;

  constructor(session?: string, options?: CreateOptions) {
    this.options = options;
    if (session) {
      this.session = session;
    }
    this.getGroupChatId = this.getGroupChatId.bind(this);
    this.getContactChatId = this.getContactChatId.bind(this);
    this.getChatId = this.getChatId.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.sendImageMessage = this.sendImageMessage.bind(this);
    this.sendTextMessage = this.sendTextMessage.bind(this);
  }

  get client() {
    if (this.whatsapp) {
      return this.whatsapp;
    } else {
      throw "Client not initialized";
    }
  }

  /*
   * Initializes whatsapp instance
   * */
  async init() {
    try {
      this.whatsapp = await create({
        session: this.session,
        ...(this.options ?? {}),
      });

      // WhatsApp message listener
      this.whatsapp?.onMessage(async (whatsappMessage) => {
        // add sanitization of the send message
        const sanitizedMessage: WhatsappMessageResponse =
          this.sanitizeReceivedMessage(whatsappMessage);
        try {
          const replyPayload = await this.handleReceivedMessages(
            sanitizedMessage
          );

          // send the reply message
          if (replyPayload) {
            await this.sendReplyMessage(sanitizedMessage, replyPayload);
          }
        } catch (error) {
          console.error(error);
          const { from } = sanitizedMessage;
          await this.sendDefaultErrorReplyMessage(from);
        }
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  async getAllGroups(): Promise<GroupIdentifier[]> {
    try {
      const groups = await this.client.getAllGroups();

      return map(groups, (group) => ({
        id: group.id._serialized,
        name: group.name,
      }));
    } catch (error) {
      throw error;
    }
  }

  async getGroupChatId(groupName: string): Promise<string> {
    const groups = await this.client.getAllGroups();
    if (isEmpty(groups)) throw `There are no groups for this phone number`;

    const group = find(groups, (group) => {
      return group.name === groupName;
    });

    if (isEmpty(group)) throw `Group ${groupName} not found`;

    return group.id._serialized;
  }

  async getContactChatId(number: string) {
    return `${number}@c.us`;
  }

  async getChatId({ type, number }: { type: ContactType; number: string }) {
    switch (type) {
      case "individual":
        return this.getContactChatId(number);
      case "group":
        return this.getGroupChatId(number);
    }
  }

  async getChatIds(
    contacts: { type: ContactType; number: string }[]
  ): Promise<Awaited<string>[]> {
    return Promise.all(contacts.map(this.getChatId));
  }

  async sendMessage(messagePayload: WhatsappMessagePayload) {
    const { to, message } = messagePayload;
    const { text, type, image } = message;
    const chatIds = compact(await this.getChatIds(to));

    if (isEmpty(chatIds)) {
      throw `Error sending message. Could not get chat id`;
    }

    switch (type) {
      case "image":
        return Promise.all(
          chatIds.map((chatId) => this.sendImageMessage(chatId, image, text))
        );
      case "chat":
        if (!text) {
          throw `Please specify text to send`;
        }
        return Promise.all(
          chatIds.map((chatId) => this.sendTextMessage(chatId, text))
        );
      default:
        throw `Sending ${type}  messages is currently not supported`;
    }
  }

  protected async sendImageMessage(
    chatId: string,
    imagePath: string,
    caption?: string
  ) {
    // TODO add support for base64
    return this.client.sendImage(`${chatId}`, imagePath, undefined, caption);
  }

  protected async sendTextMessage(chatId: string, message: string) {
    // TODO add text reply ability
    return this.client.sendText(`${chatId}`, message);
  }

  private async handleReceivedMessages(
    messagePayload: WhatsappMessageResponse
  ): Promise<any> {
    // Sending the received message to the handler gateway
    const inboxGateway = process.env.WHATSAPP_MESSAGE_HANDLER_GATEWAY;

    if (inboxGateway) {
      return await axios
        .post(inboxGateway, messagePayload)
        .then(({ data }) => {
          return data;
        })
        .catch((error) => {
          throw error;
        });
    } else {
      throw new Error("WhatsApp message handler gateway not found!");
    }
  }

  private sanitizeReceivedMessage(
    messagePayload: any
  ): WhatsappMessageResponse {
    const {
      id,
      type,
      body,
      notifyName,
      caption,
      isForwarded,
      from,
      author,
      isGroupMsg: isGroupMessage,
    } = messagePayload;

    const sanitizedWhatsappPayload: WhatsappMessageResponse = {
      from: {
        type: isGroupMessage ? "group" : "individual",
        number: this.decodeNumberFromWhatsappId(from),
        author: isGroupMessage
          ? this.decodeNumberFromWhatsappId(author)
          : this.decodeNumberFromWhatsappId(from),
        name: notifyName,
      },
      message: {
        id,
        type,
        text: type === "chat" ? body : caption ?? null,
        image: type === "image" ? body : null,
        file: ["document", "audio", "video"].includes(type) ? body : null,
      },
      isForwarded,
    };

    return sanitizedWhatsappPayload;
  }

  private decodeNumberFromWhatsappId(wid: string): string {
    return (wid ?? "").split("@")[0];
  }

  private async sendDefaultErrorReplyMessage(destination: any): Promise<void> {
    var defaultErrorReplyMessage: WhatsappMessagePayload = {
      to: [
        {
          number: destination.number ?? "",
          type: destination.type ?? "individual",
        },
      ],
      message: {
        type: "chat",
        text: "Something went wrong. Try again later!",
      },
    };
    await this.sendMessage(defaultErrorReplyMessage);
  }

  private async sendReplyMessage(
    sanitizedMessage,
    replyPayload
  ): Promise<void> {
    const { value, warning, error } =
      messagePayloadSchema.validate(replyPayload);
    try {
      if (error) {
        console.error(error);
        const { from } = sanitizedMessage;
        await this.sendDefaultErrorReplyMessage(from);
        return;
      }
      if (warning) {
        console.warn(warning);
      }
      console.info(`Data captured: ${JSON.stringify(value)}`);
      await this.sendMessage(value);
    } catch (error) {
      console.error(error);
    }
  }
}

export default new WhatsappService();
