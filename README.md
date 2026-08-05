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
- Arayüz prototipindeki sayılar hesaplama motoruna bağlanana kadar demo veri olarak işaretlenir.

## İlk sürüm kapsamı

- İdeal küre modeli
- Parametrik düzlem modeli
- İki nokta arasında görüş hattı
- Ufuk mesafesi
- Hedefin görünür ve gizlenen kısmı
- Atmosfer kapalı ve standart kırılma seçenekleri
- Sonuçların yan yana karşılaştırılması
- Deney kaydetme ve raporlama altyapısı

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

Aynı kontroller her push ve pull request için GitHub Actions üzerinde otomatik çalışır.

## Belgeler

- [`docs/product-vision.md`](docs/product-vision.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/experiment-system.md`](docs/experiment-system.md)
- [`docs/model-contract.md`](docs/model-contract.md)
- [`docs/ui-design.md`](docs/ui-design.md)
- [`docs/roadmap.md`](docs/roadmap.md)

## Durum

İlk ürün, mimari ve arayüz taslağı `agent/initial-simulator-design` dalında geliştirilmektedir.
