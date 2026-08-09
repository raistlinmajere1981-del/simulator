# Aşama 6.20 — Çoklu yıldız gökyüzü snapshot çekirdeği

Durum: tamamlandı · `1.16.1`

## Amaç

Tek-yıldız odaklı Aşama 6.6–6.19 zincirini bozmadan, çevrimdışı 19-yıldız referans kataloğunun tamamını aynı gözlem zamanı ve konumunda tek bir deterministik gökyüzü snapshot'ına çözmek.

Bu aşama henüz görsel gökyüzü haritası üretmez. UI bağlantısı sonraki dilimde yapılacaktır.

## Bilimsel sözleşme

Her yıldız için mevcut ve test edilmiş zincir yeniden kullanılır:

1. BSC5P tabanlı ortalama J2000 katalog yönü,
2. mevcut IAU 2006 precession dönüşümü,
3. mevcut geometrik yatay koordinat çözümü,
4. isteğe bağlı olarak mevcut geometrik yerel skyline maskesi.

Yeni bir astrometri, precession veya skyline interpolasyon formülü eklenmez.

## Çıktılar

Her katalog yıldızı için:

- katalog kimliği / HR numarası / ad / Bayer gösterimi,
- görsel kadir kaydı,
- gözlem tarihine dönüştürülmüş ortalama sağ açıklık ve deklinasyon,
- geometrik yükseklik,
- geometrik azimut,
- geometrik 0° ufuk üstü/altı bilgisi,
- yerel skyline verilmişse:
  - o azimuttaki geometrik yerel ufuk yüksekliği,
  - geometrik açıklık,
  - above / on-horizon / below sınıfı,
  - zenit/nadir azimut tekilliğinde açık `undefined-azimuth` durumu.

Snapshot düzeyinde ayrıca geometrik ufuk üstü/altı yıldız sayıları ve varsa yerel skyline sınıf toplamları verilir.

## Provenans

Snapshot:

- katalog kimliğini,
- katalog sürümünü,
- NASA HEASARC BSC5P kaynak etiketini,
- yerel skyline uygulanmışsa kaynak etiketini ve maksimum azimut boşluğunu,
- kompakt hesap izini

açıkça taşır.

## Açık sınırlar

Bu çıktı bir `optik görünür yıldız listesi` değildir.

Uygulanmayan etkiler:

- proper motion,
- yıllık paralaks,
- radyal hız,
- nutation,
- aberration,
- ışık sapması,
- atmosferik kırılma / apparent altitude,
- atmosferik sönümleme,
- gökyüzü parlaklığı,
- bulut / seeing,
- çıplak-göz algı eşiği.

Görsel kadir yalnız katalog provenansı olarak taşınır ve otomatik görünürlük eşiğine dönüştürülmez.

## Regresyon kapıları

- çevrimdışı katalogdaki tüm 19 yıldız aynı sırayla çözülür,
- snapshot içindeki Vega sonucu mevcut tek-yıldız precession + yatay konum zinciriyle sayısal olarak eşleşir,
- düz 0° skyline geometrik 0° sınıfını yeniden üretir,
- 90° skyline hiçbir yıldızı `above` sınıfına çıkarmaz,
- katalog ve skyline provenansı kompakt hesap izinde korunur.

## Sonraki adım — Aşama 6.21

- aynı snapshot'ı Yıldız Gözlemleri panelinde display-only çoklu yıldız görünümüne bağlama,
- zenit merkezli / ufuk çevreli polar gökyüzü grafiği,
- K/D/G/B yönleri,
- seçili yıldızı belirginleştirme,
- geometrik 0° üstündeki katalog yıldızlarını gösterme,
- yerel skyline etkinse geometrik yerel-ufuk durumlarını ayrı bilgi olarak koruma,
- görselleştirmenin hesap motoruna geri besleme yapmamasını sürdürme.
