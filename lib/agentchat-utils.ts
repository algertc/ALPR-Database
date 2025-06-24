export interface ChatMessage {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  isError?: boolean;
  structured?: StructuredData;
  agentId?: string;
  agentTitle?: string;
}

export interface StructuredData {
  type:
    | "chart"
    | "known_plates"
    | "table"
    | "metrics"
    | "timeline"
    | "alerts"
    | "images";
  data: any;
  title?: string;
  description?: string;
}

export interface Agent {
  id: string;
  title: string;
  description?: string;
  url: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSession {
  messages: ChatMessage[];
  selectedAgent?: string;
  lastActivity: Date;
}

// Utility Functions
export function formatTimestamp(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateMessageId(): number {
  return Date.now();
}

export function createUserMessage(text: string): ChatMessage {
  return {
    id: generateMessageId(),
    text: text.trim(),
    sender: "user",
    timestamp: new Date(),
  };
}

export function createAIMessage(
  text: string,
  agentId?: string,
  agentTitle?: string,
  structured?: StructuredData,
  isError: boolean = false
): ChatMessage {
  return {
    id: generateMessageId(),
    text,
    sender: "ai",
    timestamp: new Date(),
    isError,
    structured,
    agentId,
    agentTitle,
  };
}
