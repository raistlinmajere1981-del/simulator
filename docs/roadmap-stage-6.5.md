# Aşama 6.5 — Gün doğumu ve gün batımı olay geometrisi

Durum: tamamlandı · `1.12.0`

## Amaç

Mevcut geometrik Güneş konumu referansından seçilen WGS84 konumu ve açık UTC ofsetli yerel sivil gün için doğuş, batış, güneş öğlesi ve gün uzunluğu olaylarını izlenebilir biçimde üretmek.

## Kapsam

- yerel günü kaydedilmiş sabit UTC ofsetiyle `00:00–24:00` kurma
- Güneş merkezi için geometrik `0°` ufuk geçişi
- ayrı standart görünür referans olarak `-0,833°` merkez eşiği
- 5 dakikalık günlük taramadan sonra geçişleri alt-saniye düzeyinde kök aramayla inceltme
- doğuş ve batış azimutları
- her eşik için yerel gün içindeki eşik-üstü süre
- yerel gün içindeki maksimum geometrik Güneş yüksekliği / güneş öğlesi
- kutup günü, kutup gecesi ve teğet/sınır durumunda sahte olay saati üretmeme
- ayrı prediction snapshot ve hesap izi
- Güneş/Ay senaryosunda tam genişlik günlük olay zaman çizgisi
- `.ggl.json` ve HTML rapor korunumu

## Bilimsel sınır

Geometrik `0°` kanalı atmosferik kırılma, Güneş diski yarıçapı ve yerel topoğrafik ufuk içermez. `-0,833°` kanalı gerçek atmosfer ölçümü değildir; üst Güneş kenarı ve standart kırılma için yaygın sabit yaklaşık takvim eşiği olarak ayrıca gösterilir. İki kanal birbiriyle karıştırılmaz.

`-0,833°` değeri dinamik atmosfer profilinden, kullanıcının standart `k` katsayısından veya arazideki gerçek ufuk yüksekliğinden türetilmez. Bu girdiler daha sonra fiziksel görünürlük olayıyla bağlanacaksa ayrı bir sözleşme ve hesap izi gerektirir.

Yerel gün saat dilimi adı veya DST veritabanıyla değil, deneyde açıkça kaydedilen sabit UTC ofsetiyle kurulur. Bu nedenle geçmiş veya gelecekteki bir saha kaydında doğru ofsetin kullanıcı tarafından seçilmiş olması gerekir.

Bu olay geometrisi mevcut astronomik referanstır; İdeal Küre, Tanımlı Düzlem veya başka bir Dünya şekli modelinin Güneş/ışık davranışı olarak otomatik atanmaz.

## Sonraki adım

- yıldız görünürlüğü ve yıldız izleri
