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
    '- atmosfer modu, meteorolojik profil ve optik ayarlar,\n- model sürümleri ve sonuç anlık görüntülerini\n',
    '- atmosfer modu, meteorolojik profil ve optik ayarlar,\n- fotoğraf kaynak bütünlüğü, kamera kalibrasyonu ve piksel işaretleri,\n- model sürümleri ve sonuç anlık görüntülerini\n',
    'README photo persistence'
)
text = replace_once(
    text,
    '- Model, jeodezi, arazi, jeoit ve su yüzeyi hesap izlerinin raporda korunması\n',
    '- Model, jeodezi, arazi, jeoit, su yüzeyi ve fotoğraf kalibrasyon hesap izlerinin raporda korunması\n',
    'README photo report'
)
text = text.replace('- Fotoğraf yükleme ve etkileşimli kamera/işaretleme arayüzü\n', '', 1)
text = replace_once(
    text,
    '- [`docs/roadmap-stage-5.1.md`](docs/roadmap-stage-5.1.md)\n',
    '- [`docs/roadmap-stage-5.1.md`](docs/roadmap-stage-5.1.md)\n- [`docs/roadmap-stage-5.2.md`](docs/roadmap-stage-5.2.md)\n',
    'README stage 5.2 doc'
)
old_status = "Aktif geliştirme sürümü `1.3.3`tür. Üç görünürlük senaryosu, kayıt/raporlama, WGS84, arazi/DEM, jeoit, su yüzeyi ve katmanlı atmosfer akışlarına ek olarak fotoğraf kalibrasyon çekirdeği; pinhole kamera iç parametreleri, iki noktalı görüntü referans çizgisi, piksel-açı dönüşümü ve koruyucu işaret belirsizliği zarfını hesaplayabilir. Sıradaki ürün aşaması bu çekirdeği yerel fotoğraf yükleme ve etkileşimli işaretleme arayüzüne bağlamaktır."
new_status = "Aktif geliştirme sürümü `1.4.0`dır. Fotoğraf/kamera kalibrasyonu artık yerel PNG/JPEG yükleme, SHA-256 kaynak provenansı, dört zorunlu etkileşimli işaret, FOV veya sensör+odak parametreleri, piksel-açı/belirsizlik hesabı, deney yeniden açma ve HTML rapor akışına bağlıdır. Fotoğraf baytları yerel/taşınabilir deney JSON’una gömülmez. Sıradaki fotoğraf aşaması açısal fotoğraf ölçümünü model tahminleriyle ayrı bir değerlendirme metriği olarak karşılaştırmaktır."
text = replace_once(text, old_status, new_status, 'README status')
readme.write_text(text)

roadmap = Path('docs/roadmap.md')
text = roadmap.read_text()
old = """# Sıradaki ana ürün aşamaları

## Aşama 5.2 — Fotoğraf yükleme ve etkileşimli işaretleme

- yerel fotoğraf yükleme ve kaynak provenansı
- kamera/lens parametre editörü
- ufuk başlangıç/son, hedef tabanı ve hedef tepesi işaretleme
- 5.1 açı/belirsizlik sonuçlarının deney kaydına bağlanması
- `.ggl.json` ve HTML rapor koruması

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
"""
new = """## Aşama 5.2 — Fotoğraf yükleme ve etkileşimli işaretleme

Durum: tamamlandı · `1.4.0`

- Electron üzerinden yerel PNG/JPEG seçimi ve 25 MB üst sınırı
- kaynak fotoğraf için dosya adı, boyut, SHA-256, MIME ve piksel boyutu provenansı
- fotoğraf `data:` önizlemesini yalnız oturumda tutma; deney JSON’una gömmeme
- referans sol/sağ + hedef tabanı/tepesi için dört zorunlu kullanıcı işareti
- `object-fit: contain` boşluklarını dikkate alan doğal piksel eşleme
- FOV veya sensör+odak kamera parametre editörü
- asal nokta, işaret belirsizliği ve distorsiyon durumu
- 5.1 açı/belirsizlik çekirdeğine bağlantı
- fotoğraf kalibrasyon state/prediction/model sürümünün deneyle saklanması
- `.ggl.json` round-trip ve tahrif edilmiş fotoğraf provenansını reddetme
- HTML raporda kaynak/işaret/kamera provenansı ve genel hesap izi
- görüntü baytlarının taşınabilir kayıt/rapora sızmadığını regresyon testleriyle koruma

Ayrıntı: [`roadmap-stage-5.2.md`](roadmap-stage-5.2.md)

# Sıradaki ana ürün aşamaları

## Aşama 5.3 — Fotoğraf açısal gözlem değerlendirmesi

- fotoğraftaki hedef taban/tepe açılarını model tahminleriyle karşılaştırma
- fotoğraf ölçüm belirsizliğini ayrı gözlem kanalı olarak değerlendirme
- sayısal görünürlük yüzdesiyle fotoğraf açısal ölçümünü birbirine karıştırmama
- kamera ve distorsiyon provenansı için kalite tanıları

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
"""
text = replace_once(text, old, new, 'roadmap stage 5.2')
roadmap.write_text(text)
