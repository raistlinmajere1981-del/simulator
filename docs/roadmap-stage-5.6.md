# Aşama 5.6 — Metinden Deney Hazırlama ve Kontrollü Form Doldurma

Durum: planlandı · Aşama 6'dan önce

## Amaç

Kullanıcının elindeki gözlem notunu veya yapmak istediği deneyi serbest metinle tarif edip, mevcut uygulama alanlarına karşılık gelen değerleri tek tek aramak zorunda kalmadan güvenli bir deney taslağı oluşturabilmesi.

Örnek kullanıcı metni:

> Gözlemci deniz seviyesinden 12 m yüksekte, kamera yerden 1,7 m. Hedef 34,2 km uzakta ve 42 m yüksekliğinde. Standart kırılma k=0,13 kullan. Mesafe belirsizliği yaklaşık ±20 m.

Bu metin doğrudan UI state'ine yazılmaz. Önce tipli ve doğrulanmış bir taslağa çevrilir.

## Taslak ara katmanı

Önerilen akış:

`Serbest metin -> çıkarım/parsing -> ExperimentSetupDraft -> doğrulama -> fark önizlemesi -> kullanıcı onayı -> mevcut UI state`

`ExperimentSetupDraft` yalnız mevcut uygulamanın gerçekten desteklediği alanları içermeli. İlk kapsam örnekleri:

- senaryo türü,
- gözlemci/hedef koordinatları,
- manuel veya koordinat tabanlı mesafe,
- göz ve hedef yüksekliği,
- gözlemci/hedef zemin kotu,
- düşey datum ve ofset,
- atmosfer modu ve Standart `k`,
- desteklenebildiği ölçüde katmanlı atmosfer girdileri,
- fotoğraf/kamera kalibrasyon parametreleri,
- açıkça verilen kamera/model belirsizlikleri,
- su seviyesi bağlamında mevcut sözleşmeye uyan değerler.

## Güvenlik ve bilimsel sınırlar

- Birim belirtilmemişse sessizce metre/kilometre/derece varsayılmamalı; alan `belirsiz` olarak işaretlenmeli veya kullanıcıdan seçim istenmeli.
- Aynı metinde çelişen iki değer varsa biri rastgele seçilmemeli.
- Metinde bulunmayan bir değer için fiziksel varsayım uydurulmamalı.
- Desteklenmeyen kavramlar ayrı listelenmeli; yakın görünen başka bir alana zorla eşlenmemeli.
- Mevcut deney değerleri kullanıcı onayı olmadan üzerine yazılmamalı.
- Çıkarılan her değerin mümkün olduğunca kaynak metindeki cümle/parça ile ilişkisi korunmalı.
- AI/LLM kullanılırsa model çıktısı güvenilir veri değildir; yalnız şemaya aday veri üretir ve uygulamanın kendi doğrulayıcılarından geçmek zorundadır.

## Önizleme

Uygulamadan önce kullanıcıya en az şu üç grup gösterilmeli:

- `Bulundu`: güvenle eşlenen değerler,
- `Kontrol gerekli`: eksik birim, birden çok olası alan veya çelişki bulunan değerler,
- `Kullanılamadı`: mevcut ürün sözleşmesinde karşılığı olmayan ifadeler.

Her bulunan alan için `mevcut değer -> önerilen değer` farkı gösterilmeli ve alan bazında `uygula / atla` seçilebilmelidir.

## Ayrıştırma mimarisi

İlk sürüm mümkün olduğunca deterministik birim/sayı/koordinat ayrıştırıcıları ile çalışabilir. Daha serbest doğal dil için AI/LLM desteği eklenirse sağlayıcıya özel kod deney state'ine bağlanmamalı; bir adaptör yalnız tipli taslak adayını üretmelidir.

Böylece aynı UI akışı çevrimdışı kural tabanlı ayrıştırıcı, yerel model veya harici API ile kullanılabilir.

## Aşama 6 ve sonrası

Taslak sözleşmesi senaryo-temelli olmalıdır. Güneş/Ay/yıldız deneyleri eklendiğinde tarih-saat, gözlem konumu, gölge uzunluğu/yönü ve benzeri yeni alanlar aynı mekanizmaya eklenebilir; mevcut parser akışı yeniden yazılmamalıdır.

## Kabul ölçütleri

- Parser sonucu doğrudan React state'ine yazılmamalı.
- Geçersiz veya belirsiz değerler doğrulama katmanını geçememeli.
- Kullanıcı onayı olmadan mevcut alanlar değişmemeli.
- Birim dönüşümleri testlerle doğrulanmalı.
- Eski/kısmi deneyler için uygulanabilir alanlar seçilebilmeli.
- Metinden gelen değerlerin provenansı raporlanabilir biçimde korunabilmeli.
