# Aşama 7.7 — Aynı anda WGS84 rota / konum karşılaştırması

Durum: geliştirme ve manuel Electron kabulü bekleniyor · `1.26.0`

## Amaç

Aşama 7'nin rota karşılaştırmaları başlığını, iki konumu birbirine bağlayan WGS84 jeodezik rota boyunca aynı fiziksel anda Güneş geometrisinin nasıl değiştiğini sayısal olarak gösterecek bir astronomik referansa dönüştürmek.

Bu aşama hareket eden bir araç veya seyahat zamanı simülasyonu değildir. A, rota ara örnekleri ve B aynı UTC anında hesaplanır.

## Hesap çekirdeği

- A ve B WGS84 enlem/boylamları arasında mevcut ters jeodezik çözüm kullanılır.
- Rota, mevcut Vincenty doğrudan çözümüyle eşit mesafe kesirlerinde örneklenir; gerekli durumda açıkça işaretli küresel yedek çözüm korunur.
- İlk görünür dilimde 5 örnek kullanılır: `%0 / %25 / %50 / %75 / %100`.
- Her örnekte mevcut düşük hassasiyetli Güneş çekirdeğiyle geometrik yükseklik ve azimut hesaplanır.
- Aynı sabit UTC ofsetiyle mevcut Aşama 7.6 Güneş zamanı çekirdeği kullanılır; A–B görünür Güneş saati farkı raporlanır.
- Örneklerde minimum/maksimum Güneş yüksekliği ve komşu örnekler arasındaki geometrik ufuk tarafı değişimleri tanısal olarak gösterilir.

## Kullanıcı arayüzü

Panel `Güneş ve Ay Gözlemleri` içinde yıllık mevsim karşılaştırmasından sonra yer alır.

- A noktası aktif gözlemci konumudur.
- B noktası ilk dilimde panel içinde düzenlenen bağımsız karşılaştırma konumudur.
- `B'yi 30° doğuya al` hızlı kontrolü boylam kaynaklı Güneş zamanı farkını görünür kılar.
- A ve B kartları Güneş yüksekliği, azimut ve görünür Güneş saatini gösterir.
- Merkez kart WGS84 rota mesafesi, başlangıç azimutu, çözüm yöntemi, B−A yükseklik farkı ve B−A Güneş saati farkını gösterir.
- SVG profilinde 0° geometrik ufuk ve beş örneğin Güneş yüksekliği birlikte çizilir.
- Beş örnek kartında rota yüzdesi, mesafe, koordinat, yükseklik, azimut ve Güneş saati görünür.
- Hesap izi panel içinde isteğe bağlı açılır.

## Bilimsel ve ürün sınırları

- Bütün rota örnekleri aynı fiziksel UTC anındadır; hız, hareket ve seyahat süresi uygulanmaz.
- Sabit UTC ofseti yalnız karşılaştırma referansıdır. IANA saat dilimi bölgeleri, siyasi/yasal sınırlar ve DST geçişleri rota boyunca otomatik uygulanmaz.
- Güneş yükseklikleri geometriktir; atmosferik kırılma ve topoğrafik yerel ufuk uygulanmaz.
- Beş örnek tanısal bir profildir; rota boyunca sürekli maksimum/minimum araması yapıldığı iddia edilmez.
- B karşılaştırma koordinatı bu ilk UI diliminde editör-local durumdur; ayrı kayıt/persistence sözleşmesi bu aşamanın şartı değildir.

## Otomatik doğrulama hedefleri

- Ekvator üzerinde 0°E → 30°E rotasında WGS84 mesafesi ve 90° başlangıç azimutu.
- `%0 / %25 / %50 / %75 / %100` eşit rota kesirleri ve yaklaşık 15°E orta nokta.
- Aynı anda 30° boylam farkı için yaklaşık `+120 dk` görünür Güneş saati farkı.
- Farklı coğrafi rota örneğinde mesafe ve yükseklik profilinin sonlu kalması.
- Model prediction ve hesap izi sözleşmesi.
- Çakışan A/B ve güvenlik dışı örnek sayısının reddi.

## Manuel Electron kabulü

1. İstanbul `41.0082°, 28.9784°`, UTC+03:00 ile Güneş ve Ay Gözlemleri açıldığında rota paneli görünmeli.
2. Varsayılan B noktası A'nın yaklaşık `30°` doğusunda olmalı; B−A görünür Güneş saati farkı yaklaşık `+120 dk` olmalı.
3. Beş rota örneği, SVG yükseklik profili, rota mesafesi ve başlangıç azimutu görünmeli.
4. B koordinatları değiştirildiğinde bütün rota sonuçları canlı güncellenmeli.
5. Dar pencerede A/özet/B kartları, tanılar ve örnek kartları tek sütuna kadar kırılmalı; yatay taşma olmamalı.

## Sonraki aday

Aşama 7'nin ilk büyük kapsamı bu dilimle tutulma, mevsim, zaman referansı ve rota karşılaştırması başlıklarını kapsar. Sonraki çalışma yeni yetenek eklemek yerine Aşama 7 sonuçlarının kayıt/rapor entegrasyonunu veya yol haritasındaki sonraki doğrulanmış ihtiyacı ele alabilir.
