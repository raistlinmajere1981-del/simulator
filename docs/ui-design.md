# Arayüz Tasarımı

## Ana çalışma biçimi

Uygulama üç temel görünüme ayrılır:

### Deney oluşturma

Kullanıcı deney türünü, gözlemciyi, hedefi, tarih-saat bilgisini, atmosferi, kamera verisini ve gerçek ölçümü girer. Eksik girdiler alan düzeyinde gösterilir.

### Simülasyon odası

Aynı deney seçili modellerde yan yana gösterilir. Her model kartında aynı metrikler aynı sırada bulunur. Kullanıcı kart sayısını iki, üç veya dört sütun olarak değiştirebilir.

### Analiz ve rapor

Tahmin-gözlem farkı, belirsizlik, hassasiyet analizi, model varsayımları, formüller ve hesap izi burada incelenir.

## Mevcut prototip

İlk React ekranı referans görseldeki laboratuvar düzenini korur:

- solda senaryolar, modeller ve katmanlar,
- üstte deney özeti ve gerçek gözlem,
- ortada üç model karşılaştırma kartı,
- altta sonuç tablosu ve notlar.

Sayısal alanlar şimdilik demo veridir ve arayüzde bu durum açıkça belirtilir.

## Değiştirilen kavramlar

- `Model Güveni` yerine `Gözleme Uyum` kullanılır.
- Gleason görünümü fiziksel model değil azimutal gösterim olarak etiketlenir.
- Desteklenmeyen deneyler boş veya uydurma sayı yerine durum mesajı gösterir.
- Atmosfer tek bir aç/kapat düğmesi yerine mod ve parametrelerle sunulur.

## Görsel hiyerarşi

1. Aktif deney ve gerçek ölçüm
2. Model tahminleri
3. Tahmin-gözlem karşılaştırması
4. Varsayımlar ve uyarılar
5. Yardımcı 2B/3B görselleştirme

## Erişilebilirlik

- Renk tek durum göstergesi olmayacaktır.
- Klavye ile senaryo ve model kartları arasında gezinilebilmelidir.
- Sayısal değerler yüksek kontrastlı ve kopyalanabilir olmalıdır.
- Grafiklerin tablo veya metin karşılığı bulunmalıdır.
