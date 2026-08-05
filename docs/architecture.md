# Teknik Mimari

## Genel yaklaşım

İlk sürüm yerel çalışan Electron masaüstü uygulamasıdır. React arayüzü deney hazırlama ve sonuç inceleme görevlerini yürütür. Sayısal çekirdek arayüzden bağımsız TypeScript modüllerinde tutulur.

```text
Electron Main
  └── güvenli preload köprüsü
        └── React Renderer
              ├── Deney editörü
              ├── Model karşılaştırma görünümü
              ├── Analiz ve rapor görünümü
              └── 2B / 3B açıklayıcı görselleştirme

Simulation Core
  ├── Model sözleşmesi
  ├── Deney doğrulama
  ├── Geometri motoru
  ├── Atmosfer / optik motoru
  ├── Astronomi motoru
  ├── Belirsizlik motoru
  └── Hesap izi ve raporlama
```

## Katmanlar

### 1. Alan modeli

`src/shared` altında deney, gözlemci, hedef, ölçüm, model ve sonuç tipleri bulunur. Bu katman Electron veya React bağımlılığı taşımaz.

### 2. Sayısal çekirdek

`src/simulation` saf fonksiyonlar ve model sözleşmelerini içerir. Hesaplama girdileri doğrulanır; ara değerler daha sonra hesap izi içinde kaydedilir.

### 3. Model eklentileri

Her model ortak sözleşmeyi uygular. Model metadata kaydı şunları içerir:

- benzersiz kimlik ve sürüm,
- desteklenen deney yetenekleri,
- açık varsayımlar,
- gereken parametreler,
- doğrulama kuralları.

### 4. Deney motoru

Deneyi seçili modellere dağıtır, sonuçları toplar ve karşılaştırılabilir metriklere dönüştürür. Bir model gerekli yeteneğe sahip değilse `unsupported` sonucu üretir.

### 5. Görselleştirme

2B ve 3B sahneler sayısal sonuçları okur. Kamera veya çizim motoru bilimsel sonucu yeniden hesaplamaz. Sahne üzerinde ölçek ve abartı kullanıldıysa açıkça gösterilir.

### 6. Kalıcılık

İlk aşamada deneyler sürümlü JSON dosyaları olarak saklanabilir. Daha sonra SQLite tabanlı yerel veri yöneticisine geçilebilir. Veri şeması için göç mekanizması gereklidir.

## Güvenlik

- Renderer içinde Node.js entegrasyonu kapalıdır.
- `contextIsolation` açıktır.
- Dosya erişimi yalnızca preload üzerinden sınırlı komutlarla yapılır.
- Model eklentileri ilk sürümde güvenilmeyen üçüncü taraf kod çalıştırmaz.
- Dış bağlantılar uygulama içinde değil sistem tarayıcısında açılır.

## Uzun vadeli performans

TypeScript, ilk geometri ve deney motoru için yeterlidir. Büyük Monte Carlo çalışmaları, atmosferik ışın izleme veya yüksek çözünürlüklü arazi hesapları gerektiğinde çekirdek Rust/WebAssembly işçilerine taşınabilir. Sözleşme katmanı bu geçişten bağımsız kalmalıdır.
