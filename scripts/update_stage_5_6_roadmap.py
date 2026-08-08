from pathlib import Path

path = Path('docs/roadmap.md')
text = path.read_text()
old = """# Sıradaki ana ürün aşamaları

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
"""
new = """## Aşama 5.5 — Bağlamsal yardım ve terim açıklamaları

Durum: tamamlandı · `1.6.0`

- merkezi tipli panel yardım kayıtları ve ortak terim sözlüğü
- ana panellerin sağ üstünde bağlamsal `?` düğmeleri
- tek ortak overlay üzerinden amaç, alanlar, birimler, hesap etkileri, varsayımlar, yaygın hatalar ve örnekler
- üst `Yardım` düğmesinden aynı içeriklerin aranabilir/toplu kataloğu
- datum, FOV, k, RSS, DEM, Ciddor, provenans ve azimut gibi bağlantılı terimler
- Escape, arka plan, odak dönüşü ve Tab/Shift+Tab klavye davranışı
- yardım state'inin deney state'i, dirty bayrağı ve hesap motorundan ayrılması

Ayrıntı: [`roadmap-stage-5.5.md`](roadmap-stage-5.5.md)

## Aşama 5.6 — Metinden deney hazırlama ve kontrollü form doldurma

Durum: tamamlandı · `1.7.0`

- çevrimdışı deterministik Türkçe gözlem notu ayrıştırıcısı
- tipli `ExperimentSetupDraft` ve `Bulundu / Kontrol gerekli / Kullanılamadı` sınıflandırması
- senaryo, mesafe/koordinat, göz/hedef yüksekliği, zemin kotları, datum/ofset, görünürlük, Standart k ve açık model belirsizliklerinin güvenli adaylara çıkarılması
- birimsiz, çelişkili veya ek provenans gerektiren değerleri otomatik uygulamama
- mevcut değer → önerilen değer fark önizlemesi
- alan bazında seçilebilir uygula/atla ve kullanıcı onayı olmadan React state'ine yazmama
- kaynak metin, parser sürümü, uygulama zamanı ve uygulanan alan parçalarını deney/.ggl.json/HTML raporunda provenans olarak koruma
- model girdi belirsizliğini fotoğraf kalibrasyonundan bağımsız deney state'i olarak saklama
- gelecekteki AI/LLM adaptörünün yalnız aynı tipli taslağa aday üretmesine izin veren mimari sınır

Ayrıntı: [`roadmap-stage-5.6.md`](roadmap-stage-5.6.md)

# Sıradaki ana ürün aşamaları

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri
"""
if old not in text:
    raise RuntimeError('roadmap stage 5.5/5.6 block not found')
path.write_text(text.replace(old, new, 1))
Path('scripts/update_stage_5_6_roadmap.py').unlink(missing_ok=True)
Path('.github/workflows/update-stage-5-6-roadmap.yml').unlink(missing_ok=True)
