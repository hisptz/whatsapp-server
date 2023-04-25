export type ContactType = "individual" | "group";
export type MessageType = "image" | "text" | "file";

export interface WhatsappMessage {
  to: {
    type: ContactType;
    number: string;
  }[];
  type: MessageType;
  text?: string;
  image?: any;
  file?: any;
}

export interface GroupIdentifier {
  id: string;
  name: string;
}
