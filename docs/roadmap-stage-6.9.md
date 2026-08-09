# Aşama 6.9 — Yıldız proper motion ve katalog epok temeli

Durum: tamamlandı · `1.13.1`

## Amaç

Aşama 6.7–6.8'de kullanılan J2000 katalog yönleri gözlem tarihine yalnız precession ile taşınıyordu. Bu aşama, yıldızın katalog epokundan beri gökyüzündeki kendi açısal hareketini ayrı ve izlenebilir bir fizik katmanı olarak tanımlar.

## Eklenen çekirdek

- `stellar-proper-motion-tangent-sphere@0.1.0`
- kaynak katalog epoku için Julian yıl sözleşmesi
- `μ_α* = cos(δ)·dα/dt` ve `μ_δ` bileşenlerini ayrı giriş olarak alma
- proper-motion vektörünü yerel ekvatoryal teğet bazında oluşturma
- `1 / cos(δ)` kullanmadan birim küre üzerinde yayılım
- kutuplara çok yakın yönlerde sonlu ve normalize edilmiş sonuç
- ileri ve geri zaman yayılımı
- kaynak/yayılmış RA-Dec, toplam proper motion ve açısal kayma
- tipli hesap izi ve algoritma sürümü

## Neden doğrudan RA'ya ekleme yapılmıyor?

BSC5P proper-motion RA alanı projeksiyonlu `μ_α*` bileşenidir. Bunu `dα/dt` olarak ele almak veya `cos(δ)` ile kontrolsüz bölmek özellikle gök kutuplarına yakın yıldızlarda sayısal olarak kırılgan olur. Bu nedenle iki bileşen yıldız yönüne teğet ortonormal bazda bir vektöre dönüştürülür ve yön birim küre üzerinde ilerletilir.

## Bilimsel sınır

Bu aşamadaki motor yalnız iki açısal proper-motion bileşenini kullanır. Aşağıdakiler henüz uygulanmaz:

- yıllık paralaks
- radyal hız
- perspektif ivmelenmesi
- nutation
- aberration
- gözlemciye özgü apparent-place düzeltmeleri

Dolayısıyla bu katman tam altı-parametreli yıldız uzay hareketi çözümü değildir.

## Veri provenansı

Bright Star Catalog/BSC5P katalog sözleşmesi `pmRA` ve `pmDE` değerlerini yay saniyesi/yıl olarak, J2000/FK5 bağlamında verir; `pmRA`, `cos(DE)·d(RA)/dt` biçimindeki projeksiyonlu bileşendir. Motorun giriş sözleşmesi bu tanımla uyumludur.

Bu checkpoint'te 19 yıldızlık çevrimdışı altkümeye hareket değerleri eklenmemiştir. Kaynak kayıttan doğrulanmamış değerler tahmin edilmez veya başka kataloglardan sessizce karıştırılmaz.

## Doğrulama

Regresyonlar şunları kapsar:

- sıfır proper motion ile yönün değişmemesi
- saf `μ_α*` hareketi
- saf `μ_δ` hareketi
- gök kutbuna çok yakın yönlerde sonlu sonuç
- geçmişe doğru yayılım
- saat dilimi ve büyüklük doğrulaması

## Sonraki dilim

- BSC5P kaynak kaydından doğrulanmış `pmRA` / `pmDE` değerlerini katalog altkümesine ekleme
- katalog epoku ve hareket provenansını yıldız kaydıyla birlikte saklama
- proper motion → IAU 2006 precession sırasını yıldız gözlem çözümüne bağlama
- prediction ve HTML hesap izinde proper-motion katkısını ayrı metrik olarak gösterme
