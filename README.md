# Geometrik Gözlem Laboratuvarı

Farklı Dünya geometrisi ve fiziksel model iddialarını, aynı ölçülebilir deneyler üzerinden sayısal olarak karşılaştırmayı amaçlayan masaüstü simülasyon projesi.

## Projenin amacı

Uygulama önceden seçilmiş bir sonucu kanıtlamaya çalışmaz. Kullanıcı bir gözlem veya deney tanımlar; seçilen modeller aynı girdilerle ayrı ayrı tahmin üretir. Sonuçlar, varsayımlar ve belirsizlikler görünür biçimde karşılaştırılır.

Temel ilke:

> Her sonuç yeniden üretilebilir, her varsayım görülebilir ve her sayı kaynağına kadar izlenebilir olmalıdır.

## Mevcut durum

Bu dal ilk ürün ve arayüz tasarımını içerir:

- Electron + React + TypeScript masaüstü iskeleti
- Koyu temalı karşılaştırma laboratuvarı prototipi
- Deney, model ve sonuç veri tipleri
- İlk geometrik yardımcı hesaplamalar
- Ürün vizyonu ve teknik mimari belgeleri

Arayüzde görünen senaryo sonuçları **demo veridir**. Bilimsel hesaplama motoruna bağlanana kadar doğrulanmış sonuç olarak değerlendirilmemelidir.

## Başlangıç

```bash
npm install
npm run dev
```

Kontroller:

```bash
npm run typecheck
npm test
npm run build
```

## Dizin yapısı

```text
docs/                  Ürün, mimari ve deney belgeleri
src/main/              Electron ana süreç
src/preload/           Güvenli masaüstü köprüsü
src/renderer/          React kullanıcı arayüzü
src/shared/            Ortak alan tipleri
src/simulation/        Model sözleşmesi ve hesaplama çekirdeği
tests/                 Sayısal birim testleri
```

## Tasarım kararları

- Harita projeksiyonu ile fiziksel model birbirinden ayrılır.
- Model puanı yerine gözlem farkı, hata ve belirsizlik gösterilir.
- Geometri, atmosfer ve görsel canlandırma ayrı katmanlardır.
- Bir model yeterli kural tanımlamıyorsa sonuç uydurulmaz; deney desteklenmiyor olarak işaretlenir.
- 3B görünüm açıklayıcıdır; sayısal motorun yerine geçmez.

Ayrıntılar için `docs/` dizinine bakın.
