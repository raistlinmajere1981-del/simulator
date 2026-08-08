# Aşama 6.3 — Gölge deneyi ve gnomon gözlemi

Durum: tamamlandı · `1.10.0`

## Amaç

Aynı UTC gözlem zamanı ve WGS84 konumundan hesaplanan geometrik Güneş referansını, sahada doğrudan ölçülebilen dikey gnomon gölgesiyle izlenebilir biçimde ilişkilendirmek.

## Kapsam

- dikey gnomon yüksekliği
- yerel yatay ölçüm yüzeyi varsayımı
- `L = h / tan(α)` ile beklenen gölge uzunluğu
- Güneş azimutunun 180° tersi olarak gölge yönü
- isteğe bağlı gözlenen gölge uzunluğu ve azimutu
- her gözlem kanalı için açık `±` belirsizlik
- gölge uzunluğundan bağımsız gözlenen Güneş yüksekliği türetimi
- uzunluk/yön farklarının yalnız tanımlı belirsizliklerle değerlendirilmesi
- Güneş geometrik ufkun altındaysa sahte doğrudan gölge üretmeme
- ayrı `ModelPrediction`, model sürümü ve hesap izi
- prediction snapshot üzerinden kayıt/reopen, `.ggl.json` ve HTML rapor korunumu
- bağlamsal yardım paneli

## Bilimsel sınır

Bu aşama mevcut WGS84/astronomik Güneş referansından ölçülebilir gölge geometrisi üretir. Bu sonuç İdeal Küre, Tanımlı Düzlem veya başka bir Dünya modelinin Güneş davranışı olarak kullanılmaz. Bir fiziksel Dünya modeli gölge deneyine katılacaksa, kendi Güneş/ışık geometrisi açıkça tanımlanmalıdır.

Atmosferik kırılma, yerel topoğrafik ufuk, eğimli ölçüm yüzeyi, gnomon düşeylik hatası ve geniş Güneş diski bu ilk dilimde fiziksel düzeltme olarak uygulanmaz.

## Sonraki adım

- iki konumlu eşzamanlı gölge karşılaştırması ve/veya gün doğumu-gün batımı olay geometrisi
