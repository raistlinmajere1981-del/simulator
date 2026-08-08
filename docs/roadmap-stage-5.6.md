# Aşama 5.6 — Metinden Deney Hazırlama ve Kontrollü Form Doldurma

Durum: tamamlandı · `1.7.0`

## Amaç

Kullanıcının elindeki gözlem notunu veya yapmak istediği deneyi serbest metinle tarif edip, mevcut uygulama alanlarına karşılık gelen değerleri tek tek aramak zorunda kalmadan güvenli bir deney taslağı oluşturabilmesi.

Örnek kullanıcı metni:

> Gözlemci deniz seviyesinden 12 m yüksekte, kamera yerden 1,7 m. Hedef 34,2 km uzakta ve 42 m yüksekliğinde. Standart kırılma k=0,13 kullan. Mesafe belirsizliği yaklaşık ±20 m.

Bu metin doğrudan UI state'ine yazılmaz. Önce tipli ve doğrulanmış bir taslağa çevrilir.

## Taslak ara katmanı

Uygulanan akış:

`Serbest metin -> deterministik parsing -> ExperimentSetupDraft -> doğrulama -> fark önizlemesi -> kullanıcı onayı -> mevcut UI state`

`ExperimentSetupDraft` yalnız mevcut uygulamanın gerçekten desteklediği alanları içerir. `1.7.0` kapsamı:

- senaryo türü,
- gözlemci/hedef koordinatları,
- manuel veya koordinat tabanlı mesafe,
- göz ve hedef yüksekliği,
- gözlemci/hedef zemin kotu,
- düşey datum ve ofset,
- gözlenen görünürlük ve gözlem belirsizliği,
- atmosfer kapalı / Standart `k` modu ve kırılma katsayısı,
- açıkça verilen model girdi belirsizlikleri.

Katmanlı atmosfer, fotoğraf/FOV ve su seviyesi gibi ek sözleşme/provenans gerektiren ifadeler tespit edilebilir fakat eksik bağlamla otomatik uygulanmaz.

## Güvenlik ve bilimsel sınırlar

- Birim belirtilmemişse sessizce metre/kilometre/derece varsayılmaz; alan `Kontrol gerekli` olarak kalır.
- Aynı metinde çelişen iki değer varsa biri rastgele seçilmez.
- `Hedef 30 m yüksekliğinde` ifadesindeki `30 m` mesafe sayılmaz; hedef ifadesinin mesafe olması için `uzakta` / `mesafede` bağlamı gerekir.
- Metinde bulunmayan bir değer için fiziksel varsayım uydurulmaz.
- Desteklenmeyen kavramlar ayrı listelenir; yakın görünen başka bir alana zorla eşlenmez.
- Mevcut deney değerleri kullanıcı onayı olmadan üzerine yazılmaz.
- Çıkarılan her değerin kaynak metindeki cümle/parça ilişkisi korunur.
- Metinden uygulanan model belirsizliği fotoğraf kalibrasyonu bulunmasa da deney state'inde saklanabilir; fotoğraf-model açı yayılımı ise ancak fotoğraf gözlemi olduğunda hesaplanır.
- AI/LLM kullanılırsa model çıktısı güvenilir veri değildir; yalnız şemaya aday veri üretir ve uygulamanın kendi doğrulayıcılarından geçmek zorundadır.

## Önizleme

Uygulamadan önce kullanıcıya üç grup gösterilir:

- `Bulundu`: güvenle eşlenen değerler,
- `Kontrol gerekli`: eksik birim, birden çok olası alan veya çelişki bulunan değerler,
- `Kullanılamadı`: mevcut ürün sözleşmesinde tek başına güvenli uygulanamayan ifadeler.

Her bulunan alan için `mevcut değer → önerilen değer` farkı gösterilir ve alan bazında `uygula / atla` seçilebilir.

## Ayrıştırma mimarisi

İlk sürüm çevrimdışı ve deterministik sayı, birim, koordinat ve anahtar sözcük kurallarıyla çalışır. Daha serbest doğal dil için AI/LLM desteği eklenirse sağlayıcıya özel kod deney state'ine bağlanmamalı; adaptör yalnız tipli taslak adayını üretmelidir.

Böylece aynı UI akışı çevrimdışı kural tabanlı ayrıştırıcı, gelecekte yerel model veya harici API ile kullanılabilir.

## Aşama 6 ve sonrası

Taslak sözleşmesi senaryo-temellidir. Güneş/Ay/yıldız deneyleri eklendiğinde tarih-saat, gözlem konumu, gölge uzunluğu/yönü ve benzeri yeni alanlar aynı mekanizmaya eklenebilir; mevcut güvenlik ve önizleme akışı yeniden yazılmamalıdır.

## Kabul ölçütleri

- Parser sonucu doğrudan React state'ine yazılmaz.
- Geçersiz veya belirsiz değerler doğrulama katmanını geçemez.
- Kullanıcı onayı olmadan mevcut alanlar değişmez.
- Birim dönüşümleri ve bağlam ayrımları testlerle doğrulanır.
- Eski/kısmi deneyler için uygulanabilir alanlar seçilebilir.
- Metinden gelen değerlerin provenansı raporlanabilir biçimde korunur.

## 1.7.0 gerçekleşen kapsam

- Çevrimdışı, deterministik Türkçe ayrıştırıcı.
- `Bulundu / Kontrol gerekli / Kullanılamadı` sınıflandırması.
- Her alan için `mevcut → önerilen` önizlemesi ve bağımsız uygula/atla seçimi.
- Birimsiz, çelişkili veya bağlamı yetersiz ifadelerin otomatik uygulanmaması.
- Fotoğraf/FOV ve su seviyesi gibi ek provenans gerektiren ifadelerin başka alana zorla eşlenmemesi.
- Kullanıcı onayından sonra tek batch state güncellemesi; model hesapları ancak bundan sonra yeniden çalışır.
- Kaynak metin, parser sürümü, uygulama zamanı ve uygulanan alan parçalarının deney kaydı / `.ggl.json` / HTML raporunda provenans olarak korunması.
- Üst araç çubuğunda `Metinden Hazırla` girişi ve merkezi Yardım kataloğunda ilgili açıklama.

Bu sürüm harici AI/LLM kullanmaz. Gelecekte bir LLM adaptörü eklenirse yalnız aynı tipli taslak sözleşmesine aday veri üretmeli; doğrudan React state veya fiziksel modele yazmamalıdır.
