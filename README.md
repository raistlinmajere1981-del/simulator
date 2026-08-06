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
- CSV, TSV veya metin dosyasından arazi profili içe aktarma
- Metre, kilometre veya rota yüzdesi sütunlarını otomatik yorumlama
- Türkçe başlıklar ve ondalık virgüllü noktalı virgül CSV desteği
- Standart dışı başlıklarda güvenli sütun eşleme ekranı
- CSV gözlemci ve hedef uç kotlarını bağımsız uygulama seçenekleri
- CSV dosya adı, sütunları, birimi, kaynak rotası ve içe aktarma zamanını kaydetme
- İçe aktarmadan sonra manuel değişiklik yapıldığını işaretleme
- İçe aktarmadan önce dosya özeti ve uyarı incelemesi
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

Standart kırılma bu aşamada etkin yarıçap yaklaşımıyla hesaplanır. Manuel veya CSV'den alınan profil ara noktaları rota yüzdesi ve ortak datumdaki kotlarıyla saklanır. CSV uç kotları kullanıcı seçerse gözlemci ve hedef zemin kotlarına uygulanır. DEM, dalga yüzeyi, jeoit dönüşümü ve gelişmiş atmosfer profili henüz dahil değildir.

## CSV arazi profilleri

`0.8.0` geliştirme sürümünde arazi düzenleyicisindeki `CSV içe aktar` eylemi şu standart biçimleri otomatik tanır:

```text
distance_m,elevation_m
distance_km,elevation_m
distance_percent,elevation_m
```

Türkçe eşler (`mesafe_m`, `mesafe_km`, `rota_yuzdesi`, `kot_m`) ve virgül, noktalı virgül veya sekme ayırıcıları desteklenir. İlk veri satırı gözlemci ucu ve `0`, son veri satırı hedef ucudur; yüzde tabanlı dosyada son mesafe `100` olmalıdır.

Standart dışı başlıklarda uygulama başlıkları ve ilk beş satırı gösterir. Kullanıcı mesafe sütununu, mesafe birimini ve kot sütununu seçer; dosyanın tamamı seçilen eşlemeyle yeniden doğrulanır. Ham dosya içeriği renderer sürecine verilmez.

İnceleme kartında CSV'nin ilk ve son kotunu gözlemci/hedef zemin kotlarına uygulamak için iki bağımsız seçenek bulunur. Mevcut profil ancak kullanıcı `Profili uygula` eylemini seçerse değiştirilir. Hatalı, süresi dolmuş veya iptal edilen içe aktarma mevcut noktaları etkilemez.

Uygulanan kaynağın dosya adı, ayırıcısı, birimi, kaynak rotası, satır sayısı, eşlenen sütunları ve uç seçenekleri deney kaydında korunur. Noktalar veya uç kotları daha sonra elle değiştirilirse kaynak silinmez; kayıt `İçe aktarımdan sonra düzenlendi` olarak işaretlenir.

## Deney kayıtları

Deneyler Electron kullanıcı veri klasöründe saklanır. Uygulama şu işlemleri destekler:

- deney oluşturma ve güncelleme,
- uygulama kapatıldıktan sonra kayıtları koruma,
- kayıtları yeniden açma,
- kayıt silme,
- koordinat ve jeodezik hesap anlık görüntüsünü saklama,
- düşey datum, zemin kotları ve bütün manuel/ithal profil noktalarını saklama,
- CSV profil kaynak metadatasını ve değişiklik durumunu saklama,
- model sürümleri ve sonuç anlık görüntülerini saklama.

## Taşınabilir dosyalar ve raporlar

`0.8.0` geliştirme sürümünde:

- deneyler sürümlemeli `.ggl.json` dosyası olarak dışa aktarılabilir,
- taşınabilir deney dosyaları doğrulanarak içe aktarılabilir,
- sürüm 1, 2, 3 ve 4 kayıtlar güvenli varsayılanlarla şema sürüm 5'e taşınabilir,
- sürüm 3'ün tek ara noktası deterministik biçimde çok noktalı diziye dönüştürülür,
- sürüm 4 kayıtlarına var olmayan CSV kaynak bilgisi uydurulmaz,
- nokta kimlikleri, yüzde konumları, tekrarlar, kotlar ve CSV kaynak alanları doğrulanır,
- CSV'den uygulanan noktalar ile kaynak provenansı birlikte kaydedilir,
- eski kayıtlar manuel mesafe ve profil davranışını korur,
- kimlik çakışmaları güvenli yeni kayıt oluşturarak çözülür,
- HTML raporu girdileri, koordinatları, jeodezik sonuçları, düşey datumu, bütün profil noktalarını, CSV kaynağını, model sonuçlarını ve hesap izlerini gösterir.

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
- [`docs/esri-ascii-dem.md`](docs/esri-ascii-dem.md)
- [`docs/csv-terrain-profile.md`](docs/csv-terrain-profile.md)
- [`docs/csv-profile-provenance.md`](docs/csv-profile-provenance.md)
- [`docs/portable-format.md`](docs/portable-format.md)
- [`docs/roadmap.md`](docs/roadmap.md)

## Durum

Hedef görünürlüğü motoru, yerel kayıtlar, taşınabilir dosyalar, çevrimdışı raporlama, WGS84 koordinat girdileri, düşey datum, çok noktalı manuel arazi profili ve temel CSV içe aktarma `main` dalındadır. CSV kaynak kaydı, uç kotu seçenekleri ve sütun eşleme sürümü `agent/csv-profile-provenance-mapping` dalında otomatik ve Linux/KDE yerel doğrulamasını beklemektedir.


### GeoJSON arazi profili

WGS84 `[boylam, enlem, yükseklik]` koordinatları taşıyan tek bir 3B LineString,
gerçek jeodezik parça mesafeleriyle arazi profiline dönüştürülebilir. Rota uçları
isteğe bağlı olarak deneyin gözlemci ve hedef koordinatlarına aktarılabilir. Örnek dosya:
`examples/terrain-profile-wgs84.geojson`.
