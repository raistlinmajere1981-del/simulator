# Aşama 3.25 — Çevrimdışı coğrafi görsel katmanlar

Durum: tamamlandı · `1.1.1`

## Kapsam

- `world-atlas` içindeki Natural Earth 110m ülke verisi uygulama paketine çevrimdışı olarak dahil edilir.
- TopoJSON sınır geometrisi `topojson-client` ile çizgi geometrisine dönüştürülür.
- Kıta / ülke / kıyı çizgileri ideal küre üzerinde WGS84 enlem-boylam konumlarıyla gösterilir.
- Aynı coğrafi veri kuzey kutup merkezli azimutal kartografik referansta gösterilir.
- Tanımlı düzlem modeline, model sözleşmesinde bulunmayan küresel coğrafi koordinat yerleşimi uydurulmaz.
- Sol panelde `Kıta / Ülke Sınırları` ve `Izgara` görsel katmanları bağımsız olarak açılıp kapatılabilir.
- Katman değişiklikleri mevcut kamera açısını bozmadan anında yeniden çizilir.
- Her model görünümünde `Görünümü sıfırla` kontrolü başlangıç kamera durumuna dönmeyi sağlar.
- Coğrafi çizgi ayrıştırması saf yardımcı fonksiyonda doğrulanır ve birim testleriyle korunur.

## Mimari sınır

Bu katmanlar yalnız görselleştirmedir. Deney girdilerini, model tahminlerini, uyum değerlendirmesini veya hesap izini değiştirmez. Natural Earth sınırları ölçüm/veri analizi kaynağı olarak kullanılmaz.

Tanımlı düzlem modelinin küresel koordinatların yüzeye nasıl yerleştirileceğine ilişkin fiziksel bir sözleşmesi olmadığı için ülke ve kıyı çizgileri bu modelde gösterilmez. Yerel yardımcı ızgara ise yalnız sahne yönlendirmesi olarak kullanılabilir.

## Veri ve çözünürlük sınırı

110m Natural Earth verisi dünya ölçeğinde yönlendirme için yeterli düşük çözünürlüklü görsel referanstır. Yerel kıyı, idari sınır veya hassas mesafe ölçümü için kullanılmamalıdır.

## Sonraki aşama

Aşama 3.26, arazi profilini / DEM kaynağını 3B sahneyle ilişkilendirirken görsel yükseltme ölçeğini fiziksel hesap geometrisinden açıkça ayrı tutacaktır. Topografya, gece ışıkları ve atmosfer profili görsel katmanları bu altyapının üzerine eklenecektir.
