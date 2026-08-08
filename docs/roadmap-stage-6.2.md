# Aşama 6.2 — Ay Konumu ve Evre Geometrisi

Sürüm: `1.9.0`

## Kapsam

- 6.1 ile aynı açık UTC gözlem anı ve WGS84 gözlem konumu
- düşük hassasiyetli analitik Ay yörüngesi ve başlıca periyodik düzeltmeler
- Ay uzaklığı ve yatay paralaks
- topocentrik geometrik yükseklik ve kuzeyden saat yönünde azimut
- Güneş-Ay uzanımı, yaklaşık faz açısı, aydınlık oranı, faz sınıfı ve yaklaşık sinodik yaş
- ayrı ModelPrediction, model sürümü ve hesap izi
- deney kaydı, taşınabilir JSON ve HTML raporunda Ay snapshot'ı

## Bilimsel sınırlar

Bu sürüm JPL DE/Horizons efemerisinin yerine geçen yüksek hassasiyetli bir Ay efemerisi değildir. Gözlemci deniz seviyesinde kabul edilir. Atmosferik kırılma ve yerel topoğrafik ufuk uygulanmaz. Faz bilgisi tutulma sonucu üretmez; tutulma için Ay yörünge düğümü ve gölge geometrisi ayrı aşamada hesaplanacaktır.
