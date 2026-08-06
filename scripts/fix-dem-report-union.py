from pathlib import Path

path = Path('src/report/html-report.ts')
text = path.read_text(encoding='utf-8')
old = """  const detailRows = source.kind === 'csv' ? `
    <tr><td>Kaynak türü</td><td>CSV / TSV</td></tr>
    <tr><td>Ayırıcı</td><td>${escapeHtml(delimiterLabels[source.delimiter])}</td></tr>
    <tr><td>Mesafe birimi</td><td>${escapeHtml(distanceUnitLabels[source.distanceUnit])}</td></tr>
    <tr><td>Kaynak satır sayısı</td><td>${source.rowCount}</td></tr>
    <tr><td>Mesafe sütunu</td><td>${escapeHtml(source.distanceColumnHeader)}</td></tr>
    <tr><td>Yükseklik sütunu</td><td>${escapeHtml(source.elevationColumnHeader)}</td></tr>` : `
    <tr><td>Kaynak türü</td><td>GeoJSON</td></tr>
    <tr><td>Geometri</td><td>${escapeHtml(source.geometryType)}</td></tr>
    <tr><td>Koordinat sayısı</td><td>${source.coordinateCount}</td></tr>
    <tr><td>Koordinat referansı</td><td>WGS84 boylam / enlem</td></tr>
    <tr><td>Yükseklik kaynağı</td><td>Koordinatların üçüncü bileşeni (Z)</td></tr>
    <tr><td>Başlangıç koordinatı</td><td>${coordinateFormatter.format(source.startLatitudeDeg)}°, ${coordinateFormatter.format(source.startLongitudeDeg)}°</td></tr>
    <tr><td>Bitiş koordinatı</td><td>${coordinateFormatter.format(source.endLatitudeDeg)}°, ${coordinateFormatter.format(source.endLongitudeDeg)}°</td></tr>
    <tr><td>Rota koordinatları</td><td>Deneye uygulandı: ${yesNo(source.appliedRouteCoordinates === true)}</td></tr>`;
"""
new = """  const detailRows = source.kind === 'csv' ? `
    <tr><td>Kaynak türü</td><td>CSV / TSV</td></tr>
    <tr><td>Ayırıcı</td><td>${escapeHtml(delimiterLabels[source.delimiter])}</td></tr>
    <tr><td>Mesafe birimi</td><td>${escapeHtml(distanceUnitLabels[source.distanceUnit])}</td></tr>
    <tr><td>Kaynak satır sayısı</td><td>${source.rowCount}</td></tr>
    <tr><td>Mesafe sütunu</td><td>${escapeHtml(source.distanceColumnHeader)}</td></tr>
    <tr><td>Yükseklik sütunu</td><td>${escapeHtml(source.elevationColumnHeader)}</td></tr>` : source.kind === 'geojson' ? `
    <tr><td>Kaynak türü</td><td>GeoJSON</td></tr>
    <tr><td>Geometri</td><td>${escapeHtml(source.geometryType)}</td></tr>
    <tr><td>Koordinat sayısı</td><td>${source.coordinateCount}</td></tr>
    <tr><td>Koordinat referansı</td><td>WGS84 boylam / enlem</td></tr>
    <tr><td>Yükseklik kaynağı</td><td>Koordinatların üçüncü bileşeni (Z)</td></tr>
    <tr><td>Başlangıç koordinatı</td><td>${coordinateFormatter.format(source.startLatitudeDeg)}°, ${coordinateFormatter.format(source.startLongitudeDeg)}°</td></tr>
    <tr><td>Bitiş koordinatı</td><td>${coordinateFormatter.format(source.endLatitudeDeg)}°, ${coordinateFormatter.format(source.endLongitudeDeg)}°</td></tr>
    <tr><td>Rota koordinatları</td><td>Deneye uygulandı: ${yesNo(source.appliedRouteCoordinates === true)}</td></tr>` : `
    <tr><td>Kaynak türü</td><td>ESRI ASCII DEM</td></tr>
    <tr><td>Grid boyutu</td><td>${source.columnCount} × ${source.rowCount} hücre</td></tr>
    <tr><td>Hücre boyutu</td><td>${coordinateFormatter.format(source.cellSizeDeg)}°</td></tr>
    <tr><td>Rota örneği</td><td>${source.sampleCount} nokta · ${inputNumberFormatter.format(source.sampleSpacingM)} m aralık</td></tr>
    <tr><td>Örnekleme</td><td>${source.samplingMethod === 'bilinear' ? 'İki doğrusal' : 'En yakın hücre'}</td></tr>
    <tr><td>Jeodezik yöntem</td><td>${source.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'Küresel yedek'}</td></tr>`;
"""
if text.count(old) != 1:
    raise RuntimeError(f'Expected one terrain report detail union, found {text.count(old)}')
text = text.replace(old, new, 1)
old_heading = """        <strong>${source.kind === 'csv' ? 'CSV / TSV kaynak kaydı' : 'GeoJSON kaynak kaydı'}</strong>
"""
new_heading = """        <strong>${source.kind === 'csv' ? 'CSV / TSV kaynak kaydı' : source.kind === 'geojson' ? 'GeoJSON kaynak kaydı' : 'ESRI ASCII DEM kaynak kaydı'}</strong>
"""
if text.count(old_heading) != 1:
    raise RuntimeError(f'Expected one terrain report heading, found {text.count(old_heading)}')
path.write_text(text.replace(old_heading, new_heading, 1), encoding='utf-8')
