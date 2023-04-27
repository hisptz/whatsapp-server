export type ContactType = "individual" | "group";
export type MessageType = "image" | "text" | "file";

export interface WhatsappMessagePayload {
  to: {
    type: ContactType;
    number: string;
  }[];
  type: MessageType;
  text?: string;
  image?: any;
  file?: any;
}

export interface WhatsappMessageResponse {
  id: string;
  type: string;
  body: string;
  caption?: string;
  isForwarded: boolean;
  from: string;
  author?: string;
  sender: WhatsappSender;
  isGroupMessage: boolean;
}

export interface WhatsappSender {
  id: string;
  name: string;
}

export interface GroupIdentifier {
  id: string;
  name: string;
}
