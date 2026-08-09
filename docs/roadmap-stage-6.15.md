# Aşama 6.15 — Yıldız yerel ufuk arayüzü, kayıt ve rapor entegrasyonu

Durum: tamamlanma adayı · `1.14.0`

## Amaç

Aşama 6.12 yerel/doğal skyline maskesi ile Aşama 6.14 yerel-ufuk yıldız izi çekirdeğini gerçek **Yıldız Gözlemleri** iş akışına bağlamak; astronomik `0°` ufuk ile kullanıcının yerel skyline sınırını hem hesapta hem ekranda açıkça ayrı tutmak.

## Kullanıcı girişi

İlk kullanıcı sözleşmesi, tam 360° ufku sekiz ana yönde tanımlar:

- K · 0°
- KD · 45°
- D · 90°
- GD · 135°
- G · 180°
- GB · 225°
- B · 270°
- KB · 315°

Her değer geometrik ufuk yüksekliğidir ve `[-90°, +90°]` aralığında doğrulanır. Ara azimutlar Aşama 6.12'nin döngüsel doğrusal interpolasyonuyla çözülür. Yerel ufuk varsayılan olarak kapalıdır.

Bu sekiz yönlü editör, yüksek çözünürlüklü skyline dosya importunun yerine geçmez; anlaşılır ve kaydedilebilir ilk UI katmanıdır. Gelecekte daha yoğun maskeler aynı temel `StellarLocalHorizonMask` sözleşmesine bağlanabilir.

## Panel çıktıları

Yerel ufuk etkin olduğunda panel:

- anlık yıldız yüksekliğini ve azimutunu,
- aynı azimuttaki interpolasyonlu yerel ufuk yüksekliğini,
- `Δh = h_yıldız - h_skyline(A)` açıklığını,
- astronomik `0°` ufuk durumunu,
- yerel skyline durumunu,
- astronomik `0°` ufuk üstü süreyi,
- yerel ufuk üstü geometrik süreyi,
- iki ayrı geçiş listesini
  - `0°` astronomik doğuş/batış,
  - yerel skyline doğuş/batış

gösterir.

## Grafik ayrımı

Yıldız izi grafiğinde üç farklı geometrik öğe ayrı tutulur:

1. yıldız yüksekliği zaman serisi,
2. sabit `0°` astronomik ufuk çizgisi,
3. yıldızın anlık azimutuna karşılık gelen yerel skyline yüksekliği zaman serisi.

Böylece yükseltilmiş bir dağ/engel ufku, astronomik `0°` sınırının yerine geçirilmez.

## Kayıt ve taşınabilirlik

Yerel ufuk ayarları yeni bir top-level `.ggl.json` alanı açmadan mevcut prediction snapshot mekanizmasında saklanır:

- yerel ufuk etkin/kapalı durumu,
- sekiz yönün geometrik yükseklikleri,
- anlık yerel ufuk yüksekliği ve açıklığı,
- pencere içindeki yerel ufuk üstü geometrik süre.

Bunun sonucu olarak:

- kaydet → tekrar aç akışı ayarları geri yükler,
- `.ggl.json` export/import aynı metrikleri korur,
- HTML rapor yerel ufuk girdilerini ve sonuçlarını normal model metrikleriyle birlikte taşır,
- 6.15 öncesi yıldız kayıtlarında bu metrikler yoksa yerel ufuk güvenli biçimde **kapalı** ve yön değerleri `0°` olarak açılır.

## Bilimsel sınır

Yerel ufuk sonucu hâlâ **geometrik** bir sonuçtur. Aşama 6.13 standart atmosferik kırılma / apparent-altitude çekirdeği bu panelde yerel skyline ile otomatik bir görünürlük sonucu üretmek üzere birleştirilmez.

Bu aşamada uygulanmayanlar:

- gerçek meteorolojik atmosfer profiline bağlı astronomik refraction,
- extinction,
- sky brightness,
- bulut,
- seeing,
- insan gözü algı eşiği,
- yüksek çözünürlüklü skyline dosya importu,
- doğal ufuk nesnesinin kendi refraktif/apparent davranışı.

Dolayısıyla paneldeki `yerel ufkun üstünde` ifadesi yalnız geometrik yön açıklığıdır; çıplak-göz görünürlüğü iddiası değildir.

## Geriye dönük uyumluluk

- mevcut astronomik `0°` yıldız izi sonucu korunur,
- yeni yerel-ufuk sonucu bunun yanında ayrı gösterilir,
- eski yıldız kayıtları ve portable dosyalar yeni alanlar olmadan açılabilir,
- model snapshot sürümü `stellar-observation-reference@0.2.0` olur,
- uygulama sürümü `1.14.0` olur.

## Doğrulama hedefleri

- yerel ufuk kapalıyken eski Yıldız Gözlemleri davranışı,
- sekiz yönlü skyline etkinleştirildiğinde local-horizon trail üretimi,
- yön değerlerinin prediction snapshot'a yazılması ve eksiksiz tekrar açılması,
- eski prediction'ların yerel ufuk kapalı olarak güvenli açılması,
- portable `.ggl.json` round-trip,
- HTML raporda yerel ufuk metrikleri, provenans ve bilimsel sınırlar,
- strict TypeScript,
- tüm regresyonlar,
- production Electron/Vite build,
- gerçek Electron UI görsel kontrolü.

## Sonraki dilimler

- yüksek çözünürlüklü skyline CSV/JSON importu ve kaynak bütünlüğü,
- apparent yıldız yüksekliği ile doğal skyline'ın fiziksel olarak güvenli karşılaştırma sözleşmesi,
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış proper-motion altkümesini gözlem zincirine bağlama,
- çoklu yıldız / gökyüzü görselleştirmesi.
