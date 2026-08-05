# Simulator

Farklı Dünya geometrisi ve fiziksel model iddialarını, aynı ölçülebilir deneyler üzerinden sayısal olarak karşılaştırmayı amaçlayan masaüstü simülasyon projesi.

## Hedef

Kullanıcının bir gözlem veya deney tanımlamasını, seçilen modellerin bu deney için ayrı tahminler üretmesini ve sonuçların ölçüm belirsizlikleriyle birlikte karşılaştırılmasını sağlamak.

## Temel ilkeler

- Aynı deney girdileri bütün modellere uygulanır.
- Geometri, atmosfer ve görsel canlandırma birbirinden ayrılır.
- Harita projeksiyonları fiziksel model olarak değerlendirilmez.
- Her sonuç kullanılan varsayımlar ve formüllerle izlenebilir olur.
- Tanımsız model davranışlarında uydurma sonuç yerine `unsupported` durumu döndürülür.
- Tek bir deneydeki uyum, bir modelin genel doğruluğu olarak sunulmaz.

## Çalışan hedef görünürlüğü laboratuvarı

İlk etkileşimli hedef görünürlüğü deneyi şu yeteneklere sahiptir:

- İdeal küre modeli
- Tanımlı, engelsiz düzlem modeli
- Azimutal projeksiyonun fiziksel model olmadığını belirten `unsupported` sonucu
- Gözlemci ve hedef yüksekliği
- Yüzey mesafesi
- Gözlenen görünürlük ve belirsizlik
- Atmosfer kapalı veya standart kırılma
- Düzenlenebilir kırılma katsayısı
- Görünür ve gizlenen hedef oranı
- Ufuk mesafesi
- Hedef tepe görüş açısı
- Gözlem ile tahmin arasındaki fark
- Her model için varsayım, formül, yerine koyma ve sonuç adımlarını gösteren hesap izi

Standart kırılma, bu aşamada etkin yarıçap yaklaşımıyla hesaplanır. Arazi, dalga yüksekliği ve gelişmiş atmosfer profili henüz dahil değildir.

## Deney kayıtları

Deneyler Electron kullanıcı veri klasöründe saklanır. Uygulama şu işlemleri destekler:

- deney oluşturma ve güncelleme,
- uygulama kapatıldıktan sonra kayıtları koruma,
- kayıtları yeniden açma,
- kayıt silme,
- model sürümleri ve sonuç anlık görüntülerini saklama.

## Taşınabilir dosyalar ve raporlar

`0.3.0` geliştirme sürümünde:

- deneyler sürümlemeli `.ggl.json` dosyası olarak dışa aktarılabilir,
- taşınabilir deney dosyaları doğrulanarak içe aktarılabilir,
- eski ham deney JSON kayıtları güncel yapıya taşınabilir,
- kimlik çakışmaları güvenli yeni kayıt oluşturarak çözülür,
- girdiler, sonuçlar, varsayımlar ve hesap izleri çevrimdışı HTML raporuna dönüştürülebilir.

HTML raporu okunabilir/yazdırılabilir çıktıdır. Yeniden içe aktarılabilir veri kaynağı `.ggl.json` dosyasıdır.

## Teknoloji

- Electron
- React
- TypeScript
- electron-vite
- Vitest

## Geliştirme

```bash
npm install
npm run dev
```

## Doğrulama

```bash
npm run typecheck
npm test
npm run build
```

Aynı kontroller pull request'lerde GitHub Actions üzerinde otomatik çalışır. Aynı dalın eski CI koşuları otomatik iptal edilir.

## Belgeler

- [`docs/product-vision.md`](docs/product-vision.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/experiment-system.md`](docs/experiment-system.md)
- [`docs/model-contract.md`](docs/model-contract.md)
- [`docs/ui-design.md`](docs/ui-design.md)
- [`docs/portable-format.md`](docs/portable-format.md)
- [`docs/roadmap.md`](docs/roadmap.md)

## Durum

Hedef görünürlüğü motoru, yerel kayıtlar ve hesap izlenebilirliği `main` dalındadır. Taşınabilir deney dosyaları ile çevrimdışı raporlama `agent/portable-experiments-and-reports` dalında yerel doğrulama aşamasındadır.
