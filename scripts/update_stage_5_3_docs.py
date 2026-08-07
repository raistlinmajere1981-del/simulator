from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


readme = Path('README.md')
text = readme.read_text()
text = replace_once(
    text,
    '- fotoğraf kaynak bütünlüğü, kamera kalibrasyonu ve piksel işaretleri,\n- model sürümleri ve sonuç anlık görüntülerini',
    '- fotoğraf kaynak bütünlüğü, kamera kalibrasyonu, piksel işaretleri ve U1–U2 referans anlamı,\n- fotoğraf açısal gözlem–model karşılaştırma snapshot ve hesap izleri,\n- model sürümleri ve sonuç anlık görüntülerini',
    'README experiment records'
)
text = replace_once(
    text,
    '- Model, jeodezi, arazi, jeoit, su yüzeyi ve fotoğraf kalibrasyon hesap izlerinin raporda korunması',
    '- Model, jeodezi, arazi, jeoit, su yüzeyi, fotoğraf kalibrasyonu ve açısal karşılaştırma hesap izlerinin raporda korunması',
    'README report coverage'
)
text = replace_once(
    text,
    '- [`docs/roadmap-stage-5.2.md`](docs/roadmap-stage-5.2.md)\n',
    '- [`docs/roadmap-stage-5.2.md`](docs/roadmap-stage-5.2.md)\n- [`docs/roadmap-stage-5.3.md`](docs/roadmap-stage-5.3.md)\n',
    'README stage 5.3 link'
)
old_status = 'Aktif geliştirme sürümü `1.4.0`dır. Fotoğraf/kamera kalibrasyonu artık yerel PNG/JPEG yükleme, SHA-256 kaynak provenansı, dört zorunlu etkileşimli işaret, FOV veya sensör+odak parametreleri, piksel-açı/belirsizlik hesabı, deney yeniden açma ve HTML rapor akışına bağlıdır. Fotoğraf baytları yerel/taşınabilir deney JSON’una gömülmez. Sıradaki fotoğraf aşaması açısal fotoğraf ölçümünü model tahminleriyle ayrı bir değerlendirme metriği olarak karşılaştırmaktır.'
new_status = 'Aktif geliştirme sürümü `1.4.1`dir. Fotoğraf/kamera kalibrasyonu yerel PNG/JPEG yükleme, SHA-256 provenansı, etkileşimli işaretler ve piksel→açı hesabına ek olarak model sonuçlarıyla **bağımsız açısal gözlem kanalı** üzerinden karşılaştırılır. U1–U2 çizgisi varsayılan olarak yalnız görsel referanstır; fiziksel yerel yatay olduğu kullanıcı tarafından açıkça belirtilmedikçe mutlak taban/tepe açıları puanlanmaz. Görüntüdeki deniz ufku otomatik yerel yatay sayılmaz. Fotoğraf baytları deney JSON’una gömülmez.'
text = replace_once(text, old_status, new_status, 'README status')
readme.write_text(text)


roadmap = Path('docs/roadmap.md')
text = roadmap.read_text()
old = '''# Sıradaki ana ürün aşamaları

## Aşama 5.3 — Fotoğraf açısal gözlem değerlendirmesi

- fotoğraftaki hedef taban/tepe açılarını model tahminleriyle karşılaştırma
- fotoğraf ölçüm belirsizliğini ayrı gözlem kanalı olarak değerlendirme
- sayısal görünürlük yüzdesiyle fotoğraf açısal ölçümünü birbirine karıştırmama
- kamera ve distorsiyon provenansı için kalite tanıları

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
'''
new = '''## Aşama 5.3 — Fotoğraf açısal gözlem değerlendirmesi

Durum: tamamlandı · `1.4.1`

- fotoğraf kalibrasyonunu model hesabına geri beslemeyen bağımsız gözlem kanalı
- U1–U2 için `visual-reference` / açık `local-horizontal` semantiği
- görsel referansta yalnız ofsetten bağımsız hedef açısal yüksekliğini karşılaştırma
- fiziksel yerel yatay açıkça seçildiğinde görünür hedef taban/tepe açılarını karşılaştırma
- model hedef tabanını görünmez öngörüyorsa tam hedef yüksekliği için sahte uyum puanı üretmeme
- İdeal Küre ve Tanımlı Düzlemde taban/tepe/tam açısal yükseklik metrikleri
- katmanlı atmosferde fiziksel taban ışını bulunamadığında taban/tam yükseklik metriklerini `null` bırakma
- fotoğraf ± işaret belirsizliğiyle ilk izlenebilir uyum testi
- comparison snapshot/modelVersion/hesap izini deney ve HTML raporda koruma
- eski fotoğraf kayıtlarında eksik referans anlamını alan uydurmadan güvenli `visual-reference` olarak yorumlama

Ayrıntı: [`roadmap-stage-5.3.md`](roadmap-stage-5.3.md)

# Sıradaki ana ürün aşamaları

## Aşama 5.4 — Birleşik fotoğraf/model belirsizlik zarfı

- kamera iç-parametre belirsizliği
- mesafe, kot ve atmosfer belirsizliğinin açı tahminine yayılması
- fotoğraf işaret belirsizliğiyle birleşik değerlendirme
- yalnız tek ± fotoğraf aralığına dayanmayan istatistiksel uyum raporu

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
'''
text = replace_once(text, old, new, 'roadmap stage 5.3')
roadmap.write_text(text)
