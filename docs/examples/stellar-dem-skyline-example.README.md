# Sentetik DEM skyline entegrasyon örneği

`stellar-dem-skyline-example.asc` yalnız **uygulama entegrasyon testi** için üretilmiş sentetik bir ESRI ASCII Grid dosyasıdır. Gerçek İstanbul topoğrafyasını temsil etmez ve bilimsel veri kaynağı olarak kullanılmamalıdır.

## Uyumlu varsayılan gözlemci

- enlem: `41.0082°`
- boylam: `28.9784°`
- grid: `41 × 41`
- hücre adımı: `0.02°`
- gözlemci grid merkezindedir
- NODATA hücresi yoktur

Varsayılan 6.25 DEM skyline ayarlarıyla:

- azimut adımı: `2°` → `180` yön,
- mesafe adımı: `250 m`,
- maksimum mesafe: `20 km`,
- örnekleme: `bilinear`,
- DEM → WGS84 elipsoid sabit ofseti: `0 m`

istenen 20 km tarama alanı grid içinde kalacak şekilde hazırlanmıştır. Doğu ve güneydoğu yönlerinde yapay yükseltiler bulunur; amaç skyline grafiğinde düz olmayan bir profil üretmektir.

## Manuel test akışı

1. Yıldız Gözlemleri → Yerel ufuk bölümünde `ESRI ASCII DEM seç` ile bu dosyayı seç.
2. Dosya seçimi yalnız DEM taslağını hazırlamalı; 360° tarama ve yıldız hesabı başlamamalıdır.
3. Varsayılan ayarlarla `DEM skyline üret` düğmesine bas.
4. Tanı `180/180` tam azimut göstermeli ve DEM profili yerel-ufuk taslağına aktarılmalıdır.
5. Yıldız grafiği bu noktada henüz değişmemelidir.
6. Mevcut `Uygula ve hesapla` düğmesiyle profili yıldız hesabına bağla.
7. Kaydet/aç ve mümkünse HTML raporda DEM türetim provenansını kontrol et.

Fail-closed davranışı denemek için aynı grid ile maksimum mesafeyi örneğin `100000 m` yap. Grid bu menzili 360° kapsamadığı için tam skyline kaynağı üretilmemelidir.
