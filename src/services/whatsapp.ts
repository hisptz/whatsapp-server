import {create, CreateOptions, Whatsapp} from "@wppconnect-team/wppconnect";
import {compact, isEmpty, map} from "lodash";
import axios from "axios";
import {uid} from "@hisptz/dhis2-utils";
import {
		ContactType,
		GroupIdentifier,
		SendMessageOptions,
		WhatsappMessagePayload,
		WhatsappMessageResponse,
} from "../interfaces";
import {messagePayloadSchema} from "../schema";

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
								puppeteerOptions: {
										headless: "new",
										args: ["--no-sandbox", "--disable-setuid-sandbox"],
								},
						});

						// WhatsApp message listener
						this.whatsapp?.onMessage(async (whatsappMessage) => {
								// add sanitization of the send message
								const sanitizedMessage: WhatsappMessageResponse =
										this.sanitizeReceivedMessage(whatsappMessage);
								try {
										const {message, from} = sanitizedMessage;

										let whitelistedPhoneNumbers = [];
										try {
												whitelistedPhoneNumbers = JSON.parse(`${process.env.ALLOWED_CONTACTS}` ?? '[]') || []
										} catch (e) {
												console.warn(`An invalid whitelisting configuration detected. Fix the environment variable. Ignoring the whitelist...`);
										}

										const sanitizedPhoneNumber = from.number.replace(/@c.us|@g.us/, "");
										if (!isEmpty(whitelistedPhoneNumbers) && !whitelistedPhoneNumbers.includes(sanitizedPhoneNumber)) {
												console.info(`Message from: ${sanitizedPhoneNumber}, Not a whitelisted number. Ignoring`)
												return;
										}

										if (message.type.toLowerCase() !== "chat") {
												console.info(`Received message of type ${message.type} but only type chat is supported. Ignoring...`)
												// For ignoring the initial cipher texts
												return;
										}
										const replyPayload = await this.handleReceivedMessages(
												sanitizedMessage
										);

										// send the reply message
										if (replyPayload) {
												await this.sendReplyMessage(sanitizedMessage, replyPayload);
										}
								} catch (error) {
										console.error(error);
										const {from} = sanitizedMessage;
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
						const groups = await this.client.listChats({onlyGroups: true});
						return map(groups, (group) => ({
								id: group.id._serialized,
								name: group.name ?? (group.groupMetadata as any)?.subject
						}));
				} catch (error) {
						throw error;
				}
		}

		getContactChatId(number: string): string {
				return number.includes("@c.us") ? number : `${number}@c.us`;
		}

		async isConnetionOnline(): Promise<boolean> {
				return this.whatsapp?.isAuthenticated();
		}

		getGroupChatId(number: string): string {
				return number.includes("@g.us") ? number : `${number}@g.us`;
		}

		async getChatId({type, number}: { type: ContactType; number: string }) {
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
				const {to, message} = messagePayload;
				const {text, type, image, id: quotedMsg} = message;
				const chatIds = compact(await this.getChatIds(to));

				if (isEmpty(chatIds)) {
						throw `Error sending message. Could not get chat id`;
				}

				switch (type) {
						case "image":
								return Promise.all(
										chatIds.map((chatId) =>
												this.sendImageMessage(chatId, image, text, quotedMsg)
										)
								);
						case "chat":
								if (!text) {
										throw `Please specify text to send`;
								}
								return Promise.all(
										chatIds.map((chatId) =>
												this.sendTextMessage(chatId, text, {quotedMsg})
										)
								);
						case "document":
								return Promise.all(
										chatIds.map((chatId) =>
												this.sendFileMessage(chatId, image, text, quotedMsg)
										)
								);
						case "video":
								return Promise.all(
										chatIds.map((chatId) =>
												this.sendVideoMessage(chatId, image, text, quotedMsg)
										)
								);
						default:
								throw `Sending ${type}  messages is currently not supported`;
				}
		}

		protected async sendImageMessage(
				chatId: string,
				imagePath: string,
				caption?: string,
				quotedMessageId?: string
		) {
				const randomFileName = uid();
				return this.client.sendImageFromBase64(
						`${chatId}`,
						imagePath,
						randomFileName,
						caption,
						quotedMessageId
				);
		}

		protected async sendVideoMessage(
				chatId: string,
				imagePath: string,
				caption?: string,
				quotedMessageId?: string
		) {
				const randomFileName = uid();
				return this.client.sendVideoAsGifFromBase64(
						`${chatId}`,
						imagePath,
						randomFileName,
						caption,
						quotedMessageId
				);
		}

		protected async sendFileMessage(
				chatId: string,
				imagePath: string,
				caption?: string,
				quotedMessageId?: string
		) {
				const filename = uid();
				return this.client.sendFile(`${chatId}`, imagePath, {
						caption,
						filename,
						quotedMsg: quotedMessageId,
				});
		}

		protected async sendTextMessage(
				chatId: string,
				message: string,
				options?: SendMessageOptions
		) {
				return this.client.sendText(`${chatId}`, message, options);
		}

		private async handleReceivedMessages(
				messagePayload: WhatsappMessageResponse
		): Promise<any> {
				// Sending the received message to the handler gateway
				const inboxGateway = process.env.WHATSAPP_MESSAGE_HANDLER_GATEWAY;
				const apiKey = process.env.WHATSAPP_MESSAGE_HANDLER_API_KEY;

				// to handle inbox gateway key
				const config = apiKey
						? {
								headers: {
										"x-api-key": apiKey,
								},
						}
						: {};

				if (inboxGateway) {
						return await axios
								.post(inboxGateway, messagePayload, config)
								.then(({data}) => {
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

				let sanitizedWhatsappPayload: WhatsappMessageResponse = {
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
				const defaultErrorReplyMessage: WhatsappMessagePayload = {
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
				sanitizedMessage: WhatsappMessageResponse,
				replyPayload: any
		): Promise<void> {
				const {value, warning, error} =
						messagePayloadSchema.validate(replyPayload);
				try {
						if (error) {
								console.error(error);
								const {from} = sanitizedMessage;
								await this.sendDefaultErrorReplyMessage(from);
								return;
						}
						if (warning) {
								console.warn(warning);
						}
						await this.sendMessage(value);
				} catch (error) {
						console.error(error);
				}
		}
}

export default new WhatsappService();
