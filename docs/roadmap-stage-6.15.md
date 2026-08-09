# Aşama 6.15 — Yıldız yerel ufuk arayüzü, kayıt ve rapor entegrasyonu

Durum: tamamlanma adayı · `1.14.0`

## Amaç

Aşama 6.12 yerel/doğal skyline maskesi ile Aşama 6.14 yerel-ufuk yıldız izi çekirdeğini gerçek **Yıldız Gözlemleri** iş akışına bağlamak; astronomik `0°` ufuk ile kullanıcının yerel skyline sınırını hem hesapta hem ekranda açıkça ayrı tutmak.

## Kullanıcı girişi

İlk kullanıcı sözleşmesi, tam 360° ufku sekiz ana yönde tanımlar:

- K · 0°
- KD · 45°
- D · 90°
- GD · 135°
- G · 180°
- GB · 225°
- B · 270°
- KB · 315°

Her değer geometrik ufuk yüksekliğidir ve `[-90°, +90°]` aralığında doğrulanır. Ara azimutlar Aşama 6.12'nin döngüsel doğrusal interpolasyonuyla çözülür. Yerel ufuk varsayılan olarak kapalıdır.

Bu sekiz yönlü editör, yüksek çözünürlüklü skyline dosya importunun yerine geçmez; anlaşılır ve kaydedilebilir ilk UI katmanıdır. Gelecekte daha yoğun maskeler aynı temel `StellarLocalHorizonMask` sözleşmesine bağlanabilir.

## Manuel UI geri bildirimi ve hesap yükü

İlk gerçek Electron kontrolünde, yerel ufku etkinleştirmenin ve yön değerlerini her tuş vuruşunda doğrudan ana ayarlara yazmanın pahalı yerel-ufuk geçiş taramasını tekrar tekrar çalıştırdığı görüldü. Bu durum yazma sırasında belirgin gecikmeye ve art arda değişikliklerde renderer kararsızlığına yol açabiliyordu.

6.15 tamamlanma adayında editör bu nedenle iki katmana ayrılır:

1. **Taslak düzenleme:** etkin/kapalı seçimi ve sekiz yön değeri yalnız panelin hafif yerel state'inde değiştirilir. Bu aşamada yıldız izi veya yerel-ufuk kök taraması yeniden çalıştırılmaz.
2. **Uygula ve hesapla:** kullanıcı bütün değerleri hazırladıktan sonra ayarlar tek paket halinde ana gözlem state'ine aktarılır ve pahalı hesap yalnız bir kez çalıştırılır.

Panel taslak ile hesaplanmış state farklıysa bunu açıkça gösterir; kullanıcı taslağı geri alabilir. Grafikte, rozetlerde ve kaydedilebilir prediction'da yalnız **uygulanmış** değerler kullanılır.

Aynı manuel kontrolde uygulama genelindeki zorunlu sayısal alanlarda kontrollü `<input type="number">` kullanımının mevcut değeri tamamen silip yeni sayı yazmayı zorlaştırdığı da doğrulandı. Bu alanlar ortak `DraftNumberInput` davranışına geçirilir:

- odaklandığında mevcut değer seçilebilir,
- geçici olarak boş, `-`, `+`, `.` veya `,` gibi yazım ara durumları kabul edilir,
- hem nokta hem virgül ondalık ayırıcı olarak yazılabilir,
- geçerli sayı Enter veya odak kaybında modele uygulanır,
- eksik/geçersiz zorunlu taslak odak kaybında son geçerli değere geri döner,
- min/max sınırı commit sırasında korunur,
- ok tuşları tanımlı `step` kadar değişiklik yapar.

Bu ortak davranış aktif ana senaryo girdileri, astronomi koordinatları/UTC ofseti, zorunlu gölge girdileri, atmosfer profili, jeoit dönüşümü ve manuel arazi editörü gibi zorunlu sayısal alanlara uygulanır. **Boş değerin gerçekten “ölçüm tanımlanmadı” anlamına geldiği opsiyonel alanların mevcut boşluk semantiği değiştirilmez.** Legacy `App.tsx` bu kullanıcı akışının parçası olmadığı için bu dilime dahil edilmez.

## Panel çıktıları

Yerel ufuk etkin olduğunda panel:

- anlık yıldız yüksekliğini ve azimutunu,
- aynı azimuttaki interpolasyonlu yerel ufuk yüksekliğini,
- `Δh = h_yıldız - h_skyline(A)` açıklığını,
- astronomik `0°` ufuk durumunu,
- yerel skyline durumunu,
- astronomik `0°` ufuk üstü süreyi,
- yerel ufuk üstü geometrik süreyi,
- iki ayrı geçiş listesini
  - `0°` astronomik doğuş/batış,
  - yerel skyline doğuş/batış

gösterir.

## Grafik ayrımı

Yıldız izi grafiğinde üç farklı geometrik öğe ayrı tutulur:

1. yıldız yüksekliği zaman serisi,
2. sabit `0°` astronomik ufuk çizgisi,
3. yıldızın anlık azimutuna karşılık gelen yerel skyline yüksekliği zaman serisi.

Böylece yükseltilmiş bir dağ/engel ufku, astronomik `0°` sınırının yerine geçirilmez.

## Kayıt ve taşınabilirlik

Yerel ufuk ayarları yeni bir top-level `.ggl.json` alanı açmadan mevcut prediction snapshot mekanizmasında saklanır:

- yerel ufuk etkin/kapalı durumu,
- sekiz yönün geometrik yükseklikleri,
- anlık yerel ufuk yüksekliği ve açıklığı,
- pencere içindeki yerel ufuk üstü geometrik süre.

Bunun sonucu olarak:

- kaydet → tekrar aç akışı ayarları geri yükler,
- `.ggl.json` export/import aynı metrikleri korur,
- HTML rapor yerel ufuk girdilerini ve sonuçlarını normal model metrikleriyle birlikte taşır,
- 6.15 öncesi yıldız kayıtlarında bu metrikler yoksa yerel ufuk güvenli biçimde **kapalı** ve yön değerleri `0°` olarak açılır.

## Bilimsel sınır

Yerel ufuk sonucu hâlâ **geometrik** bir sonuçtur. Aşama 6.13 standart atmosferik kırılma / apparent-altitude çekirdeği bu panelde yerel skyline ile otomatik bir görünürlük sonucu üretmek üzere birleştirilmez.

Bu aşamada uygulanmayanlar:

- gerçek meteorolojik atmosfer profiline bağlı astronomik refraction,
- extinction,
- sky brightness,
- bulut,
- seeing,
- insan gözü algı eşiği,
- yüksek çözünürlüklü skyline dosya importu,
- doğal ufuk nesnesinin kendi refraktif/apparent davranışı.

Dolayısıyla paneldeki `yerel ufkun üstünde` ifadesi yalnız geometrik yön açıklığıdır; çıplak-göz görünürlüğü iddiası değildir.

## Geriye dönük uyumluluk

- mevcut astronomik `0°` yıldız izi sonucu korunur,
- yeni yerel-ufuk sonucu bunun yanında ayrı gösterilir,
- eski yıldız kayıtları ve portable dosyalar yeni alanlar olmadan açılabilir,
- model snapshot sürümü `stellar-observation-reference@0.2.0` olur,
- uygulama sürümü `1.14.0` olur.

## Doğrulama hedefleri

- yerel ufuk kapalıyken eski Yıldız Gözlemleri davranışı,
- skyline checkbox/değer düzenlemesinin ana astronomi hesabını her tuşta tetiklememesi,
- sekiz yönün `Uygula ve hesapla` ile tek işlemde hesap state'ine geçmesi,
- zorunlu sayısal alanlarda boş taslak → yeni değer → Enter/blur akışı,
- nokta ve virgül ondalık yazımının kabul edilmesi,
- opsiyonel boş alan semantiğinin korunması,
- sekiz yönlü skyline etkinleştirildiğinde local-horizon trail üretimi,
- yön değerlerinin prediction snapshot'a yazılması ve eksiksiz tekrar açılması,
- eski prediction'ların yerel ufuk kapalı olarak güvenli açılması,
- portable `.ggl.json` round-trip,
- HTML raporda yerel ufuk metrikleri, provenans ve bilimsel sınırlar,
- strict TypeScript,
- tüm regresyonlar,
- production Electron/Vite build,
- gerçek Electron UI görsel ve tepkisellik kontrolü.

## Sonraki dilimler

- yüksek çözünürlüklü skyline CSV/JSON importu ve kaynak bütünlüğü,
- apparent yıldız yüksekliği ile doğal skyline'ın fiziksel olarak güvenli karşılaştırma sözleşmesi,
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış proper-motion altkümesini gözlem zincirine bağlama,
- çoklu yıldız / gökyüzü görselleştirmesi.
