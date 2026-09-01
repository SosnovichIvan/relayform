export type DestinationProvider = 'telegram' | 'vk' | 'max' | 'email';
export type Destination = { id: string; formId: string; provider: DestinationProvider; recipient: string; status: 'pendingActivation' | 'active' };
