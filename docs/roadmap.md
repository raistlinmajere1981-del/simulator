# Yol Haritası

## Aşama 0 — Tasarım ve sözleşmeler

- Ürün kapsamını kesinleştirme
- Deney veri şeması
- Model eklenti sözleşmesi
- Arayüz prototipi
- Hesap doğrulama yaklaşımı

## Aşama 1 — Geometrik MVP

- İdeal küre modeli
- Tanımlı sonsuz düzlem modeli
- İki nokta arası mesafe
- Ufuk mesafesi
- Hedef görünürlüğü ve gizlenme
- Atmosfer kapalı / standart kırılma
- Birim testleri ve referans hesaplar
- Deneyleri JSON olarak kaydetme

## Aşama 2 — WGS84 ve gerçek arazi

- Elipsoid jeodezik hesaplar
- Deniz seviyesi ve gelgit girdileri
- Sayısal yükseklik modeli entegrasyonu
- Arazi görüş hattı
- Veri kaynağı ve lisans kaydı

## Aşama 3 — Fotoğraf kalibrasyonu

- Sensör ve lens profili
- Ufuk ve hedef işaretleme
- Piksel-açı dönüşümü
- Kamera eğimi ve kırpma hesabı
- Ölçüm belirsizliği üretimi

## Aşama 4 — Güneş, Ay ve gölgeler

- Güneş azimutu ve yüksekliği
- Gölge boyu deneyleri
- Gün doğumu / gün batımı
- Ay konumu ve evreleri

## Aşama 5 — Yıldızlar ve büyük ölçekli olaylar

- Yıldız yönleri ve izleri
- Kuzey / güney gök kutbu karşılaştırması
- Tutulma deneyleri
- Uçuş ve büyük çember rota analizleri

## Karar verilmesi gerekenler

- İlk sürüm yalnızca masaüstü mü olacak, yoksa web çıktısı da üretilecek mi?
- Deney dosyaları JSON ile mi başlayacak, doğrudan SQLite mı kullanılacak?
- Model eklentileri yalnızca proje içi güvenilir kod mu olacak?
- İlk gerçek gözlem veri seti hangi senaryolardan oluşacak?
- Atmosfer profil verisinin kaynağı ve çevrimdışı çalışma yöntemi ne olacak?
