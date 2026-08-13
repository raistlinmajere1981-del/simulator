#!/usr/bin/env python3
"""Localize core visibility/horizon panels and human numeric formatting.

Temporary helper: remove before merge. This slice intentionally leaves model result
cards/tables, specialized astronomy/terrain/calibration panels, dialogs/help/reports
for later localization slices.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        fail(f"expected exactly one marker in {path.relative_to(ROOT)}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def require_absent(path: Path) -> None:
    if path.exists():
        fail(f"target already exists: {path.relative_to(ROOT)}")


i18n = ROOT / "src/renderer/src/i18n.ts"
replace_once(
    i18n,
    "  'experiment.newReady': 'Yeni deney hazırlandı.'\n",
    """  'experiment.newReady': 'Yeni deney hazırlandı.',
  'core.activeScenario': 'Aktif senaryo',
  'core.unsaved': 'KAYDEDİLMEDİ',
  'core.saveExperiment': 'Deneyi Kaydet',
  'core.newDefault': 'Yeni / Varsayılan',
  'core.liveCalculation': 'CANLI HESAPLAMA',
  'field.eyeHeight': 'Göz yüksekliği',
  'field.observerGroundElevation': 'Gözlemci zemin kotu',
  'field.datumOffset': 'Datum / yerel ofset',
  'field.verticalDatum': 'Düşey datum',
  'field.targetHeight': 'Hedef yüksekliği',
  'field.observedVisibility': 'Gözlenen görünürlük',
  'field.observationUncertainty': 'Gözlem belirsizliği',
  'field.refractionCoefficient': 'Kırılma katsayısı',
  'field.surfaceDistance': 'Yüzey mesafesi',
  'field.observerLatitude': 'Gözlemci enlemi',
  'field.observerLongitude': 'Gözlemci boylamı',
  'field.targetLatitude': 'Hedef enlemi',
  'field.targetLongitude': 'Hedef boylamı',
  'datum.orthometricMsl': 'Ortalama deniz seviyesi',
  'datum.ellipsoidalWgs84': 'WGS84 elipsoidal yükseklik',
  'datum.local': 'Yerel düşey referans',
  'distance.source': 'Mesafe kaynağı',
  'distance.manualSurface': 'Elle girilen yüzey mesafesi',
  'distance.coordinateSolution': 'WGS84 koordinat çözümü',
  'distance.manual': 'Manuel',
  'distance.coordinates': 'Koordinat',
  'distance.manualNote': 'Bu değer bütün modellerin ortak deney mesafesi olarak kullanılır.',
  'geodesic.distance': 'WGS84 mesafesi',
  'geodesic.initialBearing': 'Başlangıç azimutu',
  'geodesic.finalBearing': 'Varış azimutu',
  'geodesic.solution': 'Çözüm',
  'geodesic.vincentySolution': 'Vincenty · {iterations} iterasyon',
  'geodesic.sphericalFallback': 'Küresel yedek',
  'geodesic.trace': 'Jeodezik hesap izi',
  'geodesic.coordinateNote': 'Gözlemci {observerLat}°, {observerLon}° · Hedef {targetLat}°, {targetLon}°',
  'horizon.scope': 'Ufuk Analizi hedef, rota ve arazi profilini kullanmaz. Sonuç yalnız gözlemci toplam kotu, seçilen yüzey geometrisi ve desteklenen atmosfer varsayımından üretilir.',
  'atmosphere.off': 'Kapalı',
  'atmosphere.standard': 'Standart k',
  'atmosphere.layered': 'Katmanlı profil',
  'atmosphere.modeSummary': 'Atmosfer modu: {mode} · ayrıntılar aşağıdaki Atmosfer panelinden yönetilir.',
  'observation.reference': 'Gözlem referansı',
  'observation.numericInput': 'SAYISAL GİRDİ',
  'observation.observed': 'Gözlenen: {value}',
  'observation.uncertainty': 'Belirsizlik: {value}',
  'observation.photoNote': 'Fotoğraf ölçümü aşağıdaki kalibrasyon panelinden eklenebilir.',
  'observation.engineNote': 'Görsel açıklayıcıdır. Karşılaştırma, sayısal görünürlük ve belirsizlik girdileriyle yapılır.',
  'horizon.referenceSummary': 'Ufuk deney özeti',
  'horizon.geometricCalculation': 'GEOMETRİK HESAP',
  'horizon.totalObserverElevation': 'Toplam gözlemci kotu',
  'horizon.verticalDatum': 'Düşey datum',
  'horizon.atmosphere': 'Atmosfer',
  'horizon.standardRefraction': 'Standart k={value}',
  'horizon.engineNote': 'Bu senaryoda hedef görünürlük yüzdesi ölçümü yapılmaz; modellerin geometrik ufuk tanımları karşılaştırılır.'
"""
)
replace_once(
    i18n,
    "  'experiment.newReady': 'New experiment is ready.'\n",
    """  'experiment.newReady': 'New experiment is ready.',
  'core.activeScenario': 'Active scenario',
  'core.unsaved': 'UNSAVED',
  'core.saveExperiment': 'Save Experiment',
  'core.newDefault': 'New / Default',
  'core.liveCalculation': 'LIVE CALCULATION',
  'field.eyeHeight': 'Eye height',
  'field.observerGroundElevation': 'Observer ground elevation',
  'field.datumOffset': 'Datum / local offset',
  'field.verticalDatum': 'Vertical datum',
  'field.targetHeight': 'Target height',
  'field.observedVisibility': 'Observed visibility',
  'field.observationUncertainty': 'Observation uncertainty',
  'field.refractionCoefficient': 'Refraction coefficient',
  'field.surfaceDistance': 'Surface distance',
  'field.observerLatitude': 'Observer latitude',
  'field.observerLongitude': 'Observer longitude',
  'field.targetLatitude': 'Target latitude',
  'field.targetLongitude': 'Target longitude',
  'datum.orthometricMsl': 'Mean sea level',
  'datum.ellipsoidalWgs84': 'WGS84 ellipsoidal height',
  'datum.local': 'Local vertical reference',
  'distance.source': 'Distance source',
  'distance.manualSurface': 'Manually entered surface distance',
  'distance.coordinateSolution': 'WGS84 coordinate solution',
  'distance.manual': 'Manual',
  'distance.coordinates': 'Coordinates',
  'distance.manualNote': 'This value is used as the common experiment distance for all models.',
  'geodesic.distance': 'WGS84 distance',
  'geodesic.initialBearing': 'Initial bearing',
  'geodesic.finalBearing': 'Final bearing',
  'geodesic.solution': 'Solution',
  'geodesic.vincentySolution': 'Vincenty · {iterations} iterations',
  'geodesic.sphericalFallback': 'Spherical fallback',
  'geodesic.trace': 'Geodesic calculation trace',
  'geodesic.coordinateNote': 'Observer {observerLat}°, {observerLon}° · Target {targetLat}°, {targetLon}°',
  'horizon.scope': 'Horizon Analysis does not use a target, route or terrain profile. The result is produced only from total observer elevation, the selected surface geometry and the supported atmosphere assumption.',
  'atmosphere.off': 'Off',
  'atmosphere.standard': 'Standard k',
  'atmosphere.layered': 'Layered profile',
  'atmosphere.modeSummary': 'Atmosphere mode: {mode} · details are managed from the Atmosphere panel below.',
  'observation.reference': 'Observation reference',
  'observation.numericInput': 'NUMERIC INPUT',
  'observation.observed': 'Observed: {value}',
  'observation.uncertainty': 'Uncertainty: {value}',
  'observation.photoNote': 'A photo measurement can be added from the calibration panel below.',
  'observation.engineNote': 'The visual is explanatory. Comparison uses the numeric visibility and uncertainty inputs.',
  'horizon.referenceSummary': 'Horizon experiment summary',
  'horizon.geometricCalculation': 'GEOMETRIC CALCULATION',
  'horizon.totalObserverElevation': 'Total observer elevation',
  'horizon.verticalDatum': 'Vertical datum',
  'horizon.atmosphere': 'Atmosphere',
  'horizon.standardRefraction': 'Standard k={value}',
  'horizon.engineNote': 'This scenario does not use a target-visibility percentage measurement; the models’ geometric horizon definitions are compared.'
"""
)

formatters = ROOT / "src/renderer/src/app/app-formatters.ts"
formatters.write_text("""import type { ModelPrediction, ResultStatus } from '../../../shared/domain';
import { appLocaleTag, type AppLocale } from '../i18n';
import type { NumericInputKey } from './app-types';

export const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Gözlem aralığıyla uyumlu',
  incompatible: 'Gözlem aralığıyla uyumsuz',
  indeterminate: 'Belirsizlik içinde karar verilemedi',
  unsupported: 'Fiziksel model kuralları tanımsız'
};

export const inputRanges: Record<NumericInputKey, { min: number; max: number }> = {
  observerHeightM: { min: 0, max: 100_000 },
  targetHeightM: { min: 0.1, max: 100_000 },
  observerGroundElevationM: { min: -12_000, max: 100_000 },
  targetGroundElevationM: { min: -12_000, max: 100_000 },
  verticalDatumOffsetM: { min: -1_000, max: 1_000 },
  terrainIntermediateDistancePercent: { min: 0.001, max: 99.999 },
  terrainIntermediateElevationM: { min: -12_000, max: 100_000 },
  surfaceDistanceKm: { min: 0, max: 20_000 },
  observerLatitudeDeg: { min: -90, max: 90 },
  observerLongitudeDeg: { min: -180, max: 180 },
  targetLatitudeDeg: { min: -90, max: 90 },
  targetLongitudeDeg: { min: -180, max: 180 },
  observedVisiblePercent: { min: 0, max: 100 },
  observationUncertaintyPercent: { min: 0, max: 100 },
  refractionCoefficient: { min: -1, max: 0.99 }
};

const numberFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 2 })
};
const coordinateFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { minimumFractionDigits: 4, maximumFractionDigits: 6 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { minimumFractionDigits: 4, maximumFractionDigits: 6 })
};
const bearingFormatters: Record<AppLocale, Intl.NumberFormat> = {
  tr: new Intl.NumberFormat(appLocaleTag('tr'), { maximumFractionDigits: 3 }),
  en: new Intl.NumberFormat(appLocaleTag('en'), { maximumFractionDigits: 3 })
};

// Historical exports remain Turkish until each legacy caller is migrated to an explicit locale.
export const numberFormatter = numberFormatters.tr;
export const coordinateFormatter = coordinateFormatters.tr;
export const bearingFormatter = bearingFormatters.tr;

export function numberFormatterFor(locale: AppLocale): Intl.NumberFormat {
  return numberFormatters[locale];
}

export function coordinateFormatterFor(locale: AppLocale): Intl.NumberFormat {
  return coordinateFormatters[locale];
}

export function bearingFormatterFor(locale: AppLocale): Intl.NumberFormat {
  return bearingFormatters[locale];
}

export function getMetric(
  prediction: ModelPrediction | undefined,
  key: string
): number | null {
  return prediction?.metrics.find((metric) => metric.key === key)?.value ?? null;
}

export function formatPercentValue(valuePercent: number, locale: AppLocale = 'tr'): string {
  const formatted = numberFormatterFor(locale).format(valuePercent);
  return locale === 'tr' ? `%${formatted}` : `${formatted}%`;
}

export function formatSignedPercentValue(valuePercent: number, locale: AppLocale = 'tr'): string {
  const formatted = numberFormatterFor(locale).format(valuePercent);
  return locale === 'tr' ? `±%${formatted}` : `±${formatted}%`;
}

export function formatPercent(fraction: number | null, locale: AppLocale = 'tr'): string {
  return fraction === null ? '—' : formatPercentValue(fraction * 100, locale);
}

export function formatDistance(
  distanceM: number | null,
  infinite = false,
  locale: AppLocale = 'tr'
): string {
  if (distanceM === null) return infinite ? '∞' : '—';
  return `${numberFormatterFor(locale).format(distanceM / 1_000)} km`;
}

export function formatMetres(valueM: number | null, locale: AppLocale = 'tr'): string {
  return valueM === null ? '—' : `${numberFormatterFor(locale).format(valueM)} m`;
}

export function formatAngle(angleDeg: number | null, locale: AppLocale = 'tr'): string {
  return angleDeg === null ? '—' : `${numberFormatterFor(locale).format(angleDeg)}°`;
}

export function formatDifference(differencePp: number | null, locale: AppLocale = 'tr'): string {
  if (differencePp === null) return '—';
  return locale === 'tr'
    ? `${numberFormatterFor(locale).format(differencePp)} puan`
    : `${numberFormatterFor(locale).format(differencePp)} pp`;
}

export function clampInputValue(key: NumericInputKey, value: number): number {
  const range = inputRanges[key];
  return Math.min(range.max, Math.max(range.min, value));
}
""", encoding="utf-8")

app_config = ROOT / "src/renderer/src/app/app-config.ts"
replace_once(
    app_config,
    """const sidebarModelTranslationKeys: Record<string, TranslationKey> = {
  'ideal-sphere': 'model.idealSphere',
  'defined-plane': 'model.definedPlane',
  'azimuthal-projection': 'model.azimuthalProjection'
};

export const datumLabels: Record<VerticalDatumKind, string> = {
""",
    """const sidebarModelTranslationKeys: Record<string, TranslationKey> = {
  'ideal-sphere': 'model.idealSphere',
  'defined-plane': 'model.definedPlane',
  'azimuthal-projection': 'model.azimuthalProjection'
};

const datumTranslationKeys: Record<VerticalDatumKind, TranslationKey> = {
  'orthometric-msl': 'datum.orthometricMsl',
  'ellipsoidal-wgs84': 'datum.ellipsoidalWgs84',
  local: 'datum.local'
};

export const datumLabels: Record<VerticalDatumKind, string> = {
"""
)
replace_once(
    app_config,
    """export const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

export function getPresentation(modelId: string): ModelPresentation {
""",
    """export const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

export function getDatumLabel(locale: AppLocale, kind: VerticalDatumKind): string {
  return translate(locale, datumTranslationKeys[kind]);
}

export function getPresentation(modelId: string): ModelPresentation {
"""
)

scenario_summary = ROOT / "src/renderer/src/app/ScenarioSummary.tsx"
scenario_summary.write_text("""import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulationScenarioId } from '../../../shared/scenario';
import type { DistanceSource, SimulatorInputs } from '../../../shared/simulator';
import type { VerticalDatumKind } from '../../../shared/terrain';
import type { GeodesicResult } from '../../../simulation/geodesy';
import { PanelHelpButton } from '../HelpSystem';
import { useI18n } from '../I18nProvider';
import { NumericField } from './NumericField';
import { getDatumLabel, getScenarioPresentation } from './app-config';
import {
  bearingFormatterFor,
  coordinateFormatterFor,
  numberFormatterFor
} from './app-formatters';
import type { NumericInputKey } from './app-types';

export function ScenarioSummary({
  scenarioId,
  activeName,
  inputs,
  atmosphereMode,
  effectiveDistanceKm,
  geodesic,
  isDirty,
  onDistanceSourceChange,
  onDatumChange,
  onNumberChange,
  onReset,
  onSave,
  onShowGeodesicTrace
}: {
  scenarioId: SimulationScenarioId;
  activeName: string;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  effectiveDistanceKm: number;
  geodesic: GeodesicResult | undefined;
  isDirty: boolean;
  onDistanceSourceChange(source: DistanceSource): void;
  onDatumChange(kind: VerticalDatumKind): void;
  onNumberChange(key: NumericInputKey, value: number): void;
  onReset(): void;
  onSave(): void;
  onShowGeodesicTrace(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const scenario = getScenarioPresentation(locale, scenarioId);
  const isHorizon = scenarioId === 'horizon';
  const numberFormatter = numberFormatterFor(locale);
  const coordinateFormatter = coordinateFormatterFor(locale);
  const bearingFormatter = bearingFormatterFor(locale);
  const atmosphereModeLabel = atmosphereMode === 'off'
    ? t('atmosphere.off')
    : atmosphereMode === 'standard'
      ? t('atmosphere.standard')
      : t('atmosphere.layered');

  return (
    <section className="scenario-summary panel coordinate-summary">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">{t('core.activeScenario')}</span>
          <h2>{activeName || scenario.label}</h2>
        </div>
        <div className="title-actions">
          <PanelHelpButton panelId="scenario-summary" />
          {isDirty && <span className="dirty-badge">{t('core.unsaved')}</span>}
          <button className="save-button" onClick={onSave} type="button">{t('core.saveExperiment')}</button>
          <button className="reset-button" onClick={onReset} type="button">{t('core.newDefault')}</button>
          <span className="calculation-badge">{t('core.liveCalculation')}</span>
        </div>
      </div>

      <div className={`input-grid base-input-grid ${isHorizon ? 'horizon-input-grid' : ''}`}>
        <NumericField inputKey="observerHeightM" label={t('field.eyeHeight')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
        {isHorizon ? (
          <>
            <NumericField inputKey="observerGroundElevationM" label={t('field.observerGroundElevation')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="verticalDatumOffsetM" label={t('field.datumOffset')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <label className="input-field horizon-datum-field">
              <span>{t('field.verticalDatum')}</span>
              <select value={inputs.verticalDatumKind} onChange={(event) => onDatumChange(event.currentTarget.value as VerticalDatumKind)}>
                <option value="orthometric-msl">{getDatumLabel(locale, 'orthometric-msl')}</option>
                <option value="ellipsoidal-wgs84">{getDatumLabel(locale, 'ellipsoidal-wgs84')}</option>
                <option value="local">{getDatumLabel(locale, 'local')}</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <NumericField inputKey="targetHeightM" label={t('field.targetHeight')} unit="m" step={0.1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observedVisiblePercent" label={t('field.observedVisibility')} unit="%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
            <NumericField inputKey="observationUncertaintyPercent" label={t('field.observationUncertainty')} unit="±%" step={1} inputs={inputs} onNumberChange={onNumberChange} />
          </>
        )}
        <NumericField inputKey="refractionCoefficient" label={t('field.refractionCoefficient')} unit="k" step={0.01} inputs={inputs} disabled={atmosphereMode !== 'standard'} onNumberChange={onNumberChange} />
      </div>

      {!isHorizon && <div className="distance-source-panel">
        <div className="distance-source-heading">
          <div>
            <span className="eyebrow">{t('distance.source')}</span>
            <strong>{inputs.distanceSource === 'manual' ? t('distance.manualSurface') : t('distance.coordinateSolution')}</strong>
          </div>
          <div className="distance-mode-buttons">
            <button className={inputs.distanceSource === 'manual' ? 'selected' : ''} type="button" onClick={() => onDistanceSourceChange('manual')}>{t('distance.manual')}</button>
            <button className={inputs.distanceSource === 'coordinates' ? 'selected' : ''} type="button" onClick={() => onDistanceSourceChange('coordinates')}>{t('distance.coordinates')}</button>
          </div>
        </div>

        {inputs.distanceSource === 'manual' ? (
          <div className="manual-distance-row">
            <NumericField inputKey="surfaceDistanceKm" label={t('field.surfaceDistance')} unit="km" step={0.01} inputs={inputs} onNumberChange={onNumberChange} />
            <p>{t('distance.manualNote')}</p>
          </div>
        ) : (
          <>
            <div className="coordinate-grid">
              <NumericField inputKey="observerLatitudeDeg" label={t('field.observerLatitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="observerLongitudeDeg" label={t('field.observerLongitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="targetLatitudeDeg" label={t('field.targetLatitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
              <NumericField inputKey="targetLongitudeDeg" label={t('field.targetLongitude')} unit="°" step={0.000001} inputs={inputs} onNumberChange={onNumberChange} />
            </div>
            <div className={`geodesic-summary ${geodesic?.method === 'spherical-fallback' ? 'fallback' : ''}`}>
              <div><small>{t('geodesic.distance')}</small><strong>{numberFormatter.format(effectiveDistanceKm)} km</strong></div>
              <div><small>{t('geodesic.initialBearing')}</small><strong>{geodesic ? `${bearingFormatter.format(geodesic.initialBearingDeg)}°` : '—'}</strong></div>
              <div><small>{t('geodesic.finalBearing')}</small><strong>{geodesic ? `${bearingFormatter.format(geodesic.finalBearingDeg)}°` : '—'}</strong></div>
              <div><small>{t('geodesic.solution')}</small><strong>{geodesic?.method === 'vincenty' ? t('geodesic.vincentySolution', { iterations: geodesic.iterations }) : t('geodesic.sphericalFallback')}</strong></div>
              <button type="button" onClick={onShowGeodesicTrace}>{t('geodesic.trace')}</button>
            </div>
            <p className="coordinate-note">
              {t('geodesic.coordinateNote', {
                observerLat: coordinateFormatter.format(inputs.observerLatitudeDeg),
                observerLon: coordinateFormatter.format(inputs.observerLongitudeDeg),
                targetLat: coordinateFormatter.format(inputs.targetLatitudeDeg),
                targetLon: coordinateFormatter.format(inputs.targetLongitudeDeg)
              })}
            </p>
          </>
        )}
      </div>}

      {isHorizon && <p className="scenario-scope-note">{t('horizon.scope')}</p>}

      <div className="refraction-control">
        <span>{t('atmosphere.modeSummary', { mode: atmosphereModeLabel })}</span>
      </div>
    </section>
  );
}
""", encoding="utf-8")

observation_panels = ROOT / "src/renderer/src/app/ObservationReferencePanels.tsx"
observation_panels.write_text("""import type { AtmosphereMode } from '../../../shared/atmosphere';
import type { SimulatorInputs } from '../../../shared/simulator';
import { useI18n } from '../I18nProvider';
import { getDatumLabel } from './app-config';
import {
  formatMetres,
  formatPercentValue,
  formatSignedPercentValue,
  numberFormatterFor
} from './app-formatters';

export function ObservationPanel({ inputs }: { inputs: SimulatorInputs }): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  return (
    <section className="observation panel">
      <div className="observation-heading">
        <span className="eyebrow">{t('observation.reference')}</span>
        <span className="reference-mode">{t('observation.numericInput')}</span>
      </div>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />{numberFormatter.format(2.5)}°<br />0°<br />−{numberFormatter.format(2.5)}°</div>
      </div>
      <div className="observation-meta">
        <span>{t('observation.observed', { value: formatPercentValue(inputs.observedVisiblePercent, locale) })}</span>
        <span>{t('observation.uncertainty', { value: formatSignedPercentValue(inputs.observationUncertaintyPercent, locale) })}</span>
        <span>{t('observation.photoNote')}</span>
      </div>
      <p className="engine-note">{t('observation.engineNote')}</p>
    </section>
  );
}

export function HorizonReferencePanel({
  inputs,
  atmosphereMode
}: {
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = numberFormatterFor(locale);
  const observerTotalElevationM = inputs.observerGroundElevationM +
    inputs.verticalDatumOffsetM + inputs.observerHeightM;
  const atmosphereLabel = atmosphereMode === 'standard'
    ? t('horizon.standardRefraction', { value: numberFormatter.format(inputs.refractionCoefficient) })
    : atmosphereMode === 'profile'
      ? t('atmosphere.layered')
      : t('atmosphere.off');

  return (
    <section className="observation panel horizon-reference-panel">
      <div className="observation-heading">
        <span className="eyebrow">{t('horizon.referenceSummary')}</span>
        <span className="reference-mode">{t('horizon.geometricCalculation')}</span>
      </div>
      <div className="horizon-reference-visual">
        <span className="horizon-reference-observer" />
        <span className="horizon-reference-tangent" />
        <span className="horizon-reference-arc" />
      </div>
      <div className="horizon-reference-metrics">
        <div><small>{t('horizon.totalObserverElevation')}</small><strong>{formatMetres(observerTotalElevationM, locale)}</strong></div>
        <div><small>{t('horizon.verticalDatum')}</small><strong>{getDatumLabel(locale, inputs.verticalDatumKind)}</strong></div>
        <div><small>{t('horizon.atmosphere')}</small><strong>{atmosphereLabel}</strong></div>
      </div>
      <p className="engine-note">{t('horizon.engineNote')}</p>
    </section>
  );
}
""", encoding="utf-8")

formatter_test = ROOT / "tests/app-formatters-i18n.test.ts"
require_absent(formatter_test)
formatter_test.write_text("""import { describe, expect, it } from 'vitest';
import {
  bearingFormatterFor,
  coordinateFormatterFor,
  formatDifference,
  formatPercent,
  formatPercentValue,
  formatSignedPercentValue,
  numberFormatterFor
} from '../src/renderer/src/app/app-formatters';

describe('locale-aware renderer formatters', () => {
  it('uses locale-specific decimal separators without changing numeric values', () => {
    expect(numberFormatterFor('tr').format(12.5)).toBe('12,5');
    expect(numberFormatterFor('en').format(12.5)).toBe('12.5');
    expect(coordinateFormatterFor('tr').format(41.0082)).toBe('41,0082');
    expect(coordinateFormatterFor('en').format(41.0082)).toBe('41.0082');
    expect(bearingFormatterFor('en').format(123.4567)).toBe('123.457');
  });

  it('keeps Turkish percent presentation compatible while using English suffix style', () => {
    expect(formatPercentValue(42.5, 'tr')).toBe('%42,5');
    expect(formatPercentValue(42.5, 'en')).toBe('42.5%');
    expect(formatSignedPercentValue(2.5, 'tr')).toBe('±%2,5');
    expect(formatSignedPercentValue(2.5, 'en')).toBe('±2.5%');
    expect(formatPercent(0.425, 'en')).toBe('42.5%');
  });

  it('keeps legacy Turkish defaults while allowing localized difference labels', () => {
    expect(formatPercent(0.425)).toBe('%42,5');
    expect(formatDifference(1.25)).toBe('1,25 puan');
    expect(formatDifference(1.25, 'en')).toBe('1.25 pp');
  });
});
""", encoding="utf-8")

app_config_test = ROOT / "tests/app-config-i18n.test.ts"
app_config_test.write_text("""import { describe, expect, it } from 'vitest';
import {
  defaultExperimentName,
  getDatumLabel,
  getScenarioPresentation,
  getSidebarModelLabel
} from '../src/renderer/src/app/app-config';

describe('localized renderer scenario presentation', () => {
  it('keeps scenario ids stable while localizing their human presentation', () => {
    expect(getScenarioPresentation('tr', 'horizon')).toEqual({
      label: 'Ufuk Analizi',
      description: 'Gözlemci kotu ve atmosfer varsayımından geometrik ufuk mesafesini hesaplar.'
    });
    expect(getScenarioPresentation('en', 'horizon')).toEqual({
      label: 'Horizon Analysis',
      description: 'Calculates geometric horizon distance from observer elevation and the atmosphere assumption.'
    });
  });

  it('uses the selected locale for generated default experiment names', () => {
    const instant = new Date('2026-08-13T10:00:00.000Z');
    expect(defaultExperimentName('stellar-observation', 'tr', instant)).toMatch(/^Yıldız Gözlemleri /);
    expect(defaultExperimentName('stellar-observation', 'en', instant)).toMatch(/^Stellar Observations /);
  });

  it('preserves existing Turkish model metadata labels while supplying English sidebar labels', () => {
    expect(getSidebarModelLabel('tr', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Mevcut Türkçe Ad');
    expect(getSidebarModelLabel('en', 'ideal-sphere', 'Mevcut Türkçe Ad')).toBe('Ideal Sphere');
    expect(getSidebarModelLabel('en', 'unknown-model', 'Custom Model')).toBe('Custom Model');
  });

  it('localizes vertical datum presentation without changing persisted datum ids', () => {
    expect(getDatumLabel('tr', 'orthometric-msl')).toBe('Ortalama deniz seviyesi');
    expect(getDatumLabel('en', 'orthometric-msl')).toBe('Mean sea level');
    expect(getDatumLabel('en', 'ellipsoidal-wgs84')).toBe('WGS84 ellipsoidal height');
    expect(getDatumLabel('en', 'local')).toBe('Local vertical reference');
  });
});
""", encoding="utf-8")

doc = ROOT / "docs/localization.md"
replace_once(
    doc,
    """- Navigation slice: scenario labels/descriptions, sidebar states/model references/visual layers and locale-aware default experiment names.

The main experiment panels, astronomy time card, dialogs, help/AI guidance and reports remain separate follow-up slices.
""",
    """- Navigation slice: scenario labels/descriptions, sidebar states/model references/visual layers and locale-aware default experiment names.
- Core panel slice: visibility/horizon scenario summary, observation reference panels, vertical datum presentation and explicit locale-aware number/coordinate/bearing/percent formatting.

Model result cards/tables, astronomy time card, specialized panels, dialogs, help/AI guidance and reports remain separate follow-up slices.
"""
)

print("Core panel TR/EN localization applied successfully.")
print("Updated:")
for path in [i18n, formatters, app_config, scenario_summary, observation_panels, app_config_test, doc]:
    print(f"  - {path.relative_to(ROOT)}")
print("Created:")
print(f"  - {formatter_test.relative_to(ROOT)}")
