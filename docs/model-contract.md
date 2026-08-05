# Model Sözleşmesi

Bir model yalnızca bir çizim veya harita değildir. Deney üretebilmesi için gerekli fiziksel ve geometrik kuralları açıkça tanımlamalıdır.

## Zorunlu metadata

- Model kimliği ve sürümü
- Açıklama ve kaynak notları
- Desteklenen yetenekler
- Kullanılan sabitler
- Varsayımlar
- Geçerlilik sınırları

## Tanımlanması gereken kurallar

1. **Yüzey geometrisi:** küre, elipsoid, düzlem, disk veya başka bir yüzey.
2. **Mesafe metriği:** iki nokta arasındaki fiziksel mesafe nasıl ölçülür?
3. **Yerel dikey:** her konumda yukarı ve aşağı yönü nedir?
4. **Işık yolu:** ışık doğrusal mı, kırılmalı mı veya başka bir kurala mı bağlıdır?
5. **Atmosfer:** yoğunluk ve kırılma modeli nasıl tanımlanır?
6. **Gök cisimleri:** destekleniyorsa konum ve hareket kuralları nelerdir?
7. **Zaman sistemi:** tarih ve saat hangi referansla hesaplanır?

## Harita projeksiyonları

Azimutal eş uzaklıklı, Mercator veya başka projeksiyonlar fiziksel model olarak kaydedilmez. Bir fiziksel modelin görüntüleme seçeneği olabilirler. Fiziksel sonuç üreteceklerse ayrıca yüzey ve ışık kuralları tanımlanmalıdır.

## Yetenek tabanlı çalışma

Örnek yetenekler:

```text
surface-distance
line-of-sight
horizon
atmospheric-refraction
solar-position
lunar-position
stellar-position
```

Deney motoru gerekli yetenekleri kontrol eder. Eksik yetenek durumunda varsayılan değer üretmek yerine modelin deneyi desteklemediği bildirilir.

## Hesap izi

Her tahmin ileride aşağıdaki bilgileri taşımalıdır:

- giriş verisinin özeti,
- kullanılan model ve sürüm,
- kullanılan sabitler,
- ara hesaplar,
- uyarılar,
- sonuç metrikleri,
- deterministik tekrar için seed,
- benzersiz iz kimliği.
