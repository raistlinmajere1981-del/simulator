# Mimari

## Katmanlar

### Electron ana süreç

- Masaüstü pencere yaşam döngüsü
- Güvenli dosya ve işletim sistemi işlemleri
- İleride deney kaydetme ve rapor dışa aktarma

### React arayüzü

- Deney girdileri
- Model karşılaştırma kartları
- Sonuç tablosu
- Görsel canlandırma

### Ortak alan tipleri

- Deney tanımı
- Model metadata bilgisi
- Tahmin metrikleri
- Belirsizlik değerleri
- Sonuç durumları

### Simülasyon çekirdeği

- Geometri yardımcıları
- Gözlem değerlendirmesi
- Model çalıştırıcı
- Hata yalıtımı
- Atmosfer bağlamı

### Model eklentileri

İlk uygulamalar:

- `IdealSphereModel`
- `DefinedPlaneModel`
- `AzimuthalProjectionReference`

## Veri akışı

```text
Kullanıcı girdileri
  → ExperimentDefinition
  → SimulationContext
  → runSimulationModels
  → her modelin predict işlemi
  → ModelPrediction listesi
  → React karşılaştırma görünümü
```

## Hesaplama ayrımı

### Geometri

Küre ve düzlem üzerindeki görüş ilişkilerini hesaplar.

### Atmosfer

İlk sürümde yalnızca:

- Kapalı
- Standart kırılma için etkin yarıçap

Katmanlı atmosfer profili sözleşmede ayrılmış ancak henüz uygulanmamıştır.

### Değerlendirme

Model tahminini gözlenen değer ve belirsizlikle karşılaştırır. Bu katman model formülünden ayrıdır.

### Canlandırma

2B/3B şekiller açıklama amaçlıdır. Sayısal değerlerin kaynağı değildir.

## Hata yalıtımı

Model çalıştırıcı her modeli ayrı çalıştırır. Tek bir modeldeki hata diğer sonuçları engellemez. Hatalı veya eksik model `unsupported` sonucu ve uyarı üretir.

## Test ve CI

GitHub Actions şu adımları çalıştırır:

1. Bağımlılık kurulumu
2. TypeScript typecheck
3. Vitest testleri
4. Electron-Vite üretim derlemesi

Özellik dallarında yalnızca pull request koşusu çalışır. Aynı PR için eski koşular otomatik iptal edilir.

## Sonraki mimari genişletmeler

- Deney deposu ve JSON şeması
- WGS84/elipsoid paketi
- Arazi profili sağlayıcısı
- Atmosferik ışın izleme
- Kamera kalibrasyonu
- Rapor üretimi
