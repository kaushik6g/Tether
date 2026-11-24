export const matchPushAvailable = false;
export const matchPushEnabled: (userId: string) => Promise<boolean> = async () => false;
export const enableMatchPush: (userId: string) => Promise<void> = async () => {
  throw new Error('Match notifications are available in the mobile app.');
};
export const disableMatchPush: (userId: string) => Promise<void> = async () => {};
export const syncMatchPush: (userId: string, devicePushToken?: unknown) => Promise<void> = async () => {};
