import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSession } from '@/auth/session';
import { forgetInvite, readInvite } from '@/auth/pending-invite';

export function InviteAfterAuth() {
  const { session } = useSession();
  const email = session?.user.email;
  const ready = !!useRootNavigationState()?.key;
  const router = useRouter();
  const lastOpened = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !email) {
      lastOpened.current = null;
      return;
    }
    let active = true;

    void readInvite(email).then((invite) => {
      if (!active || !invite || lastOpened.current === invite.token) return;
      lastOpened.current = invite.token;
      router.replace({ pathname: '/invite/[token]', params: { token: invite.token } });
      void forgetInvite(invite).catch(() => {});
    }).catch(() => {
      // The original invitation URL can still be opened directly.
    });

    return () => { active = false; };
  }, [email, ready, router]);

  return null;
}
