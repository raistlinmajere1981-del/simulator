# GeoJSON arazi profili

Uygulama, WGS84 koordinatları ve yükseklik taşıyan tek bir 3B `LineString`
geometrisini arazi profiline dönüştürür.

## Desteklenen kök yapılar

- Doğrudan `LineString`
- Geometrisi `LineString` olan `Feature`
- Tam olarak bir `LineString` içeren `FeatureCollection`

Her koordinat şu sırada olmalıdır:

```json
[boylam, enlem, yükseklik_m]
```

Örnek:

```json
{
  "type": "LineString",
  "coordinates": [
    [28.9784, 41.0082, 4],
    [29.0020, 41.0200, 22],
    [29.0600, 41.0580, 5]
  ]
}
```

## Hesaplama

Ardışık koordinatlar arasındaki mesafe WGS84 elipsoidi üzerinde ters jeodezik
problem çözülerek hesaplanır. Parça mesafeleri toplanır ve iç noktalar toplam
rota üzerindeki yüzde konumlarına dönüştürülür.

Koordinatların üçüncü bileşeni zemin yüksekliği olarak kullanılır. Yüksekliğin
ortometrik mi elipsoidal mı olduğu dosyadan otomatik anlaşılamaz; kullanıcı
deneyde uygun düşey referansı seçmelidir.

## Sınırlar

- En az 2, en fazla 2.002 koordinat
- En fazla 5 MB dosya
- En fazla 20.000 km toplam rota
- Boylam `-180…180°`, enlem `-90…90°`
- Yükseklik `-12.000…100.000 m`
- Ardışık koordinatlar aynı konumda olamaz
- Birden fazla `LineString` aynı içe aktarmada desteklenmez

GeoJSON RFC 7946 uyarınca koordinatlar WGS84 boylam/enlem olarak yorumlanır.
Eski `crs` alanı bulunursa dikkate alınmadığı açık bir uyarıyla bildirilir.
