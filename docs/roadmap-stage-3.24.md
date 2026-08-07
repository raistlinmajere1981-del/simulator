# Aşama 3.24 — Etkileşimli model görselleştirme altyapısı

Durum: tamamlandı

- Three.js tabanlı model görselleştirme katmanı
- Hesap motorundan bağımsız WebGL sahne bileşeni
- İdeal küre için gerçek 3B küresel geometri
- WGS84 gözlemci ve hedef koordinatlarının küre üzerinde gösterilmesi
- Mevcut Vincenty / küresel-yedek rota çözümünden örneklenen rota çizgisi
- Enlem ve boylam yardımcı ızgarası
- Tanımlı düzlem modeli için küresel koordinat projeksiyonu uydurmayan yerel düzlem şeması
- Azimutal gösterim için kuzey kutup merkezli açık kartografik referans
- Azimutal kartın fiziksel tahmin üretmediği mevcut `unsupported` sözleşmesinin korunması
- Gözlemci ve hedef işaretleri
- Fare / pointer ile döndürme ve tekerlekle yakınlaştırma
- Responsive `ResizeObserver` boyutlandırması
- WebGL başlatılamadığında açık hata görünümü
- GPU geometry/material ve renderer kaynaklarının bileşen kapanışında temizlenmesi
- WGS84 → küre ve azimutal referans koordinat dönüşümlerinin saf yardımcı fonksiyonlara ayrılması
- Görsel rota örnek sayısı için güvenlik sınırı ve birim testleri
- Three.js `0.185.1`
- Uygulama sürümü `1.1.0`

Bu aşama kıta/ülke sınırları veya topografik kaplama eklemez. Görselleştirme katmanı
fiziksel model hesabının kaynağı değildir; yalnız hesaplanan/sağlanan deney konumunu
ve model geometrisini gösterir. Tanımlı düzlem modeline küresel koordinatları küresel
bir harita projeksiyonuyla yerleştirmek, modelde böyle bir küresel konum sözleşmesi
bulunmadığı için bilinçli olarak yapılmamıştır.

Sıradaki aşama, çevrimdışı çalışabilen kıta/kıyı sınırları ve topografya gibi görsel
coğrafi katmanları bu sahnelere eklemektir.
