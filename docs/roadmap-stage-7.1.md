# Aşama 7.1 — Güneş tutulması anlık disk örtüşme geometrisi çekirdeği

Durum: tamamlanma adayı · `1.21.1`

## Amaç

Aşama 7'deki büyük ölçekli olaylara ilk adım olarak, mevcut Güneş ve Ay astronomik referanslarını **aynı gözlemci ve aynı anda** karşılaştırıp iki görünür diskin anlık açısal geometrisini çözmek.

Bu aşama özellikle tam bir tutulma efemerisi değildir. Önce güvenli ve test edilebilir bir temel kurulur; zaman taraması, temas anları ve `Tutulma Simülasyonları` kullanıcı arayüzü sonraki dilime bırakılır.

## Hesap zinciri

1. Mevcut `solar-position-noaa` geometrik Güneş yönü kullanılır.
2. Mevcut `lunar-position-low-precision` topocentrik Ay yönü ve Ay uzaklığı kullanılır.
3. Yerel yatay koordinatlardan merkezler arası küresel açı çözülür:
   `cos ψ = sin h☉ sin h☾ + cos h☉ cos h☾ cos(A☉−A☾)`.
4. Güneş yarıçapı yaklaşık Dünya–Güneş uzaklığından, Ay yarıçapı hesaplanan Ay uzaklığından görünür açısal yarıçapa çevrilir: `ρ = asin(R/Δ)`.
5. Küçük-açı teğet düzleminde iki daire kesişimi çözülür.
6. Sonuç yalnız verilen an için şu sınıflardan birini üretir:
   - `no-overlap`
   - `partial-overlap`
   - `total-type-contained`
   - `annular-type-contained`
7. Güneş disk alanının örtülen oranı, çap doğrultusundaki örtme oranı ve iç/dış limb açıklıkları ayrı sayısal çıktılardır.
8. Güneş ve Ay merkezlerinin geometrik ufkun üstünde olup olmadığı ayrı tanı olarak tutulur; bu bilgi disk geometrisini değiştirmez.

## Fail-closed kuralları

- Güneş ve Ay snapshot'ları aynı normalize UTC anına ait değilse hesap reddedilir.
- Gözlemci enlem/boylamı aynı değilse hesap reddedilir.
- Geçersiz açısal yarıçap, uzaklık veya merkez ayrımı kabul edilmez.
- Daire kesişiminde sayısal `acos` girdileri yalnız kayan nokta yuvarlama sınırı için clamp edilir.
- `no-overlap` durumda örtüşme alanı tam sıfırdır.

## Bilimsel sınır

Bu çekirdek **resmi tutulma tahmini değildir**. Özellikle şunları üretmez:

- Bessel elemanları,
- Dünya üzerindeki merkez hattı / gölge izi,
- C1/C2/maksimum/C3/C4 temas zamanları,
- yüksek hassasiyetli JPL DE efemerisi,
- Güneş topocentrik paralaksının tam uygulanması,
- gözlemci rakımı,
- atmosferik kırılma,
- Ay limb topografyası,
- optik görünürlük veya güvenli gözlem kararı,
- Ay tutulması / Dünya gölgesi geometrisi.

`total-type-contained` ve `annular-type-contained` etiketleri yalnız iki apparent diskin o andaki geometrik kapsanma ilişkisini anlatır. Bunlar tek başına resmi “tam tutulma” veya “halkalı tutulma” olayı ilan etmez.

## Kod

- `src/simulation/solar-eclipse-overlap.ts`
  - `horizontalAngularSeparationDeg`
  - `calculateAngularDiskOverlap`
  - `calculateSolarEclipseOverlap`
- `tests/solar-eclipse-overlap.test.ts`

## Sonraki dilim — Aşama 7.2

`Tutulma Simülasyonları` senaryosunun ilk kullanıcı arayüzü:

- gözlemci koordinatı + açık saat dilimli tarih/saat,
- anlık Güneş/Ay disk şeması,
- merkez ayrımı / apparent yarıçaplar / örtüşme oranı,
- verilen zaman çevresinde kontrollü aday arama,
- düşük hassasiyet sınırının arayüzde görünür tutulması,
- temas zamanı iddiasından önce tarama hassasiyeti ve efemeris sınırlarının ayrıca tasarlanması.
