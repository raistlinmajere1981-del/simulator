export const MIN_UTC_OFFSET_MINUTES = -12 * 60;
export const MAX_UTC_OFFSET_MINUTES = 14 * 60;

export class CelestialTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CelestialTimeError';
  }
}

function assertOffset(offsetMinutes: number): void {
  if (!Number.isFinite(offsetMinutes) ||
    offsetMinutes < MIN_UTC_OFFSET_MINUTES ||
    offsetMinutes > MAX_UTC_OFFSET_MINUTES) {
    throw new CelestialTimeError('UTC ofseti -12:00 ile +14:00 arasında olmalıdır.');
  }
}

export function systemUtcOffsetMinutes(date = new Date()): number {
  return -date.getTimezoneOffset();
}

export function formatUtcOffset(offsetMinutes: number): string {
  assertOffset(offsetMinutes);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(Math.round(offsetMinutes));
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function localDateTimeValueFromInstant(
  observedAtIso: string,
  offsetMinutes: number
): string {
  assertOffset(offsetMinutes);
  const instant = new Date(observedAtIso);
  if (Number.isNaN(instant.getTime())) {
    throw new CelestialTimeError('Gözlem zamanı geçerli bir ISO-8601 zamanı olmalıdır.');
  }
  const shifted = new Date(instant.getTime() + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 19);
}

export function formatLocalDateTime24(
  observedAtIso: string,
  offsetMinutes: number
): string {
  const localValue = localDateTimeValueFromInstant(observedAtIso, offsetMinutes);
  const year = localValue.slice(0, 4);
  const month = localValue.slice(5, 7);
  const day = localValue.slice(8, 10);
  const time = localValue.slice(11, 19);
  return `${day}.${month}.${year} · ${time}`;
}

export function instantIsoFromLocalDateTime(
  localDateTime: string,
  offsetMinutes: number
): string {
  assertOffset(offsetMinutes);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localDateTime.trim());
  if (!match) {
    throw new CelestialTimeError('Yerel tarih/saat YYYY-AA-GG SS:dd biçiminde olmalıdır.');
  }
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw = '0'] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    throw new CelestialTimeError('Yerel tarih/saat bileşenleri geçerli aralıkta olmalıdır.');
  }
  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const verification = new Date(localAsUtcMs);
  if (verification.getUTCFullYear() !== year ||
    verification.getUTCMonth() !== month - 1 ||
    verification.getUTCDate() !== day ||
    verification.getUTCHours() !== hour ||
    verification.getUTCMinutes() !== minute ||
    verification.getUTCSeconds() !== second) {
    throw new CelestialTimeError('Yerel tarih/saat takvimde geçerli bir an olmalıdır.');
  }
  return new Date(localAsUtcMs - offsetMinutes * 60_000).toISOString();
}
