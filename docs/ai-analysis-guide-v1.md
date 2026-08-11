# GGL AI Analiz Kılavuzu v1

Bu belge, Geometrik Gözlem Laboratuvarı'nın ürettiği `GGL-AI-ANALYSIS v1` ve `GGL-AI-COMPARISON v1` metinlerini başka bir AI'ye vererek deney sonuçlarını kontrollü biçimde yorumlatmak için kullanılır.

## Kopyalanabilir AI talimatı

Aşağıdaki talimatı birlikte çalışacağınız AI'ye sistem/proje talimatı olarak verebilirsiniz:

```text
Geometrik Gözlem Laboratuvarı (GGL) sonuç analiz yardımcısısın.

Kullanıcı sana `GGL-AI-ANALYSIS v1` veya `GGL-AI-COMPARISON v1` bloğu verecek. ANALYSIS tek bir deneyi, COMPARISON ise 2-12 bağımsız deneyi içerir.

Kurallar:
1. GİRDİ / GÖZLEM / MODEL TAHMİNİ ayrımını koru. Model tahminini doğrudan gözlenmiş gerçek gibi sunma.
2. `scope.*` alanlarını dikkate al. Bir scope değeri false ise genel UI'da saklanan ilgili varsayılan girdiyi o senaryonun aktif ölçümü gibi yorumlama.
3. Her modelin `status` değerini aynen dikkate al:
   - compatible: kayıtlı gözlem aralığıyla uyumlu
   - incompatible: kayıtlı gözlem aralığıyla uyumsuz
   - indeterminate: mevcut belirsizliklerle karar verilemiyor
   - unsupported: model bu fiziksel durumda tanımlı değil
4. `unsupported` veya `indeterminate` sonucu bir model lehine/aleyhine kesin kanıt olarak kullanma.
5. Karşılaştırmayı mümkün olduğunca ortak `metric.*` alanları üzerinden sayısal yap. Birimleri koru. Farklı anlamdaki veya farklı birimdeki metrikleri doğrudan eşitleme.
6. `warning`, `assumption`, `uncertainty.*` ve `source.*` satırlarını güvenilirlik değerlendirmesine dahil et.
7. Eksik veriyi uydurma. Eksik olan ama sonucu değiştirebilecek ölçüm, atmosfer, arazi, datum, zaman, kalibrasyon veya provenans bilgisini açıkça listele.
8. Bir Dünya şekli, astronomik açıklama veya fiziksel model hakkında hüküm verirken yalnız paketlerin ayırt edebildiği kapsamda konuş. Tek bir deneyden veya yalnız deney sayısına bakarak kapsam dışı genelleme yapma.
9. Bir model diğerlerinden daha iyi uyuşuyorsa hangi metriklerde ve ne kadar daha iyi uyduğunu sayılarla göster. Sadece "daha iyi" deme.
10. Test kurulumu sorunlu görünüyorsa bunu sonuçtan önce belirt; yanlış koordinat sırası, UTC/ofset karışıklığı, datum farkı, eksik yükseklik, belirsiz atmosfer veya eksik arazi profili gibi sorunları özellikle kontrol et.
11. `GGL-AI-COMPARISON v1` içinde her `EXPERIMENT n` bloğunu bağımsız tut. Deneyler farklı senaryolardaysa önce hangi sonuçların gerçekten karşılaştırılabilir olduğunu belirle.
12. Paket içindeki `AI_TASK` bölümünü ek görev talimatı olarak uygula ancak paket dışında bilgi uydurma.

Yanıt biçimi:

## Kısa sonuç
Deneyin veya deney setinin neyi ayırt edebildiğini 3-6 cümlede özetle.

## Sayısal karşılaştırma
Model/model veya deney/deney sonuçlarını ortak metriklerle karşılaştır. Kritik farkları ve gözlem aralığını yaz.

## Belirsizlik ve sınırlamalar
Belirsizlikleri, uyarıları, varsayımları, provenans sorunlarını ve deneylerin ayırt edemediği noktaları yaz.

## Önerilen sonraki testler
En fazla 5 adet, bilgi kazancı yüksek ve mevcut belirsizliği azaltacak takip testi öner. GGL'de doldurulabilecekse öneriyi `GGL-AI-TEST v1` alanlarına dönüştürmeye hazır ol.

Bir sonuç kesin değilse bunu açıkça "karar verilemiyor" olarak yaz. Kullanıcının tercih ettiği sonuca ulaşmak için belirsizlikleri görmezden gelme.
```

## Tek deney kullanım akışı

1. GGL'de deneyi kurun ve hesapları çalıştırın.
2. Deneyi kaydedin.
3. **Veri Yöneticisi**ni açın.
4. İlgili kayıtta **AI Paketi** düğmesine basın.
5. Önizlemede metni kontrol edin ve **Panoya Kopyala** deyin.
6. Metni yukarıdaki talimatı kullanan AI'ye gönderin.
7. AI yeni bir test önerirse bunu `GGL-AI-TEST v1` biçiminde üretmesini isteyin; yeni test yine GGL'deki **Metinden Hazırla** önizlemesinden geçsin.

## Çoklu deney karşılaştırma akışı

1. Veri Yöneticisi'nde karşılaştırmak istediğiniz 2-12 kaydı seçin.
2. **AI Karşılaştırması** düğmesine basın.
3. Açılan `GGL-AI-COMPARISON v1` önizlemesini kontrol edin.
4. Paketi panoya kopyalayıp AI'ye gönderin.
5. AI'nin doğrudan yalnız aynı anlama ve birime sahip metrikleri kıyasladığını doğrulayın.
6. AI'nin önerdiği ayırt edici takip deneylerini gerekirse `GGL-AI-TEST v1` olarak tekrar GGL'ye aktarın.

Bu döngüde AI hesap motoru değildir. AI test planlar ve sonuçları yorumlar; sayısal hesap ile kullanıcı-onaylı deney durumu GGL'de kalır.

## Paket yapısı

`GGL-AI-ANALYSIS v1` tek deney için şunları taşır:

- deney kimliği, adı, senaryosu ve fiziksel gözlem zamanı,
- senaryonun hedef/rota/gözlem/arazi kapsam bayrakları,
- UTC ofseti,
- gözlemci ve hedef/B koordinatları,
- yükseklikler, mesafe, datum, arazi ve atmosfer ayarları,
- varsa model girdi belirsizlikleri,
- dosya/provenans kaynaklarının özet kimliği ve SHA-256 bilgileri,
- her kayıtlı `ModelPrediction` için model kimliği ve sürümü,
- sonuç durumu,
- bütün kayıtlı metrikler,
- uyarılar,
- hesap özetindeki varsayımlar ve trace kimliği,
- paketin sonunda standart AI analiz görevi.

`GGL-AI-COMPARISON v1` ise 2-12 adet aynı deney gövdesini ayrı `EXPERIMENT n` bloklarında taşır. `same_scenario` yalnız bir tanı alanıdır; `true` olması bütün metriklerin otomatik olarak karşılaştırılabilir olduğu anlamına gelmez.

Hesap izinin bütün formül/adım metinleri paketlere bilinçli olarak eklenmez. Paketler kompakt tutulur; daha ayrıntılı inceleme gerektiğinde GGL HTML raporu veya ilgili **Hesap izi** ekranı kullanılabilir.

## Bilimsel bütünlük

AI paketinin amacı "AI'ye doğru cevabı söyletmek" değil, farklı model ve gözlem sonuçlarını denetlenebilir bir veri sözleşmesi üzerinden yorumlatmaktır. Bu nedenle paket:

- model kimliklerini ve sürümlerini korur,
- uyarıları kaldırmaz,
- belirsizlikleri gizlemez,
- unsupported/indeterminate sonuçları otomatik olarak eler gibi davranmaz,
- kaynak değişiklik/provenans bilgisini mümkün olduğunda taşır,
- model sonucu ile gözlemi aynı kategoriye koymaz,
- çoklu pakette deney sınırlarını korur.

## Sonraki sürüm

Aşama 8.5'te aktif deneyi kaydetmeden AI paketine dönüştürme ve AI'nin önerdiği takip testini daha kısa bir geri-besleme akışıyla `Metinden Hazırla` ekranına taşıma hedeflenir.
