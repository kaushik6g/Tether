export const matchPushAvailable = false;

export async function matchPushEnabled(_userId: string): Promise<boolean> {
  return false;
}

export async function enableMatchPush(_userId: string): Promise<void> {
  throw new Error('Match notifications are available in the mobile app.');
}

export async function disableMatchPush(_userId: string): Promise<void> {}

export async function syncMatchPush(_userId: string, _devicePushToken?: unknown): Promise<void> {}
