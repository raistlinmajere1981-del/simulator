# Aşama 3.26 — Arazi profilinin 3B sahneyle ilişkilendirilmesi

Durum: tamamlandı · `1.1.2`

## Amaç

Mevcut manuel, CSV, GeoJSON veya DEM arazi profilini model kartlarındaki Three.js sahnelerine görsel bir yardımcı katman olarak bağlamak; bunu yaparken görsel yükseltme ile fiziksel hesap geometrisini birbirine karıştırmamak.

## Uygulama

- Profil örnekleri rota mesafesi boyunca 0…1 aralığında konumlandırılır.
- Her örnek için gözlemci ve hedef uç kotlarını birleştiren doğrusal baz kot hesaplanır.
- Görsel rölyef `örnek kotu - doğrusal baz kot` olarak tanımlanır.
- Rölyef yalnız sahnede görünür olacak sınırlı bir göreli ölçeğe normalize edilir.
- Gerçek kot değerleri metre olarak hesap motorunda ve deney verisinde değişmeden kalır.
- İdeal kürede örnekler WGS84 jeodezik rota üzerindeki gerçek ara konumlara yerleştirilir.
- Tanımlı düzlemde profil, yerel gözlemci-hedef rota ekseni üzerinde gösterilir; küresel koordinat haritası uydurulmaz.
- Azimutal görünümde profil yalnız kartografik veri şeridi olarak gösterilir ve fiziksel model kuralı oluşturmaz.
- Kaynağın manuel / CSV / GeoJSON / DEM olduğu görsel katman açıklamasında korunur.
- `Topografya Görselleştirme` anahtarı yalnız renderer state'ini değiştirir; deney girdilerini ve model sonuçlarını değiştirmez.

## Güvenlik sınırları

- Görsel şerit hassas yükseklik ölçekli 3B arazi modeli değildir.
- Görsel yükseltme katsayısı fiziksel görünürlük, görüş hattı veya kırılma hesabına geri beslenmez.
- Geçersiz profil veya üretilemeyen jeodezik görsel yol, model sahnesinin tamamını düşürmez; yalnız arazi katmanı atlanır.

## Doğrulama

- Profil normalizasyonu için saf birim testleri eklendi.
- Doğrusal eğimli profil nötr rölyef üretir.
- Pozitif ve negatif ara rölyef işareti korunur.
- Sırasız veya uç örnekleri eksik profiller reddedilir.
- Pull request CI strict TypeScript, Vitest ve production build ile doğrulanır.

## Sonraki aşama

Aşama 3.27 mevcut görünürlük motorunu ayrı `Ufuk Analizi` ve `Uzun Mesafe Görüş` deney akışlarına ayıracaktır.
