# Aşama 7.5 — Yıllık Güneş döngüsü, ekinokslar ve gündönümleri

Durum: geliştirme / manuel Electron kabulü bekleniyor · `1.24.0`

## Amaç

Aşama 7'nin “büyük ölçekli olaylar” başlığındaki **mevsimler** dilimini, mevcut astronomik Güneş referansını kopyalamadan ve yüksek hassasiyet iddiası üretmeden görünür sayısal bir yıllık karşılaştırmaya dönüştürmek.

## Uygulama

- `src/simulation/solar-season-events.ts`
  - seçilen yıl için görünür Güneş ekliptik boylamının `0°`, `90°`, `180°`, `270°` geçişlerini arar;
  - 6 saatlik kaba tarama ardından en fazla 500 ms zaman aralığına kadar kök inceltmesi uygular;
  - dört olayı Mart ekinoksu, Haziran gündönümü, Eylül ekinoksu ve Aralık gündönümü olarak döndürür;
  - olay anındaki görünür Güneş boylamı ve deklinasyonu kaydeder;
  - seçili gözlemci için aynı olayın yerel sivil günündeki geometrik `0°` ve standart `-0,833°` eşik üstü sürelerini, güneş öğlesi yüksekliğini ve doğuş/batış azimutlarını mevcut `solar-day-events` motoruyla hesaplar;
  - model metadata/prediction ve ayrıntılı hesap izi üretir.

- `SolarSeasonEventsPanel`
  - dört dönüm noktasını tek yıllık bant üzerinde gösterir;
  - gözlemcinin yarıküresine göre mevsim adını açıklar;
  - UTC olay zamanı ile gözlemcinin yerel tarihini birbirinden ayırır;
  - gün uzunluğu, Güneş deklinasyonu, güneş öğlesi yüksekliği ve doğuş/batış azimutlarını dört kartta karşılaştırır.

- panel, `Güneş ve Ay Gözlemleri` içindeki mevcut günlük Güneş olaylarının hemen altında yer alır. Bu aşamada yeni bir bağımsız senaryo açılmaz; önce yıllık referansın görünümü ve sayısal davranışı doğrulanır.

## Bilimsel sınır

Bu çıktı resmi almanak/efemeris değildir.

- Güneş konumu mevcut NOAA tabanlı düşük maliyetli referans çekirdeğinden gelir.
- Yüksek hassasiyetli JPL efemerisi ve ΔT/UT1 düzeltmesi uygulanmaz.
- Yerel gün sabit kaydedilmiş UTC ofsetiyle kurulur; IANA saat dilimi adı ve otomatik DST uygulanmaz.
- Standart gün uzunluğu `-0,833°` sabit merkez eşiğidir; gerçek atmosfer veya topoğrafik ufuk ölçümü değildir.
- Mevsim adları kuzey/güney yarıküre için ayrı etiketlenir; dönüm noktası zamanları küresel astronomik olaylardır.
- İlk doğrulama aralığı `1900–2100` olarak sınırlandırılmıştır.

## Otomatik doğrulama

`tests/solar-season-events.test.ts`:

1. 2024 dört çeyrek geçişinin beklenen UTC günlerinde bulunması,
2. kökte görünür Güneş boylamının hedef çeyreğe çok yakın olması,
3. Dallas benzeri kuzey enleminde Haziran gününün Aralık'tan belirgin uzun/yüksek olması,
4. aynı karşıtlığın güney yarıkürede tersine dönmesi,
5. prediction/trace sözleşmesi ve yıl sınırı doğrulaması.

## Manuel Electron kabulü

1. `Güneş ve Ay Gözlemleri` açılır.
2. Yıllık panel günlük Güneş olaylarının altında görünmelidir.
3. `2024`, `32.7767°, -96.7970°`, UTC+00:00 örneğinde dört kart sırasıyla 20 Mart, 20 Haziran, 22 Eylül ve 21 Aralık UTC günlerine yakın görünmelidir.
4. Haziran kartında gün uzunluğu ve güneş öğlesi yüksekliği Aralık kartından belirgin büyük olmalıdır.
5. Enlem yaklaşık `-32.8°` yapıldığında Haziran/Aralık karşıtlığı tersine dönmelidir.
6. Dar ekran veya uygulama penceresi küçültüldüğünde 4 kart önce 2 sütuna, sonra tek sütuna düşmeli; yatay taşma olmamalıdır.
