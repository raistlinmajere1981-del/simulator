# Aşama 4.1 — Katmanlı meteorolojik atmosfer profili çekirdeği

Durum: tamamlandı · `1.2.1`

## Amaç

Gelişmiş atmosfer hesabına geçmeden önce sıcaklık, basınç ve bağıl nem ölçümlerini açık, doğrulanabilir ve katmanlı bir veri sözleşmesine dönüştürmek.

Bu aşama **ışın izleme yapmaz** ve mevcut standart `k` etkin-yarıçap yaklaşımının yerine geçmez. Amaç, daha sonraki kırılma hesabının kullanacağı ölçüm profilini güvenli biçimde hazırlamaktır.

## Profil sözleşmesi

Her atmosfer örneği şunları taşır:

- benzersiz örnek kimliği,
- ortak düşey referansa göre yükseklik (m),
- sıcaklık (°C),
- toplam hava basıncı (hPa),
- bağıl nem (%).

Profil ayrıca kaynak etiketi ve isteğe bağlı, açık saat dilimli gözlem zamanı tutar.

## Doğrulama

- en az iki, en fazla 1000 örnek,
- kesin artan örnek yükseklikleri,
- yükseklik: `-500 … 20.000 m`,
- sıcaklık: `-100 … 60 °C`,
- basınç: `1 … 1100 hPa`,
- bağıl nem: `%0 … %100`,
- gözlem zamanı verilirse açık `Z` veya `±HH:MM` saat dilimi,
- su buharı kısmi basıncının toplam basınçtan küçük olması.

Sınırlar veri giriş hatalarını yakalamaya yöneliktir; atmosferin bu aralıkların tamamında standart davranacağı anlamına gelmez.

## Katman işlemleri

- ölçülen örnekler değiştirilmeden komşu örneklerden katman özetleri üretilir,
- sıcaklık, basınç ve nem düşey gradyanları hesaplanır,
- profil kapsamı içindeki bir yükseklikte doğrusal enterpolasyon yapılabilir,
- profil dışına otomatik ekstrapolasyon yapılmaz.

Ekstrapolasyonun reddedilmesi bilinçlidir: ölçülmeyen atmosfer koşulları kullanıcıya ait veriymiş gibi üretilmez.

## Meteorolojik türevler

- Buck tipi doygun su buharı basıncı yaklaşımı,
- bağıl nemden su buharı kısmi basıncı,
- kuru hava + su buharı ideal gaz bileşimiyle nemli hava yoğunluğu.

Bu büyüklükler meteorolojik yardımcı değerlerdir. Henüz doğrudan optik kırılma açısı veya etkin Dünya yarıçapına çevrilmezler.

## Bilimsel sınır

Görünür ışığın kırılma indisi dalga boyuna ve atmosfer bileşimine bağlıdır. Sıcaklık/basınç/nem profilini doğrudan radyo-refraktivite formüllerine sokup optik görüş sonucu gibi sunmak doğru değildir. Bu nedenle optik refraktif indis modeli ve katmanlı ışın izleme ayrı bir sonraki aşamada, formülü ve varsayımları açıkça belirtilerek eklenecektir.

## Sonraki adım

Aşama 4.2:

- görünür ışık için açık dalga boyu seçimi,
- optik kırılma indisi hesabı,
- katman sınırlarında ışın ilerleme sözleşmesi,
- düz ve küresel geometriden bağımsız atmosfer ışın izi çekirdeği,
- standart `k` yaklaşımıyla sonuç karşılaştırması.
