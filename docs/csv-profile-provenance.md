# CSV Profil Kaynağı ve Sütun Eşleme

## Amaç

CSV veya TSV ile içe aktarılan arazi profilinin yalnız nokta dizisini değil, verinin hangi dosya ve sütunlardan geldiğini de deney kaydında korumak.

## Kaynak kaydı

Bir CSV profili uygulandığında deney şu bilgileri saklar:

- dosya adı,
- içe aktarma zamanı,
- ayırıcı türü,
- mesafe birimi,
- kaynak rota uzunluğu,
- toplam satır sayısı,
- gözlemci ve hedef uç kotları,
- uç kotlarının deney alanlarına uygulanıp uygulanmadığı,
- mesafe sütunu başlığı,
- kot sütunu başlığı,
- içe aktarmadan sonra manuel değişiklik yapılıp yapılmadığı.

Yerel dosya yolu ve ham dosya içeriği deney kaydında tutulmaz.

## Uç kotlarını uygulama

İnceleme kartında iki bağımsız seçenek bulunur:

- gözlemci zemin kotunu CSV ilk satırından uygula,
- hedef taban kotunu CSV son satırından uygula.

Seçenekler varsayılan olarak kapalıdır. Böylece dosyanın ara noktaları kullanılabilirken mevcut deney uç kotları korunabilir. Seçilen uçlar, profil noktalarıyla aynı atomik uygulama işleminde güncellenir.

## Sütun eşleme

Standart başlıklar otomatik tanınır. Başlıklar tanınmazsa veya birden fazla olası sütun varsa uygulama:

1. dosya adını ve algılanan ayırıcıyı gösterir,
2. başlıkları ve ilk beş veri satırını önizler,
3. mesafe sütunu seçtirir,
4. mesafe birimini metre, kilometre veya rota yüzdesi olarak seçtirir,
5. kot sütunu seçtirir,
6. seçilen eşlemeyle dosyanın tamamını yeniden doğrular.

Mesafe ve kot aynı sütuna atanamaz.

## Güvenlik

Ham CSV içeriği renderer sürecine verilmez. Ana süreç içerik için rastgele bir istek kimliği üretir ve veriyi en fazla on dakika bellekte tutar. Eşleme onaylandığında renderer yalnız istek kimliğini, sütun indekslerini, mesafe birimini ve aktif deney bağlamını gönderir.

Süresi dolan eşleme isteklerinde dosyanın yeniden seçilmesi gerekir.

## Düzenlenme durumu

CSV uygulandıktan sonra profil noktaları veya uç kotları manuel olarak değiştirilirse kaynak bilgisi silinmez. Kayıt `modifiedAfterImport` alanıyla işaretlenir ve arayüzde “İçe aktarımdan sonra düzenlendi” olarak gösterilir.

Bu işaret, deneydeki mevcut nokta dizisinin kaynak dosyayla birebir aynı olmayabileceğini açıklar.
