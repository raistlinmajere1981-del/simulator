# Aşama 7.6 — Sivil saat, standart meridyen ve Güneş zamanı

Durum: geliştirme / manuel kabul bekliyor · `1.25.0`

## Amaç

Aşama 7'nin zaman dilimleri başlığını yalnız saat dönüştürücü olarak değil, seçilen sabit UTC ofsetinin gözlem boylamıyla geometrik ilişkisini görünür hale getiren astronomik bir referans olarak eklemek.

## Kapsam

- kaydedilmiş sabit UTC ofsetinden `15°/saat` kuralıyla standart meridyen türetme
- gözlem boylamı ile standart meridyen arasındaki açısal fark
- `4 dakika / derece` ile ortalama Güneş zamanı boylam düzeltmesi
- mevcut düşük hassasiyetli Güneş çekirdeğinden zaman denklemi (Equation of Time)
- sivil saat, ortalama Güneş zamanı ve görünür Güneş zamanını aynı anda gösterme
- gün sınırı aşılırsa önceki/sonraki gün provenansını koruma
- mevcut günlük Güneş çözümünden geometrik Güneş öğlesinin sivil saatini ve 12:00 farkını gösterme
- hesap izi ve model prediction çekirdeği

## Bilimsel sınır

Bu özellik bir IANA saat dilimi veritabanı veya yasal saat dilimi sınır modeli değildir. Kullanıcının kaydettiği sabit UTC ofseti kullanılır; DST otomatik uygulanmaz. Standart meridyen yalnız `UTC ofseti × 15°` geometrik referansıdır. Görünür Güneş zamanı mevcut NOAA tabanlı düşük hassasiyetli Güneş konumu çekirdeğinin zaman denklemini kullanır; resmi zaman servisi veya yüksek hassasiyetli efemeris değildir.

## Arayüz

Panel `Güneş ve Ay Gözlemleri` içinde günlük Güneş olayları ile yıllık mevsim paneli arasında yer alır.

Üç ana saat kartı:

1. Sivil saat — sabit UTC ofseti
2. Ortalama Güneş zamanı — yalnız boylam düzeltmesi
3. Görünür Güneş zamanı — boylam düzeltmesi + zaman denklemi

Ayrı tanı kartları:

- standart meridyen ve gözlem boylamı
- boylam farkı
- boylam düzeltmesi
- zaman denklemi
- toplam görünür Güneş zamanı farkı
- günlük geometrik Güneş öğlesinin sivil saate göre konumu

## Manuel Electron kabulü

1. İstanbul için yaklaşık `41.0082°, 28.9784°`, `UTC+03:00` seçildiğinde standart meridyen `45° D` görünmeli.
2. Aynı durumda boylam farkı yaklaşık `-16.02°`, boylam düzeltmesi yaklaşık `-64.09 dk` olmalı.
3. Görünür Güneş zamanı toplam farkı boylam düzeltmesi ile zaman denkleminin toplamına eşit olmalı.
4. UTC ofseti `UTC+02:00` yapıldığında standart meridyen `30° D` olmalı ve boylam düzeltmesi yaklaşık `-4.09 dk` düzeyine gelmeli; bu değişim astronomik konumdan değil sivil saat referansından kaynaklanmalı.
5. Dar pencerede saat kartları ve düzeltme kartları tek sütuna kırılmalı; yatay taşma olmamalı.

## Sonraki adım

Aşama 7'nin rota karşılaştırmaları diliminde iki veya daha fazla gözlem noktasında aynı UTC anını ve/veya aynı sivil saati karşılaştırmak için bu zaman referansı yeniden kullanılabilir.
