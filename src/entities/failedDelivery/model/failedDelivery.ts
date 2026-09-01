export type FailedDeliveryProvider = 'telegram' | 'vk' | 'max' | 'email';

export type FailedDelivery = {
  id: string;
  formId: string;
  provider: FailedDeliveryProvider;
  failureCode: string;
  isRetryable: boolean;
  failedAt: string;
};
