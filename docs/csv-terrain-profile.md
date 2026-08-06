# CSV Arazi Profili İçe Aktarma

## Amaç

CSV arazi profili içe aktarma, harita veya ölçüm araçlarından üretilen rota boyunca mesafe-kot örneklerini çok noktalı arazi düzenleyicisine taşır.

İçe aktarılan profil küre ve düzlem modellerine aynı deney girdisi olarak uygulanır. Dosya kaynağı ve sütun eşlemesi deney kaydında izlenebilir biçimde korunur.

## Desteklenen dosyalar

```text
.csv
.tsv
.txt
```

Dosya UTF-8 metin olmalıdır. En fazla 5 MB ve en fazla 2.002 veri satırı kabul edilir. Boş satırlar ve `#` ile başlayan açıklama satırları yok sayılır.

## Ayırıcılar ve sayılar

Ayırıcı başlık satırından otomatik algılanır:

- virgül,
- noktalı virgül,
- sekme.

Noktalı virgül veya sekme dosyalarında Türkçe ondalık virgül desteklenir:

```csv
mesafe_km;kot_m
0;0
2,5;8,25
10;0
```

Virgül ayırıcılı dosyada ondalık ayırıcı olarak nokta kullanılmalıdır.

## Otomatik tanınan sütunlar

### Mesafe

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

Yalnız `distance` veya `mesafe` başlığı kullanılırsa değer metre kabul edilir ve uyarı gösterilir.

### Kot

```text
elevation_m
terrain_elevation_m
ground_elevation_m
kot_m
kot
yukseklik_m
rakim_m
```

Kotlar seçilen ortak düşey datumda metre cinsinden yorumlanır.

## Sütun eşleme

Başlıklar tanınmıyorsa veya birden fazla olası sütun varsa dosya reddedilmek yerine eşleme ekranı açılır. Ekran:

- dosya adını,
- algılanan ayırıcıyı,
- bütün başlıkları,
- ilk beş veri satırını

gösterir.

Kullanıcı:

1. mesafe sütununu,
2. mesafe birimini (`metre`, `kilometre`, `rota yüzdesi`),
3. kot sütununu

seçer. Mesafe ve kot aynı sütun olamaz. Seçimden sonra dosyanın tamamı yeniden doğrulanır.

Örnek eşleme dosyası:

- [`examples/terrain-profile-custom-columns.csv`](../examples/terrain-profile-custom-columns.csv)

Bu dosyada `chainage` metre mesafesine, `terrain_height` kot sütununa eşlenir.

Ham dosya içeriği renderer sürecine verilmez. Ana süreç içerik için rastgele bir istek kimliği oluşturur ve veriyi en fazla on dakika bellekte tutar. Süre dolarsa dosya yeniden seçilmelidir.

## Uç satırları

İlk veri satırı gözlemci ucudur ve mesafesi `0` olmalıdır.

Son veri satırı hedef ucudur:

- yüzde tabanlı profilde `100`,
- metre veya kilometre tabanlı profilde pozitif toplam rota mesafesi.

İnceleme kartında iki bağımsız seçenek bulunur:

- gözlemci zemin kotunu CSV ilk satırından uygula,
- hedef taban kotunu CSV son satırından uygula.

Seçenekler varsayılan olarak kapalıdır. Seçilen uç kotları, ara noktalarla aynı `Profili uygula` işleminde güncellenir. Seçilmeyen uçlarda mevcut deney değerleri korunur.

## Mesafe dönüşümü

Yüzde tabanlı dosyalardaki ara konumlar doğrudan kullanılır.

Metre ve kilometre tabanlı dosyalarda:

```text
rota yüzdesi = ara mesafe / CSV toplam mesafesi × 100
```

CSV toplam mesafesi ile aktif deney mesafesi arasında yüzde 1'den fazla fark varsa uyarı gösterilir. Noktalar CSV'nin kendi toplamına göre normalize edilir; aktif deney mesafesi otomatik değiştirilmez.

## Doğrulama kuralları

- Mesafe ve kot değerleri sonlu sayı olmalıdır.
- Kotlar `-12.000…100.000 m` aralığındadır.
- Mesafeler negatif olamaz.
- Satır mesafeleri kesin artan ve tekrarsızdır.
- İlk mesafe `0` olmalıdır.
- Yüzde profilinin son değeri `100` olmalıdır.
- Mutlak profilin toplam mesafesi `0…20.000 km` aralığındadır.
- En fazla 2.000 ara nokta kabul edilir.
- Eksik seçili sütun, bozuk sayı, tırnak hatası veya geçersiz sıra dosyanın tamamını reddeder.

Hatalı, iptal edilmiş veya süresi dolmuş işlem mevcut profili değiştirmez.

## Uygulama akışı

1. Manuel profil açılır.
2. `CSV içe aktar` seçilir.
3. Dosya ana Electron sürecinde okunur.
4. Gerekirse sütun eşleme yapılır.
5. İnceleme kartında dosya, satır, birim, kaynak rota, sütunlar, uç kotları ve uyarılar gösterilir.
6. İsteğe bağlı uç kotları seçilir.
7. `Vazgeç` mevcut profili korur.
8. `Profili uygula` noktaları ve seçilen uçları birlikte uygular.
9. Küre ve düzlem sonuçları canlı yeniden hesaplanır.

## Kaynak provenansı

Uygulama şu alanları deney kaydında saklar:

- dosya adı,
- içe aktarma zamanı,
- ayırıcı,
- mesafe birimi,
- kaynak rota,
- satır sayısı,
- CSV uç kotları,
- uçların uygulanma seçimleri,
- mesafe ve kot sütunu başlıkları,
- içe aktarmadan sonra değişiklik durumu.

Dosya yolu ve ham CSV metni kaydedilmez.

Profil noktaları veya uç kotları daha sonra elle değiştirilirse kaynak bilgisi silinmez; arayüz ve rapor kaydı `İçe aktarımdan sonra düzenlendi` olarak işaretler.

## Kayıt ve rapor

Deney şeması v5:

- profil noktalarını,
- kaynak provenansını,
- uç uygulama seçimlerini,
- manuel değişiklik işaretini

yerel kayıt ve `.ggl.json` dosyasında korur.

HTML raporu aynı alanları `Profil kaynağı ve provenans` bölümünde gösterir.

## Örnek dosyalar

- [`examples/terrain-profile-percent.csv`](../examples/terrain-profile-percent.csv)
- [`examples/terrain-profile-meters-tr.csv`](../examples/terrain-profile-meters-tr.csv)
- [`examples/terrain-profile-custom-columns.csv`](../examples/terrain-profile-custom-columns.csv)

## Mevcut sınırlar

- CSV toplam mesafesini aktif manuel deney mesafesine uygulama seçeneği yoktur.
- Koordinat sütunlarından rota üretimi yoktur.
- GeoJSON ve DEM içe aktarma yoktur.
- Jeoit/datum dönüşümü otomatik değildir.
