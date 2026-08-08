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

# Sıradaki ana ürün aşamaları

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
