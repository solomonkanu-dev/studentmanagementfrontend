import { apiClient } from './client';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface NotificationToggles {
  feePayment: boolean;
  resultsPublished: boolean;
  announcement: boolean;
  assignmentPosted: boolean;
  attendanceAlert: boolean;
}

export interface NotificationSettings {
  smtp: SmtpConfig;
  enabled: NotificationToggles;
}

export interface EmailLogEntry {
  _id: string;
  recipientEmail: string;
  type: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: string;
  recipientUser?: { fullName: string };
}

export interface SmsLogEntry {
  _id: string;
  recipientPhone: string;
  type: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: string;
  recipientUser?: { fullName: string };
}

export const notificationSettingsApi = {
  getSettings: async (): Promise<NotificationSettings> => {
    const { data } = await apiClient.get('/admin/notification-settings');
    return data.data ?? data;
  },

  updateSettings: async (
    payload: Partial<{ smtp: Partial<SmtpConfig>; enabled: Partial<NotificationToggles> }>
  ): Promise<NotificationSettings> => {
    const { data } = await apiClient.patch('/admin/notification-settings', payload);
    return data.data ?? data;
  },

  sendTestEmail: async (testEmail: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/admin/notification-settings/test-email', { testEmail });
    return data;
  },

  sendTestSms: async (testPhone: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/admin/notification-settings/test-sms', { testPhone });
    return data;
  },

  getLogs: async (page = 1): Promise<{ logs: EmailLogEntry[]; total: number; pages: number }> => {
    const { data } = await apiClient.get(`/admin/notification-settings/logs?page=${page}`);
    return data;
  },

  getSmsLogs: async (page = 1): Promise<{ logs: SmsLogEntry[]; total: number; pages: number }> => {
    const { data } = await apiClient.get(`/admin/notification-settings/sms-logs?page=${page}`);
    return data;
  },
};
