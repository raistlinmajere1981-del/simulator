# Güvenlik politikası

## Desteklenen sürümler

Public release oluşturulduktan sonra en güncel release ve `main` dalı güvenlik düzeltmeleri için öncelikli olacaktır. Eski geliştirme snapshot'ları için geriye dönük güvenlik desteği garanti edilmez.

## Güvenlik açığı bildirme

Bir güvenlik açığı bulursanız hassas ayrıntıları public issue içinde paylaşmayın. Repository'de GitHub **Private vulnerability reporting / Security Advisory** etkinse bunu kullanın. Bu özellik etkin değilse önce düşük ayrıntılı bir issue açıp maintainer'dan özel iletişim kanalı isteyin; exploit, kişisel veri veya hassas dosya içeriğini public issue'ya eklemeyin.

Bildirimde mümkünse şunları verin:

- etkilenen sürüm/commit,
- işletim sistemi,
- yeniden üretme adımlarının güvenli özeti,
- beklenen ve görülen davranış,
- etkinin kapsamı,
- önerilen düzeltme varsa kısa açıklama.

## Tehdit modeli

GGL masaüstünde çalışan yerel bir Electron uygulamasıdır. Temel güven sınırları:

- renderer Node/Electron API'lerine doğrudan erişmez; masaüstü I/O preload IPC yüzeyinden geçer,
- dış dosyalar ve portable JSON güvenilmeyen girdi kabul edilir ve doğrulanır,
- kaynak dosyalarında mümkün olan yerlerde boyut/SHA-256/provenans kontrolleri kullanılır,
- HTML raporu kayıtlı veriden üretilir ve dış kaynak yürütmeye ihtiyaç duymaz,
- uygulama içi AI işbirliği otomatik ağ/API çağrısı yapmaz,
- dış AI cevabı fiziksel hesap otoritesi değildir ve doğrudan state'e uygulanmaz.

## Hassas veri

Gözlem fotoğrafları, koordinatlar ve deney dosyaları kullanıcı verisi olabilir. Bug/issue oluştururken gerçek özel fotoğraf, kesin ev/iş koordinatı, kişisel metadata veya özel deney JSON'u yüklemeyin. Sorunu mümkünse sentetik/minimum fixture ile yeniden üretin.

## Kapsam dışı

Aşağıdakiler tek başına güvenlik açığı sayılmaz:

- model/formül doğruluğu üzerine bilimsel anlaşmazlık,
- bilerek desteklenmeyen fiziksel model davranışı,
- kullanıcının açıkça içe aktardığı hatalı bilimsel veri nedeniyle ortaya çıkan sonuç farkı,
- dış AI'nin yorum hatası; AI hesap otoritesi değildir.

Bunlar uygun şekilde bug/feature/scientific-method issue olarak raporlanabilir.
