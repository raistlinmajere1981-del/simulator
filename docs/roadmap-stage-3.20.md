# Aşama 3.20 — Su yüzeyi ölçüm ve provenans sözleşmesi

Durum: tamamlandı

- Anlık su seviyesinin seçilen düşey datuma göre kaydı
- Saat dilimi içeren zorunlu gözlem zamanı
- Ayrı kayıt zamanı ve isteğe bağlı kaynak yayın zamanı
- Manuel gözlem, gelgit ölçer, gelgit tahmini ve ölçme/nivelman kaynak türleri
- Zorunlu kaynak etiketi ve isteğe bağlı istasyon etiketi
- Su seviyesi ölçüm/tahmin belirsizliği
- Dalga kaynaklı doğrudan düşey belirsizlik
- Anlamlı dalga yüksekliğinin ayrı provenans olarak tutulması
- `H_s` değerinin otomatik belirsizlik veya geometri düzeltmesine çevrilmemesi
- Gelgit evresi kaydı
- Varsayılan koruyucu doğrusal belirsizlik toplamı
- Açık bağımsızlık varsayımıyla isteğe bağlı kök-toplam-kare birleşimi
- Alt ve üst su yüzeyi sınırı
- Formül, sayısal yerine koyma, varsayım, uyarı ve iz kimliği
- Mevcut şema-7 üzerinden `.ggl.json` kayıpsız gidiş-dönüş
- HTML raporunda kaynak, zaman, su seviyesi, dalga bağlamı ve düşey aralık
- Eski deneylerle geriye dönük uyumluluk
- Uygulama sürümü `1.0.8`

Bu aşama yalnız ölçüm ve provenans katmanıdır. Su seviyesi henüz gözlemci, hedef
veya arazi geometrisine otomatik uygulanmaz. Sıradaki aşama kullanıcı kontrollü
su yüzeyi kayıt arayüzü ve kaydın deneyle birlikte saklanmasıdır.
