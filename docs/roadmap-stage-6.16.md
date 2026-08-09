# Aşama 6.16 — Yüksek çözünürlüklü skyline dosya importu çekirdeği

Durum: tamamlanma adayı · `1.14.1`

## Amaç

Aşama 6.12–6.15 ile kurulan geometrik yerel-ufuk sözleşmesini, 8 yönlü manuel editörün yanında yüksek çözünürlüklü dış dosyalardan besleyebilecek güvenli bir import katmanı hazırlamak.

Bu checkpoint kullanıcı arayüzüne yeni düğme eklemez. Parser, doğrulama, dosya bütünlüğü ve Electron IPC sözleşmesini hazırlar; UI/persistence bağlantısı bir sonraki dilimde yapılır.

## Desteklenen dosyalar

- CSV
- TSV
- TXT
- JSON

### CSV/TSV/TXT

Önerilen başlık:

```text
azimuthDeg,altitudeDeg
0,2.1
1,2.2
2,2.4
```

Desteklenen özellikler:

- virgül, noktalı virgül veya sekme ayırıcı,
- başlıklı veya yalnız iki sayısal sütunlu dosya,
- noktalı virgül/sekme biçiminde ondalık virgül,
- azimut ve ufuk yüksekliği için İngilizce/Türkçe yaygın başlık eşleri,
- boş satırlar ve `#` ile başlayan yorum satırları.

### JSON

İki temel biçim kabul edilir:

```json
{
  "points": [
    { "azimuthDeg": 0, "altitudeDeg": 2.1 },
    { "azimuthDeg": 1, "altitudeDeg": 2.2 }
  ]
}
```

ve

```json
[[0, 2.1], [1, 2.2], [2, 2.4]]
```

## Doğrulama

Dosya noktaları mevcut `normalizeStellarLocalHorizonMask()` çekirdeğinden geçirilir. Böylece aynı fiziksel/geometrik sözleşme korunur:

- en az 3 nokta,
- en fazla 1.440 nokta,
- azimut `0° <= A < 360°`,
- ufuk yüksekliği `-90° <= h <= +90°`,
- yinelenen/ayırt edilemeyecek kadar yakın azimut reddi,
- noktaların 0°→360° sırasına normalize edilmesi,
- 360°/0° döngüsel aralığının hesaba katılması,
- en büyük azimut boşluğunun raporlanması.

Kaynak sırasızsa veya profil azimut bakımından seyrekse uyarı üretilir; veri sessizce daha yüksek çözünürlüklü kabul edilmez.

## Dosya bütünlüğü

Dosya seçimi Electron main process içinde yapılır.

- en fazla 2 MB,
- boş dosya reddedilir,
- ham dosya renderer'a gönderilmez,
- SHA-256 özeti hesaplanır,
- dosya boyutu korunur,
- import zamanı kaydedilir,
- renderer yalnız doğrulanmış ve normalize edilmiş profil nesnesini alır.

Bu bilgiler daha sonraki kayıt/portable/rapor entegrasyonunun provenans temeli olacaktır.

## Bilimsel sınır

Dosya içindeki yükseklikler **geometrik yerel skyline açılarıdır**. Import katmanı:

- DEM'den skyline üretmez,
- kamera panoramasından skyline çıkarmayı denemez,
- atmosferik kırılma uygulamaz,
- doğal ufkun apparent/refraktif davranışını varsaymaz,
- optik çıplak-göz görünürlüğü üretmez.

Kaynak dosya yalnız kullanıcı tarafından sağlanan `azimut → geometrik ufuk yüksekliği` profilidir.

## Geriye dönük uyumluluk

Bu checkpoint mevcut `SavedExperiment` şemasına yeni alan eklemez ve 8 yönlü manuel skyline davranışını değiştirmez. Yalnız yeni masaüstü API çağrısı ve doğrulanmış import veri sözleşmesi eklenir.

## Doğrulama hedefleri

- başlıklı CSV,
- başlıksız iki sütunlu CSV,
- noktalı virgül + ondalık virgül,
- sırasız azimut normalizasyonu,
- JSON nesne noktaları,
- JSON `[azimut, yükseklik]` çiftleri,
- uzantı/içerik parser seçimi,
- duplicate / geçersiz yükseklik / bozuk JSON reddi,
- 1.440 nokta üst sınırı,
- strict TypeScript,
- tüm regresyonlar,
- production Electron/Vite build.

## Sonraki dilim

Aşama 6.17:

- Yıldız Gözlemleri paneline `Skyline dosyasından al` akışı,
- manuel 8 yön / dış dosya kaynak seçimi,
- yüksek çözünürlüklü noktaları gerçek yıldız izi hesabına bağlama,
- kaynak adı / nokta sayısı / maksimum azimut boşluğu / SHA-256 görünümü,
- `SavedExperiment` + `.ggl.json` + HTML rapor persistence,
- eski kayıtlar için geriye dönük güvenli fallback.
