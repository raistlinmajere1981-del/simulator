# Aşama 4.2 — Görünür ışık kırılma indisi ve katmanlı ışın izi

Durum: tamamlandı · `1.2.2`

## Amaç

Aşama 4.1'de tanımlanan sıcaklık, basınç ve bağıl nem profilini fiziksel olarak izlenebilir bir optik kırılma katmanına dönüştürmek; standart sabit `k` yaklaşımından bağımsız, profil tabanlı ışın izleme çekirdeği oluşturmak.

## Ciddor faz kırılma indisi

Her atmosfer örneğinde görünür/yakın KIZÖ ışık için Ciddor (1996) faz kırılma indisi hesaplanır.

Girdiler:

- vakum dalga boyu
- sıcaklık
- toplam hava basıncı
- bağıl nem
- CO₂ derişimi

Varsayılan optik ayarlar:

- `550 nm`
- `450 ppm` CO₂

Uygulama, Ciddor/NIST tarafından verilen konservatif çalışma aralığının dışına otomatik ekstrapolasyon yapmaz:

- `300–1690 nm`
- `-40–100 °C`
- `800–1200 hPa`
- `%0–100` bağıl nem
- `0–2000 ppm` CO₂

Kaynaklar:

- P. E. Ciddor, “Refractive index of air: new equations for the visible and near infrared”, Applied Optics 35(9), 1566–1573 (1996), DOI `10.1364/AO.35.001566`.
- NIST Engineering Metrology Toolbox, “Index of Refraction of Air”, Ciddor calculation documentation.

## Katman optik tanıları

Ardışık meteorolojik örneklerden şu değerler türetilir:

- faz kırılma indisi `n`
- refraktivite `N = (n - 1) × 10⁶`
- `dn/dh`
- `dN/dh` (`N/km`)
- yerel ışın eğriliği yaklaşımı `κ ≈ -(1/n) dn/dh`
- tanı amaçlı yerel `k = Rκ`
- `k != 1` ise yerel etkin Dünya yarıçapı `R/(1-k)`

Bu `k` değeri yalnız katmanın kırılma gradyanını anlaşılır bir ölçeğe çevirmek için tanıdır. Profil tabanlı ışın izi tek bir sabit `k` değerine indirgenmez.

## Katmanlı küresel ışın izi

Yeni ışın izleyici iki boyutlu merkez-kökenli küresel kesitte çalışır. Işın denklemi izotropik ortam için

`d(n t̂)/ds = ∇n`

biçiminde sayısal olarak bütünleştirilir. Atmosfer yalnız yarıçapa/yüksekliğe bağlı katmanlı bir ortam olarak kabul edilir.

- başlangıç konumu gözlemci yüksekliğidir
- başlangıç yönü yerel yataya göre yükselim açısıyla verilir
- integrasyon RK4 ile yapılır
- her adımda yerel yarıçap, yükseklik, kırılma indisi, ışın yönü ve yüzey mesafesi kaydedilir
- profil ölçüm kapsamı dışına çıkılırsa izleme durur; otomatik meteorolojik ekstrapolasyon yapılmaz
- adım boyu en ince katmana göre büyükse çözünürlük uyarısı üretilir

## Bilimsel sınırlar

- Ciddor yerel kırılma indisini sağlar; tek başına Dünya geometrisi veya ışın yolu tanımlamaz.
- Bu aşamadaki atmosfer profili yatay yönde homojen ve yalnız yükseklikle değişen bir profildir.
- Türbülans, yatay sıcaklık cephesi, lokal miraj hücreleri, aerosol saçılması ve bulut/damlacık optiği modellenmez.
- Yüksek bağıl nemde yoğuşmuş su damlacıkları oluşursa yalnız gaz fazı kırılma indisi yeterli değildir.
- Işın izleme çekirdeği bu aşamada model sonuç ekranına bağlanmaz; Aşama 4.3 entegrasyonu standart `k` ve profil modlarını karşılaştırmalı olarak sunacaktır.

## Doğrulama

Testler:

- 633 nm'de bağımsız Ciddor/NIST referans uygulamalarıyla kırılma indisi karşılaştırması
- görünür ışık dispersiyonu
- geçerlilik aralığı dışı girdilerin reddi
- profil `dN/dh` ve yerel `k` tanıları
- sıfır gradyanlı ortamda teğet ışının inertiyal olarak düz kalması
- yükseklikle kırılma indisi azaldığında ışının aşağı doğru eğilmesi

## Sonraki adım

Aşama 4.3, atmosfer profilini deney state'ine ve İdeal Küre modeline bağlayacak; kullanıcı standart `k` yaklaşımı ile profil tabanlı optik hesabı seçebilecek ve iki yaklaşımın sonuç/hesap izleri ayrı tutulacaktır.
