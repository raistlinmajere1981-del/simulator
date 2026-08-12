# Katkı rehberi

Geometrik Gözlem Laboratuvarı'na katkılar memnuniyetle karşılanır. Proje tartışmalı iddiaları aynı ölçülebilir deneyler üzerinde karşılaştırmayı amaçladığı için katkılarda özellikle yöntem, birim, belirsizlik ve provenans açıklığı beklenir.

## Başlamadan önce

Kod değiştirmeden önce şu dosyaları okuyun:

- `AGENTS.md` — proje için bağlayıcı teknik ve bilimsel sınırlar
- `docs/current-status.md` — güncel özellik ve bakım durumu
- `docs/architecture.md` — katmanlar ve veri akışı
- `docs/model-contract.md` — model sözleşmesi
- ilgili domain dokümanı ve testler

AI destekli geliştirme kullanıyorsanız `docs/ai-development.md` dosyasını da okuyun.

## Yerel kurulum

Gereksinim: Node.js 22 veya daha yeni bir sürüm.

```bash
git clone <repo-url>
cd simulator
npm install
npm run dev
```

Tam doğrulama:

```bash
npm run verify
```

Bu komut TypeScript typecheck, tüm Vitest testleri ve Electron-Vite üretim derlemesini çalıştırır.

## Katkı türleri

### Hata düzeltmesi

Mümkünse önce hatayı yeniden üreten bir regresyon testi ekleyin. UI semptomunu değil kök veri akışını düzeltin.

### Yeni fiziksel model veya hesap

Yeni hesap önce `src/simulation/` veya `src/models/` içinde saf/deterministik biçimde kurulmalıdır. Açık varsayımlar, birimler, desteklenmeyen kapsam ve yeniden üretilebilir hesap izi beklenir.

Modelin belirli bir durumda davranışı tanımlı değilse sahte tahmin yerine `unsupported` veya uygun belirsizlik durumu kullanılmalıdır.

### Veri kaynağı / importer

Kaynağın dosya adı, zaman bağlamı, birim/datum bilgisi ve mümkünse SHA-256 bütünlük bilgisi korunmalıdır. Hatalı veya ambiguous dosya sessizce kabul edilmemelidir.

### AI çalışma döngüsü

Harici AI hesap otoritesi değildir. AI önerileri hiçbir zaman doğrudan deney state'ine uygulanamaz. Mevcut kanonik blok → fail-closed parser → preview → kullanıcı onayı sınırı korunmalıdır.

## Pull request ilkeleri

- Bir PR mümkün olduğunca tek amaçlı olsun.
- Büyük refactor ile yeni davranışı aynı PR'da birleştirmeyin.
- Public veri/AI sözleşmesi değişiyorsa ilgili doküman ve regresyon testi aynı PR'da olsun.
- Geçici migration/refactor helper dosyalarını merge öncesinde kaldırın.
- UI/Electron değişikliğinde yaptığınız manuel smoke testi PR açıklamasına yazın.

PR açmadan önce:

```bash
npm run verify
```

çalıştırın.

## Bilimsel ve iletişim yaklaşımı

Proje belirli bir dünya/geometri görüşünü savunmak için tasarlanmamıştır. Katkılar formülleri ve veriyi sonuç beklentisine göre seçmemeli; aynı deney girdilerini modellere tutarlı biçimde uygulamalıdır.

Bir modelin tek deneyle uyumlu çıkması genel doğruluk iddiası değildir. Rapor ve UI metinlerinde bu ayrım korunmalıdır.

## Lisans

Repository public yayına hazırlanırken proje lisansı kökteki `LICENSE` dosyasında ilan edilecektir. Katkı yapmadan önce güncel lisans koşullarını kontrol edin.
