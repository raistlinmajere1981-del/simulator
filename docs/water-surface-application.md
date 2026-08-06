# Kontrollü su yüzeyi fiziksel uygulaması

Bu aşama tipli su yüzeyi anlık görüntüsünü deney geometrisine otomatik değil,
kullanıcı tarafından açıkça seçilen bir işlem olarak uygular.

## Uygulama hedefleri

Kullanıcı üç hedeften birini seçer:

- yalnız gözlemci zemin kotu,
- yalnız hedef taban kotu,
- gözlemci ve hedef uç kotlarının ikisi.

İşlem gözlemci göz yüksekliğini, hedef nesne yüksekliğini, arazi ara noktalarını
ve datum/gelgit ofsetini değiştirmez. Bu ayrım, su seviyesini yanlışlıkla bütün
profil için genel bir datum düzeltmesi gibi kullanmayı önler.

## Su yüzeyi senaryoları

- **mean**: kaydedilen anlık/durgun su seviyesi,
- **lower-bound**: birleşik belirsizlikten türetilen alt sınır,
- **upper-bound**: birleşik belirsizlikten türetilen üst sınır.

Alt veya üst sınır yalnız kaynak kayıtta birleşik belirsizlik ve su yüzeyi aralığı
varsa kullanılabilir. Sınır senaryoları duyarlılık analizi olarak işaretlenir;
gerçek gözlem anındaki yüzey oldukları varsayılmaz.

## Güvenlik kontrolleri

Uygulama başlamadan önce:

- su yüzeyi kaydının deney kimliği eşleşmelidir,
- su yüzeyi ve deney aynı düşey datumda olmalıdır,
- deney ve su gözlemi zamanları saat dilimli ISO biçiminde olmalıdır,
- isteğe bağlı azami zaman farkı sınırı aşılmamalıdır,
- uygulanacak su yüzeyi güvenli kot aralığında olmalıdır.

Datum uyuşmazlığında otomatik jeoit veya yerel datum dönüşümü yapılmaz. Kullanıcı
önce doğrulanmış datum dönüşümünü ayrı işlem olarak tamamlamalıdır.

## Zaman farkı

```text
Δt = |t_deney - t_su|
```

Zaman farkı her durumda hesap izine yazılır. Kullanıcı bir azami dakika sınırı
verirse bu sınırı aşan su yüzeyi kaydı uygulanmaz. Sınır verilmezse işlem mümkün
olur ancak sıfır olmayan fark açık uyarı üretir.

## Sonuç ve provenans

İşlem şu alanları içeren ayrı `water-surface-application` hesap kaydı üretir:

- seçilen uygulama hedefi,
- seçilen ortalama/alt/üst senaryo,
- uygulanan su yüzeyi,
- deney ve su gözlemi zaman farkı,
- işlem öncesi ve sonrası uç kotları,
- kaynak birleşik su yüzeyi belirsizliği,
- uygulama zamanı,
- formüller, varsayımlar, uyarılar ve iz kimliği.

Ortalama senaryo kullanıldığında kaynak birleşik belirsizlik, uygulanan su yüzeyi
metriğinin belirsizlik alanına da yazılır. Alt/üst senaryoda aynı belirsizlik tekrar
uygulanmaz; seçilen sınır zaten belirsizlik zarfının bir ucudur.

Bu hesap kaydı mevcut şema-7 `ModelPrediction` sözleşmesiyle yerel kayıt,
`.ggl.json` ve HTML raporunda korunur.

## Bilinçli sınırlar

- Anlamlı dalga yüksekliği geometri düzeltmesine çevrilmez.
- Su yüzeyi arazi profili boyunca yatay bir su katmanı üretmez.
- Kıyı, dalga kırılması, gemi yalpası, kamera yüksekliği hareketi veya su yüzeyi
  eğimi modellenmez.
- Uygulama yalnız seçilen uç zemin kotlarını değiştirir.
- Kullanıcı arayüzü ve canlı deney durumu bağlantısı sonraki aşamadadır.
