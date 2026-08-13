# GGL AI takip soy ağacı v1

Aşama 8.7, dış AI ile yapılan kontrollü çalışma döngüsünün hangi deterministik GGL anlık görüntüsünden hangi kanonik test önerisine ve hangi kullanıcı-onaylı alan uygulamasına geçtiğini izler. Aşama 8.9 aynı v1 lineage kaydına geriye uyumlu, opsiyonel deterministik analiz snapshot kanıtı ekler.

## Güven sınırı

Dış AI hesap otoritesi değildir. GGL yalnız kendi deterministik hesaplarını ve kayıtlı gözlemleri otoritatif veri olarak kabul eder. AI yanıtının serbest metin kısmı kayda alınmaz. Uygulamaya geri dönebilen tek içerik, mevcut fail-closed ayrıştırıcının kabul ettiği tek `GGL-AI-TEST v1 ... END GGL-AI-TEST` bloğudur.

## Zincir

1. Aktif deneyden `GGL-AI-ANALYSIS v1` paketi üretilir.
2. Kullanıcının dış AI'ye gönderdiği bu tam paket UTF-8 olarak SHA-256 ile özetlenir.
3. AI yanıtından tam olarak bir kanonik `GGL-AI-TEST v1` bloğu çıkarılır.
4. Kanonik test bloğu UTF-8 olarak SHA-256 ile özetlenir.
5. Test mevcut `Metinden Hazırla` önizlemesine gider; AI hiçbir alanı doğrudan değiştirmez.
6. Yalnız kullanıcının seçip uyguladığı alanlar `TextExperimentSetupProvenance` kaydına girer.
7. Sonraki deney kaydı bu provenansı taşıdığı için kaynak analiz → test önerisi → uygulanan alanlar → sonuç deneyi zinciri korunur.

## `aiLineage` alanları

- `version`: `v1`
- `analysisPackageVersion`: kaynak `GGL-AI-ANALYSIS` paket sürümü
- `analysisGeneratedAtIso`: kaynak analiz paketinin üretim zamanı
- `sourceExperimentId`: analiz paketinin üretildiği deney/anlık görüntü kimliği
- `sourceExperimentUpdatedAtIso`: kaynak anlık görüntünün `updatedAtIso` değeri
- `analysisSha256`: dış AI'ye gönderilen tam analiz paketinin SHA-256 özeti
- `canonicalTestSha256`: kontrollü önizlemeye aktarılan kanonik test bloğunun SHA-256 özeti
- `analysisSnapshot` *(Aşama 8.9, opsiyonel)*: dış AI yanıtı değil, GGL'nin kendisinin ürettiği exact `GGL-AI-ANALYSIS` paket metni. Eski v1 kayıtlarında bulunmayabilir.

`sourceKind` yeni kayıtlar için `manual-text` veya `ai-follow-up` olur. Eski kayıtlarda alanın bulunmaması geriye dönük olarak manuel metin davranışıyla uyumludur.

## Saklanmayan veri

- Dış AI'nin serbest metin analizi veya açıklaması
- Birden fazla/eksik/ambiguous test bloğu
- Önizlemede seçilmeyen alanlar için uygulama kaydı
- AI tarafından üretilmiş hesap sonucu

## Rapor ve sonraki AI paketi

Çevrimdışı HTML raporu AI takip kaydının kaynak deney kimliğini ve iki SHA-256 özetini gösterir. Sonraki `GGL-AI-ANALYSIS` paketinde yalnız hash tabanlı lineage özeti bulunur; tarihsel analiz snapshot metni, önceki dış AI yanıtı veya kanonik test metni pakete tekrar gömülmez. Snapshot yalnız yerel/portable provenance kanıtıdır.

## Aşama 8.8 · yerel doğrulama

Veri Yöneticisi, kayıtlı bir `ai-follow-up` zincirini ağ veya dış AI çağrısı olmadan yeniden denetleyebilir.

- Kanonik test bütünlüğü her zaman `sourceText.trim()` üzerinden tekrar SHA-256 hesaplanarak `canonicalTestSha256` ile karşılaştırılır.
- Kaynak deney aynı `sourceExperimentId` ile hâlâ kayıt listesinde bulunuyorsa `GGL-AI-ANALYSIS` paketi kayıtlı `analysisGeneratedAtIso` ile yeniden üretilir ve `analysisSha256` doğrudan karşılaştırılır. Analiz paketi `updatedAtIso` değerini içermediği için zaman farkı tek başına doğrulamayı bozmaz.
- Yeniden üretilen analiz hash'i eşleşirse, mevcut kaydın `updatedAtIso` değeri farklı olsa bile analiz `TAM DOĞRULANDI` olabilir.
- Kaynak deney silinmişse veya aynı kimlikteki mevcut kaydın içeriği sonradan değiştiği için analiz hash'i artık üretilemiyorsa durum `KISMİ DOĞRULAMA` olur; tek başına veri bozulması sayılmaz.
- Aynı snapshot zamanı korunmasına rağmen yeniden üretilen analiz hash'i eşleşmiyorsa veya kanonik test hash'i farklıysa durum `UYUŞMAZLIK` olur.

Bu denetim AI yorumunun bilimsel olarak doğru olup olmadığını kanıtlamaz. Yalnız kayıtlı provenance zincirinin ve yeniden üretilebilen deterministik GGL paketinin kriptografik olarak tutarlı olup olmadığını kontrol eder.


## Aşama 8.9 · immutable deterministik analiz snapshot kanıtı

Yeni `ai-follow-up` kayıtlarında, GGL'nin dış AI'ye kopyalanmak üzere kendisinin ürettiği exact `GGL-AI-ANALYSIS` paketi `analysisSnapshot` içinde saklanır. Aynı exact metnin SHA-256 özeti zaten `analysisSha256` alanındadır. Böylece kaynak deney daha sonra değişse veya silinse bile tarihsel analiz paketi bağımsız olarak doğrulanabilir.

- Snapshot dış AI'nin cevabı değildir ve AI tarafından üretilmiş prose saklanmaz.
- Snapshot paket header'ı, paket sürümü, `generated_at_utc` zamanı ve kapanış satırı fail-closed persistence parserında doğrulanır.
- Snapshot boyutu savunmacı olarak sınırlandırılır.
- Snapshot varsa doğrulayıcı önce onu kullanır; hash veya yapısal bağ uyuşmazsa sonuç `UYUŞMAZLIK` olur.
- Snapshot bulunmayan eski v1 lineage kayıtları Aşama 8.8 kaynak-deneyi-yeniden-üretme davranışını aynen sürdürür ve kaynak kaybolmuş/değişmişse `KISMİ DOĞRULAMA` gösterebilir.
- Sonraki AI paketlerine snapshot metni taşınmaz; yalnız mevcut hash/provenans özeti aktarılır.

Bu genişletme lineage `v1` için geriye uyumludur: yeni alan opsiyoneldir ve eski portable/local kayıtlar okunmaya devam eder.
