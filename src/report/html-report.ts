import type { SavedExperiment } from '../shared/simulator';
import {
  astronomyModelIds,
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  metricNumberFormatters,
  predictionSection,
  yesNo
} from './report-core';
import { geodesicSection, verticalTerrainSection } from './report-terrain';

function astronomyResultsSection(experiment: SavedExperiment): string {
  const predictions = experiment.predictions.filter((prediction) => astronomyModelIds.has(prediction.modelId));
  if (predictions.length === 0) return '';
  const observedAtIso = experiment.observedAtIso ?? experiment.createdAtIso;
  return `
    <div class="astronomy-group">
      <div class="astronomy-group-heading">
        <div><span class="eyebrow">Aşama 7 · kaydedilmiş astronomi anlık görüntüleri</span><h2>Astronomi sonuçları</h2></div>
        <strong>${predictions.length} hesap kaydı</strong>
      </div>
      <p>Bu bölüm kaydedilen gözlem anı (${formatDate(observedAtIso)}), açık UTC ofseti ve model sürümleriyle birlikte saklanan Güneş, Ay, tutulma, mevsim, Güneş zamanı ve rota karşılaştırması sonuçlarını gösterir.</p>
      ${predictions.map((prediction) => predictionSection(
        prediction,
        experiment.modelVersions[prediction.modelId]
      )).join('')}
    </div>`;
}

function stellarLocalHorizonSourceSection(experiment: SavedExperiment): string {
  const source = experiment.stellarLocalHorizonSource;
  if (!source) return '';
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? 'İçe aktarımdan / üretimden sonra düzenlendi'
    : source.format === 'dem'
      ? 'Kaydedilen noktalar DEM türetim kaydıyla eşleşiyor'
      : source.format === 'panorama'
        ? 'Kaydedilen noktalar panorama işaret/türetim kaydıyla eşleşiyor'
        : 'Kaydedilen noktalar içe aktarılan kaynakla eşleşiyor';
  const dem = source.demDerivation;
  const demRows = source.format === 'dem' && dem ? `
          <tr><td>Kaynak türü</td><td>DEM’den türetilmiş geometrik 360° skyline</td></tr>
          <tr><td>Türetim algoritması</td><td>${escapeHtml(dem.algorithmId)}@${escapeHtml(dem.algorithmVersion)}</td></tr>
          <tr><td>Gözlemci</td><td>${coordinateFormatter.format(dem.observerLatitudeDeg)}°, ${coordinateFormatter.format(dem.observerLongitudeDeg)}° · göz yüksekliği ${inputNumberFormatter.format(dem.observerHeightM)} m</td></tr>
          <tr><td>DEM → WGS84 elipsoid ofseti</td><td>${inputNumberFormatter.format(dem.heightDatumToEllipsoidOffsetM)} m</td></tr>
          <tr><td>Azimut örnekleme</td><td>ΔA ${metricNumberFormatters.degree.format(dem.azimuthStepDeg)}° · ${source.pointCount} yön</td></tr>
          <tr><td>Mesafe örnekleme</td><td>Δs ${inputNumberFormatter.format(dem.distanceStepM)} m · maksimum ${inputNumberFormatter.format(dem.maximumDistanceM / 1_000)} km</td></tr>
          <tr><td>DEM örnekleme</td><td>${dem.samplingMethod === 'bilinear' ? 'Bilinear' : 'En yakın hücre'}</td></tr>
          <tr><td>360° kapsama</td><td>${dem.completeCoverage ? 'Tam' : 'Eksik'} · tam ${dem.completeRayCount}/${source.pointCount} · kapsam-sınırlı ${dem.coverageLimitedRayCount} · NODATA-etkili ${dem.noDataAffectedRayCount} · kapsamasız ${dem.noCoverageRayCount}</td></tr>
          <tr><td>Jeodezik yedek örnek</td><td>${dem.geodesicFallbackSampleCount}</td></tr>` : '';
  const panorama = source.panoramaDerivation;
  const panoramaRows = source.format === 'panorama' && panorama ? `
          <tr><td>Kaynak türü</td><td>Panoramadan türetilmiş geometrik 360° skyline</td></tr>
          <tr><td>Türetim algoritması</td><td>${escapeHtml(panorama.algorithmId)}@${escapeHtml(panorama.algorithmVersion)}</td></tr>
          <tr><td>Geometri kaynağı</td><td>${panorama.geometrySource === 'gpano-xmp' ? 'GPano XMP' : 'Manuel geometri'}</td></tr>
          <tr><td>Metadata durumu</td><td>${escapeHtml(panorama.metadataStatusAtImport)} · standart XMP ${panorama.standardXmpPacketFound ? 'var' : 'yok'} · extended XMP ${panorama.extendedXmpPacketFound ? 'var' : 'yok'} · bitmap ölçekleme ${panorama.metadataScaledToImage ? 'uygulandı' : 'uygulanmadı'}</td></tr>
          <tr><td>Bitmap</td><td>${panorama.geometry.imageWidthPx} × ${panorama.geometry.imageHeightPx} px</td></tr>
          <tr><td>Tam panorama</td><td>${panorama.geometry.fullPanoWidthPx} × ${panorama.geometry.fullPanoHeightPx} px · crop sol ${panorama.geometry.croppedAreaLeftPx} px · üst ${panorama.geometry.croppedAreaTopPx} px</td></tr>
          <tr><td>Pose</td><td>heading ${metricNumberFormatters.degree.format(panorama.geometry.poseHeadingDeg)}° · pitch ${metricNumberFormatters.degree.format(panorama.geometry.posePitchDeg)}° · roll ${metricNumberFormatters.degree.format(panorama.geometry.poseRollDeg)}°</td></tr>
          <tr><td>Panorama kapsamı</td><td>yatay ${metricNumberFormatters.degree.format(panorama.horizontalCoverageDeg)}° · düşey ${metricNumberFormatters.degree.format(panorama.verticalCoverageDeg)}° · tam küre ${panorama.fullSphereCoverage ? 'evet' : 'hayır'}</td></tr>
          <tr><td>Manuel skyline işaretleri</td><td>${panorama.marks.length} işaret · maksimum azimut boşluğu ${metricNumberFormatters.degree.format(source.maximumAzimuthGapDeg)}°</td></tr>` : '';
  const sourceRows = demRows || panoramaRows || `
          <tr><td>Kaynak türü</td><td>Dış skyline dosyası</td></tr>`;
  const sourceKindLabel = source.format === 'dem'
    ? 'DEM skyline kaynak provenansı'
    : source.format === 'panorama'
      ? 'Panorama skyline kaynak provenansı'
      : 'Yıldız yerel skyline dosya kaynağı';
  const subtitle = source.format === 'dem'
    ? 'ESRI ASCII DEM → WGS84/toposentrik geometrik azimut → ufuk yüksekliği profili'
    : source.format === 'panorama'
      ? 'Equirectangular panorama pikseli → gerçek azimut / geometrik ufuk yüksekliği'
      : 'Geometrik azimut → ufuk yüksekliği profili';
  const formatLabel = source.format === 'dem'
    ? 'DEM · türetilmiş geometrik'
    : source.format === 'panorama'
      ? 'PANORAMA · türetilmiş geometrik'
      : source.format.toUpperCase();
  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>${sourceKindLabel}</h2><span>${subtitle}</span></div>
        <strong class="status status-compatible">${source.pointCount} nokta</strong>
      </header>
      <div class="source-card ${stateClass}">
        <div class="source-card-heading"><strong>${escapeHtml(source.fileName)}</strong><span>${escapeHtml(stateLabel)}</span></div>
        <table><tbody>
          <tr><td>Biçim</td><td>${escapeHtml(formatLabel)}</td></tr>
          <tr><td>Nokta sayısı</td><td>${source.pointCount}</td></tr>
          <tr><td>En büyük azimut boşluğu</td><td>${metricNumberFormatters.degree.format(source.maximumAzimuthGapDeg)}°</td></tr>
          <tr><td>Dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
          <tr><td>İçe aktarma</td><td>${formatDate(source.importedAtIso)}</td></tr>
          <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
          ${sourceRows}
        </tbody></table>
        ${source.warnings.length > 0 ? `<h3>Kaynak uyarıları</h3><ul class="warnings">${source.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}
        <p class="muted">Bu kayıt ham kaynak dosya veya panorama görüntü baytlarını içermez; doğrulanmış/normalize edilmiş geometrik skyline noktalarını ve kaynak bütünlük/türetim özetini taşır. DEM kaynakta geoit değişimi, atmosferik kırılma, bina/bitki örtüsü ve grid dışı arazi; panorama kaynakta otomatik görüntü segmentasyonu ve optik görünürlük sınıflaması profile eklenmez. Profilin yıldız hesabında uygulanıp uygulanmadığı ilgili Yıldız Gözlemi prediction anlık görüntüsünde ayrıca kaydedilir.</p>
      </div>
    </section>`;
}

function stellarMotionSourceSection(experiment: SavedExperiment): string {
  const source = experiment.stellarMotionSource;
  if (!source) return '';
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? 'İçe aktarımdan sonra düzenlendi'
    : '19 kaynak satırı doğrulanmış kayıtla eşleşiyor';
  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Yıldız proper-motion kaynak provenansı</h2><span>BSC5P fixed-width doğrulanmış 19-yıldız altkümesi</span></div>
        <strong class="status status-compatible">${source.entryCount}/19 doğrulandı</strong>
      </header>
      <div class="source-card ${stateClass}">
        <div class="source-card-heading"><strong>${escapeHtml(source.fileName)}</strong><span>${escapeHtml(stateLabel)}</span></div>
        <table><tbody>
          <tr><td>Katalog</td><td>${escapeHtml(source.sourceCatalog)}</td></tr>
          <tr><td>Subset</td><td>${escapeHtml(source.subsetId)}@${escapeHtml(source.subsetVersion)}</td></tr>
          <tr><td>Kaynak biçim</td><td>${escapeHtml(source.sourceFormatId)}@${escapeHtml(source.sourceFormatVersion)}</td></tr>
          <tr><td>Koordinat / epok</td><td>FK5 / J${inputNumberFormatter.format(source.sourceEpochJulianYear)}</td></tr>
          <tr><td>Doğrulanmış yıldız</td><td>${source.entryCount}/19</td></tr>
          <tr><td>Dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
          <tr><td>İçe aktarma</td><td>${formatDate(source.importedAtIso)}</td></tr>
          <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
        </tbody></table>
        <p class="muted">Portable kayıt tüm BSC5P kataloğunu gömmez; doğrulanmış 19 sabit-genişlik kaynak satırını ve seçilen tam dosyanın SHA-256 özetini taşır. Yeniden açılışta bu 19 satır parser ve HR/J2000/V-kadir eşleşmesiyle tekrar doğrulanır.</p>
      </div>
    </section>`;
}

function photoCalibrationSection(experiment: SavedExperiment): string {
  const calibration = experiment.photoCalibration;
  if (!calibration) return '';
  const source = calibration.source;
  const cameraRows = calibration.calibration.sourceKind === 'field-of-view'
    ? `<tr><td>Kalibrasyon yöntemi</td><td>Yatay / düşey FOV</td></tr>
       <tr><td>Yatay FOV</td><td>${metricNumberFormatters.degree.format(calibration.calibration.horizontalFovDeg)}°</td></tr>
       <tr><td>Düşey FOV</td><td>${metricNumberFormatters.degree.format(calibration.calibration.verticalFovDeg)}°</td></tr>`
    : `<tr><td>Kalibrasyon yöntemi</td><td>Sensör + odak uzaklığı</td></tr>
       <tr><td>Odak uzaklığı</td><td>${inputNumberFormatter.format(calibration.calibration.focalLengthMm)} mm</td></tr>
       <tr><td>Sensör</td><td>${inputNumberFormatter.format(calibration.calibration.sensorWidthMm)} × ${inputNumberFormatter.format(calibration.calibration.sensorHeightMm)} mm</td></tr>`;
  const cameraUncertaintyRows = calibration.cameraUncertainty
    ? Object.entries({
        'Yatay FOV ±': calibration.cameraUncertainty.horizontalFovDeg === undefined ? undefined : `${metricNumberFormatters.degree.format(calibration.cameraUncertainty.horizontalFovDeg)}°`,
        'Düşey FOV ±': calibration.cameraUncertainty.verticalFovDeg === undefined ? undefined : `${metricNumberFormatters.degree.format(calibration.cameraUncertainty.verticalFovDeg)}°`,
        'Odak uzaklığı ±': calibration.cameraUncertainty.focalLengthMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.focalLengthMm)} mm`,
        'Sensör genişliği ±': calibration.cameraUncertainty.sensorWidthMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.sensorWidthMm)} mm`,
        'Sensör yüksekliği ±': calibration.cameraUncertainty.sensorHeightMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.sensorHeightMm)} mm`,
        'Asal nokta X ±': calibration.cameraUncertainty.principalPointXPx === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.principalPointXPx)} px`,
        'Asal nokta Y ±': calibration.cameraUncertainty.principalPointYPx === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.principalPointYPx)} px`
      }).filter(([, value]) => value !== undefined).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')
    : '<tr><td>Kamera iç-parametre belirsizliği</td><td>Tanımlanmadı</td></tr>';
  const cameraCombinationRow = calibration.cameraUncertainty
    ? `<tr><td>Kamera belirsizlik birleşimi</td><td>${calibration.cameraUncertainty.combination === 'rss-independent' ? 'RSS · bağımsız bileşenler' : 'Koruyucu doğrusal toplam'}</td></tr>`
    : '';
  const markRows = Object.entries({
    'Ufuk / referans sol': calibration.marks.horizonStart,
    'Ufuk / referans sağ': calibration.marks.horizonEnd,
    'Hedef tabanı': calibration.marks.targetBase,
    'Hedef tepesi': calibration.marks.targetTop
  }).map(([label, mark]) => `<tr><td>${escapeHtml(label)}</td><td>${inputNumberFormatter.format(mark.xPx)}, ${inputNumberFormatter.format(mark.yPx)} px${mark.uncertaintyPx === undefined ? '' : ` · ±${inputNumberFormatter.format(mark.uncertaintyPx)} px`}</td></tr>`).join('');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Fotoğraf kaynak ve işaretleme provenansı</h2><span>Görüntü baytları rapora veya deney JSON’una gömülmez</span></div>
        <strong class="status status-compatible">Kalibrasyon kaydı</strong>
      </header>
      <div class="two-column">
        <div>
          <h3>Kaynak fotoğraf</h3>
          <table><tbody>
            <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
            <tr><td>Görüntü boyutu</td><td>${source.imageWidthPx} × ${source.imageHeightPx} px</td></tr>
            <tr><td>Dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
            <tr><td>MIME</td><td>${escapeHtml(source.mimeType)}</td></tr>
            <tr><td>İçe aktarma</td><td>${formatDate(source.importedAtIso)}</td></tr>
            <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
            ${cameraRows}
            ${cameraCombinationRow}
            ${cameraUncertaintyRows}
            <tr><td>Asal nokta</td><td>${calibration.principalPointXPx === undefined || calibration.principalPointYPx === undefined ? 'Görüntü merkezi (varsayılan)' : `${inputNumberFormatter.format(calibration.principalPointXPx)}, ${inputNumberFormatter.format(calibration.principalPointYPx)} px`}</td></tr>
            <tr><td>Distorsiyon önceden düzeltildi</td><td>${yesNo(calibration.distortionCorrected)}</td></tr>
            <tr><td>Varsayılan işaret belirsizliği</td><td>±${inputNumberFormatter.format(calibration.defaultMarkUncertaintyPx)} px</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>İşaretler</h3>
          <table><tbody>${markRows}</tbody></table>
          <p class="muted">Kalibrasyon kayıt zamanı: ${formatDate(calibration.recordedAtIso)}</p>
          ${calibration.notes ? `<p>${escapeHtml(calibration.notes)}</p>` : ''}
        </div>
      </div>
    </section>`;
}


function photoModelUncertaintySection(experiment: SavedExperiment): string {
  const settings = experiment.photoModelUncertainty;
  if (!settings) return '';
  const rows = Object.entries({
    'Etkin yüzey mesafesi ±': settings.surfaceDistanceM === undefined ? undefined : `${inputNumberFormatter.format(settings.surfaceDistanceM)} m`,
    'Göz yüksekliği ±': settings.observerEyeHeightM === undefined ? undefined : `${inputNumberFormatter.format(settings.observerEyeHeightM)} m`,
    'Gözlemci zemin kotu ±': settings.observerGroundElevationM === undefined ? undefined : `${inputNumberFormatter.format(settings.observerGroundElevationM)} m`,
    'Hedef yüksekliği ±': settings.targetHeightM === undefined ? undefined : `${inputNumberFormatter.format(settings.targetHeightM)} m`,
    'Hedef taban kotu ±': settings.targetGroundElevationM === undefined ? undefined : `${inputNumberFormatter.format(settings.targetGroundElevationM)} m`,
    'Kırılma katsayısı k ±': settings.refractionCoefficient === undefined ? undefined : inputNumberFormatter.format(settings.refractionCoefficient)
  }).filter(([, value]) => value !== undefined).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Fotoğraf / model belirsizlik ayarları</h2><span>Nominal model girdilerini değiştirmeyen hassasiyet aralıkları</span></div>
        <strong class="status status-compatible">${settings.combination === 'rss-independent' ? 'RSS' : 'Koruyucu toplam'}</strong>
      </header>
      <p>Boş bırakılan bileşenler sıfır belirsizlik sayılmaz; bu raporda yalnız kullanıcı tarafından açıkça tanımlanan ± aralıklar listelenir.</p>
      <table><tbody>${rows || '<tr><td colspan="2">Model girdi belirsizliği tanımlanmadı.</td></tr>'}</tbody></table>
    </section>`;
}

function textSetupHistorySection(experiment: SavedExperiment): string {
  const history = experiment.textSetupHistory;
  if (!history || history.length === 0) return '';
  const entries = history.map((item, index) => `
    <div class="source-card">
      <div class="source-card-heading"><strong>Metinden uygulama ${index + 1}</strong><span>${formatDate(item.appliedAtIso)} · parser ${escapeHtml(item.parserVersion)}</span></div>
      <p>${escapeHtml(item.sourceText)}</p>
      <table><thead><tr><th>Alan</th><th>Uygulanan değer</th><th>Kaynak ifade</th></tr></thead><tbody>
        ${item.appliedFields.map((field) => `<tr><td>${escapeHtml(field.fieldId)}</td><td>${escapeHtml(field.displayValue)}</td><td>${escapeHtml(field.sourceExcerpt)}</td></tr>`).join('')}
      </tbody></table>
    </div>`).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading"><div><h2>Metinden deney hazırlama provenansı</h2><span>Kullanıcı onayıyla forma uygulanan serbest metin alanları</span></div><strong class="status status-compatible">${history.length} uygulama</strong></header>
      <p>Bu metin parser girdisidir; fiziksel ölçüm kaynağının kendisi değildir. Yalnız hangi UI değerlerinin hangi ifadelerden çıkarılıp kullanıcı onayıyla uygulandığını izler.</p>
      <div class="trace-list">${entries}</div>
    </section>`;
}

export function createExperimentHtmlReport(
  experiment: SavedExperiment,
  generatedAtIso = new Date().toISOString()
): string {
  const inputs = experiment.inputs;
  const effectiveDistanceKm = experiment.geodesic?.distanceM !== undefined &&
    inputs.distanceSource === 'coordinates'
    ? experiment.geodesic.distanceM / 1_000
    : inputs.surfaceDistanceKm;
  const isCelestial = experiment.scenarioId === 'sun-moon-observation';
  const isShadowObservation = experiment.scenarioId === 'shadow-observation';
  const isStellarObservation = experiment.scenarioId === 'stellar-observation';
  const isEclipseObservation = experiment.scenarioId === 'eclipse-simulation';
  const isAstronomyObservation = isCelestial || isShadowObservation || isStellarObservation || isEclipseObservation;
  const coordinateCards = inputs.distanceSource === 'coordinates' ? `
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Hedef koordinatı</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Mesafe kaynağı</small><strong>WGS84 koordinat çözümü</strong></div>` : `
    <div class="input-card"><small>Mesafe kaynağı</small><strong>Manuel giriş</strong></div>`;
  const reportInputCards = isAstronomyObservation ? `
    <div class="input-card"><small>Gözlem zamanı · UTC</small><strong>${formatDate(experiment.observedAtIso ?? experiment.createdAtIso)}</strong></div>
    <div class="input-card"><small>UTC ofset provenansı</small><strong>${experiment.observationUtcOffsetMinutes === undefined ? 'Tanımlanmadı' : `${experiment.observationUtcOffsetMinutes >= 0 ? '+' : ''}${inputNumberFormatter.format(experiment.observationUtcOffsetMinutes / 60)} saat`}</strong></div>
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    ${isCelestial ? `<div class="input-card"><small>Rota karşılaştırması B</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>` : ''}
    <div class="input-card"><small>${isShadowObservation ? '6.3 hesap türü' : isStellarObservation ? 'Yıldız gözlemi' : isEclipseObservation ? 'Tutulma hesabı' : 'Aşama 7 astronomi'}</small><strong>${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : isStellarObservation ? 'Katalog yıldızı, precession ve geometrik skyline izi' : isEclipseObservation ? 'Anlık Güneş–Ay disk geometrisi ve kontrollü olay araması' : 'Güneş/Ay, günlük/yıllık olaylar, Güneş zamanı ve WGS84 rota karşılaştırması'}</strong></div>` : `
    <div class="input-card"><small>Göz yüksekliği</small><strong>${inputNumberFormatter.format(inputs.observerHeightM)} m</strong></div>
    <div class="input-card"><small>Hedef yüksekliği</small><strong>${inputNumberFormatter.format(inputs.targetHeightM)} m</strong></div>
    <div class="input-card"><small>Yüzey mesafesi</small><strong>${inputNumberFormatter.format(effectiveDistanceKm)} km</strong></div>
    <div class="input-card"><small>Gözlenen görünürlük</small><strong>%${inputNumberFormatter.format(inputs.observedVisiblePercent)}</strong></div>
    <div class="input-card"><small>Gözlem belirsizliği</small><strong>±%${inputNumberFormatter.format(inputs.observationUncertaintyPercent)}</strong></div>
    <div class="input-card"><small>Atmosfer</small><strong>${inputs.useStandardRefraction ? `Standart kırılma (k=${inputNumberFormatter.format(inputs.refractionCoefficient)})` : 'Kapalı'}</strong></div>
    ${coordinateCards}`;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(experiment.name)} · Deney Raporu</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Arial, sans-serif; color: #18232d; background: #eef2f5; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: 0 auto; }
    .report-header, section { background: white; border: 1px solid #d7e0e7; border-radius: 10px; box-shadow: 0 8px 24px rgba(20,35,50,.06); }
    .report-header { padding: 28px; margin-bottom: 18px; }
    .eyebrow { color: #527087; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 8px 0 4px; font-size: 30px; }
    h2 { margin: 0; }
    h3 { margin: 18px 0 8px; font-size: 16px; }
    h4 { margin: 0 0 8px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 24px; color: #5b6f7f; font-size: 13px; }
    .notice { margin-top: 18px; padding: 12px 14px; border-left: 4px solid #d79b2c; background: #fff8e8; font-size: 13px; }
    .input-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
    .input-card { padding: 12px; border: 1px solid #dce5eb; border-radius: 7px; background: #f8fafb; }
    .input-card small { display: block; color: #687d8d; margin-bottom: 5px; }
    .input-card strong { font-size: 17px; }
    .model-section { margin: 18px 0; padding: 24px; page-break-inside: avoid; }
    .astronomy-group { margin: 18px 0; padding: 18px; border: 1px solid #d5c58a; border-top: 4px solid #d39a28; border-radius: 10px; background: #fffdf6; }
    .astronomy-group > .model-section { background: #fff; }
    .astronomy-group-heading { display: flex; justify-content: space-between; gap: 16px; align-items: end; padding: 4px 6px 14px; border-bottom: 1px solid #eadfb8; }
    .astronomy-group-heading strong { color: #7a5a18; }
    .geodesic-section { border-top: 4px solid #2b79ad; }
    .vertical-section { border-top: 4px solid #4b8a58; }
    .model-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; border-bottom: 1px solid #e0e7ec; padding-bottom: 14px; }
    .model-heading span { display: block; color: #718492; margin-top: 4px; font-size: 12px; }
    .status { max-width: 330px; padding: 7px 10px; border-radius: 999px; font-size: 12px; text-align: center; }
    .status-compatible { color: #19622d; background: #e4f5e8; }
    .status-incompatible { color: #8a2d22; background: #fbe8e5; }
    .status-indeterminate { color: #725a13; background: #fff4cf; }
    .status-unsupported { color: #63417c; background: #f1e7f8; }
    .two-column { display: grid; grid-template-columns: 1.25fr 1fr; gap: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 10px; border: 1px solid #dce4e9; text-align: left; }
    th { background: #f2f6f8; }
    ul { margin: 8px 0; padding-left: 20px; line-height: 1.55; }
    .warnings { color: #8b4e12; }
    .trace-list { display: grid; gap: 10px; }
    .trace-step { display: grid; grid-template-columns: 32px 1fr; gap: 12px; padding: 14px; border: 1px solid #dbe4ea; border-radius: 7px; background: #f9fbfc; }
    .trace-number { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #174f75; background: #dcecf7; font-weight: 700; }
    code { display: block; padding: 9px; overflow-wrap: anywhere; border: 1px solid #ccdce7; border-radius: 4px; background: #edf4f8; }
    .trace-result { display: inline-block; padding: 5px 8px; color: #155e2b; background: #e0f3e5; border-radius: 4px; font-weight: 700; }
    .trace-id, .muted { color: #71828f; font-size: 11px; overflow-wrap: anywhere; }
    .source-card { padding: 14px; border: 1px solid #b9d9c1; border-left: 4px solid #4d985e; border-radius: 7px; background: #f3fbf5; }
    .source-card.source-modified { border-color: #e0c98e; border-left-color: #c58c27; background: #fff9e9; }
    .source-card-heading { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 10px; }
    .source-card-heading span { color: #4c7656; font-size: 12px; font-weight: 700; }
    .source-modified .source-card-heading span { color: #87621d; }
    footer { padding: 16px 4px; color: #70818e; font-size: 11px; text-align: center; }
    @media (max-width: 760px) { body { padding: 12px; } .input-grid, .two-column { grid-template-columns: 1fr; } .model-heading, .source-card-heading { display: block; } .status { display: inline-block; margin-top: 10px; } .source-card-heading span { display: block; margin-top: 6px; } }
    @media print { body { padding: 0; background: white; } .report-header, section { box-shadow: none; } .model-section { break-before: auto; } }
  </style>
</head>
<body>
  <main>
    <header class="report-header">
      <span class="eyebrow">Geometrik Gözlem Laboratuvarı · Deney Raporu</span>
      <h1>${escapeHtml(experiment.name)}</h1>
      <div class="meta">
        <span>Kayıt kimliği: ${escapeHtml(experiment.id)}</span>
        <span>Oluşturma: ${formatDate(experiment.createdAtIso)}</span>
        <span>Son güncelleme: ${formatDate(experiment.updatedAtIso)}</span>
        <span>Rapor üretimi: ${formatDate(generatedAtIso)}</span>
      </div>
      <div class="input-grid">
        ${reportInputCards}
      </div>
      <div class="notice">Bu rapor, kaydedildiği andaki model sürümlerini, sonuç anlık görüntülerini ve hesap izlerini gösterir. Tek bir deneydeki uyum, bir modelin genel doğruluğu anlamına gelmez.</div>
    </header>

    ${geodesicSection(experiment)}
    ${verticalTerrainSection(experiment, effectiveDistanceKm)}
    ${photoCalibrationSection(experiment)}
    ${photoModelUncertaintySection(experiment)}
    ${textSetupHistorySection(experiment)}
    ${stellarLocalHorizonSourceSection(experiment)}
    ${stellarMotionSourceSection(experiment)}
    ${astronomyResultsSection(experiment)}
    ${experiment.predictions
      .filter((prediction) => !astronomyModelIds.has(prediction.modelId))
      .map((prediction) => predictionSection(
        prediction,
        experiment.modelVersions[prediction.modelId]
      )).join('')}

    <footer>Bu dosya çevrimdışı okunabilen, kendine yeterli bir HTML raporudur. Geometrik Gözlem Laboratuvarı tarafından üretilmiştir.</footer>
  </main>
</body>
</html>`;
}
