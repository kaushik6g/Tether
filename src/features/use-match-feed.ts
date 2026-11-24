import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

export function useMatchFeed<T>(channelId: string, matchId: string | undefined, load: () => Promise<T>, observePlans = false) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState(false);
  const refresh = useRef(() => {});

  useFocusEffect(useCallback(() => {
    const client = supabase;
    let active = true;
    let sequence = 0;
    function refreshNow() {
      const current = ++sequence;
      void load().then((value) => {
        if (active && sequence === current) { setData(value); setError(false); }
      }).catch(() => {
        if (active && sequence === current) setError(true);
      });
    }

    refresh.current = refreshNow;
    refreshNow();
    const channel = client?.channel(channelId).on('postgres_changes', {
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
      if (client && channel) void client.removeChannel(channel);
    };
  }, [channelId, matchId, load, observePlans]));

  return { data, error, reload: () => refresh.current() };
}
