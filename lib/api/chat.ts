import { apiClient } from "./client";

export interface ChatContact {
  _id: string;
  fullName: string;
  role: string;
  profilePhoto?: string;
  email: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: { _id: string; fullName: string; role: string; profilePhoto?: string };
  content: string;
  readBy: string[];
  createdAt: string;
}

export interface ChatConversation {
  _id: string;
  type: "direct" | "group";
  name?: string;
  participants: ChatContact[];
  createdBy?: string;
  lastMessage?: { _id: string; content: string; sender: { fullName: string }; createdAt: string };
  lastMessageAt?: string;
  updatedAt: string;
}

const BASE = "/chat";

export const chatApi = {
  getContacts: async (): Promise<ChatContact[]> => {
    const { data } = await apiClient.get(`${BASE}/contacts`);
    return data.data ?? data;
  },

  getConversations: async (): Promise<ChatConversation[]> => {
    const { data } = await apiClient.get(`${BASE}/conversations`);
    return data.data ?? data;
  },

  getOrCreateConversation: async (targetUserId: string): Promise<ChatConversation> => {
    const { data } = await apiClient.post(`${BASE}/conversations`, { targetUserId });
    return data.data ?? data;
  },

  createGroupConversation: async (name: string, participantIds: string[]): Promise<ChatConversation> => {
    const { data } = await apiClient.post(`${BASE}/conversations/group`, { name, participantIds });
    return data.data ?? data;
  },

  getMessages: async (
    conversationId: string,
    limit = 50,
    before?: string
  ): Promise<ChatMessage[]> => {
    const params: Record<string, unknown> = { limit };
    if (before) params.before = before;
    const { data } = await apiClient.get(`${BASE}/conversations/${conversationId}/messages`, {
      params,
    });
    return data.data ?? data;
  },

  sendMessage: async (conversationId: string, content: string): Promise<ChatMessage> => {
    const { data } = await apiClient.post(`${BASE}/conversations/${conversationId}/messages`, {
      content,
    });
    return data.data ?? data;
  },

  markRead: async (conversationId: string): Promise<void> => {
    await apiClient.patch(`${BASE}/conversations/${conversationId}/read`);
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get(`${BASE}/unread-count`);
    return (data.data ?? data)?.count ?? 0;
  },
};
