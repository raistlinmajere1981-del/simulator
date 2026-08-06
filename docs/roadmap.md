# Yol Haritası

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
- Ufuk mesafesi
- Görünür ve gizlenen hedef yüksekliği
- Hedef tepe görüş açısı
- Atmosfer kapalı ve standart kırılma seçenekleri
- Gözlem farkı ve belirsizlik değerlendirmesi
- Etkileşimli arayüz girdileri
- Linux/KDE 1920×1080 görsel doğrulama
- Girdi sınırlandırması
- Birim testleri ve üretim derlemesi

## Aşama 2 — Deney kaydetme ve izlenebilirlik

Durum: tamamlandı

- Yerel deney kayıtları
- Kayıt oluşturma, güncelleme, yeniden açma ve silme
- Model sürümleri ve sonuç anlık görüntüleri
- Formül, sayısal yerine koyma ve sonuç adımları
- Varsayımlar ve hesap izi kimliği
- Linux/KDE kayıt akışı doğrulaması

## Aşama 2.1 — Taşınabilir deneyler ve raporlar

Durum: tamamlandı

- Sürümlü `.ggl.json` dışa/içe aktarma
- Eski kayıtların otomatik taşınması
- Çalışma zamanı doğrulaması
- Bozuk dosyaların güvenli reddi
- Kimlik çakışması çözümü
- Çevrimdışı ve yazdırılabilir HTML raporu
- Şema taşıma ve HTML güvenlik testleri

## Aşama 3.1 — WGS84 gerçek konum girdileri

Durum: tamamlandı

- Gözlemci ve hedef enlem/boylamları
- Manuel ve koordinat mesafesi seçimi
- WGS84 Vincenty ters jeodezik çözümü
- Yüzey mesafesi ve uç azimutları
- Yakın-antipodal durumda işaretli küresel yedek çözüm
- Jeodezik hesap izi
- Kayıt, JSON ve HTML raporu desteği
- Referans, sınır ve taşıma testleri

## Aşama 3.2 — Düşey datum ve arazi temeli

Durum: tamamlandı ve `main` dalına alındı

- Ortometrik deniz seviyesi, WGS84 elipsoidal ve yerel datum
- Datum veya gelgit ofseti
- Gözlemci zemin ve hedef taban kotları
- Ortak referansta göz ve hedef tepe kotu
- Genel arazi profil sözleşmesi
- Düzlem ve kürede görüş hattı açıklığı
- Kritik engel ve minimum açıklık
- Araziyi temizleyen minimum hedef kotu
- Kırılmanın arazi hesabına yaklaşık yansıması
- Şema v3 ve eski kayıt taşıması
- HTML raporunda düşey datum ve profil
- Uygulama sürümü `0.5.0`

## Aşama 3.3 — Çok noktalı manuel arazi profili

Durum: tamamlandı ve `main` dalına alındı

- Kimlik, yüzde konumu ve kot taşıyan iç noktalar
- En fazla 2.000 nokta
- Sıralama, tekrar ve sınır doğrulaması
- Uçların zemin kotlarından otomatik eklenmesi
- Nokta ekleme, düzenleme ve silme
- En büyük boşluğa otomatik nokta ekleme
- Canlı SVG profil önizlemesi
- Kritik arazi mesafesi işareti
- Küre ve düzlemin canlı yeniden hesaplanması
- Şema v4 ve v1–v3 taşıması
- HTML raporunda bütün noktalar
- 1920×1080 panel akışı
- Uygulama sürümü `0.6.0`
- Linux/KDE, kayıt, JSON ve rapor doğrulaması

## Aşama 3.4 — CSV arazi profili içe aktarma

Durum: tamamlandı ve `main` dalına alındı

- CSV, TSV ve düz metin dosyaları
- Electron ana sürecinde güvenli dosya okuma
- 5 MB dosya ve 2.000 ara nokta sınırı
- Virgül, noktalı virgül ve sekme algılama
- Metre, kilometre ve rota yüzdesi sütunları
- Türkçe başlıklar ve ondalık virgül
- Gözlemci/hedef uç satırı doğrulaması
- Artan ve tekrarsız mesafeler
- Mutlak mesafelerin yüzdeye dönüştürülmesi
- Kaynak rota ve uç kotu farkı uyarıları
- İnceleme kartı
- `Vazgeç` ve `Profili uygula`
- Hata veya iptalde mevcut profil koruması
- Canlı model yenilemesi
- Örnek dosyalar ve parser testleri
- Uygulama sürümü `0.7.0`
- Linux/KDE yerel doğrulaması

## Aşama 3.5 — CSV provenansı, uç kotları ve sütun eşleme

Durum: tamamlandı ve `main` dalına alındı

Tamamlananlar:

- CSV dosya adı ve içe aktarma zamanı kaydı
- Ayırıcı, mesafe birimi ve kaynak rota kaydı
- Kaynak satır sayısı ve eşlenen sütun başlıkları
- CSV gözlemci/hedef uç kotlarının kaydı
- Gözlemci uç kotunu bağımsız uygulama seçeneği
- Hedef uç kotunu bağımsız uygulama seçeneği
- Standart dışı başlıklarda sütun eşleme ekranı
- Mesafe sütunu, birim ve kot sütunu seçimi
- İlk beş satırlık güvenli önizleme
- Ham dosya içeriğinin renderer'a verilmemesi
- Ana süreçte rastgele istek kimliği ve 10 dakikalık süre
- İçe aktarma sonrasında manuel değişiklik işareti
- Kaynak durumunun arazi panelinde gösterilmesi
- Şema v5 ve v1–v4 taşıması
- V4 kayıtlarına uydurma provenans eklenmemesi
- JSON ve HTML raporunda kaynak bilgisi
- Eşleme gerektiren örnek CSV
- Parser, şema, rapor ve güvenlik testleri
- Uygulama sürümü `0.8.0`

Yerel doğrulama:

- Linux/KDE sütun eşleme kartı yerleşimi
- `chainage → metre`, `terrain_height → kot` eşlemesi
- Mesafe ve kot için aynı sütunun reddedilmesi
- CSV uç kotlarını uygulamadan profil kullanma
- Yalnız gözlemci ucunu uygulama
- Yalnız hedef ucunu uygulama
- İki ucu birlikte uygulama
- Kaynak durumunun yeşil `Kaynakla eşleşiyor` görünümü
- Nokta veya uç değişiminde sarı `İçe aktarımdan sonra düzenlendi` görünümü
- Kayıt ve yeniden açmada provenansın korunması
- Şema v5 JSON dışa/içe aktarma
- HTML raporunda dosya, sütun, birim, rota, uç seçimleri ve değişiklik durumu

## Aşama 3.6 — CSV rota mesafesini deneye aktarma

Durum: tamamlandı

- Mutlak mesafeli CSV profillerinde kaynak toplam rota uzunluğu
- Yalnız manuel mesafe modunda kullanılabilen bağımsız seçim
- Varsayılan olarak mevcut deney mesafesini koruma
- Seçildiğinde manuel yüzey mesafesini CSV rotasına ayarlama
- Koordinat modunda WGS84 mesafesini değiştirmeme
- Yüzde tabanlı ve uygulama sınırını aşan profillerde seçeneği göstermeme
- Mesafe değiştiğinde CSV kaynağını sonradan düzenlenmiş olarak işaretleme
- Saf uygulama fonksiyonu ve sınır testleri
- Uygulama sürümü `0.8.1`

## Aşama 3.7 — GeoJSON arazi profili

Durum: tamamlandı

- Doğrudan `LineString`, `Feature` ve tek hatlı `FeatureCollection`
- WGS84 `[boylam, enlem, yükseklik]` koordinatları
- Ardışık noktalar arasında ters jeodezik mesafe hesabı
- Kümülatif mesafeden rota yüzdesi üretimi
- GeoJSON rota mesafesini deneye isteğe bağlı uygulama
- Başlangıç ve bitiş zemin yüksekliklerini bağımsız uygulama
- 5 MB, 2.002 koordinat ve 20.000 km güvenlik sınırları
- Tekrarlanan konum, eksik yükseklik ve birden fazla rota reddi
- GeoJSON kaynağının kayıt, JSON ve HTML raporunda korunması
- Taşınabilir ve yerel kayıt şeması v6
- Uygulama sürümü `0.9.0`

## Sonraki gerçek arazi işleri
- Noktaları grafik üzerinde sürükleme
- Sayısal yükseklik modeli entegrasyonu
- Görüş hattı boyunca DEM örnekleme
- Veri kaynağı ve çözünürlük izlenebilirliği
- Jeoit dönüşümü
- Su seviyesi, gelgit zamanı ve dalga belirsizliği

## Aşama 4 — Gelişmiş atmosfer

- Sıcaklık, basınç ve nem girdileri
- Dikey atmosfer profili
- Katmanlı ışın izleme
- Standart ve gelişmiş sonuç karşılaştırması

## Aşama 5 — Fotoğraf kalibrasyonu

- Kamera ve lens bilgileri
- Ufuk, hedef tabanı ve hedef tepesi işaretleme
- Piksel-açı dönüşümü
- Ölçüm belirsizliği üretimi

## Aşama 6 — Güneş, Ay ve gökyüzü deneyleri

- Güneş yüksekliği ve azimutu
- Gölge deneyleri
- Gün doğumu ve gün batımı
- Ay konumu ve evreleri
- Yıldız görünürlüğü ve yıldız izleri

## Aşama 7 — Büyük ölçekli olaylar

- Tutulmalar
- Mevsimler
- Zaman dilimleri
- Rota karşılaştırmaları
