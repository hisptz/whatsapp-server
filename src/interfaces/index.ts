export type ContactType = "individual" | "group";
export type MessageType =
  | "image"
  | "chat"
  | "document"
  | "video"
  | "ciphertext";

export interface GroupIdentifier {
  id: string;
  name: string;
}
export interface WhatsappMessagePayload {
  to: {
    type: ContactType;
    number: string;
  }[];
  message: BaseWhatsappMessage;
}

export interface WhatsappMessageResponse {
  from: {
    type: ContactType;
    number: string;
    author?: string;
    name?: string;
  };
  message: BaseWhatsappMessage;
  isForwarded: boolean;
}

export interface BaseWhatsappMessage {
  type: MessageType;
  id?: string;
  text?: string;
  image?: any;
  file?: any;
}

export interface SendMessageOptions {
  quotedMsg?: string;
}
