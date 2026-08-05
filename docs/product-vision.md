# Ürün Vizyonu

## Tanım

Geometrik Gözlem Laboratuvarı, farklı geometrik ve fiziksel modellerin aynı ölçülebilir gözlem karşısında ürettiği tahminleri karşılaştıran, deney odaklı bir masaüstü uygulamasıdır.

## Kullanıcı problemi

Dünya'nın şekli ve gözlemsel sonuçlar hakkındaki tartışmalarda çoğu karşılaştırma:

- aynı girdileri kullanmaz,
- atmosferi geometriyle karıştırır,
- ölçüm belirsizliğini yok sayar,
- harita projeksiyonunu fiziksel model gibi ele alır,
- görsel canlandırmayı sayısal kanıt yerine koyar,
- sonuç üretmek için açıklanmayan varsayımlar kullanır.

Uygulama bu sorunları açık deney tanımı, model sözleşmesi ve izlenebilir hesaplama ile azaltmayı hedefler.

## Ürün ilkeleri

1. **Deney önce gelir.** Kullanıcı önce gözlemi ve ölçümü tanımlar.
2. **Aynı girdi, ayrı tahmin.** Seçili modeller aynı deney paketini alır.
3. **Varsayımlar görünürdür.** Modelin yüzey, ışık, atmosfer ve zaman kuralları saklanmaz.
4. **Belirsizlik sonuçtur.** Tek sayı yerine gerektiğinde aralık ve dağılım gösterilir.
5. **Desteklenmeyen deney uydurulmaz.** Eksik model kuralları açıkça raporlanır.
6. **Görselleştirme açıklayıcıdır.** Sayısal çözüm motorundan ayrı tutulur.
7. **Tarafsızlık eşdeğerlik değildir.** Modeller önceden etiketlenmez; gözlem farkı ve veri desteği saklanmaz.

## İlk hedef kullanıcılar

- kendi gözlemlerini sayısal olarak incelemek isteyen meraklılar,
- fotoğraf veya video üzerinden görüş hattı analizi yapan kullanıcılar,
- eğitim amacıyla geometri, atmosfer ve astronomi ilişkisini göstermek isteyenler,
- farklı model iddialarını yeniden üretilebilir deneylerle karşılaştırmak isteyen araştırmacılar.

## Başarı ölçütleri

- Kaydedilen bir deney başka bir bilgisayarda aynı sonuçları üretebilmeli.
- Her sonuç kullanılan model sürümü ve parametrelerle ilişkilendirilmeli.
- Belirsizlik veya eksik veri sonucu otomatik olarak görünür olmalı.
- Kullanıcı, bir sonucun hangi formül ve ara değerlerden geldiğini inceleyebilmeli.
