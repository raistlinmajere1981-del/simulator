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

Durum: çalışan ilk sürüm tamamlandı, yerel kullanım doğrulaması bekliyor

- Deneyleri Electron kullanıcı veri klasöründe JSON olarak saklama
- Kayıt oluşturma, güncelleme, yeniden açma ve silme
- Model sürümleri ile sonuç anlık görüntüsünü kaydetme
- Her model için formül, sayısal yerine koyma ve sonuç adımları
- Model varsayımları görünümü
- Hesap izi kimliği
- Azimutal projeksiyon için eksik fiziksel kuralların izde açıklanması

Kalan işler:

- Kayıt ve yeniden açma akışının Linux/KDE üzerinde doğrulanması
- JSON dışa aktarma ve içe aktarma
- İnsan tarafından okunabilir sonuç raporu
- Kayıt şeması sürümü ve eski kayıt taşıma mekanizması

## Aşama 3 — Gerçek konum ve arazi

- Koordinatlardan mesafe hesabı
- WGS84 elipsoid modeli
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
