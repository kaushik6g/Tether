import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { supabase } from '@/lib/supabase';

const SessionContext = createContext<{ session: Session | null; ready: boolean }>({
  session: null,
  ready: false,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    const auth = supabase?.auth;
    if (!auth) return;

    const { data: { subscription } } = auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setReady(true);
    });

    function refreshWhileActive(state: AppStateStatus) {
      if (state === 'active') void auth?.startAutoRefresh();
      else void auth?.stopAutoRefresh();
    }

    const native = Platform.OS !== 'web';
    const lifecycle = native ? AppState.addEventListener('change', refreshWhileActive) : undefined;
    if (native) refreshWhileActive(AppState.currentState);

    return () => {
      subscription.unsubscribe();
      lifecycle?.remove();
      if (native) void auth.stopAutoRefresh();
    };
  }, []);

  return <SessionContext.Provider value={{ session, ready }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
