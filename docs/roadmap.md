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

Durum: tamamlandı ve Linux/KDE üzerinde doğrulandı

- Deneyleri Electron kullanıcı veri klasöründe JSON olarak saklama
- Kayıt oluşturma, güncelleme, yeniden açma ve silme
- Model sürümleri ile sonuç anlık görüntüsünü kaydetme
- Her model için formül, sayısal yerine koyma ve sonuç adımları
- Model varsayımları görünümü
- Hesap izi kimliği
- Azimutal projeksiyon için eksik fiziksel kuralların izde açıklanması
- Uygulamayı kapatıp açtıktan sonra kayıtların korunması
- Veri Yöneticisi ve sol menüden kayıt açma

## Aşama 2.1 — Taşınabilir dosyalar ve raporlama

Durum: kod ve otomatik testler tamamlandı, yerel kullanım doğrulaması bekliyor

- Sürüm 1 taşınabilir deney dosyası şeması
- Sürüm 1 yerel deney deposu şeması
- Eski düz yerel kayıt dizisinin otomatik taşınması
- Ham eski deney JSON kaydının içe aktarılması
- Derin çalışma zamanı doğrulaması
- Bozuk ve desteklenmeyen dosyaların güvenli biçimde reddedilmesi
- Kimlik çakışmasında yeni kayıt kimliği üretme
- Veri Yöneticisinden JSON dışa aktarma ve içe aktarma
- Çevrimdışı, yazdırılabilir HTML deney raporu
- Raporda girdiler, model sürümleri, sonuçlar, uyarılar ve hesap izleri
- HTML içerik kaçış testi

Yerel doğrulama:

- JSON dışa aktarma
- Aynı dosyayı yeniden içe aktarma
- Kimlik çakışması davranışı
- Bozuk JSON dosyasının reddedilmesi
- HTML raporunun tarayıcı ve yazdırma görünümü

## Aşama 3 — Gerçek konum ve arazi

- Koordinat giriş arayüzü
- Koordinatlardan jeodezik mesafe hesabı
- WGS84 elipsoid modeli
- Küre ve elipsoid sonuç karşılaştırması
- Sayısal yükseklik modeli entegrasyonu
- Deniz seviyesi ve arazi engelleri

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
