# Aşama 3.18 — Kontrollü jeoit profil dönüşümü

Durum: tamamlandı

- WGS84 elipsoidal ve ortometrik yükseklik datumları arasında kontrollü arayüz
- Açık `N = h - H` işaret sözleşmesi
- Kullanıcı tarafından girilen jeoit ondülasyonu
- Zorunlu kaynak veya model etiketi
- İsteğe bağlı jeoit ondülasyonu belirsizliği
- Uygulama öncesinde gözlemci ve hedef kotu önizlemesi
- Ortak düzeltme, arazi örnek sayısı ve sonuç belirsizliği özeti
- Gözlemci, hedef ve bütün arazi noktalarının tek işlemde dönüştürülmesi
- Nokta kimliği, rota yüzdesi ve sırasının korunması
- Kaynak arazi profilinin içe aktarımdan sonra düzenlenmiş olarak işaretlenmesi
- Yerel datumun doğrulanmış jeodezik bağ olmadan dönüştürülmemesi
- Mevcut datum / gelgit ofsetinin ayrı deney düzeltmesi olarak korunması
- Saf profil dönüşüm motoru ve sınır testleri
- Uygulama sürümü `1.0.6`

Kaynak/model etiketi bu aşamada bilinçli kullanıcı onayı ve işlem bildirimi için
zorunludur; henüz deney kaydına kalıcı provenans olarak yazılmaz. Sıradaki alt
aşama model adı, sürüm, epok, `N`, belirsizlik, dönüşüm yönü, zaman ve hesap izini
taşınabilir kayıt şemasında ve HTML raporunda koruyacaktır.
