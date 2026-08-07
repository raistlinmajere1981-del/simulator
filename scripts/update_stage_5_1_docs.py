from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

roadmap = Path('docs/roadmap.md')
text = roadmap.read_text()
old = """# Sıradaki ana ürün aşamaları

## Aşama 5 — Fotoğraf kalibrasyonu

- kamera ve lens bilgileri
- ufuk, hedef tabanı ve hedef tepesi işaretleme
- piksel-açı dönüşümü
- ölçüm belirsizliği üretimi

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
"""
new = """# Aşama 5 — Fotoğraf kalibrasyonu

## Aşama 5.1 — Fotoğraf ve kamera kalibrasyonu çekirdeği

Durum: tamamlandı · `1.3.3`

- sensör + odak uzaklığı veya yatay/düşey FOV ile pinhole iç parametre çözümü
- piksel → kamera ışını ve piksel → düşey açı dönüşümü
- iki noktalı ufuk/referans çizgisinden roll ve yerel açı referansı
- hedef tabanı / hedef tepesi için referansa göre açılar ve hedef açısal yüksekliği
- işaret belirsizliğini 256 uç durumla koruyucu açı zarfına yayma
- düzeltilmemiş lens distorsiyonunu açık sistematik hata uyarısı olarak koruma
- işaretlenen çizgiyi otomatik fiziksel/astronomik ufuk saymama
- ModelPrediction provenansı ve hesap izi

Ayrıntı: [`roadmap-stage-5.1.md`](roadmap-stage-5.1.md)

# Sıradaki ana ürün aşamaları

## Aşama 5.2 — Fotoğraf yükleme ve etkileşimli işaretleme

- yerel fotoğraf yükleme ve kaynak provenansı
- kamera/lens parametre editörü
- ufuk başlangıç/son, hedef tabanı ve hedef tepesi işaretleme
- 5.1 açı/belirsizlik sonuçlarının deney kaydına bağlanması
- `.ggl.json` ve HTML rapor koruması

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
"""
text = replace_once(text, old, new, 'roadmap stage 5.1')
roadmap.write_text(text)

readme = Path('README.md')
text = readme.read_text()
text = text.replace(
    '- Fotoğraf ve kamera/lens kalibrasyonu\n',
    '- Fotoğraf yükleme ve etkileşimli kamera/işaretleme arayüzü\n',
    1
)
text = replace_once(
    text,
    '- [`docs/roadmap-stage-4.5.md`](docs/roadmap-stage-4.5.md)\n',
    '- [`docs/roadmap-stage-4.5.md`](docs/roadmap-stage-4.5.md)\n- [`docs/roadmap-stage-5.1.md`](docs/roadmap-stage-5.1.md)\n',
    'README stage 5.1 doc link'
)
old_status = "Aktif geliştirme sürümü `1.3.2`dir. Üç görünürlük senaryosu, kayıt/raporlama, WGS84, arazi/DEM, jeoit ve su yüzeyi akışlarına ek olarak katmanlı meteorolojik atmosferin Ciddor/RK4 fizik yolu İdeal Küre görünürlük ve ufuk sonuçlarına bağlanmış; atmosfer kabukları, optik ışın ve geometrik LOS 3B sahnede hesap motorundan bağımsız bir görsel katman olarak kullanılabilir hale gelmiştir. Sıradaki ana fiziksel ürün aşaması fotoğraf ve kamera/lens kalibrasyonudur."
new_status = "Aktif geliştirme sürümü `1.3.3`tür. Üç görünürlük senaryosu, kayıt/raporlama, WGS84, arazi/DEM, jeoit, su yüzeyi ve katmanlı atmosfer akışlarına ek olarak fotoğraf kalibrasyon çekirdeği; pinhole kamera iç parametreleri, iki noktalı görüntü referans çizgisi, piksel-açı dönüşümü ve koruyucu işaret belirsizliği zarfını hesaplayabilir. Sıradaki ürün aşaması bu çekirdeği yerel fotoğraf yükleme ve etkileşimli işaretleme arayüzüne bağlamaktır."
text = replace_once(text, old_status, new_status, 'README status')
readme.write_text(text)
