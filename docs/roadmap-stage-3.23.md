# Aşama 3.23 — Su yüzeyi kayıt ve uygulama arayüzü

Durum: tamamlandı

- Su seviyesi, kaynak türü ve kaynak etiketi için kullanıcı kontrollü giriş paneli
- Saat dilimli su gözlemi zamanı
- İsteğe bağlı istasyon ve gelgit tahmini yayın zamanı
- Su seviyesi ölçüm/tahmin belirsizliği
- Dalga kaynaklı düşey belirsizlik
- Anlamlı dalga yüksekliğinin yalnız provenans olarak korunması
- Gelgit evresi seçimi
- Koruyucu doğrusal veya bağımsız RSS belirsizlik birleşimi
- Kayıttan alt ve üst su yüzeyi sınırı önizlemesi
- Gözlemci zemini, hedef tabanı veya iki uç için kontrollü uygulama
- Ortalama/anlık, alt sınır ve üst sınır senaryoları
- İsteğe bağlı azami deney-su gözlemi zaman farkı
- Su gözlem ve uygulama hesap izlerinin arayüzden açılması
- Kaydedilmemiş deneylerde de kararlı deney kimliği kullanılması
- Deney referans zamanının ilk kayıt zamanıyla korunması
- Su gözlem ve uygulama tahminlerinin yerel kayıt, `.ggl.json` ve HTML rapor akışına dahil edilmesi
- Deney yeniden açıldığında su yüzeyi kayıtlarının çalışma durumuna geri yüklenmesi
- Uç kotu, düşey datum veya datum/ofset sonradan değişirse önceki su uygulamasının tarihsel olarak işaretlenmesi
- Yeni su gözlemi oluşturulduğunda eski canlı uygulamanın kaldırılması
- DEM ve su yüzeyi kapsam notlarının aktif arayüzle uyumlu hâle getirilmesi
- Saf çalışma durumu geri yükleme ve tarihsel işaretleme testleri
- Uygulama sürümü `1.0.11`

Bu aşama su yüzeyini yatay bir rota katmanı veya dinamik dalga geometrisi olarak
modellemez. Uygulama yalnız kullanıcının açıkça seçtiği uç zemin kotlarını değiştirir.
Sonraki ürün işi gerçek harita/küre görselleştirme altyapısını kurmak ve mevcut
koordinat, rota, arazi ve model sonuçlarını bu sahnede göstermek olacaktır.
