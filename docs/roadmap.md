# Yol Haritası

Bu belge ana ürün aşamalarının güncel özetidir. Ayrıntılı teknik kararlar ilgili `docs/roadmap-stage-*.md` ve konu belgelerinde tutulur.

## Aşama 0 — Temel ve sözleşmeler

Durum: tamamlandı

- Electron + React + TypeScript proje iskeleti
- Deney ve model alan tipleri
- Model eklenti sözleşmesi
- GitHub Actions doğrulaması
- Ürün, mimari ve arayüz belgeleri

## Aşama 1 — Hedef görünürlüğü motoru

Durum: tamamlandı

- İdeal küre modeli
- Tanımlı düzlem modeli
- Azimutal projeksiyon için fiziksel model değildir uyarısı
- Ufuk, görünürlük, gizlenme ve hedef tepe açısı
- Standart kırılma / atmosfer kapalı seçenekleri
- Gözlem farkı ve belirsizlik değerlendirmesi
- Etkileşimli hedef görünürlüğü arayüzü

## Aşama 2 — Deney kaydetme ve izlenebilirlik

Durum: tamamlandı

- Yerel deney kayıtları
- Kayıt oluşturma, güncelleme, yeniden açma ve silme
- Model sürümleri ve sonuç anlık görüntüleri
- Formül, yerine koyma, varsayım ve hesap izi

## Aşama 2.1 — Taşınabilir deneyler ve raporlar

Durum: tamamlandı

- Sürümlü `.ggl.json` dışa/içe aktarma
- Eski kayıtların güvenli taşınması
- Bozuk dosya ve kimlik çakışması kontrolleri
- Çevrimdışı / yazdırılabilir HTML raporu

# Aşama 3 — Gerçek konum, arazi ve düşey referans

## Aşama 3.1 — WGS84 gerçek konum girdileri

Durum: tamamlandı · `0.4.x`

- Enlem/boylam girdileri
- Manuel veya koordinat mesafesi
- Vincenty ters jeodezik çözümü
- Yakın-antipodal küresel yedek çözüm

## Aşama 3.2 — Düşey datum ve arazi temeli

Durum: tamamlandı · `0.5.0`

- Ortometrik, WGS84 elipsoidal ve yerel datum
- Gözlemci/hedef zemin kotları
- Görüş hattı açıklığı ve kritik engel çözümü

## Aşama 3.3 — Çok noktalı manuel arazi profili

Durum: tamamlandı · `0.6.0`

- Sıralı ara noktalar
- SVG profil önizlemesi
- Kritik arazi mesafesi

## Aşama 3.4 — CSV arazi profili

Durum: tamamlandı · `0.7.0`

- CSV / TSV / metin içe aktarma
- metre, kilometre ve rota yüzdesi
- Türkçe başlıklar ve ondalık virgül

## Aşama 3.5 — CSV provenansı ve sütun eşleme

Durum: tamamlandı · `0.8.0`

- Kaynak dosya ve sütun bilgileri
- Uç kotu seçenekleri
- Standart dışı başlıklarda güvenli eşleme

## Aşama 3.6 — CSV rota mesafesi uygulaması

Durum: tamamlandı · `0.8.1`

- Mutlak CSV rota uzunluğunu manuel deneye isteğe bağlı uygulama

## Aşama 3.7 — GeoJSON arazi profili

Durum: tamamlandı · `0.9.0`

- 3B WGS84 LineString
- gerçek jeodezik parça mesafeleri

## Aşama 3.8 — GeoJSON rota koordinatları

Durum: tamamlandı · `0.9.1`

- Rota başlangıç/bitiş koordinatlarını deneye isteğe bağlı uygulama

## Aşama 3.9 — Grafik üzerinde profil düzenleme

Durum: tamamlandı · `0.9.2`

- Ara noktaları pointer ile sürükleme
- komşu geçiş sınırları ve dokunmatik desteği

## Aşama 3.10 — ESRI ASCII DEM çekirdeği

Durum: tamamlandı · `0.9.3`

- Grid ayrıştırma
- en yakın hücre ve iki doğrusal örnekleme
- NODATA ve kapsam güvenliği

## Aşama 3.11 — DEM rota profili

Durum: tamamlandı · `1.0.0`

- WGS84 rota boyunca DEM örnekleme
- uç kotu seçenekleri
- DEM provenansı

## Aşama 3.12 — DEM örnekleme denetimleri

Durum: tamamlandı · `1.0.1`

- örnekleme yöntemi
- otomatik / manuel örnek sayısı

## Aşama 3.13 — DEM kalite ve kapsam tanısı

Durum: tamamlandı · `1.0.2`

- grid hücre açıklığı
- örnek aralığı / çözünürlük oranı
- kapsam kenarı ve yükseklik aralığı tanıları

## Aşama 3.14 — Arazi kaynak bütünlüğü

Durum: tamamlandı · `1.0.3`

- CSV / GeoJSON / DEM SHA-256
- dosya boyutu ve bütünlük provenansı

## Aşama 3.15 — DEM görüş hattı önizlemesi

Durum: tamamlandı · `1.0.4`

- profil uygulanmadan önce küresel görüş hattı açıklığı
- kritik örnek ve minimum açıklık

Ayrıntı: [`roadmap-stage-3.15.md`](roadmap-stage-3.15.md)

## Aşama 3.16 — DEM veri kaynağı ve çözünürlük izi

Durum: tamamlandı · `1.0.5`

- CRS/datum sınırlamalarının açık gösterimi
- doğal derece ve etkili metre çözünürlüğü
- güncel / kısmi / eski kaynak sınıflandırması

Ayrıntı: [`roadmap-stage-3.16.md`](roadmap-stage-3.16.md)

## Aşama 3.17 — Jeoit yükseklik dönüşüm çekirdeği

Durum: tamamlandı

- `N = h - H`
- elipsoidal ↔ ortometrik dönüşüm
- belirsizlik birleşimi ve hesap izi

Ayrıntı: [`roadmap-stage-3.17.md`](roadmap-stage-3.17.md)

## Aşama 3.18 — Kontrollü jeoit profil dönüşümü

Durum: tamamlandı · `1.0.6`

- gözlemci, hedef ve bütün profil noktalarını kontrollü dönüştürme
- kaynak/model etiketi ve önizleme

Ayrıntı: [`roadmap-stage-3.18.md`](roadmap-stage-3.18.md)

## Aşama 3.19 — Kalıcı jeoit provenansı

Durum: tamamlandı · `1.0.7`

- model etiketi, sürüm/çözünürlük, epok, N, belirsizlik ve hesap izi
- kayıt, `.ggl.json` ve HTML rapor koruması

Ayrıntı: [`roadmap-stage-3.19.md`](roadmap-stage-3.19.md)

## Aşama 3.20 — Su yüzeyi ölçüm ve provenans sözleşmesi

Durum: tamamlandı · `1.0.8`

- su seviyesi, kaynak, zaman, gelgit ve dalga bağlamı
- birleşik belirsizlik ve düşey aralık

Ayrıntı: [`roadmap-stage-3.20.md`](roadmap-stage-3.20.md)

## Aşama 3.21 — Tipli su yüzeyi anlık görüntüsü

Durum: tamamlandı · `1.0.9`

- kayıtlı provenanstan güvenli ve makine tarafından yeniden kullanılabilir su yüzeyi snapshot'ı

Ayrıntı: [`roadmap-stage-3.21.md`](roadmap-stage-3.21.md)

## Aşama 3.22 — Kontrollü su yüzeyi fiziksel uygulaması

Durum: tamamlandı · `1.0.10`

- gözlemci, hedef veya iki uç uygulaması
- ortalama / alt sınır / üst sınır senaryoları
- deney kimliği, datum ve zaman güvenlik kontrolleri

Ayrıntı: [`roadmap-stage-3.22.md`](roadmap-stage-3.22.md)

## Aşama 3.23 — Su yüzeyi kayıt ve uygulama arayüzü

Durum: tamamlandı · `1.0.11`

- su seviyesi, gelgit ve dalga giriş paneli
- belirsizlik zarfı önizlemesi
- kontrollü uç uygulaması
- kayıt ve yeniden açmada su yüzeyi durumunun korunması
- sonradan kot/datum/ofset değişikliğinde tarihsel uygulama işareti
- su gözlem ve uygulama hesap izleri

Ayrıntı: [`roadmap-stage-3.23.md`](roadmap-stage-3.23.md)

## Aşama 3.24 — Etkileşimli model görselleştirme altyapısı

Durum: tamamlandı · `1.1.0`

- Three.js tabanlı WebGL sahneleri
- ideal kürede gerçek 3B geometri
- WGS84 gözlemci/hedef konumları ve jeodezik rota çizgisi
- döndürme ve yakınlaştırma
- tanımlı düzlem için küresel konum haritası uydurmayan yerel şema
- kuzey kutup merkezli azimutal kartografik referans
- WebGL hata görünümü ve GPU kaynak temizliği
- görsel koordinat dönüşümleri için saf testler

Ayrıntı: [`roadmap-stage-3.24.md`](roadmap-stage-3.24.md)

## Aşama 3.25 — Çevrimdışı coğrafi görsel katmanlar

Durum: tamamlandı · `1.1.1`

- Natural Earth 110m tabanlı çevrimdışı ülke/kıyı sınırları
- aynı sınır verisinin küre ve azimutal kartografik referansta gösterimi
- kıta/ülke sınırı ve ızgara katmanlarını ayrı açma/kapatma
- katman değişikliklerinde kamera durumunu koruyan anlık yeniden çizim
- model görünümünü başlangıç kamerasına döndüren sıfırlama kontrolü
- tanımlı düzlem modeline küresel coğrafi projeksiyon uydurmama
- coğrafi çizgi ayrıştırma doğrulaması ve birim testleri

Ayrıntı: [`roadmap-stage-3.25.md`](roadmap-stage-3.25.md)

## Aşama 3.26 — Arazi profilinin 3B sahneyle ilişkilendirilmesi

Durum: tamamlandı · `1.1.2`

- rota boyunca göreli arazi yükseklik şeridi
- manuel/CSV/GeoJSON/DEM kaynak etiketinin görsel katmanda korunması
- kürede WGS84 jeodezik rota üzerinde arazi çizimi
- tanımlı düzlemde yerel rota ekseninde arazi çizimi
- azimutal kartografik referansta yalnız veri şeridi olarak gösterim
- metre kotlarının hesap motorunda değişmeden korunması
- görsel yükseltmenin fiziksel geometri olmadığına dair açık etiket
- topografya katmanını bağımsız açma/kapatma

Ayrıntı: [`roadmap-stage-3.26.md`](roadmap-stage-3.26.md)

## Aşama 3.27 — Ayrı ufuk ve uzun mesafe görüş senaryoları

Durum: tamamlandı · `1.2.0`

- Hedef Görünürlüğü, Ufuk Analizi ve Uzun Mesafe Görüş için ayrı senaryo kimlikleri
- ideal kürede hedefsiz geometrik ufuk hesabı
- tanımlı sonsuz düzlemde geometrik ufkun `∞` olarak açık gösterimi
- azimutal projeksiyonda fiziksel ufuk kuralı bulunmadığı için `unsupported`
- ufuk senaryosunda hedef/rota/arazi/su girdilerinin devreden çıkarılması
- uzun mesafe senaryosunda mevcut hedef görünürlüğü motorunun kopyalanmadan yeniden kullanılması
- senaryo kimliğinin yerel ve taşınabilir deney kayıtlarında korunması
- eski kayıtların güvenli biçimde Hedef Görünürlüğü senaryosuna taşınması

Ayrıntı: [`roadmap-stage-3.27.md`](roadmap-stage-3.27.md)

# Aşama 4 — Gelişmiş atmosfer

## Aşama 4.1 — Katmanlı meteorolojik atmosfer profili çekirdeği

Durum: tamamlandı · `1.2.1`

- yükseklik, sıcaklık, basınç ve bağıl nem örnek sözleşmesi
- kaynak etiketi ve açık saat dilimli gözlem zamanı
- fiziksel aralık, örnek sırası ve su buharı basıncı doğrulaması
- katman gradyanları
- profil kapsamı içinde doğrusal enterpolasyon
- Buck tipi doygun su buharı basıncı ve kısmi basınç yardımcıları
- nemli hava yoğunluğu
- ölçülmeyen yüksekliklere otomatik ekstrapolasyon yapmama

Bu aşama mevcut standart `k` etkin-yarıçap yaklaşımını değiştirmez ve henüz optik ışın izleme yapmaz.

Ayrıntı: [`roadmap-stage-4.1.md`](roadmap-stage-4.1.md)

## Aşama 4.2 — Optik kırılma indisi ve katmanlı ışın izi

- görünür ışık için açık dalga boyu seçimi
- formülü ve geçerlilik sınırları izlenebilir optik kırılma indisi
- katman sınırlarında ışın ilerleme hesabı
- küresel ve düzlemsel yüzey geometrisinden ayrı atmosfer çözümü
- standart `k` yaklaşımıyla karşılaştırma

## Aşama 4.3 — Atmosfer profili arayüzü ve kayıt

- profil noktası editörü
- profil görsel katmanı
- deney kaydı / yeniden açma / taşınabilir provenans
- standart ve gelişmiş atmosfer sonuçlarının yan yana gösterimi

# Sıradaki ana ürün aşamaları

## Aşama 5 — Fotoğraf kalibrasyonu

- kamera ve lens bilgileri
- ufuk, hedef tabanı ve hedef tepesi işaretleme
- piksel-açı dönüşümü
- ölçüm belirsizliği üretimi

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri

- Güneş yüksekliği ve azimutu
- gölge deneyleri
- gün doğumu ve gün batımı
- Ay konumu ve evreleri
- yıldız görünürlüğü ve yıldız izleri

## Aşama 7 — Büyük ölçekli olaylar

- tutulmalar
- mevsimler
- zaman dilimleri
- rota karşılaştırmaları

## Dağıtım aşaması

Son kullanıcı kurulum paketi, imzalama ve dağıtım işlemleri ana ürün işlevleri tamamlandıktan sonra ele alınacaktır.
