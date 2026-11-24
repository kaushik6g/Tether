import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

let nextSubscription = 0;

export function useMatchFeed<T>(channelId: string, matchId: string | undefined, load: () => Promise<T>, observePlans = false) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState(false);
  const refresh = useRef(() => {});

  useFocusEffect(useCallback(() => {
    const client = supabase;
    let active = true;
    let running = false;
    let pending = false;

    function refreshNow() {
      if (!active) return;
      if (running) {
        pending = true;
        return;
      }

      running = true;
      void load().then((value) => {
        if (active) { setData(value); setError(false); }
      }).catch(() => {
        if (active) setError(true);
      }).finally(() => {
        running = false;
        if (pending) {
          pending = false;
          refreshNow();
        }
      });
    }

    refresh.current = refreshNow;
    refreshNow();
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNow();
    });

    // Focus can return while the previous channel is still leaving.
    const topic = channelId + ':' + ++nextSubscription;
    const channel = client?.channel(topic).on('postgres_changes', {
      event: '*', schema: 'public', table: 'matches', ...(matchId && { filter: 'id=eq.' + matchId }),
    }, refreshNow);

    if (matchId) {
      channel?.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: 'match_id=eq.' + matchId,
      }, refreshNow);
    }
    if (observePlans) {
      const planFilter = { schema: 'public', table: 'catchup_plans', ...(matchId && { filter: 'match_id=eq.' + matchId }) };
      channel?.on('postgres_changes', { event: 'INSERT', ...planFilter }, refreshNow)
        .on('postgres_changes', { event: 'UPDATE', ...planFilter }, refreshNow);
    }
    channel?.subscribe((status) => {
      if (status === 'SUBSCRIBED') refreshNow();
    });

    return () => {
      active = false;
      refresh.current = () => {};
      foreground.remove();
      if (client && channel) void client.removeChannel(channel);
    };
  }, [channelId, matchId, load, observePlans]));

  return { data, error, reload: () => refresh.current() };
}
