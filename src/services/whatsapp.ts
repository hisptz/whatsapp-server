import { create, CreateOptions, Whatsapp } from "@wppconnect-team/wppconnect";
import { ContactType, GroupIdentifier, WhatsappMessage } from "../interfaces";
import { compact, find, isEmpty, map } from "lodash";

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
    //  TODO add message listener
    this.whatsapp = await create({
      session: this.session,
      ...(this.options ?? {}),
    });
    return true;
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

  async sendMessage(message: WhatsappMessage) {
    const { text, to, type, image } = message;
    const chatIds = compact(await this.getChatIds(to));

    if (isEmpty(chatIds)) {
      throw `Error sending message. Could not get chat id`;
    }

    switch (type) {
      case "image":
        return Promise.all(
          chatIds.map((chatId) => this.sendImageMessage(chatId, image, text))
        );
      case "text":
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
    return this.client.sendImage(`${chatId}`, imagePath, undefined, caption);
  }

  protected async sendTextMessage(chatId: string, message: string) {
    return this.client.sendText(`${chatId}`, message);
  }
}

export default new WhatsappService();
