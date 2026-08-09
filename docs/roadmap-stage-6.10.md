# Aşama 6.10 — BSC5P resmi kaynak satırı ve doğrulama temeli

Durum: tamamlandı · `1.13.2`

## Amaç

Aşama 6.9 proper-motion matematiğini tanımladı; ancak uygulamadaki 19 yıldız için `pmRA` / `pmDE` değerlerini elle kopyalamak kolon kayması, yanlış HR satırı ve boş alanı sıfır sanma gibi veri bütünlüğü riskleri doğurur. Bu aşama, Bright Star Catalogue kaynak satırını resmi sabit-genişlik biçiminden deterministik olarak okuyup mevcut yıldız referansıyla doğrulayacak katmanı ekler.

## Kaynak sözleşmesi

Temel alınan kaynak biçimi CDS katalog `V/50` Bright Star Catalogue 5th Revised Edition'ın 197 karakterlik ana kaydıdır.

Kod düzeyinde sabitlenen başlıca alanlar:

- byte `1–4`: HR
- byte `5–14`: katalog adı
- byte `26–31`: HD
- byte `32–37`: SAO
- byte `38–41`: FK5
- byte `76–83`: J2000 sağ açıklık (`hh mm ss.s`)
- byte `84–90`: J2000 deklinasyon (`±dd mm ss`)
- byte `103–107`: V kadri
- byte `149–154`: `pmRA`, yay-saniyesi/yıl
- byte `155–160`: `pmDE`, yay-saniyesi/yıl
- byte `162–166`: paralaks
- byte `167–170`: radyal hız
- byte `197`: not bayrağı

`pmRA`, katalog tanımındaki projeksiyonlu bileşen `μ_α* = cos(δ)·dα/dt` olarak korunur; 6.9 proper-motion motoruyla aynı semantik kullanılır.

## Parser davranışı

`bsc5p-fixed-width@0.1.0` katmanı:

- kayıt uzunluğunu tam 197 karakter olarak doğrular,
- HR aralığını doğrular,
- J2000 RA/Dec alanlarının ya tamamını ya hiçbirini kabul eder,
- RA/Dec alt alanlarının fiziksel aralıklarını denetler,
- sayısal boş alanları `0` yapmak yerine `null` bırakır,
- `pmRA`, `pmDE`, paralaks ve radyal hızı ayrı alanlar olarak korur,
- çoklu kaynak metninde yinelenen HR kayıtlarını reddeder,
- kaynak epokunu `J2000.0`, kaynak çerçevesini açıkça `FK5/J2000` olarak etiketler.

## Yanlış satır koruması

Kaynak satırı doğrudan yıldız kaydına bağlanmaz. `bsc5p-reference-validation` katmanı önce:

1. HR numarasını,
2. J2000 gökyüzü konumunu,
3. V kadrini

mevcut çevrimdışı parlak-yıldız referansıyla karşılaştırır.

BSC5P'nin kaynak hassasiyetini karşılamak için J2000 konumunda en fazla `3″` açısal fark kabul edilir. V kadri iki ondalık kaynak hassasiyetine uygun dar toleransla karşılaştırılır.

Proper motion entegrasyonu isteniyorsa `pmRA` ve `pmDE` bileşenlerinin ikisi de bulunmak zorundadır. Boş bileşen hiçbir koşulda sessizce `0` kabul edilmez.

## Bu aşamada özellikle yapılmayanlar

Bu checkpoint henüz uygulamadaki 19 yıldızın gerçek proper-motion sayılarını değiştirmez. Dolayısıyla mevcut Yıldız Gözlemleri sonucu 6.8 davranışını korur.

Kaynak verisi elde edilmeden:

- proper-motion değeri tahmin edilmez,
- Gaia/SIMBAD/başka katalog değeri BSC5P provenansı altında kullanılmaz,
- eksik PM alanı sıfıra çevrilmez,
- FK5/J2000 satırı otomatik olarak ICRS etiketiyle yeniden adlandırılmaz.

## Doğrulama

Regresyonlar şunları kapsar:

- resmi byte aralıklarından HR/J2000/Vmag/pmRA/pmDE okuma,
- boş alanların `null` korunması,
- tam boş J2000 konumu ve kısmi bozuk konum ayrımı,
- kayıt uzunluğu ve koordinat aralığı doğrulaması,
- yinelenen HR reddi,
- HR + J2000 konum + Vmag referans eşleştirmesi,
- yanlış HR/konum/kadir reddi,
- PM alanı eksikken veri zenginleştirmesini durdurma.

## Sonraki dilim

- resmi BSC5P kaynak kayıtlarından 19 HR satırını elde etme,
- parser + referans doğrulamasından geçen `pmRA` / `pmDE` değerlerini provenanslı altkümeye üretme,
- proper motion → precession → yerel yıldız konumu zincirini bağlama,
- proper-motion açısal katkısını prediction ve HTML hesap izinde ayrı gösterme,
- paralaks ve radyal hızın henüz uygulanmadığını koruma.
