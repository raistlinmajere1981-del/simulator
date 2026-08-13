import type { SavedExperiment } from '../shared/simulator';
import type { UiLocale } from '../shared/ui-locale';
import {
  escapeHtml,
  formatCoordinate,
  formatDate,
  formatDegree,
  formatInputNumber,
  yesNo
} from './report-core';

function tx(locale: UiLocale, tr: string, en: string): string {
  return locale === 'en' ? en : tr;
}

export function stellarLocalHorizonSourceSection(
  experiment: SavedExperiment,
  locale: UiLocale = 'tr'
): string {
  const source = experiment.stellarLocalHorizonSource;
  if (!source) return '';
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? tx(locale, 'İçe aktarımdan / üretimden sonra düzenlendi', 'Modified after import / generation')
    : source.format === 'dem'
      ? tx(locale, 'Kaydedilen noktalar DEM türetim kaydıyla eşleşiyor', 'Saved points match the DEM derivation record')
      : source.format === 'panorama'
        ? tx(locale, 'Kaydedilen noktalar panorama işaret/türetim kaydıyla eşleşiyor', 'Saved points match the panorama marking/derivation record')
        : tx(locale, 'Kaydedilen noktalar içe aktarılan kaynakla eşleşiyor', 'Saved points match the imported source');

  const dem = source.demDerivation;
  const demRows = source.format === 'dem' && dem ? `
          <tr><td>${tx(locale, 'Kaynak türü', 'Source type')}</td><td>${tx(locale, 'DEM’den türetilmiş geometrik 360° skyline', 'Geometric 360° skyline derived from DEM')}</td></tr>
          <tr><td>${tx(locale, 'Türetim algoritması', 'Derivation algorithm')}</td><td>${escapeHtml(dem.algorithmId)}@${escapeHtml(dem.algorithmVersion)}</td></tr>
          <tr><td>${tx(locale, 'Gözlemci', 'Observer')}</td><td>${formatCoordinate(dem.observerLatitudeDeg, locale)}°, ${formatCoordinate(dem.observerLongitudeDeg, locale)}° · ${tx(locale, 'göz yüksekliği', 'eye height')} ${formatInputNumber(dem.observerHeightM, locale)} m</td></tr>
          <tr><td>${tx(locale, 'DEM → WGS84 elipsoid ofseti', 'DEM → WGS84 ellipsoid offset')}</td><td>${formatInputNumber(dem.heightDatumToEllipsoidOffsetM, locale)} m</td></tr>
          <tr><td>${tx(locale, 'Azimut örnekleme', 'Azimuth sampling')}</td><td>ΔA ${formatDegree(dem.azimuthStepDeg, locale)}° · ${source.pointCount} ${tx(locale, 'yön', 'directions')}</td></tr>
          <tr><td>${tx(locale, 'Mesafe örnekleme', 'Distance sampling')}</td><td>Δs ${formatInputNumber(dem.distanceStepM, locale)} m · ${tx(locale, 'maksimum', 'maximum')} ${formatInputNumber(dem.maximumDistanceM / 1_000, locale)} km</td></tr>
          <tr><td>${tx(locale, 'DEM örnekleme', 'DEM sampling')}</td><td>${dem.samplingMethod === 'bilinear' ? 'Bilinear' : tx(locale, 'En yakın hücre', 'Nearest cell')}</td></tr>
          <tr><td>${tx(locale, '360° kapsama', '360° coverage')}</td><td>${dem.completeCoverage ? tx(locale, 'Tam', 'Complete') : tx(locale, 'Eksik', 'Incomplete')} · ${tx(locale, 'tam', 'complete')} ${dem.completeRayCount}/${source.pointCount} · ${tx(locale, 'kapsam-sınırlı', 'coverage-limited')} ${dem.coverageLimitedRayCount} · NODATA-${tx(locale, 'etkili', 'affected')} ${dem.noDataAffectedRayCount} · ${tx(locale, 'kapsamasız', 'no-coverage')} ${dem.noCoverageRayCount}</td></tr>
          <tr><td>${tx(locale, 'Jeodezik yedek örnek', 'Geodesic fallback samples')}</td><td>${dem.geodesicFallbackSampleCount}</td></tr>` : '';

  const panorama = source.panoramaDerivation;
  const panoramaRows = source.format === 'panorama' && panorama ? `
          <tr><td>${tx(locale, 'Kaynak türü', 'Source type')}</td><td>${tx(locale, 'Panoramadan türetilmiş geometrik 360° skyline', 'Geometric 360° skyline derived from panorama')}</td></tr>
          <tr><td>${tx(locale, 'Türetim algoritması', 'Derivation algorithm')}</td><td>${escapeHtml(panorama.algorithmId)}@${escapeHtml(panorama.algorithmVersion)}</td></tr>
          <tr><td>${tx(locale, 'Geometri kaynağı', 'Geometry source')}</td><td>${panorama.geometrySource === 'gpano-xmp' ? 'GPano XMP' : tx(locale, 'Manuel geometri', 'Manual geometry')}</td></tr>
          <tr><td>${tx(locale, 'Metadata durumu', 'Metadata status')}</td><td>${escapeHtml(panorama.metadataStatusAtImport)} · ${tx(locale, 'standart XMP', 'standard XMP')} ${panorama.standardXmpPacketFound ? tx(locale, 'var', 'present') : tx(locale, 'yok', 'absent')} · extended XMP ${panorama.extendedXmpPacketFound ? tx(locale, 'var', 'present') : tx(locale, 'yok', 'absent')} · ${tx(locale, 'bitmap ölçekleme', 'bitmap scaling')} ${panorama.metadataScaledToImage ? tx(locale, 'uygulandı', 'applied') : tx(locale, 'uygulanmadı', 'not applied')}</td></tr>
          <tr><td>Bitmap</td><td>${panorama.geometry.imageWidthPx} × ${panorama.geometry.imageHeightPx} px</td></tr>
          <tr><td>${tx(locale, 'Tam panorama', 'Full panorama')}</td><td>${panorama.geometry.fullPanoWidthPx} × ${panorama.geometry.fullPanoHeightPx} px · ${tx(locale, 'crop sol', 'crop left')} ${panorama.geometry.croppedAreaLeftPx} px · ${tx(locale, 'üst', 'top')} ${panorama.geometry.croppedAreaTopPx} px</td></tr>
          <tr><td>Pose</td><td>heading ${formatDegree(panorama.geometry.poseHeadingDeg, locale)}° · pitch ${formatDegree(panorama.geometry.posePitchDeg, locale)}° · roll ${formatDegree(panorama.geometry.poseRollDeg, locale)}°</td></tr>
          <tr><td>${tx(locale, 'Panorama kapsamı', 'Panorama coverage')}</td><td>${tx(locale, 'yatay', 'horizontal')} ${formatDegree(panorama.horizontalCoverageDeg, locale)}° · ${tx(locale, 'düşey', 'vertical')} ${formatDegree(panorama.verticalCoverageDeg, locale)}° · ${tx(locale, 'tam küre', 'full sphere')} ${yesNo(panorama.fullSphereCoverage, locale).toLocaleLowerCase(locale === 'en' ? 'en-US' : 'tr-TR')}</td></tr>
          <tr><td>${tx(locale, 'Manuel skyline işaretleri', 'Manual skyline marks')}</td><td>${panorama.marks.length} ${tx(locale, 'işaret', 'marks')} · ${tx(locale, 'maksimum azimut boşluğu', 'maximum azimuth gap')} ${formatDegree(source.maximumAzimuthGapDeg, locale)}°</td></tr>` : '';

  const sourceRows = demRows || panoramaRows || `
          <tr><td>${tx(locale, 'Kaynak türü', 'Source type')}</td><td>${tx(locale, 'Dış skyline dosyası', 'External skyline file')}</td></tr>`;
  const sourceKindLabel = source.format === 'dem'
    ? tx(locale, 'DEM skyline kaynak provenansı', 'DEM skyline source provenance')
    : source.format === 'panorama'
      ? tx(locale, 'Panorama skyline kaynak provenansı', 'Panorama skyline source provenance')
      : tx(locale, 'Yıldız yerel skyline dosya kaynağı', 'Stellar local-skyline file source');
  const subtitle = source.format === 'dem'
    ? tx(locale, 'ESRI ASCII DEM → WGS84/toposentrik geometrik azimut → ufuk yüksekliği profili', 'ESRI ASCII DEM → WGS84/topocentric geometric azimuth → horizon-altitude profile')
    : source.format === 'panorama'
      ? tx(locale, 'Equirectangular panorama pikseli → gerçek azimut / geometrik ufuk yüksekliği', 'Equirectangular panorama pixel → true azimuth / geometric horizon altitude')
      : tx(locale, 'Geometrik azimut → ufuk yüksekliği profili', 'Geometric azimuth → horizon-altitude profile');
  const formatLabel = source.format === 'dem'
    ? tx(locale, 'DEM · türetilmiş geometrik', 'DEM · geometrically derived')
    : source.format === 'panorama'
      ? tx(locale, 'PANORAMA · türetilmiş geometrik', 'PANORAMA · geometrically derived')
      : source.format.toUpperCase();

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>${sourceKindLabel}</h2><span>${subtitle}</span></div>
        <strong class="status status-compatible">${source.pointCount} ${tx(locale, 'nokta', 'points')}</strong>
      </header>
      <div class="source-card ${stateClass}">
        <div class="source-card-heading"><strong>${escapeHtml(source.fileName)}</strong><span>${escapeHtml(stateLabel)}</span></div>
        <table><tbody>
          <tr><td>${tx(locale, 'Biçim', 'Format')}</td><td>${escapeHtml(formatLabel)}</td></tr>
          <tr><td>${tx(locale, 'Nokta sayısı', 'Point count')}</td><td>${source.pointCount}</td></tr>
          <tr><td>${tx(locale, 'En büyük azimut boşluğu', 'Maximum azimuth gap')}</td><td>${formatDegree(source.maximumAzimuthGapDeg, locale)}°</td></tr>
          <tr><td>${tx(locale, 'Dosya boyutu', 'File size')}</td><td>${formatInputNumber(source.fileSizeBytes, locale)} ${tx(locale, 'bayt', 'bytes')}</td></tr>
          <tr><td>${tx(locale, 'İçe aktarma', 'Imported')}</td><td>${formatDate(source.importedAtIso, locale)}</td></tr>
          <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
          ${sourceRows}
        </tbody></table>
        ${source.warnings.length > 0 ? `<h3>${tx(locale, 'Kaynak uyarıları', 'Source warnings')}</h3><ul class="warnings">${source.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}
        <p class="muted">${tx(
          locale,
          'Bu kayıt ham kaynak dosya veya panorama görüntü baytlarını içermez; doğrulanmış/normalize edilmiş geometrik skyline noktalarını ve kaynak bütünlük/türetim özetini taşır. DEM kaynakta geoit değişimi, atmosferik kırılma, bina/bitki örtüsü ve grid dışı arazi; panorama kaynakta otomatik görüntü segmentasyonu ve optik görünürlük sınıflaması profile eklenmez. Profilin yıldız hesabında uygulanıp uygulanmadığı ilgili Yıldız Gözlemi prediction anlık görüntüsünde ayrıca kaydedilir.',
          'This record does not contain the raw source file or panorama image bytes; it carries validated/normalized geometric skyline points and a source-integrity/derivation summary. DEM sources do not add geoid variation, atmospheric refraction, buildings/vegetation or terrain outside the grid; panorama sources do not add automatic image segmentation or optical-visibility classification. Whether the profile was applied to the stellar calculation is stored separately in the relevant Stellar Observation prediction snapshot.'
        )}</p>
      </div>
    </section>`;
}

export function stellarMotionSourceSection(
  experiment: SavedExperiment,
  locale: UiLocale = 'tr'
): string {
  const source = experiment.stellarMotionSource;
  if (!source) return '';
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? tx(locale, 'İçe aktarımdan sonra düzenlendi', 'Modified after import')
    : tx(locale, '19 kaynak satırı doğrulanmış kayıtla eşleşiyor', '19 source rows match the verified record');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>${tx(locale, 'Yıldız proper-motion kaynak provenansı', 'Stellar proper-motion source provenance')}</h2><span>${tx(locale, 'BSC5P fixed-width doğrulanmış 19-yıldız altkümesi', 'BSC5P fixed-width verified 19-star subset')}</span></div>
        <strong class="status status-compatible">${source.entryCount}/19 ${tx(locale, 'doğrulandı', 'verified')}</strong>
      </header>
      <div class="source-card ${stateClass}">
        <div class="source-card-heading"><strong>${escapeHtml(source.fileName)}</strong><span>${escapeHtml(stateLabel)}</span></div>
        <table><tbody>
          <tr><td>${tx(locale, 'Katalog', 'Catalog')}</td><td>${escapeHtml(source.sourceCatalog)}</td></tr>
          <tr><td>Subset</td><td>${escapeHtml(source.subsetId)}@${escapeHtml(source.subsetVersion)}</td></tr>
          <tr><td>${tx(locale, 'Kaynak biçim', 'Source format')}</td><td>${escapeHtml(source.sourceFormatId)}@${escapeHtml(source.sourceFormatVersion)}</td></tr>
          <tr><td>${tx(locale, 'Koordinat / epok', 'Coordinates / epoch')}</td><td>FK5 / J${formatInputNumber(source.sourceEpochJulianYear, locale)}</td></tr>
          <tr><td>${tx(locale, 'Doğrulanmış yıldız', 'Verified stars')}</td><td>${source.entryCount}/19</td></tr>
          <tr><td>${tx(locale, 'Dosya boyutu', 'File size')}</td><td>${formatInputNumber(source.fileSizeBytes, locale)} ${tx(locale, 'bayt', 'bytes')}</td></tr>
          <tr><td>${tx(locale, 'İçe aktarma', 'Imported')}</td><td>${formatDate(source.importedAtIso, locale)}</td></tr>
          <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
        </tbody></table>
        <p class="muted">${tx(
          locale,
          'Portable kayıt tüm BSC5P kataloğunu gömmez; doğrulanmış 19 sabit-genişlik kaynak satırını ve seçilen tam dosyanın SHA-256 özetini taşır. Yeniden açılışta bu 19 satır parser ve HR/J2000/V-kadir eşleşmesiyle tekrar doğrulanır.',
          'The portable record does not embed the full BSC5P catalog; it carries the 19 verified fixed-width source rows and the SHA-256 digest of the selected full file. On reopen, those 19 rows are verified again through the parser and HR/J2000/V-magnitude matching.'
        )}</p>
      </div>
    </section>`;
}

export function photoCalibrationSection(
  experiment: SavedExperiment,
  locale: UiLocale = 'tr'
): string {
  const calibration = experiment.photoCalibration;
  if (!calibration) return '';
  const source = calibration.source;
  const cameraRows = calibration.calibration.sourceKind === 'field-of-view'
    ? `<tr><td>${tx(locale, 'Kalibrasyon yöntemi', 'Calibration method')}</td><td>${tx(locale, 'Yatay / düşey FOV', 'Horizontal / vertical FOV')}</td></tr>
       <tr><td>${tx(locale, 'Yatay FOV', 'Horizontal FOV')}</td><td>${formatDegree(calibration.calibration.horizontalFovDeg, locale)}°</td></tr>
       <tr><td>${tx(locale, 'Düşey FOV', 'Vertical FOV')}</td><td>${formatDegree(calibration.calibration.verticalFovDeg, locale)}°</td></tr>`
    : `<tr><td>${tx(locale, 'Kalibrasyon yöntemi', 'Calibration method')}</td><td>${tx(locale, 'Sensör + odak uzaklığı', 'Sensor + focal length')}</td></tr>
       <tr><td>${tx(locale, 'Odak uzaklığı', 'Focal length')}</td><td>${formatInputNumber(calibration.calibration.focalLengthMm, locale)} mm</td></tr>
       <tr><td>${tx(locale, 'Sensör', 'Sensor')}</td><td>${formatInputNumber(calibration.calibration.sensorWidthMm, locale)} × ${formatInputNumber(calibration.calibration.sensorHeightMm, locale)} mm</td></tr>`;

  const uncertaintyLabels: Array<[string, string, number | undefined, string]> = [
    ['Yatay FOV ±', 'Horizontal FOV ±', calibration.cameraUncertainty?.horizontalFovDeg, 'degree'],
    ['Düşey FOV ±', 'Vertical FOV ±', calibration.cameraUncertainty?.verticalFovDeg, 'degree'],
    ['Odak uzaklığı ±', 'Focal length ±', calibration.cameraUncertainty?.focalLengthMm, 'mm'],
    ['Sensör genişliği ±', 'Sensor width ±', calibration.cameraUncertainty?.sensorWidthMm, 'mm'],
    ['Sensör yüksekliği ±', 'Sensor height ±', calibration.cameraUncertainty?.sensorHeightMm, 'mm'],
    ['Asal nokta X ±', 'Principal point X ±', calibration.cameraUncertainty?.principalPointXPx, 'px'],
    ['Asal nokta Y ±', 'Principal point Y ±', calibration.cameraUncertainty?.principalPointYPx, 'px']
  ];
  const cameraUncertaintyRows = calibration.cameraUncertainty
    ? uncertaintyLabels
        .filter(([, , value]) => value !== undefined)
        .map(([trLabel, enLabel, value, unit]) => {
          const numeric = unit === 'degree'
            ? `${formatDegree(value as number, locale)}°`
            : `${formatInputNumber(value as number, locale)} ${unit}`;
          return `<tr><td>${escapeHtml(tx(locale, trLabel, enLabel))}</td><td>${escapeHtml(numeric)}</td></tr>`;
        })
        .join('')
    : `<tr><td>${tx(locale, 'Kamera iç-parametre belirsizliği', 'Camera intrinsic-parameter uncertainty')}</td><td>${tx(locale, 'Tanımlanmadı', 'Undefined')}</td></tr>`;
  const cameraCombinationRow = calibration.cameraUncertainty
    ? `<tr><td>${tx(locale, 'Kamera belirsizlik birleşimi', 'Camera uncertainty combination')}</td><td>${calibration.cameraUncertainty.combination === 'rss-independent' ? tx(locale, 'RSS · bağımsız bileşenler', 'RSS · independent components') : tx(locale, 'Koruyucu doğrusal toplam', 'Conservative linear sum')}</td></tr>`
    : '';

  const markSpecs = [
    [tx(locale, 'Ufuk / referans sol', 'Horizon / reference left'), calibration.marks.horizonStart],
    [tx(locale, 'Ufuk / referans sağ', 'Horizon / reference right'), calibration.marks.horizonEnd],
    [tx(locale, 'Hedef tabanı', 'Target base'), calibration.marks.targetBase],
    [tx(locale, 'Hedef tepesi', 'Target top'), calibration.marks.targetTop]
  ] as const;
  const markRows = markSpecs.map(([label, mark]) =>
    `<tr><td>${escapeHtml(label)}</td><td>${formatInputNumber(mark.xPx, locale)}, ${formatInputNumber(mark.yPx, locale)} px${mark.uncertaintyPx === undefined ? '' : ` · ±${formatInputNumber(mark.uncertaintyPx, locale)} px`}</td></tr>`
  ).join('');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>${tx(locale, 'Fotoğraf kaynak ve işaretleme provenansı', 'Photo source and marking provenance')}</h2><span>${tx(locale, 'Görüntü baytları rapora veya deney JSON’una gömülmez', 'Image bytes are not embedded in the report or experiment JSON')}</span></div>
        <strong class="status status-compatible">${tx(locale, 'Kalibrasyon kaydı', 'Calibration record')}</strong>
      </header>
      <div class="two-column">
        <div>
          <h3>${tx(locale, 'Kaynak fotoğraf', 'Source photo')}</h3>
          <table><tbody>
            <tr><td>${tx(locale, 'Dosya adı', 'File name')}</td><td>${escapeHtml(source.fileName)}</td></tr>
            <tr><td>${tx(locale, 'Görüntü boyutu', 'Image size')}</td><td>${source.imageWidthPx} × ${source.imageHeightPx} px</td></tr>
            <tr><td>${tx(locale, 'Dosya boyutu', 'File size')}</td><td>${formatInputNumber(source.fileSizeBytes, locale)} ${tx(locale, 'bayt', 'bytes')}</td></tr>
            <tr><td>MIME</td><td>${escapeHtml(source.mimeType)}</td></tr>
            <tr><td>${tx(locale, 'İçe aktarma', 'Imported')}</td><td>${formatDate(source.importedAtIso, locale)}</td></tr>
            <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
            ${cameraRows}
            ${cameraCombinationRow}
            ${cameraUncertaintyRows}
            <tr><td>${tx(locale, 'Asal nokta', 'Principal point')}</td><td>${calibration.principalPointXPx === undefined || calibration.principalPointYPx === undefined ? tx(locale, 'Görüntü merkezi (varsayılan)', 'Image center (default)') : `${formatInputNumber(calibration.principalPointXPx, locale)}, ${formatInputNumber(calibration.principalPointYPx, locale)} px`}</td></tr>
            <tr><td>${tx(locale, 'Distorsiyon önceden düzeltildi', 'Distortion corrected beforehand')}</td><td>${yesNo(calibration.distortionCorrected, locale)}</td></tr>
            <tr><td>${tx(locale, 'Varsayılan işaret belirsizliği', 'Default mark uncertainty')}</td><td>±${formatInputNumber(calibration.defaultMarkUncertaintyPx, locale)} px</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>${tx(locale, 'İşaretler', 'Marks')}</h3>
          <table><tbody>${markRows}</tbody></table>
          <p class="muted">${tx(locale, 'Kalibrasyon kayıt zamanı', 'Calibration recorded at')}: ${formatDate(calibration.recordedAtIso, locale)}</p>
          ${calibration.notes ? `<p>${escapeHtml(calibration.notes)}</p>` : ''}
        </div>
      </div>
    </section>`;
}

export function photoModelUncertaintySection(
  experiment: SavedExperiment,
  locale: UiLocale = 'tr'
): string {
  const settings = experiment.photoModelUncertainty;
  if (!settings) return '';
  const rowSpecs: Array<[string, string, number | undefined, string]> = [
    ['Etkin yüzey mesafesi ±', 'Effective surface distance ±', settings.surfaceDistanceM, 'm'],
    ['Göz yüksekliği ±', 'Eye height ±', settings.observerEyeHeightM, 'm'],
    ['Gözlemci zemin kotu ±', 'Observer ground elevation ±', settings.observerGroundElevationM, 'm'],
    ['Hedef yüksekliği ±', 'Target height ±', settings.targetHeightM, 'm'],
    ['Hedef taban kotu ±', 'Target base elevation ±', settings.targetGroundElevationM, 'm'],
    ['Kırılma katsayısı k ±', 'Refraction coefficient k ±', settings.refractionCoefficient, '']
  ];
  const rows = rowSpecs
    .filter(([, , value]) => value !== undefined)
    .map(([trLabel, enLabel, value, unit]) => {
      const formatted = `${formatInputNumber(value as number, locale)}${unit ? ` ${unit}` : ''}`;
      return `<tr><td>${escapeHtml(tx(locale, trLabel, enLabel))}</td><td>${escapeHtml(formatted)}</td></tr>`;
    })
    .join('');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>${tx(locale, 'Fotoğraf / model belirsizlik ayarları', 'Photo / model uncertainty settings')}</h2><span>${tx(locale, 'Nominal model girdilerini değiştirmeyen hassasiyet aralıkları', 'Sensitivity ranges that do not alter nominal model inputs')}</span></div>
        <strong class="status status-compatible">${settings.combination === 'rss-independent' ? 'RSS' : tx(locale, 'Koruyucu toplam', 'Conservative sum')}</strong>
      </header>
      <p>${tx(
        locale,
        'Boş bırakılan bileşenler sıfır belirsizlik sayılmaz; bu raporda yalnız kullanıcı tarafından açıkça tanımlanan ± aralıklar listelenir.',
        'Blank components are not treated as zero uncertainty; this report lists only ± ranges explicitly defined by the user.'
      )}</p>
      <table><tbody>${rows || `<tr><td colspan="2">${tx(locale, 'Model girdi belirsizliği tanımlanmadı.', 'Model input uncertainty is undefined.')}</td></tr>`}</tbody></table>
    </section>`;
}

export function textSetupHistorySection(
  experiment: SavedExperiment,
  locale: UiLocale = 'tr'
): string {
  const history = experiment.textSetupHistory;
  if (!history || history.length === 0) return '';
  const entries = history.map((item, index) => {
    const lineage = item.sourceKind === 'ai-follow-up' ? item.aiLineage : undefined;
    const sourceLabel = lineage
      ? tx(locale, 'AI takip testi', 'AI follow-up test')
      : tx(locale, 'Manuel metin', 'Manual text');
    const lineageRows = lineage ? `
      <h3>${tx(locale, 'AI soy ağacı', 'AI lineage')}</h3>
      <table><tbody>
        <tr><td>${tx(locale, 'Lineage sürümü', 'Lineage version')}</td><td>${escapeHtml(lineage.version)}</td></tr>
        <tr><td>${tx(locale, 'Kaynak analiz paketi', 'Source analysis package')}</td><td>GGL-AI-ANALYSIS ${escapeHtml(lineage.analysisPackageVersion)} · ${formatDate(lineage.analysisGeneratedAtIso, locale)}</td></tr>
        <tr><td>${tx(locale, 'Kaynak deney', 'Source experiment')}</td><td><code>${escapeHtml(lineage.sourceExperimentId)}</code> · snapshot ${formatDate(lineage.sourceExperimentUpdatedAtIso, locale)}</td></tr>
        <tr><td>${tx(locale, 'Analiz SHA-256', 'Analysis SHA-256')}</td><td><code>${escapeHtml(lineage.analysisSha256)}</code></td></tr>
        <tr><td>${tx(locale, 'Kanonik test SHA-256', 'Canonical test SHA-256')}</td><td><code>${escapeHtml(lineage.canonicalTestSha256)}</code></td></tr>
      </tbody></table>` : '';

    return `
    <div class="source-card">
      <div class="source-card-heading"><strong>${tx(locale, 'Metinden uygulama', 'Text application')} ${index + 1}</strong><span>${formatDate(item.appliedAtIso, locale)} · parser ${escapeHtml(item.parserVersion)} · ${sourceLabel}</span></div>
      <p>${escapeHtml(item.sourceText)}</p>
      ${lineageRows}
      <table><thead><tr><th>${tx(locale, 'Alan', 'Field')}</th><th>${tx(locale, 'Uygulanan değer', 'Applied value')}</th><th>${tx(locale, 'Kaynak ifade', 'Source excerpt')}</th></tr></thead><tbody>
        ${item.appliedFields.map((field) => `<tr><td>${escapeHtml(field.fieldId)}</td><td>${escapeHtml(field.displayValue)}</td><td>${escapeHtml(field.sourceExcerpt)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
  }).join('');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading"><div><h2>${tx(locale, 'Metinden deney hazırlama provenansı', 'Prepare-from-text provenance')}</h2><span>${tx(locale, 'Kullanıcı onayıyla forma uygulanan alanlar ve varsa AI takip soy ağacı', 'Fields applied to the form with user approval and AI follow-up lineage when present')}</span></div><strong class="status status-compatible">${history.length} ${tx(locale, 'uygulama', 'applications')}</strong></header>
      <p>${tx(
        locale,
        "Bu metin parser girdisidir; fiziksel ölçüm kaynağının kendisi değildir. AI takip akışında dış AI'nin serbest açıklaması saklanmaz; yalnız kanonik test bloğu, hash zinciri ve kullanıcı tarafından uygulanan alanlar korunur.",
        "This text is parser input; it is not itself the physical measurement source. In the AI follow-up flow, the external AI's free-form explanation is not stored; only the canonical test block, hash chain and user-applied fields are retained."
      )}</p>
      <div class="trace-list">${entries}</div>
    </section>`;
}
