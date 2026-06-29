export const Events = {
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  VPS_CREATED: 'vps.created',
  VPS_DELETED: 'vps.deleted',
  VPS_STATUS_CHANGED: 'vps.status_changed',
  INVOICE_PAID: 'invoice.paid',
  WHATSAPP_MESSAGE: 'whatsapp.message',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  CRM_LEAD_CREATED: 'crm.lead.created',
  CRM_DEAL_WON: 'crm.deal.won',
  NOTIFICATION_SENT: 'notification.sent',
  AUDIT_LOG_CREATED: 'audit.log.created',
} as const;

export const Queues = {
  EMAIL_QUEUE: 'email_queue',
  NOTIFICATION_QUEUE: 'notification_queue',
  WHATSAPP_QUEUE: 'whatsapp_queue',
  AUDIT_QUEUE: 'audit_queue',
  ANALYTICS_QUEUE: 'analytics_queue',
  BILLING_QUEUE: 'billing_queue',
} as const;

export type VoidCloudEvent = (typeof Events)[keyof typeof Events];
export type VoidCloudQueue = (typeof Queues)[keyof typeof Queues];
