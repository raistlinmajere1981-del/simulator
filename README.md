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

## Çalışan ilk hesaplama motoru

İlk etkileşimli hedef görünürlüğü deneyi şu anda çalışmaktadır:

- İdeal küre modeli
- Tanımlı, engelsiz düzlem modeli
- Azimutal projeksiyonun fiziksel model olmadığını belirten `unsupported` sonucu
- Gözlemci yüksekliği
- Hedef yüksekliği
- Yüzey mesafesi
- Gözlenen görünürlük ve belirsizlik
- Atmosfer kapalı veya standart kırılma
- Kırılma katsayısı
- Görünür ve gizlenen hedef oranı
- Ufuk mesafesi
- Hedef tepe görüş açısı
- Gözlem ile tahmin arasındaki fark

Standart kırılma, bu aşamada etkin yarıçap yaklaşımıyla hesaplanır. Arazi, dalga yüksekliği ve gelişmiş atmosfer profili henüz dahil değildir.

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

Aynı kontroller her pull request ve `main` dalı güncellemesi için GitHub Actions üzerinde otomatik çalışır. Aynı dalın eski CI koşuları otomatik iptal edilir.

## Belgeler

- [`docs/product-vision.md`](docs/product-vision.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/experiment-system.md`](docs/experiment-system.md)
- [`docs/model-contract.md`](docs/model-contract.md)
- [`docs/ui-design.md`](docs/ui-design.md)
- [`docs/roadmap.md`](docs/roadmap.md)

## Durum

İlk ürün, mimari, arayüz ve hedef görünürlüğü motoru `agent/initial-simulator-design` dalında geliştirilmektedir.
