# Model Sözleşmesi

Her fiziksel model `SimulationModel` sözleşmesini uygular.

## Zorunlu alanlar

- Kimlik, ad ve sürüm
- Açıklama
- Desteklenen yetenekler
- Açık varsayımlar
- Deney doğrulaması
- Tahmin üretimi

## İlk yetenekler

- `surface-distance`
- `line-of-sight`
- `horizon`
- `atmospheric-refraction`

Astronomi yetenekleri daha sonraki aşamalarda eklenecektir.

## Tahmin sonucu

Her sonuç şunları içerir:

- Model kimliği
- Deney kimliği
- Durum
- Sayısal metrikler
- Uyarılar
- İz kimliği

Durum değerleri:

- `compatible`
- `incompatible`
- `indeterminate`
- `unsupported`

## Güvenli başarısızlık

Bir model deney için gerekli kuralları tanımlamıyorsa tahmin uydurmaz. `unsupported` sonucu ve eksik kuralı açıklayan uyarı döndürür.

Azimutal eş uzaklıklı gösterim bunun ilk örneğidir. Harita projeksiyonu fiziksel yüzey, dikey yön veya ışık yolu tanımlamadığı için hedef görünürlüğü tahmini üretemez.

## Çalıştırıcı

`runSimulationModels` bütün seçili modelleri aynı deney ve bağlamla çalıştırır. Tek bir model hata verirse diğer modellerin sonuçları kaybolmaz; hata veren model güvenli biçimde `unsupported` sonucuna dönüştürülür.

## Atmosfer bağlamı

Desteklenen ilk modlar:

- `off`: saf geometrik hesap
- `standard`: kırılma katsayısıyla etkin yarıçap
- `profile`: sözleşmede ayrılmıştır, ışın izleme henüz uygulanmamıştır

Bir model atmosfer kuralı tanımlamıyorsa bunu uyarı olarak belirtir ve geometrik sonucunu üretir.

## Genişletme ilkesi

Yeni bir model eklenirken:

1. Fiziksel kurallar açıkça yazılmalı.
2. Desteklenen deneyler belirtilmeli.
3. Her sayısal davranış için test eklenmeli.
4. Eksik davranışlarda `unsupported` kullanılmalı.
5. Harita gösterimi ile fiziksel model ayrı tutulmalı.
