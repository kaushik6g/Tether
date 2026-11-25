export const minimumSignupAge = 18;
export const signupAgeMessage = 'You must be at least ' + minimumSignupAge + ' to create a Tether account.';

export function normalizeBirthDate(input: string): string {
  return input.trim().replace(/^(\d{2})-(\d{2})-(\d{4})$/, '$3-$2-$1');
}

export function signupAgeProblem(dateOfBirth: string, today = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizeBirthDate(dateOfBirth));
  const invalid = 'Enter a valid date of birth in DD-MM-YYYY or YYYY-MM-DD format.';
  if (!match) return invalid;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(0);
  birth.setUTCFullYear(year, month - 1, day);
  if (year < 1 || birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) {
    return invalid;
  }

  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();
  const birthdayPassed = currentMonth > month || (currentMonth === month && currentDay >= day);
  const age = today.getUTCFullYear() - year - (birthdayPassed ? 0 : 1);
  if (age < 0) return 'Enter a date of birth in the past.';
  return age < minimumSignupAge ? signupAgeMessage : null;
}
