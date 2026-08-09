# Aşama 6.7 — Yıldız katalog koordinatı ve gözlem tarihine dönüşüm

Durum: tamamlandı · `1.12.2`

## Amaç

Aşama 6.6'daki yıldız konumu/iz çekirdeğine katalog koordinatlarını bilimsel anlamı açık bir ara katman üzerinden bağlamak; J2000 veya ICRS yönlerini sessizce gözlem tarihinin koordinatı olarak kullanmamak.

## Kapsam

- IAU 2006 Fukushima–Williams dört-açı precession formülasyonu
- `ICRS/GCRS → ortalama gözlem tarihi` için frame-bias + precession matrisi
- `ortalama J2000 → ortalama gözlem tarihi` için J2000 frame-biasını ayıran saf precession matrisi
- SOFA `Pmat06` doğrulama matrisine bağlı regresyon testi
- dönüşüm açısal kayması, kaynak çerçevesi ve hesap izi
- HEASARC BSC5P tabanlı küçük çevrimdışı parlak-yıldız referans altkümesi
- yıldız kimliği, yaygın ad, Bayer gösterimi, takımyıldız, HR numarası, J2000 RA/Dec ve görsel kadir
- katalog arama / kimlik çözme ve seçilen gözlem anına precession dönüşümü
- bilinmeyen katalog kimliğinde sessiz yedek yıldız kullanmama

## Bilimsel sınırlar

Precession zaman değişkeni normalde TT ile değerlendirilir. Uygulamanın mevcut çevrimdışı zaman sözleşmesinde yalnız açık saat dilimli UTC anı kayıtlı olduğundan bu dilimde UTC Julian günü TT için pratik vekil olarak kullanılır. Bu yaklaşım precession katmanında açıkça hesap izine yazılır; yüksek hassasiyetli astrometri iddiası değildir.

Katalog yönlerine bu aşamada yıldızın proper motion'u, radyal hızı, yıllık paralaksı, ışık sapması, aberration veya nutation uygulanmaz. Özellikle yüksek proper-motion yıldızlarda uzun zaman aralıkları için yalnız precession uygulanmış sonuç gerçek gözlem yönünün tam astrometrik çözümü değildir.

BSC5P altkümesi uygulama içindeki çevrimdışı referans ve arayüz doğrulama kataloğudur; bütün BSC5P tablosunun kopyası değildir. Kaynak tablosu J2000 ekvatoryal konumlar ve yıldız tanımlayıcıları sağlar.

Bu dönüşüm astronomik referans katmanıdır. İdeal Küre, Tanımlı Düzlem veya başka bir Dünya şekli modeline yıldız hareketi fiziği otomatik olarak atanmaz.

## Doğrulama

- IAU/SOFA `Pmat06(2400000.5, 50123.9999)` referans matrisinin 9 elemanı
- ortalama J2000 → J2000 özdeşlik kontrolü
- Sirius için 2026 gözlem tarihine sayısal precession regresyonu
- explicit timezone ve katalog kimliği güvenlik kontrolleri
- katalog kimliği/range/sıralama/aramanın regresyon testleri

## Sonraki adım

### Aşama 6.8 — Yıldız Gözlemleri arayüzü ve kayıt entegrasyonu

- senaryoyu sol menüde etkinleştirme
- katalog yıldızı seçimi ve J2000 → of-date provenansının görünür gösterimi
- yıldız konumu ve yıldız izi paneli
- iz süresi / örnekleme denetimleri
- prediction snapshot, kayıt, `.ggl.json` ve HTML rapor korunumu
- kullanıcı ekranı üzerinden manuel görsel doğrulama
