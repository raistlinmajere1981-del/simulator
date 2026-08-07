# Aşama 4.4 — Katmanlı atmosferin İdeal Küre sonuçlarına fiziksel bağlantısı

Durum: tamamlandı · `1.3.1`

## Amaç

Aşama 4.1–4.3'te oluşturulan meteorolojik profil, Ciddor optik kırılma indisi ve küresel RK4 ışın izini İdeal Küre'nin gerçek deney sonuçlarına bağlamak. Profil modu standart `k` yaklaşımının başka bir gösterimi değildir; iki hesap yolu ayrı tutulur.

## Hedef görünürlüğü

Katmanlı profil modunda gözlemciden farklı başlangıç yükselim açılarıyla fiziksel ışın yolları izlenir.

- her ışın aynı küresel yüzey geometrisi ve aynı meteorolojik profil üzerinden ilerler,
- hedef yüzey mesafesindeki ışın yüksekliği sayısal olarak bulunur,
- yüzeye veya arazi profiline çarpan yollar açık yol kabul edilmez,
- hedef mesafesine ulaşan açık ışınlar arasındaki en düşük son kot görünürlük sınırını belirler,
- hedef tabanı/tepesi ile bu sınır karşılaştırılarak görünür ve gizli yükseklik/oran hesaplanır,
- hedef tepesine ulaşan açık ışın için başlangıç yükselim açısı ayrıca sayısal atış çözümüyle bulunur.

Bu işlem tek bir ortalama veya etkin `k` üretmez.

## Arazi açıklığı

Arazi profili etkinse mevcut manuel/CSV/GeoJSON/DEM örnekleri aynı optik ışın yolu üzerinde sınanır. Her arazi örneğinde:

`açıklık = h_ışın - h_arazi`

hesaplanır. Sıfır veya negatif açıklık ışını engelli yapar. Böylece gelişmiş atmosfer ve arazi birbirinden ayrı girdiler olarak kalır fakat görünürlük kararı aynı fiziksel yol üzerinde birleşir.

## Optik ufuk

Ufuk Analizi senaryosunda farklı başlangıç yükselim açıları taranır. Yüzeye dönen ışınlarla ölçülmüş atmosfer içinde yüzeye dönmeden ilerleyen ışınlar arasındaki sınır bisection ile daraltılır. En uzak güvenilir yüzey kesişimi optik ufuk mesafesi olarak raporlanır.

Profilin alt sınırı `0 m` olduğunda RK4 alt adımlarından biri yüzeyin altına geçtiği için meteorolojik enterpolasyon yapılamayabilir. Işın o anda aşağı yönlü ve son geçerli nokta yüzeyin üzerindeyse bu durum profil ekstrapolasyonu olarak değil, fiziksel `0 m` yüzey kesişimi olarak sınıflandırılır. Kesişim mesafesi ışın adımı çözünürlüğüyle sınırlandırılır ve uyarı üretilir.

## Ölçüm kapsamı ve hesap sınırları

- gözlemci yüksekliği ölçülmüş atmosfer profilinin içinde olmalıdır,
- hedefin taban–tepe düşey aralığı ölçülmüş profilin içinde olmalıdır,
- ölçülmemiş yüksekliklere meteorolojik ekstrapolasyon yapılmaz,
- profil kapsamı güvenilir bir açık ışın kurmaya yetmiyorsa sonuç `indeterminate` olur,
- çok uzun rota / çok küçük ışın adımı kombinasyonlarında hesap sayısı sınırlandırılır ve kullanıcıya daha büyük adım gereksinimi açıkça bildirilir,
- ufuk sonucu tarama mesafesi veya profil kapsamı tarafından sınırlandırılıyorsa sonlu bir değer uydurulmaz.

## Standart `k` ile ayrım

- **Kapalı:** önceki geometrik İdeal Küre yolu değişmeden kullanılır.
- **Standart k:** önceki `Rₑ = R/(1-k)` etkin yarıçap yolu değişmeden kullanılır.
- **Katmanlı profil:** Ciddor `n(h)` ve RK4 ışın yolu kullanılır; `refractionCoefficient` bu sonucu etkilemez.

Düzlem modeline yeni bir atmosfer kuralı uydurulmaz. Tanımlı Düzlem, kendi fiziksel sözleşmesinde kırılma kuralı olmadığı için atmosfer girdisini uygulamadan açık uyarı vermeye devam eder.

## Hesap izi

Katmanlı İdeal Küre sonucu aşağıdaki provenansı taşır:

- atmosfer profil kaynak etiketi,
- meteorolojik örnek sayısı,
- vakum dalga boyu,
- CO₂ derişimi,
- RK4 ışın adımı,
- en düşük açık ışının başlangıç açısı,
- minimum görünür kot,
- varsa kritik arazi açıklığı,
- hedef-tepe ışın açısı,
- optik ufuk sonucu ve çözünürlük/kapsam uyarıları.

## Doğrulama ölçütleri

CI üzerinde aşağıdakiler birlikte doğrulandı:

- sıfır indis gradyanında optik ufkun geometrik küre ufkuna yaklaşması,
- normal negatif refraktivite gradyanında optik ufkun uzaması,
- hedef görünürlüğünün profil modunda fiziksel sonuç üretmesi,
- arazi engeli eklenince minimum görünür kotun yükselmesi,
- hedef profil kapsamını aşıyorsa sonucun reddedilmesi,
- profil modunda standart `k` girişinin sonucu değiştirmemesi,
- mevcut standart-k regresyon sonucunun korunması,
- `0 m` profil tabanındaki aşağı yönlü RK4 sınır çıkışının fiziksel yüzey kesişimi olarak ayrılması,
- strict TypeScript, tüm Vitest testleri ve production build'in geçmesi.

## Sonraki adım

Aşama 4.5 tamamlandı: Atmosfer Profili görsel katmanı katman yüksekliklerini, optik ışın yolunu ve geometrik görüş hattını İdeal Küre sahnesinde hesap motorundan bağımsız olarak gösterir. Sonraki ana fiziksel ürün aşaması Aşama 5 fotoğraf/kamera kalibrasyonudur.
