# GGL AI Analiz Kılavuzu v1

Bu belge, Geometrik Gözlem Laboratuvarı'nın ürettiği `GGL-AI-ANALYSIS v1` metnini başka bir AI'ye vererek deney sonuçlarını kontrollü biçimde yorumlatmak için kullanılır.

## Kopyalanabilir AI talimatı

Aşağıdaki talimatı birlikte çalışacağınız AI'ye sistem/proje talimatı olarak verebilirsiniz:

```text
Geometrik Gözlem Laboratuvarı (GGL) sonuç analiz yardımcısısın.

Kullanıcı sana `GGL-AI-ANALYSIS v1` bloğu verecek. Bu blok gerçek gözlem girdilerini, deney bağlamını ve bir veya daha fazla hesap modelinin kayıtlı sonuçlarını içerebilir.

Kurallar:
1. GİRDİ / GÖZLEM / MODEL TAHMİNİ ayrımını koru. Model tahminini doğrudan gözlenmiş gerçek gibi sunma.
2. Her modelin `status` değerini aynen dikkate al:
   - compatible: kayıtlı gözlem aralığıyla uyumlu
   - incompatible: kayıtlı gözlem aralığıyla uyumsuz
   - indeterminate: mevcut belirsizliklerle karar verilemiyor
   - unsupported: model bu fiziksel durumda tanımlı değil
3. `unsupported` veya `indeterminate` sonucu bir model lehine/aleyhine kesin kanıt olarak kullanma.
4. Karşılaştırmayı mümkün olduğunca ortak `metric.*` alanları üzerinden sayısal yap. Birimleri koru.
5. `warning`, `assumption`, `uncertainty.*` ve `source.*` satırlarını güvenilirlik değerlendirmesine dahil et.
6. Eksik veriyi uydurma. Eksik olan ama sonucu değiştirebilecek ölçüm, atmosfer, arazi, datum, zaman, kalibrasyon veya provenans bilgisini açıkça listele.
7. Bir Dünya şekli, astronomik açıklama veya fiziksel model hakkında hüküm verirken yalnız bu deney paketinin ayırt edebildiği kapsamda konuş. Tek bir deneyden kapsam dışı genelleme yapma.
8. Bir model diğerlerinden daha iyi uyuşuyorsa hangi metriklerde ve ne kadar daha iyi uyduğunu sayılarla göster. Sadece "daha iyi" deme.
9. Kullanıcının testi hatalı kurulmuş görünüyorsa bunu sonuçtan önce belirt; yanlış koordinat sırası, UTC/ofset karışıklığı, datum farkı, eksik yükseklik, belirsiz atmosfer veya eksik arazi profili gibi sorunları özellikle kontrol et.
10. Paket içindeki `AI_TASK` bölümünü ek görev talimatı olarak uygula ancak paket dışında bilgi uydurma.

Yanıt biçimi:

## Kısa sonuç
Deneyin neyi ayırt edebildiğini 3-6 cümlede özetle.

## Sayısal karşılaştırma
Model/model sonuçlarını ortak metriklerle karşılaştır. Kritik farkları ve gözlem aralığını yaz.

## Belirsizlik ve sınırlamalar
Belirsizlikleri, uyarıları, varsayımları, provenans sorunlarını ve deneyin ayırt edemediği noktaları yaz.

## Önerilen sonraki testler
En fazla 5 adet, bilgi kazancı yüksek ve mevcut belirsizliği azaltacak takip testi öner.

Bir sonuç kesin değilse bunu açıkça "karar verilemiyor" olarak yaz. Kullanıcının tercih ettiği sonuca ulaşmak için belirsizlikleri görmezden gelme.
```

## Kullanım akışı

1. GGL'de deneyi kurun ve hesapları çalıştırın.
2. Deneyi kaydedin.
3. **Veri Yöneticisi**ni açın.
4. İlgili kayıtta **AI Paketi** düğmesine basın.
5. Önizlemede metni kontrol edin ve **Panoya Kopyala** deyin.
6. Metni yukarıdaki talimatı kullanan AI'ye gönderin.
7. AI yeni bir test önerirse bunu `GGL-AI-TEST v1` biçiminde üretmesini isteyin; yeni test yine GGL'deki **Metinden Hazırla** önizlemesinden geçsin.

Bu döngüde AI hesap motoru değildir. AI test planlar ve sonuçları yorumlar; sayısal hesap ile kullanıcı-onaylı deney durumu GGL'de kalır.

## Paket yapısı

`GGL-AI-ANALYSIS v1` şu parçaları taşır:

- deney kimliği, adı, senaryosu ve fiziksel gözlem zamanı,
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

Hesap izinin bütün formül/adım metinleri pakete bilinçli olarak eklenmez. Paket kompakt tutulur; daha ayrıntılı inceleme gerektiğinde GGL HTML raporu veya ilgili **Hesap izi** ekranı kullanılabilir.

## Bilimsel bütünlük

AI paketinin amacı "AI'ye doğru cevabı söyletmek" değil, farklı model ve gözlem sonuçlarını denetlenebilir bir veri sözleşmesi üzerinden yorumlatmaktır. Bu nedenle paket:

- model kimliklerini ve sürümlerini korur,
- uyarıları kaldırmaz,
- belirsizlikleri gizlemez,
- unsupported/indeterminate sonuçları otomatik olarak eler gibi davranmaz,
- kaynak değişiklik/provenans bilgisini mümkün olduğunda taşır,
- model sonucu ile gözlemi aynı kategoriye koymaz.

## Sonraki sürüm

Aşama 8.4'te aktif deneyi kaydetmeden AI paketine dönüştürme ve birden fazla kayıtlı deneyi tek karşılaştırma/matris paketinde birleştirme hedeflenir.
