# Simulator

Farklı Dünya geometrisi ve fiziksel model iddialarını aynı ölçülebilir deneyler üzerinden sayısal olarak karşılaştırmayı amaçlayan Electron masaüstü simülasyon laboratuvarı.

## Hedef

Kullanıcı bir gözlem veya deney tanımlar; seçilen modeller aynı girdilerle ayrı tahminler üretir ve sonuçlar ölçüm belirsizlikleri, varsayımlar ve yeniden üretilebilir hesap izleriyle karşılaştırılır.

## Temel ilkeler

- Aynı deney girdileri bütün modellere uygulanır.
- Geometri, atmosfer, arazi verisi ve görsel canlandırma birbirinden ayrılır.
- Harita projeksiyonları fiziksel model olarak değerlendirilmez.
- Her sonuç kullanılan varsayımlar, formüller ve veri kaynağıyla izlenebilir olur.
- Tanımsız model davranışlarında uydurma sonuç yerine `unsupported` durumu döndürülür.
- Tek bir deneydeki uyum bir modelin genel doğruluğu olarak sunulmaz.

## Çalışan gözlem senaryoları

### Senaryo akışları

`1.2.0` ile üç ayrı görünürlük senaryosu etkin durumdadır:

- **Hedef Görünürlüğü:** hedefin görünür/gizli bölümünü ölçüm ve belirsizlikle karşılaştırır.
- **Ufuk Analizi:** hedef, rota ve arazi gerektirmeden modelin ufuk tanımını hesaplar. İdeal kürede atmosfer moduna göre geometrik/standart-k/katmanlı optik ufuk, tanımlı sonsuz düzlemde `∞`, azimutal kartografik referansta `unsupported` sonucu üretilir.
- **Uzun Mesafe Görüş:** rota, arazi ve uzak hedef bağlamını ayrı bir deney kimliği altında yönetir; fiziksel hesapları mevcut hedef görünürlüğü çekirdeğini kopyalamadan yeniden kullanır.

Senaryo kimliği yerel ve taşınabilir deney kayıtlarında korunur. Eski kayıtlarda senaryo alanı yoksa kayıt `Hedef Görünürlüğü` olarak açılır.

### Fiziksel modeller ve gözlem

- İdeal küre modeli
- Tanımlı düzlem modeli
- Azimutal projeksiyon için fiziksel model değildir / `unsupported` sonucu
- Gözlemci göz yüksekliği ve hedef yüksekliği
- Gözlenen görünürlük ve ölçüm belirsizliği
- Atmosfer kapalı, standart `k` veya katmanlı meteorolojik profil
- Düzenlenebilir standart kırılma katsayısı
- Katmanlı profilde Ciddor görünür ışık kırılma indisi ve küresel RK4 ışın izi
- Görünür ve gizlenen hedef oranı
- Ufuk mesafesi
- Hedef tepe görüş açısı
- Gözlem ile tahmin arasındaki fark
- Model ve jeodezik çözüm için yeniden üretilebilir hesap izleri

### Etkileşimli model görselleştirmesi

`1.1.2` ile model kartları Three.js tabanlı etkileşimli WebGL sahneleri, çevrimdışı coğrafi yardımcı katmanlar ve rota tabanlı arazi görselleştirmesi kullanır:

- ideal küre için gerçek 3B küre,
- WGS84 gözlemci ve hedef konumları,
- mevcut jeodezik çözümden örneklenen rota çizgisi,
- açılıp kapatılabilen enlem/boylam yardımcı ızgarası,
- Natural Earth 110m tabanlı çevrimdışı ülke/kıyı sınırları,
- aynı sınır verisinin küre ve kuzey kutup merkezli azimutal kartografik referansta gösterimi,
- fare/pointer ile döndürme ve tekerlekle yakınlaştırma,
- tek tıklamayla başlangıç kamera görünümüne dönme,
- manuel/CSV/GeoJSON/DEM profilinden rota boyunca göreli arazi yükselti şeridi,
- topografya katmanını bağımsız açma/kapatma ve kaynak türünü sahnede belirtme,
- tanımlı düzlem için küresel harita projeksiyonu uydurmayan yerel düzlem şeması,
- WebGL kullanılamadığında açık hata görünümü,
- sahne kapandığında GPU kaynaklarının temizlenmesi.

Görselleştirme fiziksel hesap motorunun kaynağı değildir. Coğrafi sınırlar, ızgara ve topografya şeridi deney girdilerini veya model tahminlerini değiştirmez. Arazi kotları hesap motorunda metre olarak korunur; 3B sahnedeki yükseklik yalnız göreli biçimi görünür kılmak için sınırlı olarak ölçeklenir. Özellikle tanımlı düzlem modeline, model sözleşmesinde bulunmayan küresel konum haritası uydurulmaz. Azimutal görünüm de fiziksel tahmin üretmeyen kartografik referans olarak kalır. Natural Earth 110m sınırları dünya ölçeğinde görsel yönlendirme içindir; hassas mesafe, kıyı veya idari sınır analizi verisi değildir.

### Konum ve jeodezi

- Manuel yüzey mesafesi
- Gözlemci ve hedef enlem-boylamı
- WGS84 Vincenty ters jeodezik çözümü
- Yüzey mesafesi ve uç azimutları
- Yakın-antipodal durumda açıkça işaretlenen küresel yedek çözüm

### Düşey datum ve arazi

- Ortalama deniz seviyesi / ortometrik yükseklik
- WGS84 elipsoidal yükseklik
- Yerel düşey datum
- Datum, gelgit veya yerel benchmark ofseti
- Gözlemci zemin kotu ve hedef taban kotu
- Sıralı ve düzenlenebilir çok noktalı manuel profil
- Profil noktalarını grafik üzerinde sürükleme
- CSV / TSV arazi profili içe aktarma
- Standart dışı CSV sütun eşleme
- GeoJSON 3B WGS84 LineString profili
- ESRI ASCII Grid DEM içe aktarma
- En yakın hücre veya iki doğrusal DEM örnekleme
- Otomatik veya manuel DEM örnek sayısı
- DEM çözünürlük, kapsam ve örnekleme tanıları
- Profil uygulanmadan önce DEM görüş hattı önizlemesi
- Kritik arazi noktası, minimum açıklık ve hedef kotu çözümü
- Kaynak dosya boyutu ve SHA-256 bütünlük kaydı
- İçe aktarımdan sonra değişiklik durumunun korunması

### Jeoit dönüşümü

- `N = h - H` işaret sözleşmesi
- Elipsoidal ↔ ortometrik yükseklik dönüşümü
- Kullanıcı tarafından verilen jeoit ondülasyonu ve belirsizliği
- Kaynak/model etiketi, sürüm veya çözünürlük ve epok
- Gözlemci, hedef ve bütün arazi noktalarının kontrollü dönüşümü
- Dönüşüm hesap izi ve kalıcı provenans
- Sonradan datum veya kot değişikliğinde tarihsel işlem uyarısı

### Su seviyesi, gelgit ve dalga

- manuel gözlem, gelgit ölçer, gelgit tahmini veya ölçme/nivelman kaynağı
- saat dilimli gözlem zamanı
- kaynak ve isteğe bağlı istasyon etiketi
- su seviyesi ölçüm/tahmin belirsizliği
- dalga kaynaklı doğrudan düşey belirsizlik
- anlamlı dalga yüksekliğinin ayrı provenans olarak tutulması
- gelgit evresi
- koruyucu doğrusal veya bağımsız RSS belirsizlik birleşimi
- alt ve üst su yüzeyi sınırları
- gözlemci zemini, hedef tabanı veya iki uç için kontrollü uygulama
- anlık/ortalama, alt sınır ve üst sınır senaryoları
- deney kimliği, düşey datum ve zaman farkı güvenlik kontrolleri
- kayıt ve uygulama hesap izleri
- deney yeniden açıldığında su yüzeyi kayıtlarının geri yüklenmesi
- uç kotu, datum veya ofset sonradan değişirse önceki uygulamanın tarihsel olarak işaretlenmesi

Anlamlı dalga yüksekliği otomatik geometri düzeltmesine dönüştürülmez. Su yüzeyi bu aşamada rota boyunca dinamik bir dalga yüzeyi olarak modellenmez; yalnız kullanıcının açıkça seçtiği uç zemin kotlarına uygulanır.

### Gelişmiş katmanlı atmosfer

`1.3.1` ile katmanlı atmosfer veri, arayüz ve İdeal Küre fiziksel hesap yolu birlikte çalışır:

- yükseklik, sıcaklık, basınç ve bağıl nemden oluşan sıralı profil örnekleri,
- kaynak etiketi ve açık saat dilimli isteğe bağlı gözlem zamanı,
- fiziksel aralık ve örnek sırası doğrulaması,
- profil kapsamı içinde doğrusal enterpolasyon,
- katman sıcaklık/basınç/nem gradyanları,
- doygun su buharı basıncı, su buharı kısmi basıncı ve nemli hava yoğunluğu yardımcıları,
- Ciddor görünür/yakın KIZÖ faz kırılma indisi,
- optik `n`, `N`, `dn/dh`, `dN/dh` ve yerel `k` tanıları,
- vakum dalga boyu ve CO₂ ayarları,
- küresel/radyal atmosferde RK4 ışın izleme,
- İdeal Küre hedef görünürlüğünde minimum açık optik ışın ve hedef-tepe atış çözümü,
- arazi örneklerini aynı optik ışın üzerinde açıklık açısından sınama,
- İdeal Küre için katmanlı optik ufuk,
- profil modunun standart `k` katsayısından ayrı tutulması,
- ölçülmeyen yüksekliklere otomatik meteorolojik ekstrapolasyon yapmama,
- profil kapsamı yetersizse sonlu/uydurma sonuç yerine açık `indeterminate` sonucu,
- atmosfer state'inin yerel ve taşınabilir deney kayıtlarında korunması,
- İdeal Küre 3B sahnesinde ölçülmüş profil yüksekliği kabukları, katmanlı optik ışın ve geometrik LOS karşılaştırması,
- uzun RK4 yollarında yalnız çizim için uçları koruyan örnek azaltma.

Tanımlı Düzlem modeline, model sözleşmesinde bulunmayan bir atmosfer kırılma kuralı eklenmez. Atmosfer görsel katmanı yalnız İdeal Küre sahnesinde etkinleşir ve hesap motoruna geri besleme yapmaz. Profil yüksekliği dünya yarıçapına göre okunamayacak kadar küçük olduğundan yalnız 3B sahnede abartılı ölçeklenir; fizik hesabındaki metre değerleri değişmez. Görsel ışın yeniden üretilemezse sahte bir fallback ışını çizilmez.

## Arazi veri biçimleri

### CSV / TSV

Otomatik tanınan örnek başlıklar:

```text
distance_m,elevation_m
distance_km,elevation_m
distance_percent,elevation_m
```

Türkçe eşler (`mesafe_m`, `mesafe_km`, `rota_yuzdesi`, `kot_m`), virgül / noktalı virgül / sekme ayırıcıları ve ondalık virgül desteklenir. Standart dışı başlıklarda kullanıcı güvenli eşleme ekranından mesafe sütununu, birimini ve kot sütununu seçer.

### GeoJSON

Tek bir 3B WGS84 `LineString`, `Feature` veya tek hatlı `FeatureCollection` desteklenir. `[boylam, enlem, yükseklik]` koordinatları gerçek jeodezik parça mesafeleriyle rota profiline dönüştürülür.

Örnek: `examples/terrain-profile-wgs84.geojson`

### ESRI ASCII Grid DEM

Koordinat modunda DEM dosyası gözlemci-hedef rotası boyunca WGS84 ara koordinatlarında örneklenir. Grid çözünürlüğü, rota örnek aralığı, kapsam kenarı, yükseklik aralığı ve kaynak bütünlüğü deney provenansında korunur.

Örnek: `examples/dem-route-wgs84.asc`

## Deney kayıtları

Deneyler Electron kullanıcı veri klasöründe saklanır. Uygulama:

- deney oluşturma ve güncelleme,
- yeniden açma ve silme,
- koordinat ve jeodezik hesap anlık görüntüsü,
- düşey datum ve bütün arazi noktaları,
- CSV / GeoJSON / DEM kaynak provenansı,
- jeoit dönüşüm provenansı,
- su yüzeyi gözlem ve uygulama provenansı,
- atmosfer modu, meteorolojik profil ve optik ayarlar,
- model sürümleri ve sonuç anlık görüntülerini

korur.

## Taşınabilir dosyalar ve raporlar

- Sürümlemeli `.ggl.json` dışa/içe aktarma
- Eski şemaların güvenli taşınması
- Bozuk veya tutarsız verinin reddi
- Kimlik çakışmalarının güvenli çözümü
- Yazdırılabilir çevrimdışı HTML raporu
- Model, jeodezi, arazi, jeoit ve su yüzeyi hesap izlerinin raporda korunması

HTML raporu okunabilir çıktıdır. Yeniden içe aktarılabilir veri kaynağı `.ggl.json` dosyasıdır.

## Henüz tamamlanmayan ana ürün işleri

- Gece ışıkları görsel katmanı
- Fotoğraf ve kamera/lens kalibrasyonu
- Güneş, Ay, yıldız ve tutulma deneyleri
- Toroidal ve içbükey gibi ek geometrik model sözleşmeleri

Son kullanıcı kurulum paketi ve dağıtım işlemleri ürün işlevleri tamamlandıktan sonraki aşamadır.

## Teknoloji

- Electron
- React
- TypeScript
- Three.js
- TopoJSON / çevrimdışı Natural Earth dünya sınırları
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

Aynı kontroller pull request ve `main` güncellemelerinde GitHub Actions üzerinde otomatik çalışır.

## Belgeler

- [`docs/product-vision.md`](docs/product-vision.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/experiment-system.md`](docs/experiment-system.md)
- [`docs/model-contract.md`](docs/model-contract.md)
- [`docs/ui-design.md`](docs/ui-design.md)
- [`docs/geodesy.md`](docs/geodesy.md)
- [`docs/terrain-profile.md`](docs/terrain-profile.md)
- [`docs/csv-terrain-profile.md`](docs/csv-terrain-profile.md)
- [`docs/csv-profile-provenance.md`](docs/csv-profile-provenance.md)
- [`docs/geojson-terrain-profile.md`](docs/geojson-terrain-profile.md)
- [`docs/esri-ascii-dem.md`](docs/esri-ascii-dem.md)
- [`docs/terrain-source-integrity.md`](docs/terrain-source-integrity.md)
- [`docs/geoid-height-conversion.md`](docs/geoid-height-conversion.md)
- [`docs/water-surface-observation.md`](docs/water-surface-observation.md)
- [`docs/water-surface-application.md`](docs/water-surface-application.md)
- [`docs/portable-format.md`](docs/portable-format.md)
- [`docs/roadmap.md`](docs/roadmap.md)
- [`docs/roadmap-stage-3.23.md`](docs/roadmap-stage-3.23.md)
- [`docs/roadmap-stage-3.24.md`](docs/roadmap-stage-3.24.md)
- [`docs/roadmap-stage-3.25.md`](docs/roadmap-stage-3.25.md)
- [`docs/roadmap-stage-3.26.md`](docs/roadmap-stage-3.26.md)
- [`docs/roadmap-stage-3.27.md`](docs/roadmap-stage-3.27.md)
- [`docs/roadmap-stage-4.1.md`](docs/roadmap-stage-4.1.md)
- [`docs/roadmap-stage-4.2.md`](docs/roadmap-stage-4.2.md)
- [`docs/roadmap-stage-4.3.md`](docs/roadmap-stage-4.3.md)
- [`docs/roadmap-stage-4.4.md`](docs/roadmap-stage-4.4.md)
- [`docs/roadmap-stage-4.5.md`](docs/roadmap-stage-4.5.md)

## Durum

Aktif geliştirme sürümü `1.3.2`dir. Üç görünürlük senaryosu, kayıt/raporlama, WGS84, arazi/DEM, jeoit ve su yüzeyi akışlarına ek olarak katmanlı meteorolojik atmosferin Ciddor/RK4 fizik yolu İdeal Küre görünürlük ve ufuk sonuçlarına bağlanmış; atmosfer kabukları, optik ışın ve geometrik LOS 3B sahnede hesap motorundan bağımsız bir görsel katman olarak kullanılabilir hale gelmiştir. Sıradaki ana fiziksel ürün aşaması fotoğraf ve kamera/lens kalibrasyonudur.
