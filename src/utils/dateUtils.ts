export function utcDateToLocalDate(utcDateString: string, locale: string = 'en-CA'): string {
  // Ensure we parse the UTC date string in a timezone-agnostic way by appending Z
  const utcDate = new Date(`${utcDateString}T00:00:00Z`);
  return utcDate.toLocaleDateString(locale);
}

export function getTodayLocalDate(locale: string = 'en-CA'): string {
  return new Date().toLocaleDateString(locale);
}

export function isUtcDateLocalToday(utcDateString: string, locale: string = 'en-CA'): boolean {
  return utcDateToLocalDate(utcDateString, locale) === getTodayLocalDate(locale);
}
