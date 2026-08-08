# Aşama 6.1 — Güneş konumu, gözlem zamanı ve konumu

Sürüm: `1.8.0`

Bu aşamada Güneş ve Ay Gözlemleri senaryosunun ilk fiziksel referans hesabı etkinleştirildi.

## Kapsam

- ayrı `sun-moon-observation` senaryo kimliği ve `celestial` deney türü
- yerel tarih/saat + açık UTC ofsetinden yeniden üretilebilir UTC gözlem anı
- WGS84 gözlemci enlem/boylamı
- NOAA Solar Calculator denklem setiyle Güneşin geometrik yerel yüksekliği ve azimutu
- deklinasyon, saat açısı, zenit açısı ve zaman denklemi tanıları
- ayrı hesap izi ve model sürüm/provenans snapshot'ı
- gözlem zamanını kayıt oluşturma/güncelleme zamanından ayıran `observedAtIso` alanı
- tarih/saat ve gösterim ofsetinin yerel/portable deney kaydında korunması
- senaryoya özel HTML rapor özeti
- bağlamsal yardım panelleri
- astronomi senaryosunda yüzey modeli kartlarını çalıştırmadan yalnız Güneş astronomik referansını gösteren ayrı UI akışı
- yüzey modeli görsel katman anahtarlarını astronomi senaryosunda göstermeyip ilerideki gökyüzü görselleştirmesini açıkça sonraki dilime bırakma

## Bilimsel sınır

6.1 sonucu geometrik astronomik referanstır. Atmosferik kırılma, topoğrafik ufuk, Güneş diskinin görünür kenarı, gölge geometrisi ve Dünya şekli modellerinin ayrı Güneş tahminleri bu aşamada sonuca karıştırılmaz. Bu ayrım daha sonraki karşılaştırmalı astronomi aşamalarının aynı girdiler üzerinde izlenebilir kurulmasını sağlar.

Ay konumu 6.2 kapsamındadır.

## Doğrulama

Final ürün head'i strict TypeScript, 53 test dosyasında 291 test ve production build ile doğrulanmıştır. Birleşme sonrası `main` doğrulaması ayrıca yapılır.
