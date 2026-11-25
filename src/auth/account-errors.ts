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

const signupRateLimitMessage = 'Too many requests. Wait a little before trying again.';

export function signUpProblem(error: AuthError) {
  if (error.status === 429) return signupRateLimitMessage;
  if (error.status === 403 && error.message === 'Enter a valid date of birth and confirm you are at least 18 to create an account.') {
    return error.message;
  }
  switch (error.code) {
    case 'weak_password':
      return 'Choose a longer password that is harder to guess.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return signupRateLimitMessage;
    case 'email_address_invalid':
      return 'Check your email address and try again.';
    default:
      return 'Could not create your account. Try again in a moment.';
  }
}
