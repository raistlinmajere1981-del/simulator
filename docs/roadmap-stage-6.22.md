# Aşama 6.22 — Doğrulanmış proper-motion kaynağını yıldız zincirine uygulama

Durum: geliştirme checkpoint'i · `1.17.1`

## Amaç

Aşama 6.9–6.11'de hazırlanan proper-motion matematiği ve BSC5P sabit-genişlik doğrulama zincirini gerçek yıldız hesap akışına bağlamak; fakat doğrulanmamış katalog sayılarını repoya gömmemek.

## Hesap sırası

Doğrulanmış bir motion kaynağı verildiğinde her yıldız için sıra açıktır:

1. çevrimdışı parlak-yıldız referansındaki ortalama J2000 yönü,
2. BSC5P kaynağından doğrulanmış `μ_α*` ve `μ_δ` ile kaynak epoktan gözlem epoch'una proper-motion yayılımı,
3. proper-motion ile taşınmış yönün IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüşümü,
4. mevcut geometrik yatay koordinat, yıldız izi, skyline ve çoklu-yıldız snapshot hesapları.

`μ_α*`, BSC5P/CDS V/50 dokümantasyonundaki gibi `cos(δ)·dα/dt` yansıtılmış bileşenidir. Proper-motion çekirdeği kutuplarda `1/cos(δ)` bölmesi yapmaz; birim-küre teğet vektörü kullanır.

## Geriye dönük davranış

Motion kaynağı verilmezse mevcut `1.17.0` sonucu korunur: proper motion uygulanmaz ve uyarılarda bu sınırlama açıkça kalır. Bu checkpoint varsayılan davranışı sessizce değiştirmez.

## Bilimsel sınır

Bu aşama yalnız iki açısal proper-motion bileşenini uygular. Paralaks, radyal hız ve perspektif ivmelenmesi proper-motion yayılımına dahil değildir. Nutation, aberration ve apparent-place düzeltmeleri de ayrı katmanlardır.

## Kaynak politikası

Gerçek 19-yıldız hareket değerleri ancak BSC5P `V/50/catalog` satırları mevcut 6.10/6.11 parser + HR/konum/V-kadir doğrulamasından eksiksiz geçerse uygulanabilir. Kaynak veriye erişilemediğinde sayı tahmin edilmez veya başka katalogdan sessizce ikame edilmez.

## Sonraki checkpoint

- Electron dosya seçicisinden resmi BSC5P `catalog` kaynağını alma,
- 19 satırlık doğrulanmış motion subset üretme,
- dosya adı / SHA-256 / kaynak epok / katalog sürümü provenansını saklama,
- deney/portable/HTML rapor zincirinde proper-motion kaynağını koruma,
- Yıldız Gözlemleri panelinde kaynağı taslak → tek seferde uygula akışıyla etkinleştirme,
- polar gökyüzü sayaç metnini çizilen üst-yarımküre ile tüm katalog sınıflarını ayıracak şekilde netleştirme.
