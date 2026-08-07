from pathlib import Path

# Renderer safety refinements.
path = Path('src/renderer/src/WorldModelViewport.tsx')
text = path.read_text()

old = """  const visualProfile = buildTerrainVisualizationProfile(profile);
  const basePoints: THREE.Vector3[] = [];
  const ridgePoints: THREE.Vector3[] = [];

  if (kind === 'plane') {"""
new = """  let visualProfile;
  try {
    visualProfile = buildTerrainVisualizationProfile(profile);
  } catch {
    return;
  }
  const basePoints: THREE.Vector3[] = [];
  const ridgePoints: THREE.Vector3[] = [];

  if (kind === 'plane') {"""
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('terrain validation safety anchor not found')

old = """  } else {
    const path = createWgs84GeodesicPath(observerCoordinate, targetCoordinate);
    for (const sample of visualProfile.samples) {"""
new = """  } else {
    let path;
    try {
      path = createWgs84GeodesicPath(observerCoordinate, targetCoordinate);
    } catch {
      return;
    }
    for (const sample of visualProfile.samples) {"""
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('terrain geodesic safety anchor not found')

old = """      controlsRef.current = null;
      gridGroupRef.current = null;
      boundaryGroupRef.current = null;
      renderRef.current = () => undefined;
      if (scene) disposeScene(scene);"""
new = """      controlsRef.current = null;
      gridGroupRef.current = null;
      boundaryGroupRef.current = null;
      terrainGroupRef.current = null;
      renderRef.current = () => undefined;
      if (scene) disposeScene(scene);"""
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('terrain cleanup safety anchor not found')

path.write_text(text)

# README status.
path = Path('README.md')
text = path.read_text()
text = text.replace(
    '`1.1.1` ile model kartları Three.js tabanlı etkileşimli WebGL sahneleri ve çevrimdışı coğrafi yardımcı katmanlar kullanır:',
    '`1.1.2` ile model kartları Three.js tabanlı etkileşimli WebGL sahneleri, çevrimdışı coğrafi yardımcı katmanlar ve rota tabanlı arazi görselleştirmesi kullanır:'
)
text = text.replace(
    '- tek tıklamayla başlangıç kamera görünümüne dönme,\n',
    '- tek tıklamayla başlangıç kamera görünümüne dönme,\n- manuel/CSV/GeoJSON/DEM profilinden rota boyunca göreli arazi yükselti şeridi,\n- topografya katmanını bağımsız açma/kapatma ve kaynak türünü sahnede belirtme,\n'
)
text = text.replace(
    'Görselleştirme fiziksel hesap motorunun kaynağı değildir. Coğrafi sınırlar ve ızgara deney girdilerini veya model tahminlerini değiştirmez.',
    'Görselleştirme fiziksel hesap motorunun kaynağı değildir. Coğrafi sınırlar, ızgara ve topografya şeridi deney girdilerini veya model tahminlerini değiştirmez. Arazi kotları hesap motorunda metre olarak korunur; 3B sahnedeki yükseklik yalnız göreli biçimi görünür kılmak için sınırlı olarak ölçeklenir.'
)
text = text.replace(
    '- Arazi profilini 3B model sahnesiyle ilişkilendirme ve topografya görsel katmanı\n',
    ''
)
text = text.replace(
    '- [`docs/roadmap-stage-3.25.md`](docs/roadmap-stage-3.25.md)\n',
    '- [`docs/roadmap-stage-3.25.md`](docs/roadmap-stage-3.25.md)\n- [`docs/roadmap-stage-3.26.md`](docs/roadmap-stage-3.26.md)\n'
)
text = text.replace(
    'Aktif geliştirme sürümü `1.1.1`dir. Hedef görünürlüğü motoru, kayıt/raporlama, WGS84 koordinatları, manuel/CSV/GeoJSON/DEM arazi profilleri, jeoit dönüşümü, kontrollü su yüzeyi uygulaması, Three.js tabanlı etkileşimli model sahneleri ve çevrimdışı ülke/kıyı sınırı ile ızgara katmanları aynı deney akışında çalışmaktadır. Sıradaki ana ürün aşaması arazi profilinin ve DEM kaynağının 3B sahneyle ilişkilendirilmesidir.',
    'Aktif geliştirme sürümü `1.1.2`dir. Hedef görünürlüğü motoru, kayıt/raporlama, WGS84 koordinatları, manuel/CSV/GeoJSON/DEM arazi profilleri, jeoit dönüşümü, kontrollü su yüzeyi uygulaması, Three.js tabanlı etkileşimli model sahneleri, çevrimdışı ülke/kıyı sınırı, ızgara ve rota tabanlı topografya görselleştirmesi aynı deney akışında çalışmaktadır. Sıradaki ana ürün aşaması ayrı ufuk ve uzun mesafe görüş senaryolarıdır.'
)
path.write_text(text)

# Main roadmap status.
path = Path('docs/roadmap.md')
text = path.read_text()
old = """# Sıradaki ana ürün aşamaları

## Aşama 3.26 — Arazi profilinin 3B sahneyle ilişkilendirilmesi

Durum: sıradaki

- rota boyunca arazi yükseklik şeridi
- DEM/manuel profil kaynağının 3B sahnede açık gösterimi
- görünürlük hesabı ile görsel yükseltme ölçeğinin birbirine karıştırılmaması
- topografya katmanı için görsel kaynak/ölçek bilgisi

## Aşama 3.27 — Ayrı ufuk ve uzun mesafe görüş senaryoları
"""
new = """## Aşama 3.26 — Arazi profilinin 3B sahneyle ilişkilendirilmesi

Durum: tamamlandı · `1.1.2`

- rota boyunca göreli arazi yükseklik şeridi
- manuel/CSV/GeoJSON/DEM kaynak etiketinin görsel katmanda korunması
- kürede WGS84 jeodezik rota üzerinde arazi çizimi
- tanımlı düzlemde yerel rota ekseninde arazi çizimi
- azimutal kartografik referansta yalnız veri şeridi olarak gösterim
- metre kotlarının hesap motorunda değişmeden korunması
- görsel yükseltmenin fiziksel geometri olmadığına dair açık etiket
- topografya katmanını bağımsız açma/kapatma

Ayrıntı: [`roadmap-stage-3.26.md`](roadmap-stage-3.26.md)

# Sıradaki ana ürün aşamaları

## Aşama 3.27 — Ayrı ufuk ve uzun mesafe görüş senaryoları
"""
if old not in text:
    if new not in text:
        raise SystemExit('roadmap stage 3.26 anchor not found')
else:
    text = text.replace(old, new, 1)
path.write_text(text)
