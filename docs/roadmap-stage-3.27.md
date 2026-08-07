# Aşama 3.27 — Ayrı ufuk ve uzun mesafe görüş senaryoları

Durum: tamamlandı · `1.2.0`

## Amaç

Hedef görünürlüğü motorunu tek bir ekran adı altında tutmak yerine, kullanıcı niyetini ve gerekli girdileri açıkça ayıran senaryo akışları oluşturmak.

## Senaryolar

### Hedef Görünürlüğü

Mevcut hedef görünürlüğü deneyi korunur. Hedef yüksekliği, gözlenen görünürlük, mesafe/koordinat, arazi, su yüzeyi ve standart kırılma girdileri kullanılabilir.

### Ufuk Analizi

Gerçek `horizon` deney tipidir ve hedef gerektirmez.

- İdeal kürede gözlemci toplam kotundan geometrik ufuk yüzey mesafesi hesaplanır.
- Standart kırılma açıksa etkin yarıçap yaklaşımı ufuk hesabına uygulanır.
- Tanımlı sonsuz düzlemde yüzey eğriliğinden kaynaklanan sonlu geometrik ufuk olmadığı açıkça `∞` olarak gösterilir.
- Azimutal projeksiyon fiziksel yüzey ve ışık modeli olmadığı için `unsupported` kalır.
- Hedef, rota, arazi profili ve su yüzeyi panelleri bu senaryoda kullanılmaz.
- WebGL sahneleri hedef ve rota çizmeden gözlemci/temel geometri referansını gösterir.

Bu sonuç yerel dağ/engel silueti, fotoğrafta görülen ufuk veya gelişmiş atmosferik ışın izleme sonucu değildir; yalnız seçilen modelin geometrik ufuk tanımıdır.

### Uzun Mesafe Görüş

Ayrı bir senaryo kimliği ve ekran akışı kullanır; fiziksel hesap çekirdeği mevcut hedef görünürlüğü sözleşmesini yeniden kullanır. Böylece aynı formüller kopyalanmadan rota, arazi ve uzak hedef bağlamı ayrı bir deney türü olarak yönetilebilir.

## Kayıt ve geriye uyumluluk

- `SavedExperiment` isteğe bağlı `scenarioId` alanı taşır.
- Yeni kayıtlar aktif senaryo kimliğini korur.
- Yerel kayıt ve `.ggl.json` taşınabilir akışı senaryo kimliğini yeniden açmada kullanır.
- Eski kayıtlarda olmayan `scenarioId` alanı parse sırasında uydurulmaz; uygulama açarken eksik değer güvenli biçimde `target-visibility` olarak yorumlanır.
- Mevcut taşınabilir şema sürümü bozulmadı; alan geriye uyumlu ve isteğe bağlıdır.

## Model sürümleri

- İdeal Küre: `0.4.0`
- Tanımlı Düzlem: `0.4.0`
- Azimutal Gösterim: `0.2.1`

## Doğrulama

Senaryo sözleşmesi, hedefsiz ufuk hesabı, düzlemde sonsuz geometrik ufuk, azimutal `unsupported` davranışı ve senaryo kimliğinin taşınabilir kayıtta korunması birim testleriyle kapsanır.

## Sonraki adım

Bir sonraki ana ürün aşaması gelişmiş atmosferdir: sıcaklık, basınç ve nem girdileri, dikey atmosfer profili ve standart etkin-yarıçap yaklaşımından ayrı katmanlı ışın izleme.
