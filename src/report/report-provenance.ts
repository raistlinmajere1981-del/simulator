import type { SavedExperiment } from '../shared/simulator';
import {
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  metricNumberFormatters,
  yesNo
} from './report-core';

export function stellarLocalHorizonSourceSection(experiment: SavedExperiment): string {
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

export function stellarMotionSourceSection(experiment: SavedExperiment): string {
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

export function photoCalibrationSection(experiment: SavedExperiment): string {
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


export function photoModelUncertaintySection(experiment: SavedExperiment): string {
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

export function textSetupHistorySection(experiment: SavedExperiment): string {
  const history = experiment.textSetupHistory;
  if (!history || history.length === 0) return '';
  const entries = history.map((item, index) => {
    const lineage = item.sourceKind === 'ai-follow-up' ? item.aiLineage : undefined;
    const sourceLabel = lineage ? 'AI takip testi' : 'Manuel metin';
    const lineageRows = lineage ? `
      <h3>AI soy ağacı</h3>
      <table><tbody>
        <tr><td>Lineage sürümü</td><td>${escapeHtml(lineage.version)}</td></tr>
        <tr><td>Kaynak analiz paketi</td><td>GGL-AI-ANALYSIS ${escapeHtml(lineage.analysisPackageVersion)} · ${formatDate(lineage.analysisGeneratedAtIso)}</td></tr>
        <tr><td>Kaynak deney</td><td><code>${escapeHtml(lineage.sourceExperimentId)}</code> · snapshot ${formatDate(lineage.sourceExperimentUpdatedAtIso)}</td></tr>
        <tr><td>Analiz SHA-256</td><td><code>${escapeHtml(lineage.analysisSha256)}</code></td></tr>
        <tr><td>Kanonik test SHA-256</td><td><code>${escapeHtml(lineage.canonicalTestSha256)}</code></td></tr>
      </tbody></table>` : '';
    return `
    <div class="source-card">
      <div class="source-card-heading"><strong>Metinden uygulama ${index + 1}</strong><span>${formatDate(item.appliedAtIso)} · parser ${escapeHtml(item.parserVersion)} · ${sourceLabel}</span></div>
      <p>${escapeHtml(item.sourceText)}</p>
      ${lineageRows}
      <table><thead><tr><th>Alan</th><th>Uygulanan değer</th><th>Kaynak ifade</th></tr></thead><tbody>
        ${item.appliedFields.map((field) => `<tr><td>${escapeHtml(field.fieldId)}</td><td>${escapeHtml(field.displayValue)}</td><td>${escapeHtml(field.sourceExcerpt)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading"><div><h2>Metinden deney hazırlama provenansı</h2><span>Kullanıcı onayıyla forma uygulanan alanlar ve varsa AI takip soy ağacı</span></div><strong class="status status-compatible">${history.length} uygulama</strong></header>
      <p>Bu metin parser girdisidir; fiziksel ölçüm kaynağının kendisi değildir. AI takip akışında dış AI'nin serbest açıklaması saklanmaz; yalnız kanonik test bloğu, hash zinciri ve kullanıcı tarafından uygulanan alanlar korunur.</p>
      <div class="trace-list">${entries}</div>
    </section>`;
}
