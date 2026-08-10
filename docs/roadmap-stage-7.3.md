# Aşama 7.3 — Yerel tutulma zaman penceresi araması

Durum: tamamlanma adayı · `1.22.1`

## Amaç

Aşama 7.1 ve 7.2 yalnız seçilen tek bir UTC anındaki Güneş–Ay apparent disk örtüşmesini çözüyor. Bu dilim aynı düşük hassasiyetli astronomik zinciri zaman ekseninde kontrollü biçimde tarayarak, kullanıcının seçtiği gözlem anının çevresinde yerel bir disk örtüşme olayı olup olmadığını araştırır.

Bu aşama **resmi tutulma efemerisi değildir**. Üretilen zamanlar C1–C4 olarak adlandırılmaz.

## Hesap zinciri

Her zaman örneğinde:

1. mevcut NOAA geometrik Güneş konumu hesaplanır,
2. aynı UTC anı ve WGS84 gözlemci için mevcut düşük hassasiyetli topocentrik Ay konumu hesaplanır,
3. Aşama 7.1 disk örtüşme çekirdeği çalıştırılır,
4. dış limb açıklığı ve disk örtüşme oranı zaman boyunca izlenir.

## Arama stratejisi

- varsayılan pencere: seçili anın `±12 saat` çevresi
- kullanıcı seçenekleri: `±6`, `±12`, `±24`, `±48 saat`
- kaba tarama adımı: `5 dakika`
- en yakın yaklaşım / maksimum örtüşme: kaba minimumun komşu aralığında iteratif zaman optimizasyonu
- disk örtüşme başlangıç/bitiş sınırı: dış limb açıklığının işaret değiştirdiği aralıkta bisection
- iç kapsama varsa aynı yöntemle iç limb sınırlarının yaklaşık zamanları
- sınır inceltme toleransı: yaklaşık `1 saniye`

Kaba tarama adımı bilimsel hassasiyet iddiası değildir; olayın bulunmasını sağlar. Son sınır zamanları daha sonra sayısal olarak inceltilir.

## Arayüz

`Güneş ve Ay Gözlemleri` içinde Aşama 7.2 anlık disk panelinin altına kullanıcı kontrollü yeni kart eklenir:

- arama penceresi seçimi
- `Pencereyi tara` düğmesi
- örtüşme başlangıcı
- maksimum örtüşme zamanı ve oranı
- örtüşme bitişi
- yaklaşık süre
- maksimum geometrik sınıf
- maksimumda geometrik ufuk durumu
- varsa iç kapsama aralığı
- olay yoksa pencere içindeki en yakın yaklaşım

Tarama otomatik çalışmaz. Tarih veya koordinat değişirse önceki sonuç `eski` olarak işaretlenir; kullanıcı yeniden tarar. Bu, normal astronomi ekranında yüzlerce örneğin her alan değişiminde gereksiz yere hesaplanmasını önler.

## Bilimsel sınırlar

Bu aşamada uygulanmayanlar:

- Bessel elemanları
- resmi C1–C4 temas zamanları
- Dünya üzerindeki umbra/penumbra yolu veya merkez hattı
- JPL DE / Horizons yüksek hassasiyetli efemerisi
- Ay limb topografyası
- gözlemci rakımının Ay paralaksına etkisi
- atmosferik kırılma
- görsel tutulma güvenliği veya gözlem yapılabilirliği kararı

Dolayısıyla `örtüşme başlangıcı`, `maksimum örtüşme` ve `örtüşme bitişi` yalnız mevcut düşük hassasiyetli yerel disk geometrisinin sayısal zaman sınırlarıdır.

## Doğrulama hedefleri

- 8 Nisan 2024 Dallas örneğinde seçili pencere içinde bir örtüşme olayı bulunması
- başlangıç < maksimum < bitiş zaman sırasının korunması
- maksimum Güneş disk alanı örtüşmesinin sıfırdan anlamlı derecede büyük olması
- maksimumda iki disk merkezinin geometrik ufuk üstünde kalması
- olay bulunmayan bir tarihte sahte temas üretmemesi ve yalnız en yakın yaklaşımı raporlaması
- açık saat dilimi olmayan veya aşırı büyük arama penceresinde fail-closed davranışı

## Sonraki dilim

Özel `Tutulma Simülasyonları` senaryosunun etkinleştirilmesi; olay aramasının deney kayıt/prediction sözleşmesine taşınması ve yalnız doğrulanmış kapsam ölçüsünde ayrı iş akışına alınması sonraki UI/persistence diliminde ele alınacaktır.
