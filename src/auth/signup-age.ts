export const minimumSignupAge = 18;
export const signupAgeMessage = 'You must be at least ' + minimumSignupAge + ' to create a Tether account.';

export function signupAgeProblem(dateOfBirth: string, today = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  const invalid = 'Enter a valid date of birth in YYYY-MM-DD format.';
  if (!match) return invalid;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(0);
  birth.setUTCFullYear(year, month - 1, day);
  if (year < 1 || birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) {
    return invalid;
  }

  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const birthdayPassed = currentMonth > month || (currentMonth === month && currentDay >= day);
  const age = today.getFullYear() - year - (birthdayPassed ? 0 : 1);
  if (age < 0) return 'Enter a date of birth in the past.';
  return age < minimumSignupAge ? signupAgeMessage : null;
}
