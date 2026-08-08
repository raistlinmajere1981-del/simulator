# Aşama 6.4 — İki konumlu eşzamanlı gölge karşılaştırması

Durum: tamamlandı · `1.11.0`

## Amaç

İki ayrı WGS84 gözlem noktasındaki dikey gnomon gölgelerini aynı UTC fiziksel anında izlenebilir biçimde karşılaştırmak; farklı gnomon yüksekliklerini ortak açısal gözlem kanalına dönüştürmek.

## Kapsam

- Gölge Deneyi içinde opsiyonel B gözlem noktası
- A ve B için aynı UTC gözlem anı
- B enlem/boylam ve gnomon yüksekliği
- B için isteğe bağlı gölge uzunluğu/azimutu ve açık ± belirsizlikler
- A ve B Güneş/gölge çözümlerinin bağımsız hesaplanması
- WGS84 jeodezik baz çizgisi ve A→B başlangıç azimutu
- gnomon yüksekliğinden bağımsız `L/h = cot(α)` gölge oranı
- iki saha gölgesinden türetilen Güneş yükseklik farkı
- iki uzunluk belirsizliğinin koruyucu açı farkı zarfına yayılması
- gölge yönü farkı ve varsa açık azimut belirsizlikleriyle karşılaştırma
- ayrı prediction snapshot, hesap izi, reopen, `.ggl.json` ve HTML rapor korunumu

## Bilimsel sınır

Bu aşama WGS84 baz çizgisi ve mevcut geometrik Güneş referansını ölçüm bağlamı olarak kullanır. Bunlar İdeal Küre, Tanımlı Düzlem veya başka bir Dünya modelinin Güneş davranışı değildir. Bir Dünya şekli modeli eşzamanlı gölge deneyine fiziksel tahmin üretmek için kendi Güneş/ışık geometrisini açıkça tanımlamalıdır.

Atmosferik kırılma, yerel topoğrafik ufuk, gnomon düşeylik hatası, eğimli ölçüm yüzeyi ve iki istasyondaki zaman senkronizasyon hatası bu aşamada otomatik düzeltme olarak uygulanmaz.

## Sonraki adım

- gün doğumu/gün batımı olay geometrisi
- yıldız görünürlüğü ve yıldız izleri
