# Aşama 5.5 — Bağlamsal Yardım ve Terim Açıklamaları

Durum: planlandı · Aşama 6'dan önce

## Amaç

Uygulamanın büyüyen fizik, arazi, atmosfer, fotoğraf ve belirsizlik kapsamını tek bir uzun kullanım kılavuzuna yüklemek yerine, açıklamayı kullanıcının bulunduğu panelin bağlamına taşımak.

## Arayüz ilkeleri

- Yardım gerektiren ana panellerin sağ üst köşesinde küçük ve tutarlı bir `?` düğmesi bulunur.
- Düğme paneli terk ettirmeden overlay/modal açar.
- Overlay en az şu başlıkları destekler: panelin amacı, alanların anlamı ve birimleri, hangi girdilerin fiziksel hesaba girdiği, varsayımlar/sınırlamalar, yaygın kullanım hataları ve kısa örnek.
- Overlay `Esc` ile kapanır, klavye odağını doğru yönetir ve küçük ekranlarda kaydırılabilir kalır.
- Yardım açmak veya kapatmak deney state'ini, dirty durumunu veya hesap sonuçlarını değiştirmez.

## Tek içerik kaynağı

Panel yardımı ve üst çubuktaki genel `Yardım` görünümü aynı içerik kayıtlarından beslenir. Böylece aynı terim veya panel için iki farklı açıklama zamanla birbirinden kopmaz.

Önerilen içerik sözleşmesi:

- `panelId`
- başlık ve kısa özet
- alan/terim açıklamaları
- birimler
- fiziksel hesap etkisi
- varsayımlar ve sınırlamalar
- yaygın hatalar
- örnek kullanım
- ilgili diğer paneller/terimler

Üst `Yardım` görünümü bu kayıtları kategori, arama ve bağlantılarla toplu başvuru sayfasına dönüştürür.

## İlk kapsam

Öncelik sırası:

1. senaryo özeti ve mesafe/koordinat girdileri,
2. atmosfer ve optik kırılma,
3. düşey datum/arazi/DEM,
4. su yüzeyi,
5. fotoğraf ve kamera kalibrasyonu,
6. kamera/model belirsizliği ve karşılaştırma sonuçları,
7. model görselleştirmeleri ve katmanlar,
8. veri yöneticisi, kayıt, içe/dışa aktarma ve hesap izi.

## Terim sistemi

`datum`, `FOV`, `k`, `RSS`, `provenans`, `azimut`, `jeodezik`, `ortometrik`, `elipsoidal`, `Ciddor`, `DEM` gibi terimler tek sözlük kaynağında tutulmalı ve gerektiğinde panel yardımından bağlantılanmalıdır.

## Kabul ölçütleri

- Yardım içeriği hesap motoruna bağlı olmadan test edilebilir bir veri sözleşmesine sahip olmalı.
- Bir panelin yardım metni yalnız bir yerde tanımlanmalı.
- Üst Yardım görünümü panel yardım kayıtlarını yeniden kullanmalı.
- Yardım açma/kapatma deney girdilerini değiştirmemeli.
- Klavye ve odak davranışı masaüstü Electron ortamında doğrulanmalı.
