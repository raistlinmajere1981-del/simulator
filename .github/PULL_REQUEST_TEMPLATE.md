## Amaç

<!-- Sorunu/değişikliği kısa ve ölçülebilir biçimde açıklayın. -->

## Değişiklik türü

- [ ] Hata düzeltmesi
- [ ] Yeni hesap/model davranışı
- [ ] UI/Electron davranışı
- [ ] Persistence / portable format
- [ ] AI çalışma sözleşmesi
- [ ] Refactor / bakım
- [ ] Dokümantasyon

## Bilimsel / veri sınırı

<!-- Birim, belirsizlik, provenans, model varsayımı veya destek kapsamı değişiyor mu? Değişmiyorsa da belirtin. -->

- [ ] Deterministik GGL hesap motoru sonuç otoritesi olarak kaldı.
- [ ] Tanımsız model davranışına sahte sayı/formül eklenmedi.
- [ ] Girdi / gözlem / prediction / provenans ayrımı korundu.

## Sözleşme ve geriye uyumluluk

- [ ] Portable/local kayıt geriye uyumluluğu değerlendirildi.
- [ ] AI protokolü etkileniyorsa fail-closed + kullanıcı onayı sınırı korundu.
- [ ] Public sözleşme değiştiyse ilgili doküman/test güncellendi.
- [ ] Şema/model/protokol sürümü gerekiyorsa bilinçli olarak güncellendi.

## Doğrulama

- [ ] `npm run verify` geçti.
- [ ] Yeni/değişen davranış için regresyon testi eklendi veya neden gerekmediği açıklandı.
- [ ] UI/Electron değiştiyse ilgili manuel smoke test yapıldı.
- [ ] Geçici helper/migration scriptleri merge öncesinde kaldırıldı.

### Manuel smoke / notlar

<!-- Uygulanan senaryoları ve sonucu yazın. -->
