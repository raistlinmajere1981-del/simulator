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

## Aşama 4.2 — Optik kırılma ve katmanlı ışın izi

Durum: tamamlandı · `1.2.2`

- Ciddor görünür/yakın KIZÖ faz kırılma indisi
- meteorolojik profilden `n`, `N`, `dn/dh`, `dN/dh` ve yerel `k` tanıları
- küresel/radyal katmanlı atmosferde RK4 ışın izleme
- profil kapsamı dışında otomatik ekstrapolasyon yapmama

Ayrıntı: [`roadmap-stage-4.2.md`](roadmap-stage-4.2.md)

## Aşama 4.3 — Atmosfer arayüzü ve deney entegrasyonu

Durum: tamamlandı · `1.3.0`

- atmosfer modu: kapalı / standart `k` / katmanlı profil
- sıcaklık / basınç / nem katman editörü
- dalga boyu, CO₂ ve ışın adımı ayarları
- Ciddor optik N ve katman `dN/dh` / yerel `k` tanıları
- atmosfer state'inin yerel ve taşınabilir deney kayıtlarında korunması
- eski kayıtların legacy standart-k bayrağından güvenli açılması
- profil modunun standart `k` hesabına sessizce düşmemesi

Ayrıntı: [`roadmap-stage-4.3.md`](roadmap-stage-4.3.md)

## Aşama 4.4 — Katmanlı atmosferin İdeal Küre sonuçlarına fiziksel bağlantısı

Durum: tamamlandı · `1.3.1`

- Ciddor `n(h)` profilinden küresel RK4 ışın yollarıyla hedef görünürlüğü
- yüzey ve arazi profilini temizleyen en düşük optik ışından minimum görünür kot
- hedef-tepe optik atış açısı
- katmanlı optik ufuk taraması
- standart `k` katsayısından tamamen ayrı profil sonucu
- profil kapsamı yetersizse uydurma sonuç yerine `indeterminate`
- `0 m` profil tabanındaki sayısal sınır geçişini fiziksel yüzey kesişiminden ayırma

Ayrıntı: [`roadmap-stage-4.4.md`](roadmap-stage-4.4.md)

## Aşama 4.5 — Atmosfer ve optik ışın görsel katmanı

Durum: tamamlandı · `1.3.2`

- Atmosfer Profili anahtarını yalnız Katmanlı profil modunda etkinleştirme
- İdeal Küre sahnesinde ölçülmüş profil yüksekliklerini yarı saydam kabuklarla gösterme
- 4.4 tahminindeki hedef-tepe/sınır başlangıç açısıyla aynı Ciddor + RK4 ışınını yalnız çizim için yeniden örnekleme
- hedefli deneyde geometrik LOS ile katmanlı optik ışın yolunu ayrı gösterme
- hedefli ışını mevcut WGS84 gözlemci-hedef rotasına görsel olarak ankrajlama
- Ufuk Analizi için hedef koordinatı uydurmayan yerel büyük-daire kesiti
- uzun ışın yollarını yalnız çizim amacıyla en fazla 420 noktaya düşürme
- atmosfer yüksekliğini yalnız sahnede okunabilirlik için abartma ve bunu legend'de açıkça belirtme
- Tanımlı Düzlem / azimutal referansa tanımsız fiziksel kırılma yolu uydurmama
- görselleştirmenin fiziksel hesap motoruna geri besleme yapmaması

Ayrıntı: [`roadmap-stage-4.5.md`](roadmap-stage-4.5.md)

# Aşama 5 — Fotoğraf kalibrasyonu

## Aşama 5.1 — Fotoğraf ve kamera kalibrasyonu çekirdeği

Durum: tamamlandı · `1.3.3`

- sensör + odak uzaklığı veya yatay/düşey FOV ile pinhole iç parametre çözümü
- piksel → kamera ışını ve piksel → düşey açı dönüşümü
- iki noktalı ufuk/referans çizgisinden roll ve yerel açı referansı
- hedef tabanı / hedef tepesi için referansa göre açılar ve hedef açısal yüksekliği
- işaret belirsizliğini 256 uç durumla koruyucu açı zarfına yayma
- düzeltilmemiş lens distorsiyonunu açık sistematik hata uyarısı olarak koruma
- işaretlenen çizgiyi otomatik fiziksel/astronomik ufuk saymama
- ModelPrediction provenansı ve hesap izi

Ayrıntı: [`roadmap-stage-5.1.md`](roadmap-stage-5.1.md)

## Aşama 5.2 — Fotoğraf yükleme ve etkileşimli işaretleme

Durum: tamamlandı · `1.4.0`

- Electron üzerinden yerel PNG/JPEG seçimi ve 25 MB üst sınırı
- kaynak fotoğraf için dosya adı, boyut, SHA-256, MIME ve piksel boyutu provenansı
- fotoğraf `data:` önizlemesini yalnız oturumda tutma; deney JSON’una gömmeme
- referans sol/sağ + hedef tabanı/tepesi için dört zorunlu kullanıcı işareti
- `object-fit: contain` boşluklarını dikkate alan doğal piksel eşleme
- FOV veya sensör+odak kamera parametre editörü
- asal nokta, işaret belirsizliği ve distorsiyon durumu
- 5.1 açı/belirsizlik çekirdeğine bağlantı
- fotoğraf kalibrasyon state/prediction/model sürümünün deneyle saklanması
- `.ggl.json` round-trip ve tahrif edilmiş fotoğraf provenansını reddetme
- HTML raporda kaynak/işaret/kamera provenansı ve genel hesap izi
- görüntü baytlarının taşınabilir kayıt/rapora sızmadığını regresyon testleriyle koruma

Ayrıntı: [`roadmap-stage-5.2.md`](roadmap-stage-5.2.md)

## Aşama 5.3 — Fotoğraf açısal gözlem değerlendirmesi

Durum: tamamlandı · `1.4.1`

- fotoğraf kalibrasyonunu model hesabına geri beslemeyen bağımsız gözlem kanalı
- U1–U2 için `visual-reference` / açık `local-horizontal` semantiği
- görsel referansta yalnız ofsetten bağımsız hedef açısal yüksekliğini karşılaştırma
- fiziksel yerel yatay açıkça seçildiğinde görünür hedef taban/tepe açılarını karşılaştırma
- model hedef tabanını görünmez öngörüyorsa tam hedef yüksekliği için sahte uyum puanı üretmeme
- İdeal Küre ve Tanımlı Düzlemde taban/tepe/tam açısal yükseklik metrikleri
- katmanlı atmosferde fiziksel taban ışını bulunamadığında taban/tam yükseklik metriklerini `null` bırakma
- fotoğraf ± işaret belirsizliğiyle ilk izlenebilir uyum testi
- comparison snapshot/modelVersion/hesap izini deney ve HTML raporda koruma
- eski fotoğraf kayıtlarında eksik referans anlamını alan uydurmadan güvenli `visual-reference` olarak yorumlama

Ayrıntı: [`roadmap-stage-5.3.md`](roadmap-stage-5.3.md)

## Aşama 5.4 — Birleşik fotoğraf/model belirsizlik zarfı

Durum: tamamlandı · `1.5.0`

- fotoğraf işaret belirsizliğine isteğe bağlı kamera iç-parametre belirsizliklerinin eklenmesi
- yatay/düşey FOV, odak uzaklığı, sensör boyutu ve asal nokta ± aralıklarının açı hassasiyetine yayılması
- yüzey mesafesi, göz yüksekliği, uç zemin kotları, hedef yüksekliği ve Standart `k` belirsizliğinin modeli alt/üst uçlarda yeniden çözerek yayılması
- koruyucu doğrusal toplam veya açık bağımsızlık varsayımıyla RSS birleşimi
- boş belirsizlik alanlarını `±0` saymama ve ölçülmemiş değer uydurmama
- belirsizlik aralığında fiziksel açı tanımsızlaşırsa sahte uyum puanı üretmeme
- kamera ve model belirsizlik provenansını deney, `.ggl.json` ve HTML raporda koruma

Ayrıntı: [`roadmap-stage-5.4.md`](roadmap-stage-5.4.md)

## Aşama 5.5 — Bağlamsal yardım ve terim açıklamaları

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

### Aşama 6.1 — Güneş konumu, gözlem zamanı ve konumu

Durum: tamamlandı · `1.8.0`

- açık UTC ofsetli gözlem zamanı ve WGS84 gözlem konumu
- geometrik Güneş yüksekliği ve azimutu
- deklinasyon, saat açısı, zaman denklemi ve hesap izi
- gözlem zamanı/provenansının kayıt ve raporda korunması

Ayrıntı: [`roadmap-stage-6.1.md`](roadmap-stage-6.1.md)

### Aşama 6.2 — Ay konumu ve evre geometrisi

Durum: tamamlandı · `1.9.0`

- düşük hassasiyetli Ay yörünge ve başlıca periyodik düzeltmeleri
- topocentrik paralaks, geometrik yükseklik ve azimut
- uzaklık, Güneş-Ay uzanımı, aydınlık oranı, faz sınıfı ve yaklaşık Ay yaşı
- Güneş ile ortak gözlem zamanı/konumu
- ayrı snapshot, sürüm ve hesap izi
- tutulma geometrisini bu aşamaya karıştırmama

Ayrıntı: [`roadmap-stage-6.2.md`](roadmap-stage-6.2.md)

### Aşama 6.3 — Gölge deneyi ve gnomon gözlemi

Durum: tamamlandı · `1.10.0`

- dikey gnomon ve yerel yatay yüzey gölge geometrisi
- beklenen gölge uzunluğu ve kuzey referanslı yön
- isteğe bağlı saha uzunluk/azimut ölçümü ve açık ± belirsizlikler
- gölgeden bağımsız Güneş yüksekliği türetimi
- Güneş ufuk altındaysa sahte doğrudan gölge üretmeme
- Dünya modellerine tanımsız Güneş davranışı uydurmama
- ayrı snapshot, hesap izi, reopen, `.ggl.json` ve HTML rapor korunumu

Ayrıntı: [`roadmap-stage-6.3.md`](roadmap-stage-6.3.md)

### Aşama 6.4 — İki konumlu eşzamanlı gölge karşılaştırması

Durum: tamamlandı · `1.11.0`

- Gölge Deneyi içinde opsiyonel ikinci WGS84 gözlem noktası
- iki noktanın aynı UTC fiziksel anında bağımsız Güneş/gölge çözümü
- farklı gnomon yüksekliklerini ortak açısal gözlem kanalına dönüştürme
- WGS84 baz çizgisi, Güneş yükseklik farkı ve gölge yönü farkı
- açık saha belirsizlikleri varsa fark düzeyinde uyum değerlendirmesi
- prediction snapshot üzerinden reopen, portable ve HTML rapor korunumu
- Dünya modellerine tanımsız Güneş/ışık davranışı uydurmama

Ayrıntı: [`roadmap-stage-6.4.md`](roadmap-stage-6.4.md)

### Aşama 6.5 — Gün doğumu ve gün batımı olay geometrisi

Durum: tamamlandı · `1.12.0`

- açık UTC ofsetli yerel sivil gün penceresi
- geometrik Güneş merkezi `0°` doğuş/batış geçişleri
- ayrı standart görünür referans olarak `-0,833°` eşiği
- doğuş/batış azimutları ve eşik-üstü süreler
- güneş öğlesi / günlük maksimum geometrik yükseklik
- kutup günü/gecesinde sahte olay saati üretmeme
- prediction, hesap izi, portable ve HTML rapor korunumu
- Dünya modellerine tanımsız Güneş/ışık davranışı uydurmama

Ayrıntı: [`roadmap-stage-6.5.md`](roadmap-stage-6.5.md)

### Aşama 6.6 — Yıldız konumu ve iz geometrisi çekirdeği

Durum: tamamlandı · `1.12.1`

- of-date sağ açıklık/deklinasyon girdisi ve açık koordinat çerçevesi sözleşmesi
- yaklaşık GMST/LMST, yıldız saat açısı, geometrik yükseklik ve azimut
- circumpolar / doğup-batan / hiç-doğmayan / teğet ufuk sınıfları
- en fazla 48 saatlik geometrik yıldız izi örnekleme
- geometrik `0°` doğuş/batış geçişlerini zaman ekseninde kök aramayla inceltme
- pencere içindeki geometrik ufuk-üstü süre
- tipli prediction adaptörü ve hesap izi
- J2000/ICRS dönüşümü ile optik görünürlüğü sessizce varsaymama

Ayrıntı: [`roadmap-stage-6.6.md`](roadmap-stage-6.6.md)

### Aşama 6.7 — Yıldız katalog koordinatı ve gözlem tarihine dönüşüm

Durum: tamamlandı · `1.12.2`

- IAU 2006 precession ve açık ICRS / ortalama J2000 çerçeve ayrımı
- SOFA referans matrisine bağlı regresyon
- BSC5P tabanlı çevrimdışı parlak-yıldız referans altkümesi
- J2000 katalog yönünü sessizce of-date kabul etmeme

Ayrıntı: [`roadmap-stage-6.7.md`](roadmap-stage-6.7.md)

### Aşama 6.8 — Yıldız Gözlemleri arayüzü ve kayıt entegrasyonu

Durum: tamamlandı · `1.13.0`

- Yıldız Gözlemleri senaryosunu etkinleştirme
- katalog yıldızı seçimi, J2000 → gözlem tarihi provenansı
- anlık geometrik konum, LMST ve günlük ufuk sınıfı
- 3–48 saat yıldız izi, geometrik ufuk geçişleri ve ufuk-üstü süre
- prediction snapshot üzerinden reopen ve portable kayıt korunumu
- HTML rapor ve hesap izi entegrasyonu

Ayrıntı: [`roadmap-stage-6.8.md`](roadmap-stage-6.8.md)

### Aşama 6.9 — Yıldız proper motion ve katalog epok temeli

Durum: tamamlandı · `1.13.1`

- BSC5P `μ_α*=cos(δ)·dα/dt` proper-motion semantiğini açık sözleşme olarak koruma
- iki açısal proper-motion bileşenini ekvatoryal teğet bazda birleştirme
- gök kutuplarında `1/cos(δ)` tekilliğine düşmeden birim küre üzerinde yayılım
- ileri/geri epok dönüşümü, açısal kayma ve hesap izi
- paralaks/radyal hız/perspektif ivmelenmesini uygulanmış gibi göstermeme
- doğrulanmamış katalog hareket değerlerini altkümeye eklememe

Ayrıntı: [`roadmap-stage-6.9.md`](roadmap-stage-6.9.md)

### Aşama 6.10 — BSC5P resmi kaynak satırı ve doğrulama temeli

Durum: tamamlandı · `1.13.2`

- CDS V/50 197 karakterlik sabit-genişlik ana kayıt parserı
- HR, J2000 RA/Dec, V kadri, pmRA/pmDE, paralaks ve radyal hız byte alanlarını açık sözleşmeyle okuma
- boş sayısal alanları sıfır uydurmadan `null` koruma
- pmRA semantiğini `μ_α*=cos(δ)·dα/dt` olarak koruma
- kaynak satırını HR + J2000 konum + V kadriyle çevrimdışı yıldız referansına doğrulama
- proper motion isteniyorsa pmRA ve pmDE'nin ikisini de zorunlu tutma
- doğrulanmamış 19-yıldız hareket değerini henüz ürün kataloğuna eklememe

Ayrıntı: [`roadmap-stage-6.10.md`](roadmap-stage-6.10.md)

### Aşama 6.11 — Doğrulanmış BSC5P motion altküme üretimi

Durum: tamamlandı · `1.13.3`

- ürünün 19 HR kaydını resmi kaynak kayıtlarından deterministik seçme
- her satırı 6.10 HR + J2000 konum + V-kadir doğrulamasından geçirme
- pmRA ve pmDE'nin ikisini de zorunlu tutma; `0` ile eksik `null` değerini ayırma
- tek bir yıldız eksik/bozuksa kısmi motion altkümesi üretmeme
- kaynak J2000 astrometrisini, paralaks/radyal hız alanlarını ve özgün 197 karakterlik satırı provenans için koruma
- sabit katalog sırası ve deterministik JSON serileştirme
- resmi kaynak dosyasına erişmeden gerçek 19-yıldız PM sayılarını ürün verisi olarak eklememe

Ayrıntı: [`roadmap-stage-6.11.md`](roadmap-stage-6.11.md)

### Aşama 6.12 — Yıldız yerel ufuk / skyline maskesi temeli

Durum: tamamlandı · `1.13.4`

- astronomik/geometrik 0° ufuk ile azimuta bağlı yerel/doğal ufku ayrı sözleşmeler olarak tutma
- 3–1.440 noktalı döngüsel azimut/yükseklik skyline maskesi
- 360°/0° kuzey sınırında kesintisiz doğrusal interpolasyon
- geometrik açıklık `Δh = h_yıldız - h_yerel_ufuk` ve above/on-horizon/below sınıfları
- manual/external/derived kaynak provenansı ve en büyük azimut örnekleme boşluğu
- mevcut tek-doğrultulu rota DEM profilini 360° skyline gibi sessizce kullanmama
- atmosferik kırılma ve çıplak-göz görünürlüğünü bu aşamaya karıştırmama

Ayrıntı: [`roadmap-stage-6.12.md`](roadmap-stage-6.12.md)

### Aşama 6.13 — Standart astronomik kırılma / apparent altitude temeli

Durum: tamamlandı · `1.13.5`

- NOAA GML parçalı standart atmosferik refraction yaklaşımı
- geometric altitude → refraction correction → apparent altitude zinciri
- 85° üstü, yüksek irtifa, yakın ufuk ve ufuk-altı formül bölgelerini açık tutma
- point-source yıldız hesabına Güneş semidiameter düzeltmesi taşımama
- gerçek basınç/sıcaklık/nem/dalga boyu kullanılmadığını açık sınırlama olarak koruma
- mevcut Ciddor terrestrial-ray motorunu yıldız apparent-altitude problemiyle sessizce eşitlememe
- apparent yıldız yüksekliğini geometrik local skyline'a otomatik kıyaslayıp görünürlük sonucu üretmeme

Ayrıntı: [`roadmap-stage-6.13.md`](roadmap-stage-6.13.md)

### Aşama 6.14 — Yerel ufuk maskeli yıldız izi ve geçişleri

Durum: tamamlandı · `1.13.6`

- 6.12 skyline maskesini 6.6 geometrik yıldız izi üzerine ayrı katman olarak bağlama
- her örnekte `Δh = h_yıldız - h_skyline(A)` geometrik açıklığı
- çıktı örneklemesinden bağımsız en fazla 15 saniyelik local-horizon kök taraması
- işaret değişimlerini 250 ms altı zaman aralığına kadar ikili kök aramayla inceltme
- yerel ufuk doğuş/batış olayları ve pencere içi yerel-ufuk üstü geometrik süre
- maske kaynak türü, etiket, nokta sayısı ve en büyük azimut boşluğunu provenans olarak koruma
- mevcut astronomik 0° yıldız izi API'sini değiştirmeme
- atmosferik apparent altitude ile geometrik skyline'ı sessizce birleştirmeme

Ayrıntı: [`roadmap-stage-6.14.md`](roadmap-stage-6.14.md)

### Aşama 6.15 — Yıldız yerel ufuk arayüzü, kayıt ve rapor entegrasyonu

Durum: tamamlandı · `1.14.0`

- yerel ufku varsayılan kapalı, sekiz yönlü manuel skyline editörüyle kullanıcıya açma
- K/KD/D/GD/G/GB/B/KB yön değerlerini 6.12 döngüsel interpolasyon sözleşmesine bağlama
- astronomik `0°` ufuk ile yerel skyline'ı grafikte ayrı çizgiler ve ayrı durum/geçiş sonuçları olarak tutma
- anlık yerel ufuk yüksekliği, geometrik açıklık ve yerel-ufuk üstü süreyi prediction metriklerine ekleme
- sekiz yönü mevcut prediction snapshot içinde saklayıp yeni top-level portable şema alanı açmama
- kayıt/reopen, `.ggl.json` round-trip ve HTML rapor korunumu
- 6.15 öncesi yıldız kayıtlarını yerel ufuk kapalı ve 0° yön değerleriyle güvenli açma
- atmosferik apparent altitude ile geometrik skyline'ı otomatik görünürlük sonucuna dönüştürmeme

Ayrıntı: [`roadmap-stage-6.15.md`](roadmap-stage-6.15.md)

### Aşama 6.16 — Yüksek çözünürlüklü skyline dosya importu çekirdeği

Durum: tamamlandı · `1.14.1`

- CSV/TSV/TXT ve JSON `azimut → geometrik ufuk yüksekliği` parserı
- 3–1.440 nokta için mevcut local-horizon maskesiyle ortak doğrulama
- sırasız kaynak normalizasyonu, duplicate reddi ve maksimum azimut boşluğu tanısı
- Electron main-process dosya seçimi, 2 MB sınırı, SHA-256 ve dosya boyutu provenansı
- renderer'a yalnız doğrulanmış/normalize edilmiş profil nesnesi taşıma
- mevcut 8 yönlü manuel UI ve SavedExperiment şemasını değiştirmeme

Ayrıntı: [`roadmap-stage-6.16.md`](roadmap-stage-6.16.md)

### Aşama 6.17 — Yüksek çözünürlüklü skyline UI, kayıt ve rapor entegrasyonu

Durum: tamamlandı · `1.15.0`

- manuel 8 yön ve doğrulanmış dış dosya kaynak modlarını açıkça ayırma
- dosya importunu taslak state'te tutup ağır yıldız hesabını yalnız `Uygula ve hesapla` ile başlatma
- kaynak kartında dosya adı, biçim, nokta sayısı, maksimum boşluk, SHA-256 ve import zamanı
- yüksek çözünürlüklü noktaları Aşama 6.14 local-horizon trail motoruna bağlama
- prediction'a yalnız hafif kaynak özeti; tam profili tek `SavedExperiment.stellarLocalHorizonSource` alanında tutma
- portable/local store şemasını v8'e yükseltip v1–v7 migration'ı koruma
- pointCount, max-gap, SHA ve profil geometrisini import sırasında yeniden doğrulama
- HTML raporda skyline dosya provenansı; ham kaynak baytlarını rapora gömmeme
- gerçek Electron manuel doğrulaması

Ayrıntı: [`roadmap-stage-6.17.md`](roadmap-stage-6.17.md)

### Aşama 6.18 — Apparent yıldız / geometrik skyline güvenli tanı sözleşmesi

Durum: tamamlandı · `1.15.1`

- standart atmosferik kırılmayla apparent yıldız yüksekliğini ayrı tanı katmanı olarak tutma
- geometrik skyline ile apparent yıldız arasındaki karma-referans farkını açık tanı olarak üretme
- karma farktan yerel optik görünürlük sınıfı üretmeme
- yıldızın geometrik olarak skyline altında olup apparent farkın pozitif olabildiği sınır durumunu regresyonla koruma

Ayrıntı: [`roadmap-stage-6.18.md`](roadmap-stage-6.18.md)

### Aşama 6.19 — Standart atmosferik kırılma tanısı UI entegrasyonu

Durum: tamamlandı · `1.16.0`

- geometrik ve standart apparent yıldız yüksekliğini ayrı kart ve grafik çizgileriyle gösterme
- refraction tanı anahtarını yalnız renderer state'i olarak tutup ağır hesabı yeniden çalıştırmama
- karma apparent-yıldız / geometrik-skyline farkını yalnız tanı etiketiyle gösterme
- prediction/HTML raporda apparent metrikleri ve `yerel apparent görünürlük sınıflandırıldı = false` koruması
- gerçek Electron görünümü ve toggle tepkiselliği manuel doğrulaması

Ayrıntı: [`roadmap-stage-6.19.md`](roadmap-stage-6.19.md)

### Aşama 6.20 — Çoklu yıldız gökyüzü snapshot çekirdeği

Durum: tamamlandı · `1.16.1`

- çevrimdışı 19-yıldız katalog altkümesini aynı gözlem anında deterministik çözme
- her yıldızda mevcut J2000 → IAU 2006 precession → geometrik yatay konum zincirini yeniden kullanma
- geometrik 0° üstü/altı toplamları
- isteğe bağlı geometrik local skyline sınıfı ve aggregate sayımlar
- katalog/skyline provenansı ve kompakt hesap izi
- optik görünür yıldız listesi üretmeme

Ayrıntı: [`roadmap-stage-6.20.md`](roadmap-stage-6.20.md)

### Aşama 6.21 — Çoklu yıldız polar gökyüzü görünümü

Durum: tamamlandı · `1.17.0`

- zenit merkezli ve geometrik 0° ufuk çemberli polar üst-yarımküre görünümü
- K/D/G/B yönleri ve 30°/60° yükseklik halkaları
- seçili yıldızı ve en parlak katalog referanslarını etiketleme
- yerel skyline altında kalan geometrik-ufuk-üstü yıldızları ayrı görsel durumda tutma
- görünüm anahtarını hesap state'inden ayırma
- prediction'a yalnız çoklu-yıldız aggregate metrikleri ekleme; tam yıldız dizisini portable kayda kopyalamama
- optik görünürlük ve apparent-altitude haritası üretmeme

Ayrıntı: [`roadmap-stage-6.21.md`](roadmap-stage-6.21.md)

### Aşama 6.22 — Doğrulanmış proper-motion kaynağını hesap zincirine uygulama

Durum: tamamlandı · `1.17.1`

- doğrulanmış BSC5P motion reference verilirse J2000 katalog yönünü önce proper motion ile gözlem epoch'una taşıma
- proper motion sonrası mevcut IAU 2006 precession zincirini uygulama
- seçili yıldız ve 19-yıldız snapshot için aynı motion subset sözleşmesi
- partial/eksik 19-yıldız subset'i sessizce karıştırmak yerine fail-closed reddetme
- prediction'a compact PM uygulanma/kayma/bileşen/kaynak-epok metrikleri
- motion kaynağı verilmezse 1.17.0 geometrik sonucu birebir koruma
- gerçek BSC5P sayılarını kaynak dosya olmadan tahmin edip ürün kataloğuna gömmeme

Ayrıntı: [`roadmap-stage-6.22.md`](roadmap-stage-6.22.md)

### Aşama 6.23 — BSC5P proper-motion kaynak importu ve provenans

Durum: tamamlanma adayı · `1.18.0`

- resmi BSC5P `V/50/catalog` dosyasını Electron dosya seçicisinden alma
- 19/19 HR + J2000 yön + V-kadir doğrulaması ve PM alanlarını zorunlu tutma
- tam kaynak dosyanın SHA-256 / boyut / import zamanı provenansı
- kaynak seçimini taslakta tutup ağır hesabı yalnız `Uygula ve hesapla` ile tek seferde çalıştırma
- seçili yıldız ve 19-yıldız polar snapshot için doğrulanmış PM kaynağını ortak uygulama
- portable/local-store şemasını v9'a çıkarıp v1–v8 migration'ı koruma
- tüm katalog yerine yalnız doğrulanmış 19 exact source row'u saklayıp reopen/import sırasında tekrar parser + referans doğrulaması yapma
- HTML raporda BSC5P proper-motion kaynak provenansı
- polar özetinde haritada çizilenler, 0° altında çizilmeyenler ve çizilen yıldızların skyline sınıflarını ayrı sayma

Ayrıntı: [`roadmap-stage-6.23.md`](roadmap-stage-6.23.md)

### Sonraki astronomi dilimleri

- DEM veya panorama gibi kaynaklardan açık provenanslı 360° skyline üretimi
- daha geniş yıldız kataloğu gerekirse performans ve veri-provenans tasarımı
- ihtiyaç doğrulanırsa paralaks/radyal hız/perspektif ivmelenmesini ayrı astrometrik katman olarak ele alma

## Aşama 7 — Büyük ölçekli olaylar

- tutulmalar
- mevsimler
- zaman dilimleri
- rota karşılaştırmaları

## Dağıtım aşaması

Son kullanıcı kurulum paketi, imzalama ve dağıtım işlemleri ana ürün işlevleri tamamlandıktan sonra ele alınacaktır.
