export interface ExtensionStatus {
  enabled: boolean;
  domain?: string ;
  ethAddress?: string;
  price?: string;
  decimals?: number;
  currency?: string;
}

export interface RecentChat {
  domain: string;
  ethAddress: string;
   price?: string;
  decimals?: number;
  currency?: string;
  timestamp: number;
}

export interface ChromeMessage {
  action: string;
  domain?: string;
  ethAddress?: string;
    price?: string;
  decimals?: number;
  currency?: string;
}

export interface ChromeResponse {
  success?: boolean;
  enabled?: boolean;
  domain?: string;
  ethAddress?: string;
    price?: string;
  decimals?: number;
  currency?: string;
  recentChats?: RecentChat[];
  blacklistedDomains?: string[];
  error?: string;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  message: string;
  type: NotificationType;
}