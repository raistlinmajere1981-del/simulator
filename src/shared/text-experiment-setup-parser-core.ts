import type {
  ExperimentSetupCandidate,
  ExperimentSetupCandidateStatus,
  ExperimentSetupFieldId
} from './text-experiment-setup-types';

export const NUM = String.raw`[-+]?\d+(?:[.,]\d+)?`;
export const LENGTH_UNIT = String.raw`(?:km|kilometre|kilometreler|m|metre|metreler|cm|santimetre)`;

export interface RawCandidate extends Omit<ExperimentSetupCandidate, 'id'> {}

export function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/[–—]/g, '-');
}

export function parseNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

export function normalizedUnit(unit: string): 'km' | 'm' | 'cm' | undefined {
  const lower = unit.toLocaleLowerCase('tr-TR');
  if (lower === 'km' || lower.startsWith('kilometre')) return 'km';
  if (lower === 'm' || lower.startsWith('metre')) return 'm';
  if (lower === 'cm' || lower.startsWith('santimetre')) return 'cm';
  return undefined;
}

export function lengthToMetres(value: number, unit: string): number | undefined {
  const normalized = normalizedUnit(unit);
  if (normalized === 'km') return value * 1_000;
  if (normalized === 'm') return value;
  if (normalized === 'cm') return value / 100;
  return undefined;
}

export function trNumber(value: number, max = 4): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: max }).format(value);
}

export function excerpt(match: RegExpExecArray): string {
  return match[0].trim().replace(/\s+/g, ' ');
}

export function addNumberMatches(
  target: RawCandidate[],
  text: string,
  options: {
    fieldId: ExperimentSetupFieldId;
    label: string;
    regex: RegExp;
    convert(value: number, unit?: string): number | undefined;
    display(value: number): string;
    validate(value: number): boolean;
    missingUnitReason?: string;
  }
): void {
  for (const match of text.matchAll(options.regex)) {
    const rawNumber = match.groups?.value;
    if (!rawNumber) continue;
    const parsed = parseNumber(rawNumber);
    if (!Number.isFinite(parsed)) continue;
    const rawUnit = match.groups?.unit;
    if (options.missingUnitReason && !rawUnit) {
      target.push({
        fieldId: options.fieldId,
        label: options.label,
        status: 'review',
        displayValue: trNumber(parsed),
        sourceExcerpt: excerpt(match as RegExpExecArray),
        reason: options.missingUnitReason
      });
      continue;
    }
    const converted = options.convert(parsed, rawUnit);
    if (converted === undefined || !options.validate(converted)) {
      target.push({
        fieldId: options.fieldId,
        label: options.label,
        status: 'review',
        displayValue: rawUnit ? `${trNumber(parsed)} ${rawUnit}` : trNumber(parsed),
        sourceExcerpt: excerpt(match as RegExpExecArray),
        reason: 'Değer desteklenen aralığın dışında veya birimi tanınmıyor.'
      });
      continue;
    }
    target.push({
      fieldId: options.fieldId,
      label: options.label,
      status: 'found',
      displayValue: options.display(converted),
      sourceExcerpt: excerpt(match as RegExpExecArray),
      numericValue: converted
    });
  }
}

export function collapseConflicts(raw: RawCandidate[]): ExperimentSetupCandidate[] {
  const byField = new Map<ExperimentSetupFieldId, RawCandidate[]>();
  for (const candidate of raw) {
    const list = byField.get(candidate.fieldId) ?? [];
    list.push(candidate);
    byField.set(candidate.fieldId, list);
  }

  const collapsed: ExperimentSetupCandidate[] = [];
  let sequence = 0;
  for (const [fieldId, candidates] of byField) {
    const found = candidates.filter((candidate) => candidate.status === 'found');
    const review = candidates.filter((candidate) => candidate.status === 'review');
    const signatures = new Set(found.map((candidate) =>
      candidate.numericValue !== undefined
        ? `n:${candidate.numericValue}`
        : candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined
          ? `c:${candidate.latitudeDeg},${candidate.longitudeDeg}`
          : `s:${candidate.stringValue ?? candidate.displayValue}`
    ));
    if (signatures.size > 1 || (found.length > 0 && review.length > 0)) {
      collapsed.push({
        id: `${fieldId}-${sequence++}`,
        fieldId,
        label: candidates[0]?.label ?? fieldId,
        status: 'review',
        displayValue: candidates.map((candidate) => candidate.displayValue).join(' / '),
        sourceExcerpt: candidates.map((candidate) => candidate.sourceExcerpt).join(' | '),
        reason: signatures.size > 1
          ? 'Aynı alan için birbiriyle çelişen birden fazla değer bulundu.'
          : 'Aynı alan için hem birimli hem de eksik/şüpheli bir ifade bulundu; kullanıcı kontrolü gerekli.'
      });
      continue;
    }
    const best = found[0] ?? review[0] ?? candidates[0];
    if (best) collapsed.push({ ...best, id: `${fieldId}-${sequence++}` });
  }
  return collapsed;
}

export function addKeywordCandidate(
  target: RawCandidate[],
  fieldId: ExperimentSetupFieldId,
  label: string,
  sourceExcerpt: string,
  displayValue: string,
  stringValue: string,
  status: ExperimentSetupCandidateStatus = 'found',
  reason?: string
): void {
  target.push({
    fieldId,
    label,
    status,
    displayValue,
    sourceExcerpt,
    stringValue,
    ...(reason ? { reason } : {})
  });
}

export function parseCoordinatePair(
  target: RawCandidate[],
  text: string,
  role: 'gözlemci' | 'hedef',
  fieldId: 'observerCoordinates' | 'targetCoordinates',
  label: string
): void {
  const pair = new RegExp(
    String.raw`${role}\s+koordinat(?:ı|ları)?\s*[:=]?\s*(?<lat>${NUM})\s*[,;/]\s*(?<lon>${NUM})(?!\s*(?:m|km|cm))`,
    'giu'
  );
  for (const match of text.matchAll(pair)) {
    const lat = parseNumber(match.groups?.lat ?? '');
    const lon = parseNumber(match.groups?.lon ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const valid = lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    target.push({
      fieldId,
      label,
      status: valid ? 'found' : 'review',
      displayValue: `${trNumber(lat, 6)}°, ${trNumber(lon, 6)}°`,
      sourceExcerpt: excerpt(match as RegExpExecArray),
      ...(valid ? { latitudeDeg: lat, longitudeDeg: lon } : {}),
      ...(!valid ? { reason: 'Enlem/boylam desteklenen aralığın dışında.' } : {})
    });
  }

  const directional = new RegExp(
    String.raw`${role}[^\n.!?]{0,35}?(?<lat>${NUM})\s*°?\s*(?<ns>[NKG])[^\n.!?]{0,20}?(?<lon>${NUM})\s*°?\s*(?<ew>[EDBW])`,
    'giu'
  );
  for (const match of text.matchAll(directional)) {
    let lat = parseNumber(match.groups?.lat ?? '');
    let lon = parseNumber(match.groups?.lon ?? '');
    const ns = match.groups?.ns?.toLocaleUpperCase('tr-TR');
    const ew = match.groups?.ew?.toLocaleUpperCase('tr-TR');
    if (ns === 'G') lat *= -1;
    if (ew === 'B' || ew === 'W') lon *= -1;
    const valid = Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    target.push({
      fieldId,
      label,
      status: valid ? 'found' : 'review',
      displayValue: `${trNumber(lat, 6)}°, ${trNumber(lon, 6)}°`,
      sourceExcerpt: excerpt(match as RegExpExecArray),
      ...(valid ? { latitudeDeg: lat, longitudeDeg: lon } : {}),
      ...(!valid ? { reason: 'Enlem/boylam desteklenen aralığın dışında.' } : {})
    });
  }
}
