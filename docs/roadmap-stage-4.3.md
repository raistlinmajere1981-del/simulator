# Aşama 4.3 — Atmosfer profili arayüzü ve deney kaydı

Durum: tamamlandı · `1.3.0`

## Amaç

Aşama 4.1 ve 4.2'de oluşturulan meteorolojik/optik çekirdeği masaüstü deney akışına taşımak ve standart `k` yaklaşımı ile katmanlı profil modunu birbirine karıştırmadan kaydedilebilir hale getirmek.

## Atmosfer modları

Her deney üç moddan birini seçer:

- **Kapalı:** atmosferik kırılma uygulanmaz.
- **Standart k:** mevcut etkin-yarıçap yaklaşımı kullanılır; `k` değeri ana deney girdisidir.
- **Katmanlı profil:** yükseklik, sıcaklık, basınç ve bağıl nem örnekleri ile Ciddor optik ayarları ayrı deney state'i olarak kullanılır.

Profil modu hiçbir durumda sessizce standart `k` hesabına düşürülmez. Aşama 4.4 model bağlantısı tamamlanana kadar İdeal Küre bu modda fiziksel görünürlük/ufuk sonucunu `unsupported` olarak açıkça raporlar.

## Profil editörü

Masaüstü paneli:

- kaynak etiketi,
- vakum dalga boyu,
- CO₂ derişimi,
- ışın izleme adımı,
- yükseklik,
- sıcaklık,
- basınç,
- bağıl nem

girdilerini düzenler.

En az iki profil örneği korunur. Yeni örnek son katmanın üzerine eklenebilir; örnekler silinebilir ve profil doğrulama hataları doğrudan panelde gösterilir.

## Optik tanılar

Geçerli profil Ciddor çekirdeğine aktarılır. Kullanıcı:

- her örnek için optik refraktivite `N`,
- her katman için `dN/dh`,
- tanı amaçlı yerel `k`

değerlerini görür.

Bu değerler fiziksel sonucu taklit etmek için tek bir sabit `k` değerine dönüştürülmez.

## Kayıt ve geriye uyumluluk

`SavedExperiment` isteğe bağlı `atmosphere` alanı taşır. Alan:

- seçilen atmosfer modunu,
- meteorolojik profili,
- dalga boyu / CO₂ ayarlarını,
- ışın adımını

korur.

Yerel depolama ve `.ggl.json` taşınabilir dosya ayrıştırıcısı alanı doğrular ve derin kopya olarak yeniden oluşturur. Eski kayıtların `atmosphere` alanı yoksa mevcut `useStandardRefraction` bayrağı kullanılarak güvenli biçimde `standard` veya `off` modu oluşturulur; eski dosyanın içine parse sırasında yeni alan uydurulmaz.

## Bilimsel sınır

- Atmosfer profilindeki yükseklikler deneyde kullanılan zemin/hedef kotlarıyla aynı düşey referansta yorumlanır.
- Ölçülmeyen yüksekliklere otomatik ekstrapolasyon yapılmaz.
- Ciddor geçerlilik sınırı dışındaki bir meteorolojik profil veri olarak korunabilir; fakat optik tanı üretmez.
- Katmanlı profil seçimi bu aşamada standart `k` hesabını değiştirmez veya taklit etmez; model bağlantısı Aşama 4.4'tür.

## Sonraki adım

Aşama 4.4, katmanlı küresel ışın izini İdeal Küre'nin Ufuk Analizi ve hedef görünürlüğü sonuçlarına bağlayacak; arazi açıklığı ve hesap izi de aynı ışın yolu üzerinde değerlendirilecektir.
