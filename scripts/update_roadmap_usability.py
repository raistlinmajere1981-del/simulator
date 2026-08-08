from pathlib import Path

path = Path('docs/roadmap.md')
text = path.read_text()
old = '''# Sıradaki ana ürün aşamaları

## Aşama 5.4 — Birleşik fotoğraf/model belirsizlik zarfı

- kamera iç-parametre belirsizliği
- mesafe, kot ve atmosfer belirsizliğinin açı tahminine yayılması
- fotoğraf işaret belirsizliğiyle birleşik değerlendirme
- yalnız tek ± fotoğraf aralığına dayanmayan istatistiksel uyum raporu

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
'''
new = '''## Aşama 5.4 — Birleşik fotoğraf/model belirsizlik zarfı

Durum: tamamlandı · `1.5.0`

- fotoğraf işaret belirsizliğine isteğe bağlı kamera iç-parametre belirsizliklerinin eklenmesi
- yatay/düşey FOV, odak uzaklığı, sensör boyutu ve asal nokta ± aralıklarının açı hassasiyetine yayılması
- yüzey mesafesi, göz yüksekliği, uç zemin kotları, hedef yüksekliği ve Standart `k` belirsizliğinin modeli alt/üst uçlarda yeniden çözerek yayılması
- koruyucu doğrusal toplam veya açık bağımsızlık varsayımıyla RSS birleşimi
- boş belirsizlik alanlarını `±0` saymama ve ölçülmemiş değer uydurmama
- belirsizlik aralığında fiziksel açı tanımsızlaşırsa sahte uyum puanı üretmeme
- kamera ve model belirsizlik provenansını deney, `.ggl.json` ve HTML raporda koruma

Ayrıntı: [`roadmap-stage-5.4.md`](roadmap-stage-5.4.md)

# Sıradaki ana ürün aşamaları

## Aşama 5.5 — Bağlamsal yardım ve terim açıklamaları

Durum: planlandı · Aşama 6'dan önce

- ana veri giriş, kalibrasyon, atmosfer, arazi, su, model ve sonuç panellerinin sağ üst köşesine küçük `?` yardım düğmesi
- yardım düğmesinin paneli kapatmadan overlay/modal içinde amaç, alanlar, birimler, fiziksel anlam, varsayımlar, hesap etkisi, yaygın hatalar ve kısa örnek göstermesi
- aynı yardım içeriğinin tek bir merkezi içerik kaynağından beslenmesi; panel yardımı ile üst çubuktaki `Yardım` görünümünün birbirinden kopmaması
- üstteki `Yardım` düğmesinin bütün panel açıklamalarını kategori ve arama ile bir araya getiren genel başvuru görünümüne dönüşmesi
- terimlerin (datum, FOV, k, RSS, provenans, azimut vb.) bağlama duyarlı açıklanması
- yardım katmanının deney state'ini veya hesap girdilerini değiştirmemesi
- klavye/odak/ESC davranışı ve küçük ekranlarda okunabilir overlay düzeni

## Aşama 5.6 — Metinden deney hazırlama ve kontrollü form doldurma

Durum: planlandı · Aşama 6'dan önce

- kullanıcının deneyi/gözlemi serbest metinle anlatabileceği tek bir giriş alanı
- koordinat, mesafe, göz ve hedef yüksekliği, zemin kotu, datum, atmosfer, fotoğraf/kamera bilgisi ve tanımlı belirsizlikler gibi mevcut UI alanlarına eşlenebilen değerlerin çıkarılması
- ayrıştırılan her değerin tipli bir `deney taslağı` ara katmanına yazılması; metin/AI çıktısının doğrudan React state'ine uygulanmaması
- birim eksikliği, çelişki, belirsiz ifade ve desteklenmeyen alanların açık uyarı olarak gösterilmesi; sessiz varsayım üretmeme
- çıkarılan değerlerin kaynak metindeki karşılığını/provenansını mümkün olduğunca koruma
- mevcut değerlerle fark önizlemesi ve alan bazında seçilebilir `uygula / atla` kontrolü
- kullanıcı onayı olmadan var olan deney girdilerinin üzerine yazmama
- AI/LLM kullanılacaksa sağlayıcıdan bağımsız adaptör ve şema doğrulaması; model cevabını güvenilir veri kabul etmeme
- ilk sürümde mevcut deney türlerini doldurma; ileride Güneş/Ay/yıldız senaryoları eklendiğinde aynı taslak sözleşmesini genişletme

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
'''
if old not in text:
    raise RuntimeError('roadmap anchor not found')
path.write_text(text.replace(old, new, 1))
Path('scripts/update_roadmap_usability.py').unlink(missing_ok=True)
Path('.github/workflows/update-roadmap-usability.yml').unlink(missing_ok=True)
