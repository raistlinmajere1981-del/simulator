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
- Linux/KDE masaüstünde 1920×1080 görsel doğrulama
- Girdi sınırlandırması ve uygulanmayan kontrollerin açık işaretlenmesi
- Birim testleri ve üretim derlemesi

## Aşama 2 — Deney kaydetme ve izlenebilirlik

Durum: tamamlandı

- Deneyleri Electron kullanıcı veri klasöründe JSON olarak saklama
- Kayıt oluşturma, güncelleme, yeniden açma ve silme
- Model sürümleri ile sonuç anlık görüntüsünü kaydetme
- Her model için formül, sayısal yerine koyma ve sonuç adımları
- Model varsayımları görünümü
- Hesap izi kimliği
- Azimutal projeksiyon için eksik fiziksel kuralların izde açıklanması
- Linux/KDE üzerinde kayıt, yeniden açma, güncelleme ve silme doğrulaması

## Aşama 2.1 — Taşınabilir deneyler ve raporlar

Durum: tamamlandı

- Sürüm numaralı `.ggl.json` dışa aktarma ve içe aktarma
- Eski yerel kayıt dizisinin otomatik taşınması
- Derin çalışma zamanı doğrulaması
- Bozuk ve desteklenmeyen dosyaların güvenli biçimde reddedilmesi
- Kimlik çakışmasında güvenli yeni kayıt oluşturulması
- Çevrimdışı, yazdırılabilir HTML deney raporu
- Raporda girdiler, model sürümleri, sonuçlar, varsayımlar, uyarılar ve hesap izleri
- Rapor sayılarında birime uygun okunabilir hassasiyet
- Linux/KDE üzerinde dışa aktarma, yeniden içe aktarma ve rapor görünümü doğrulaması
- Şema taşıma ve HTML güvenlik testleri

## Aşama 3.1 — WGS84 gerçek konum girdileri

Durum: tamamlandı

- Gözlemci ve hedef için enlem/boylam girdileri
- Manuel ve koordinattan hesaplanan mesafe arasında seçim
- WGS84 elipsoidi üzerinde Vincenty ters jeodezik çözümü
- Elipsoidal yüzey mesafesi
- Başlangıç ve varış azimutları
- Koordinat aralığı doğrulaması
- Çakışan noktaların açık ele alınması
- Yakın-antipodal yakınsama sorununda işaretli küresel yedek çözüm
- Jeodezik varsayım, formül, iterasyon ve sonuç hesap izi
- Koordinat ve jeodezik anlık görüntüsünün yerel kayda eklenmesi
- Taşınabilir ve yerel kayıt şemalarının sürüm 2'ye taşınması
- Sürüm 1 kayıtların manuel mesafe modunda geriye dönük açılması
- HTML raporunda koordinat ve WGS84 jeodezik bölümü
- Linux/KDE üzerinde manuel/koordinat geçişi, canlı sonuçlar, kayıt, JSON ve HTML raporu doğrulaması
- Referans, sınır ve taşıma testleri

## Aşama 3.2 — Düşey datum ve arazi temeli

Durum: tamamlandı ve `main` dalına alındı

- Ortometrik deniz seviyesi, WGS84 elipsoidal ve yerel düşey datum seçimi
- Gelgit veya yerel benchmark için datum ofseti
- Gözlemci zemin kotu ve hedef taban kotu
- Gözlemci göz kotu ve hedef tepe kotunun ortak referansta türetilmesi
- Manuel, içe aktarılan ve DEM kaynaklı genel profil sözleşmesi
- Mesafe-yükseklik örneklerinin doğrulanması
- Tek ara örnekli ilk manuel profil
- Düzlem geometrisinde görüş hattı açıklığı
- Küresel geometrinin yerel düşey doğrultularında görüş hattı açıklığı
- Kritik engel ve minimum açıklık tespiti
- Araziyi temizleyen minimum hedef kotunun sayısal çözümü
- Eğrilik ve arazi etkilerinin hedef görünürlüğünde birlikte uygulanması
- Etkin yarıçapın profil analizine yaklaşık yansıması
- Model metrikleri, uyarıları ve hesap izinde arazi sonuçları
- Kayıt ve taşınabilir dosya şemasının sürüm 3'e yükseltilmesi
- Sürüm 1 ve 2 kayıtların güvenli varsayılanlarla taşınması
- HTML raporunda düşey datum, uç kotları ve manuel profil bölümü
- Atmosfer kontrolünün 1920×1080 yerleşimde görünür tutulması
- Uygulama sürümü `0.5.0`
- Linux/KDE yerel akış doğrulaması

## Aşama 3.3 — Çok noktalı manuel arazi profili

Durum: çalışan sürüm tamamlandı, yerel görsel doğrulama bekliyor

Tamamlananlar:

- Kimlik, yüzde konumu ve kot taşıyan `ManualTerrainPoint` sözleşmesi
- En fazla 2.000 iç nokta
- Nokta kimliği, yüzde aralığı, tekrar ve sonlu sayı doğrulaması
- Noktaların artan rota yüzdesine göre deterministik sıralanması
- Gözlemci ve hedef uçlarının otomatik eklenmesi
- Yüzde konumundan gerçek metre mesafesine dönüşüm
- Nokta ekleme, düzenleme ve silme yardımcıları
- En büyük profil boşluğuna otomatik nokta ekleme
- Yeni nokta kotunun komşu örneklerden doğrusal enterpolasyonu
- Canlı SVG profil önizlemesi
- İdeal kürenin kritik arazi mesafesinin önizlemede işaretlenmesi
- Nokta değişiminde küre ve düzlem hesaplarının canlı yenilenmesi
- Kayıt açma, kaydetme ve varsayılana dönmede profil dizisinin korunması
- Taşınabilir ve yerel kayıt şemasının sürüm 4'e yükseltilmesi
- Sürüm 1, 2 ve 3 kayıtların sürüm 4'e taşınması
- Sürüm 3 tek ara noktasının kayıpsız diziye dönüştürülmesi
- HTML raporunda bütün noktaların sıra, yüzde, mesafe ve kot bilgisi
- Çok noktalı çekirdek, taşıma ve rapor testleri
- TypeScript, test ve Electron üretim derlemesi
- Uygulama sürümü `0.6.0`

Yerel doğrulama:

- Linux/KDE 1920×1080 panel yerleşimi
- Nokta ekleme ve en büyük boşluğa yerleşme
- Nokta yüzdesi değişince yeniden sıralama
- Nokta kotu değişince iki modelin canlı güncellenmesi
- Nokta silme ve sıfır ara noktalı profil
- Kritik arazi işaretinin önizlemede görünmesi
- Profil kapalı/açık geçişi
- Atmosferik kırılma kontrolünün görünür kalması
- Kayıt ve yeniden açmada bütün noktaların korunması
- Şema v4 JSON dışa/içe aktarma
- HTML raporunda bütün noktaların görünmesi

Sonraki gerçek arazi işleri:

- CSV profil içe aktarma
- GeoJSON profil içe aktarma
- Noktaları grafik üzerinde sürükleyerek düzenleme
- Sayısal yükseklik modeli entegrasyonu
- Görüş hattı boyunca DEM örneklemesi
- Arazi veri kaynağı ve çözünürlük izlenebilirliği
- Ortometrik ve elipsoidal yükseklik için isteğe bağlı jeoit dönüşümü
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
