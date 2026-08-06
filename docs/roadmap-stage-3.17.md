# Aşama 3.17 — Jeoit yüksekliği dönüşüm çekirdeği

Durum: hesap motoru tamamlandı

- `N = h - H` işaret sözleşmesi
- Elipsoidal yükseklikten ortometrik yüksekliğe `H = h - N`
- Ortometrik yükseklikten elipsoidal yüksekliğe `h = H + N`
- Pozitif ve negatif jeoit ondülasyonu desteği
- Aynı datumda düzeltmesiz sonuç
- Bağımsız belirsizliklerin kök-toplam-kare birleşimi
- Hesap izi, varsayımlar ve açık uyarılar
- Geçersiz yükseklik, ondülasyon ve belirsizlik sınırlarının reddi
- Otomatik veya doğrulanmamış jeoit modeli kullanımının bilinçli olarak dışarıda bırakılması

Sonraki alt aşama bu motoru deneydeki gözlemci/hedef ve DEM uç kotlarına kontrollü
bir kullanıcı arayüzüyle bağlamak; kullanılan jeoit modeli adı, sürümü ve değer
kaynağını provenansta saklamaktır.
