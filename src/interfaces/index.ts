export type ContactType = "individual" | "group";
export type MessageType = "image" | "chat" | "document" | "audio" | "video";

export interface GroupIdentifier {
  id: string;
  name: string;
}
export interface WhatsappMessagePayload extends BaseWhatsappMessage {
  to: {
    type: ContactType;
    number: string;
  }[];
}

export interface WhatsappMessageResponse extends BaseWhatsappMessage {
  from: {
    type: ContactType;
    number: string;
    author?: string;
    name?: string;
  };
  isForwarded: boolean;
}

export interface BaseWhatsappMessage {
  type: MessageType;
  text?: string;
  image?: any;
  file?: any;
}
