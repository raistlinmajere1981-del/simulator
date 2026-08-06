# Arazi kaynak dosyası bütünlüğü

CSV, GeoJSON ve ESRI ASCII DEM içe aktarmalarında uygulama kaynak dosyanın ham
baytlarını ana süreçte okur. Dosyanın tam bayt uzunluğu ve SHA-256 özeti hesaplanır.
Ham dosya içeriği renderer sürecine aktarılmaz.

CSV sütunlarının kullanıcı tarafından eşlenmesi gerektiğinde boyut ve özet, süreli
ana süreç önbelleğinde dosya içeriğiyle birlikte korunur. Eşleme sonrasında oluşan
profil aynı kaynak özetiyle kaydedilir.

Boyut ve SHA-256 özeti:

- yerel deney kaydında,
- taşınabilir `.ggl.json` dosyasında,
- kaynak şeridinde kısa özet olarak,
- HTML raporunda tam değer olarak

saklanır. SHA-256 özeti dosyanın sonradan değiştirilip değiştirilmediğini karşılaştırmak
için kullanılabilir; dosyanın doğruluğunu, güvenilirliğini veya bilimsel kalitesini
tek başına kanıtlamaz.

Eski şema-v7 kayıtlarında bu alanlar bulunmayabilir. Boyut ve SHA-256 ya birlikte
bulunur ya da ikisi de bulunmaz; kısmi veya biçimi bozuk bütünlük bilgisi reddedilir.
