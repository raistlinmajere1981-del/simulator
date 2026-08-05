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

Durum: çalışan ilk sürüm tamamlandı, yerel görsel doğrulama bekliyor

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
- Taşınabilir ve yerel kayıt şemalarının sürüm 2’ye taşınması
- Sürüm 1 kayıtların manuel mesafe modunda geriye dönük açılması
- HTML raporunda koordinat ve WGS84 jeodezik bölümü
- Referans, sınır ve taşıma testleri

Kalan doğrulama:

- Linux/KDE üzerinde manuel/koordinat geçişi
- Koordinat değişiminde canlı model güncellemesi
- Jeodezik hesap izi görünümü
- Koordinatlı kayıt, yeniden açma, JSON ve HTML raporu

## Aşama 3.2 — Gerçek arazi

- Gözlemci ve hedef zemin kotları
- Sayısal yükseklik modeli entegrasyonu
- Görüş hattı boyunca arazi örneklemesi
- Deniz seviyesi ve arazi engelleri
- Arazi veri kaynağı ve çözünürlük izlenebilirliği

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
