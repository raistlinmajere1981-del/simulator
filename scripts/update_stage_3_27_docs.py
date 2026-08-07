from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


readme = Path('README.md')
text = readme.read_text()
text = text.replace('## Çalışan hedef görünürlüğü laboratuvarı', '## Çalışan gözlem senaryoları', 1)
text = replace_once(
    text,
    '### Fiziksel modeller ve gözlem\n',
    """### Senaryo akışları

`1.2.0` ile üç ayrı görünürlük senaryosu etkin durumdadır:

- **Hedef Görünürlüğü:** hedefin görünür/gizli bölümünü ölçüm ve belirsizlikle karşılaştırır.
- **Ufuk Analizi:** hedef, rota ve arazi gerektirmeden modelin geometrik ufuk tanımını hesaplar. İdeal kürede sonlu ufuk, tanımlı sonsuz düzlemde `∞`, azimutal kartografik referansta `unsupported` sonucu üretilir.
- **Uzun Mesafe Görüş:** rota, arazi ve uzak hedef bağlamını ayrı bir deney kimliği altında yönetir; fiziksel hesapları mevcut hedef görünürlüğü çekirdeğini kopyalamadan yeniden kullanır.

Senaryo kimliği yerel ve taşınabilir deney kayıtlarında korunur. Eski kayıtlarda senaryo alanı yoksa kayıt `Hedef Görünürlüğü` olarak açılır.

### Fiziksel modeller ve gözlem
""",
    'README scenario section'
)
text = text.replace(
    '- manuel/CSV/GeoJSON/DEM profilinden rota boyunca göreli arazi yükselti şeridi,\n- topografya katmanını bağımsız açma/kapatma ve kaynak türünü sahnede belirtme,\n- manuel/CSV/GeoJSON/DEM profilinden rota boyunca göreli arazi yükselti şeridi,\n- topografya katmanını bağımsız açma/kapatma ve kaynak türünü sahnede belirtme,\n',
    '- manuel/CSV/GeoJSON/DEM profilinden rota boyunca göreli arazi yükselti şeridi,\n- topografya katmanını bağımsız açma/kapatma ve kaynak türünü sahnede belirtme,\n',
    1
)
text = text.replace('- Ufuk analizi ve uzun mesafe görüş için ayrı deney senaryoları\n', '', 1)
text = text.replace(
    '- [`docs/roadmap-stage-3.26.md`](docs/roadmap-stage-3.26.md)\n- [`docs/roadmap-stage-3.26.md`](docs/roadmap-stage-3.26.md)\n',
    '- [`docs/roadmap-stage-3.26.md`](docs/roadmap-stage-3.26.md)\n- [`docs/roadmap-stage-3.27.md`](docs/roadmap-stage-3.27.md)\n',
    1
)
old_status = "Aktif geliştirme sürümü `1.1.2`dir. Hedef görünürlüğü motoru, kayıt/raporlama, WGS84 koordinatları, manuel/CSV/GeoJSON/DEM arazi profilleri, jeoit dönüşümü, kontrollü su yüzeyi uygulaması, Three.js tabanlı etkileşimli model sahneleri, çevrimdışı ülke/kıyı sınırı, ızgara ve rota tabanlı topografya görselleştirmesi aynı deney akışında çalışmaktadır. Sıradaki ana ürün aşaması ayrı ufuk ve uzun mesafe görüş senaryolarıdır."
new_status = "Aktif geliştirme sürümü `1.2.0`dir. Hedef Görünürlüğü, Ufuk Analizi ve Uzun Mesafe Görüş senaryoları; kayıt/raporlama, WGS84 koordinatları, manuel/CSV/GeoJSON/DEM arazi profilleri, jeoit dönüşümü, kontrollü su yüzeyi uygulaması ve Three.js tabanlı görselleştirmelerle aynı uygulama içinde çalışmaktadır. Sıradaki ana ürün aşaması gelişmiş atmosfer modelidir."
text = replace_once(text, old_status, new_status, 'README status')
readme.write_text(text)


roadmap = Path('docs/roadmap.md')
text = roadmap.read_text()
old = """# Sıradaki ana ürün aşamaları

## Aşama 3.27 — Ayrı ufuk ve uzun mesafe görüş senaryoları

- mevcut motorun özel deney akışlarına ayrılması
- senaryo bazlı giriş ve sonuç panelleri

## Aşama 4 — Gelişmiş atmosfer
"""
new = """## Aşama 3.27 — Ayrı ufuk ve uzun mesafe görüş senaryoları

Durum: tamamlandı · `1.2.0`

- Hedef Görünürlüğü, Ufuk Analizi ve Uzun Mesafe Görüş için ayrı senaryo kimlikleri
- ideal kürede hedefsiz geometrik ufuk hesabı
- tanımlı sonsuz düzlemde geometrik ufkun `∞` olarak açık gösterimi
- azimutal projeksiyonda fiziksel ufuk kuralı bulunmadığı için `unsupported`
- ufuk senaryosunda hedef/rota/arazi/su girdilerinin devreden çıkarılması
- uzun mesafe senaryosunda mevcut hedef görünürlüğü motorunun kopyalanmadan yeniden kullanılması
- senaryo kimliğinin yerel ve taşınabilir deney kayıtlarında korunması
- eski kayıtların güvenli biçimde Hedef Görünürlüğü senaryosuna taşınması

Ayrıntı: [`roadmap-stage-3.27.md`](roadmap-stage-3.27.md)

# Sıradaki ana ürün aşamaları

## Aşama 4 — Gelişmiş atmosfer
"""
text = replace_once(text, old, new, 'roadmap stage 3.27')
roadmap.write_text(text)
