# Aşama 3.21 — Tipli su yüzeyi anlık görüntüsü

Durum: tamamlandı

- Mevcut `ModelPrediction` kaydından tipli su yüzeyi anlık görüntüsü üretimi
- Kaynak türünün `water-surface:` iz kimliğinden güvenli çözülmesi
- Saat dilimli kayıt ve gözlem zamanlarının doğrulanması
- Kaynak etiketi içinde noktalı virgül olsa bile güvenli ayrıştırma
- Düşey datumun kararlı hesap izi sözleşmesinden çözülmesi
- İstasyon etiketi ve kaynak yayın zamanının yeniden kurulması
- Su seviyesi, su belirsizliği, dalga belirsizliği ve anlamlı dalga yüksekliği
- Gelgit evresi ve belirsizlik birleşim yönteminin yeniden kurulması
- Notların hesap izinden geri alınması
- Birleşik belirsizlik ile alt/üst su yüzeyi sınırının yeniden hesaplanarak doğrulanması
- Değiştirilmiş veya eksik metrik ve hesap adımlarının reddedilmesi
- Su seviyesi metriği belirsizliği ile ayrı belirsizlik metriği tutarlılık kontrolü
- Yeni taşınabilir şema alanı eklemeden makine tarafından yeniden kullanılabilir kayıt
- Eski `0.1.0` su yüzeyi hesap kayıtlarıyla uyumluluk
- Uygulama sürümü `1.0.9`

Sıradaki aşama bu tipli anlık görüntünün kullanıcı kontrollü giriş paneliyle deney
çalışma durumuna eklenmesi, yeniden açılması ve fiziksel uygulama seçeneklerinin
ayrı bir güvenlik sınırıyla tanımlanmasıdır.
