# Arayüz Tasarımı

## Ana çalışma alanı

Uygulama tek deney girdisini seçili modellerde yan yana karşılaştırır.

Ana bölümler:

- Sol senaryo ve model paneli
- Etkileşimli deney girdileri
- Gerçek gözlem veya referans görseli
- Model kartları
- Sonuç karşılaştırma tablosu
- Hesaplama kapsamı ve uyarılar

## Etkileşimli ilk ekran

Kullanıcı şu değerleri doğrudan değiştirebilir:

- Gözlemci yüksekliği
- Hedef yüksekliği
- Yüzey mesafesi
- Gözlenen görünürlük
- Gözlem belirsizliği
- Standart kırılma açık veya kapalı
- Kırılma katsayısı

Her değişiklik seçili modelleri yeniden çalıştırır.

## Model kartı

Her kart aynı sırada şunları gösterir:

- Beklenen görünürlük
- Gizlenen kısım
- Ufuk mesafesi
- Hedef tepe görüş açısı
- Gözlemle karşılaştırma durumu
- Model varsayımı veya uyarısı

## Durumların sunumu

- Uyumlu
- Uyumsuz
- Belirsiz
- Desteklenmiyor

Bu durumlar modelin genel güvenilirlik puanı değildir. Yalnızca aktif deneydeki tahmin ile girilen gözlem arasındaki ilişkiyi açıklar.

## Sayısal ve görsel ayrımı

Dünya, düzlem ve harita şekilleri açıklayıcı canlandırmadır. Sayısal değerler model motorundan gelir. Görsel motor hesaplama kaynağı olarak kullanılmaz.

## Yerel görsel doğrulama hedefleri

İlk masaüstü çalıştırmada kontrol edilecekler:

- 1180 piksel ve üzerindeki pencere düzeni
- Form alanlarının taşmaması
- Model kartlarının eşit yüksekliği
- Türkçe sayı biçimlendirmesi
- Değer değişimlerinde anlık güncelleme
- Standart kırılma seçeneğinin sonuçlara etkisi
- Desteklenmeyen projeksiyon kartının açık görünmesi
