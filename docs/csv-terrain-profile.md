# CSV Arazi Profili İçe Aktarma

## Amaç

CSV arazi profili içe aktarma, harita veya ölçüm araçlarından üretilen rota boyunca mesafe-kot örneklerini çok noktalı manuel arazi düzenleyicisine taşır.

İçe aktarılan ara noktalar mevcut küre ve düzlem modellerine aynı deney girdisi olarak uygulanır. Gözlemci ve hedef uç kotları arayüzdeki zemin kotu alanlarından gelmeye devam eder.

## Desteklenen dosyalar

Dosya seçicisinde şu uzantılar gösterilir:

```text
.csv
.tsv
.txt
```

Dosya UTF-8 metin olmalıdır. En fazla 5 MB ve en fazla 2.002 veri satırı kabul edilir. Bu sayı gözlemci ve hedef uçları dahil, en fazla 2.000 ara nokta anlamına gelir.

Boş satırlar ve `#` karakteriyle başlayan açıklama satırları yok sayılır.

## Ayırıcılar

Ayırıcı başlık satırından otomatik algılanır:

- virgül: `,`
- noktalı virgül: `;`
- sekme: `TAB`

Noktalı virgül veya sekme kullanılan dosyalarda Türkçe ondalık virgül desteklenir:

```csv
mesafe_km;kot_m
0;0
2,5;8,25
10;0
```

Virgül ayırıcılı CSV dosyasında ondalık ayırıcı olarak nokta kullanılmalıdır.

## Zorunlu sütunlar

Dosyada bir mesafe sütunu ve bir kot sütunu bulunmalıdır.

### Mesafe sütunları

Metre:

```text
distance_m
mesafe_m
```

Kilometre:

```text
distance_km
mesafe_km
```

Rota yüzdesi:

```text
distance_percent
route_percent
rota_yuzdesi
yuzde
```

Yalnız `distance` veya `mesafe` başlığı kullanılırsa değer metre kabul edilir ve kullanıcıya uyarı gösterilir.

### Kot sütunları

```text
elevation_m
terrain_elevation_m
ground_elevation_m
kot_m
kot
yukseklik_m
rakim_m
```

Kotlar deneyde seçilen ortak düşey datumda metre cinsinden yorumlanır.

## Uç satırları

İlk veri satırı gözlemci ucudur ve mesafe değeri `0` olmalıdır.

Son veri satırı hedef ucudur:

- yüzde tabanlı profilde `100`,
- metre veya kilometre tabanlı profilde pozitif toplam rota mesafesi

olmalıdır.

Örnek:

```csv
distance_percent,elevation_m
0,0
25,12
50,30
75,5
100,0
```

Uç satırlarının kotları dosya inceleme kartında gösterilir. İlk sürümde CSV uç kotları mevcut deneydeki gözlemci zemin kotu ve hedef taban kotunu otomatik değiştirmez. Farklılık varsa açık uyarı gösterilir; mevcut deney değerleri korunur.

## Mesafe dönüşümü

Yüzde tabanlı dosyalardaki ara konumlar doğrudan kullanılır.

Metre ve kilometre tabanlı dosyalarda son satır kaynak toplam rota mesafesidir. Her ara nokta şu şekilde yüzdeye dönüştürülür:

```text
rota yüzdesi = ara mesafe / CSV toplam mesafesi × 100
```

CSV toplam mesafesi ile aktif deney mesafesi arasında yüzde 1'den fazla fark varsa inceleme kartında uyarı gösterilir. Noktalar yine CSV'nin kendi toplam mesafesine göre normalize edilir; aktif deney mesafesi otomatik değiştirilmez.

## Doğrulama kuralları

- Mesafeler sonlu sayı olmalıdır.
- Kotlar sonlu sayı olmalıdır.
- Kotlar `-12.000…100.000 m` aralığında olmalıdır.
- Mesafeler negatif olamaz.
- Satır mesafeleri kesin artan ve tekrarsız olmalıdır.
- İlk mesafe `0` olmalıdır.
- Yüzde profilinin son değeri `100` olmalıdır.
- Mutlak profilin toplam mesafesi `0…20.000 km` aralığında olmalıdır.
- En fazla 2.000 ara nokta kabul edilir.
- Eksik sütun, bozuk sayı, kapatılmamış tırnak veya geçersiz sıra dosyanın tamamını reddeder.

Hatalı dosya mevcut profil noktalarını değiştirmez.

## Uygulama akışı

1. Manuel profil açılır.
2. `CSV içe aktar` düğmesine basılır.
3. Dosya ana Electron sürecinde okunur ve doğrulanır.
4. Arayüzde inceleme kartı gösterilir.
5. Kartta dosya adı, satır sayısı, ara nokta sayısı, mesafe birimi, kaynak rota, uç kotları ve uyarılar görünür.
6. `Vazgeç` mevcut profili korur.
7. `Profili uygula` mevcut ara noktaları içe aktarılan noktalarla değiştirir.
8. Küre ve düzlem sonuçları canlı olarak yeniden hesaplanır.

İçe aktarılan noktalar uygulandıktan sonra normal manuel noktalar gibi düzenlenebilir ve silinebilir. Deney kaydedildiğinde yüzde konumları ve kotları mevcut şema v4 kayıtlarında korunur.

## Örnek dosyalar

- [`examples/terrain-profile-percent.csv`](../examples/terrain-profile-percent.csv)
- [`examples/terrain-profile-meters-tr.csv`](../examples/terrain-profile-meters-tr.csv)

## Mevcut sınırlar

Bu ilk sürüm şunları içermez:

- CSV sütun eşleme sihirbazı,
- gözlemci ve hedef uç kotlarını otomatik uygulama seçeneği,
- CSV toplam mesafesini aktif manuel deney mesafesine otomatik aktarma seçeneği,
- CSV kaynak dosyası ve içe aktarma zamanını deney kaydında ayrı provenans alanı olarak saklama,
- koordinat sütunlarından rota üretme,
- GeoJSON içe aktarma,
- DEM dosyası veya çevrimiçi yükseklik servisi.
