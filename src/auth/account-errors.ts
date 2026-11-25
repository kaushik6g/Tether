import type { AuthError } from '@supabase/supabase-js';

export function signInProblem(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Check your email and password, then try again.';
    case 'email_not_confirmed':
      return 'Confirm your email using the link we sent you, then try signing in again.';
    case 'over_request_rate_limit':
      return 'Too many attempts. Wait a little before signing in again.';
    default:
      return 'Could not sign in. Try again in a moment.';
  }
}
