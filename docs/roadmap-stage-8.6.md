# Aşama 8.6 — Uygulama içi AI işbirliği kılavuzu

## Amaç

Aşama 8.1-8.5 ile oluşan GGL ↔ AI sözleşmesini repository içindeki Markdown belgelerine bağımlı olmadan uygulama içinden erişilebilir hale getirmek.

## Kapsam

- Üst çubukta `AI Kılavuzu` düğmesi.
- Sonuç analiz AI'si için kopyalanabilir kanonik talimat.
- Test hazırlama AI'si için kopyalanabilir kanonik talimat.
- İki rolü ve geri-besleme akışını birlikte taşıyan `GGL-AI-COLLABORATION-GUIDE v1` metni.
- Talimatlar shared TypeScript sabitlerinden gelir; UI içinde ayrı ve zamanla sapabilecek metin kopyaları tutulmaz.
- Panoya kopyalama Electron/file bağlamında fallback ile çalışır.

## Bilimsel ve güvenlik sınırları

- AI hesap motoru değildir.
- AI doğrudan deney state'ini değiştirmez.
- Eksik veri uydurmama, status/scope ayrımı ve kullanıcı onayı kuralları korunur.
- Test üretim talimatı yalnız `GGL-AI-TEST v1` sözleşmesini kullanır.
- Sonuç analiz talimatı `GGL-AI-ANALYSIS v1` ve `GGL-AI-COMPARISON v1` sözleşmelerini kullanır.

## Kabul testleri

1. `AI Kılavuzu` üst menüden açılır.
2. Varsayılan `Sonuç Analizi` sekmesinde analiz talimatı görünür.
3. `Test Hazırlama` sekmesi `GGL-AI-TEST v1` ve desteklenen anahtarları içerir.
4. `Tam Kılavuz` `GGL-AI-COLLABORATION-GUIDE v1` ile başlar.
5. Her görünümde `Panoya Kopyala` çalışır.
6. Kılavuz açılıp kapanırken aktif deney veya kayıt durumu değişmez.
7. TypeScript, test ve production build başarılıdır.

## Sonraki dilim

Aşama 8.7'de AI kullanımını yeni özellik eklemek yerine kalite tarafında tamamlamak: paket boyutu/uyarı özeti, kılavuz-test sözleşmesi sürüm tutarlılığı ve uçtan uca AI workflow regresyon testleri.
