# Deney Sistemi

## Deney yaşam döngüsü

1. Kullanıcı deney türünü seçer.
2. Konum, yükseklik, tarih, saat ve ölçüm girdilerini girer.
3. Sistem eksik veya fiziksel olarak geçersiz değerleri doğrular.
4. Kullanıcı karşılaştırılacak modelleri ve atmosfer modunu seçer.
5. Her model bağımsız tahmin üretir.
6. Ölçüm belirsizliği tahmin belirsizliğiyle karşılaştırılır.
7. Sonuçlar ve hesap izi kaydedilir.

## Ortak deney girdileri

- Gözlemci koordinatı, rakımı ve göz yüksekliği
- Hedef koordinatı, taban yüksekliği ve toplam yüksekliği
- Ölçüm tarihi, saati ve zaman dilimi
- Yüzey mesafesi ve kaynağı
- Hava sıcaklığı, basınç ve nem
- Atmosfer profili veya standart kırılma seçimi
- Kamera sensörü, odak uzaklığı, kırpma ve eğim bilgisi
- Gerçek gözlem metriği ve belirsizliği

## Atmosfer modları

### Kapalı

Yalnızca model geometrisi ve doğrusal ışık yolu kullanılır.

### Standart

Kullanıcının görebildiği bir kırılma katsayısıyla etkin yarıçap veya eşdeğer yaklaşım kullanılır. Katsayı sonuç raporuna yazılır.

### Profil tabanlı

Sıcaklık, basınç ve nemin yüksekliğe göre değişimi üzerinden ışın yolu adım adım çözülür. Bu mod daha sonraki aşamadır.

## Sonuç durumları

- `compatible`: Tahmin ve gözlem belirsizlik aralıkları uyumludur.
- `incompatible`: Aralıklar belirlenen ölçüte göre uyuşmaz.
- `indeterminate`: Belirsizlik karar vermek için fazladır.
- `unsupported`: Model deney için gereken kuralları sağlamaz.

## Uyum skoru

Arayüzde tek başına açıklamasız bir güven puanı kullanılmaz. Bir skor gösterilecekse:

- formülü belgelenir,
- kullanılan ölçüm ve tahmin dağılımları görünürdür,
- örneklem sayısı belirtilir,
- skorun model doğruluğu değil yalnızca tanımlı gözleme uyum olduğu açıklanır.

## İlk deney türü: hedef görünürlüğü

İlk sürümde şu çıktılar hedeflenir:

- geometrik ufuk mesafesi,
- hedefin teorik görünür ve gizli kısmı,
- gözlemci-hedef görüş açısı,
- kırılma açık/kapalı farkı,
- girdi hassasiyet tablosu,
- gözlenen değerle fark ve belirsizlik durumu.
