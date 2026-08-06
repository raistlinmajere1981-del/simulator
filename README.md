# Simulator

Farklı Dünya geometrisi ve fiziksel model iddialarını, aynı ölçülebilir deneyler üzerinden sayısal olarak karşılaştırmayı amaçlayan masaüstü simülasyon projesi.

## Hedef

Kullanıcının bir gözlem veya deney tanımlamasını, seçilen modellerin bu deney için ayrı tahminler üretmesini ve sonuçların ölçüm belirsizlikleriyle birlikte karşılaştırılmasını sağlamak.

## Temel ilkeler

- Aynı deney girdileri bütün modellere uygulanır.
- Geometri, atmosfer, arazi verisi ve görsel canlandırma birbirinden ayrılır.
- Harita projeksiyonları fiziksel model olarak değerlendirilmez.
- Her sonuç kullanılan varsayımlar ve formüllerle izlenebilir olur.
- Tanımsız model davranışlarında uydurma sonuç yerine `unsupported` durumu döndürülür.
- Tek bir deneydeki uyum, bir modelin genel doğruluğu olarak sunulmaz.

## Çalışan hedef görünürlüğü laboratuvarı

Hedef görünürlüğü deneyi şu yeteneklere sahiptir:

- İdeal küre modeli
- Tanımlı düzlem modeli
- Azimutal projeksiyonun fiziksel model olmadığını belirten `unsupported` sonucu
- Gözlemci göz yüksekliği ve hedef yüksekliği
- Gözlemci zemin kotu ve hedef taban kotu
- Ortalama deniz seviyesi, WGS84 elipsoidal veya yerel düşey datum seçimi
- Datum, gelgit veya yerel benchmark ofseti
- Manuel yüzey mesafesi
- Gözlemci ve hedef enlem-boylamı
- WGS84 elipsoidi üzerinde koordinattan yüzey mesafesi
- Başlangıç ve varış azimutları
- Manuel ve koordinat mesafesi arasında seçim
- Sıralı ve düzenlenebilir çok noktalı manuel arazi profili
- Profil noktası ekleme, düzenleme ve silme
- Canlı SVG profil önizlemesi ve kritik arazi mesafesi işareti
- Küre ve düzlemde ayrı arazi görüş hattı çözümü
- Kritik arazi noktası, minimum açıklık ve araziyi temizleyen hedef kotu
- Gözlenen görünürlük ve belirsizlik
- Atmosfer kapalı veya standart kırılma
- Düzenlenebilir kırılma katsayısı
- Görünür ve gizlenen hedef oranı
- Ufuk mesafesi
- Hedef tepe görüş açısı
- Gözlem ile tahmin arasındaki fark
- Model ve jeodezik çözüm için yeniden üretilebilir hesap izleri

Koordinat modu WGS84 ters jeodezik problemini Vincenty iterasyonuyla çözer. Yakın-antipodal durumda iterasyon yakınsamazsa sonuç sessizce elipsoidal sonuç gibi sunulmaz; ortalama Dünya yarıçaplı küresel yedek çözüm açık uyarıyla işaretlenir.

Standart kırılma bu aşamada etkin yarıçap yaklaşımıyla hesaplanır. Manuel profil ara noktaları rota yüzdesi ve ortak datumdaki kotlarıyla saklanır; gözlemci ve hedef uçları zemin kotlarından otomatik türetilir. DEM, dalga yüzeyi, jeoit dönüşümü ve gelişmiş atmosfer profili henüz dahil değildir.

## Deney kayıtları

Deneyler Electron kullanıcı veri klasöründe saklanır. Uygulama şu işlemleri destekler:

- deney oluşturma ve güncelleme,
- uygulama kapatıldıktan sonra kayıtları koruma,
- kayıtları yeniden açma,
- kayıt silme,
- koordinat ve jeodezik hesap anlık görüntüsünü saklama,
- düşey datum, zemin kotları ve bütün manuel profil noktalarını saklama,
- model sürümleri ve sonuç anlık görüntülerini saklama.

## Taşınabilir dosyalar ve raporlar

`0.6.0` geliştirme sürümünde:

- deneyler sürümlemeli `.ggl.json` dosyası olarak dışa aktarılabilir,
- taşınabilir deney dosyaları doğrulanarak içe aktarılabilir,
- sürüm 1, 2 ve 3 kayıtlar güvenli varsayılanlarla şema sürüm 4'e taşınabilir,
- sürüm 3'ün tek ara noktası deterministik biçimde çok noktalı diziye dönüştürülür,
- nokta kimlikleri, yüzde konumları, tekrarlar ve kotlar doğrulanır,
- eski kayıtlar manuel mesafe ve profil davranışını korur,
- kimlik çakışmaları güvenli yeni kayıt oluşturarak çözülür,
- girdiler, koordinatlar, jeodezik sonuçlar, düşey datum, bütün profil noktaları, model sonuçları ve hesap izleri çevrimdışı HTML raporuna dönüştürülebilir.

HTML raporu okunabilir ve yazdırılabilir çıktıdır. Yeniden içe aktarılabilir veri kaynağı `.ggl.json` dosyasıdır.

## Teknoloji

- Electron
- React
- TypeScript
- electron-vite
- Vitest

## Geliştirme

```bash
npm install
npm run dev
```

## Doğrulama

```bash
npm run typecheck
npm test
npm run build
```

Aynı kontroller pull request'lerde GitHub Actions üzerinde otomatik çalışır. Aynı dalın eski CI koşuları otomatik iptal edilir.

## Belgeler

- [`docs/product-vision.md`](docs/product-vision.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/experiment-system.md`](docs/experiment-system.md)
- [`docs/model-contract.md`](docs/model-contract.md)
- [`docs/ui-design.md`](docs/ui-design.md)
- [`docs/geodesy.md`](docs/geodesy.md)
- [`docs/terrain-profile.md`](docs/terrain-profile.md)
- [`docs/portable-format.md`](docs/portable-format.md)
- [`docs/roadmap.md`](docs/roadmap.md)

## Durum

Hedef görünürlüğü motoru, yerel kayıtlar, taşınabilir dosyalar, çevrimdışı raporlama, WGS84 koordinat girdileri, düşey datum ve tek noktalı arazi temeli `main` dalındadır. Çok noktalı manuel profil sürümü `agent/multi-point-terrain-profiles` dalında otomatik doğrulamadan geçmiş ve Linux/KDE yerel görsel doğrulamasını beklemektedir.
