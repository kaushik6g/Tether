import { useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { matchPushAvailable, syncMatchPush } from '@/features/match-push';

const matchIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function MatchNotificationListener({ userId }: { userId: string | undefined }) {
  const router = useRouter();
  const ready = !!useRootNavigationState()?.key;
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!userId || !matchPushAvailable) return;

    function sync(devicePushToken?: Notifications.DevicePushToken) {
      if (userId) void syncMatchPush(userId, devicePushToken).catch(() => {});
    }
    sync();
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const rotation = Notifications.addPushTokenListener(sync);
    return () => { foreground.remove(); rotation.remove(); };
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId || !response) return;
    const matchId = response.notification.request.content.data.matchId;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
      typeof matchId !== 'string' || !matchIdPattern.test(matchId)) return;

    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    router.push({ pathname: '/chat/[id]', params: { id: matchId } });
  }, [ready, response, router, userId]);

  return null;
}
