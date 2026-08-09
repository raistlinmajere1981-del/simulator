# Aşama 6.11 — Doğrulanmış BSC5P motion altküme üretimi

Durum: tamamlandı · `1.13.3`

## Amaç

Aşama 6.9 proper-motion matematiğini, Aşama 6.10 ise resmi BSC5P sabit-genişlik kaynak satırı parserını ve yanlış-satır korumasını ekledi. Bu aşama, resmi kaynak kayıtları sağlandığında ürünün 19 yıldızlık proper-motion altkümesini tek ve deterministik bir işlemle üreten katmanı tamamlar.

## Üretim sözleşmesi

`bsc5p-bright-star-motion-subset@0.1.0`:

- giriş olarak parse edilmiş BSC5P kayıtlarını veya tam sabit-genişlik kaynak metnini alır,
- ürünün `BRIGHT_STAR_CATALOG` listesindeki her yıldızı HR numarasıyla arar,
- her satırı Aşama 6.10 HR + J2000 konum + V-kadir doğrulamasından geçirir,
- `pmRA` ve `pmDE` bileşenlerinin ikisini de zorunlu tutar,
- kaynak sırası ne olursa olsun çıktıyı ürün kataloğu sırasına göre üretir,
- yinelenen HR kayıtlarını reddeder,
- 19 yıldızdan tek biri bile eksik veya doğrulanamazsa kısmi çıktı üretmez.

## Eksik veri semantiği

Bu aşama özellikle `0` ile `null` değerlerini ayırır:

- `0`: katalogda mevcut, sıfır proper-motion bileşeni olarak geçerli bir ölçüm değeri,
- `null`: kaynak alanda veri yok; üretim durdurulur.

Eksik PM alanı hiçbir zaman sıfır olarak doldurulmaz.

## Çıktı provenansı

Her doğrulanmış yıldız kaydı şunları korur:

- ürün yıldız kimliği ve HR numarası,
- kaynak J2000 RA/Dec,
- kaynak V kadri,
- `μ_α*` ve `μ_δ`,
- varsa paralaks ve radyal hız,
- özgün 197 karakterlik kaynak satırı.

Altküme üst bilgisi:

- kaynak katalog: CDS `V/50`,
- kaynak biçim kimliği ve parser sürümü,
- kaynak epok: `J2000.0`,
- kaynak çerçeve: `FK5/J2000`.

Bu alanlar daha sonra ürün kataloğuna eklenecek değerlerin nereden geldiğinin denetlenebilmesini sağlar.

## Determinizm

Serileştirme katmanı aynı doğrulanmış giriş için aynı JSON içeriğini ve sabit kayıt sırasını üretir. Üretim zamanı gibi değişken alanlar veri dosyasına eklenmez; böylece kaynak değişmedikçe diff değişmez.

## Bu aşamada özellikle yapılmayanlar

Resmi BSC5P kaynak dosyasına bu çalışma oturumundan doğrudan erişilemediği için 19 yıldızın gerçek `pmRA` / `pmDE` sayıları henüz ürün kataloğuna yazılmamıştır.

Bu nedenle:

- mevcut Yıldız Gözlemleri sonuçları değişmez,
- proper motion hâlâ gözlem zincirinde uygulanmaz,
- sentetik test sayıları bilimsel veri olarak kullanılmaz,
- başka kataloglardan sayı kopyalanmaz.

## Doğrulama

Regresyonlar şunları kapsar:

- ters sıradaki kaynak kayıtlarından katalog sıralı deterministik çıktı,
- geçerli sıfır PM bileşeni,
- eksik yıldız satırında tüm üretimin reddi,
- yinelenen HR reddi,
- tek PM bileşeni eksikken reddetme,
- HR doğru yazılmış olsa bile başka yıldıza ait RA/Dec satırını reddetme,
- deterministik JSON serileştirme.

## Sonraki dilim

Kaynak erişimi sağlandığında:

1. resmi BSC5P ana katalog dosyasını parserdan geçir,
2. 19 yıldızlık doğrulanmış motion altkümesini üret,
3. oluşan veri dosyasını repo içine provenanslı statik kaynak olarak ekle,
4. proper motion → IAU 2006 precession → yerel yatay koordinat sırasını Yıldız Gözlemleri çözümüne bağla,
5. proper-motion katkısını prediction ve HTML hesap izinde ayrı göster,
6. paralaks/radyal hız/perspektif ivmelenmesinin uygulanmadığını açık tut.
