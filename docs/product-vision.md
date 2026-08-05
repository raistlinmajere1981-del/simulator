# Ürün Vizyonu

## Amaç

Farklı geometrik ve fiziksel Dünya modellerinin aynı ölçülebilir deney karşısında ürettiği sayısal tahminleri karşılaştıran masaüstü laboratuvarı oluşturmak.

Uygulama bir sonucu önceden seçmez. Deney girdisini, model varsayımlarını, tahmini, gözlemi ve belirsizliği görünür biçimde ayırır.

## Kullanıcı vaadi

- Aynı girdiyi birden fazla modelde çalıştırma
- Her sayının hangi varsayımla üretildiğini görme
- Tahmin ile gözlem farkını ölçme
- Eksik tanımlı modellerde uydurma sonuç yerine açık uyarı alma
- Deneyi daha sonra yeniden üretme

## İlk çalışan ürün dilimi

Hedef görünürlüğü deneyi:

- Gözlemci ve hedef yüksekliği
- Yüzey mesafesi
- Gözlenen görünür oran ve belirsizlik
- İdeal küre
- Tanımlı düzlem
- Standart atmosferik kırılma
- Görünür ve gizlenen hedef oranı
- Ufuk ve görüş açısı

Azimutal harita gösterimi fiziksel model gibi hesaplanmaz. Gerekli fizik kuralları tanımlanmadığı için açıkça desteklenmiyor olarak gösterilir.

## Bilimsel sunum ilkeleri

- Genel model güven puanı kullanılmaz.
- Tek deneydeki uyum, genel doğruluk iddiası olarak sunulmaz.
- Belirsizlik sonuçtan ayrı gösterilmez; değerlendirmeye dahildir.
- Geometri, atmosfer, arazi ve kamera etkileri ayrı katmanlardır.
- Görsel canlandırma sayısal çözümün yerine geçmez.

## Uzun vadeli yön

- WGS84 ve gerçek koordinatlar
- Arazi profili
- Gelişmiş atmosfer
- Fotoğraf kalibrasyonu
- Güneş, Ay ve yıldız deneyleri
- Deney arşivi ve raporlama
