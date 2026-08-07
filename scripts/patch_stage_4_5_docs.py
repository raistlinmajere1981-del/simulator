from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label}: target block not found')
    return text.replace(old, new, 1)

readme_path = Path('README.md')
readme = readme_path.read_text()
readme = replace_once(
    readme,
    "- atmosfer state'inin yerel ve taşınabilir deney kayıtlarında korunması.\n\nTanımlı Düzlem modeline, model sözleşmesinde bulunmayan bir atmosfer kırılma kuralı eklenmez. Atmosfer profili görsel katmanı da henüz hesap sonucunun kaynağı değildir; 3B optik yol görselleştirmesi ayrı aşamadır.",
    "- atmosfer state'inin yerel ve taşınabilir deney kayıtlarında korunması,\n- İdeal Küre 3B sahnesinde ölçülmüş profil yüksekliği kabukları, katmanlı optik ışın ve geometrik LOS karşılaştırması,\n- uzun RK4 yollarında yalnız çizim için uçları koruyan örnek azaltma.\n\nTanımlı Düzlem modeline, model sözleşmesinde bulunmayan bir atmosfer kırılma kuralı eklenmez. Atmosfer görsel katmanı yalnız İdeal Küre sahnesinde etkinleşir ve hesap motoruna geri besleme yapmaz. Profil yüksekliği dünya yarıçapına göre okunamayacak kadar küçük olduğundan yalnız 3B sahnede abartılı ölçeklenir; fizik hesabındaki metre değerleri değişmez. Görsel ışın yeniden üretilemezse sahte bir fallback ışını çizilmez.",
    'README atmosphere summary'
)
readme = replace_once(
    readme,
    '- Gece ışıkları ve atmosfer/optik ışın görsel katmanları',
    '- Gece ışıkları görsel katmanı',
    'README remaining work'
)
readme = replace_once(
    readme,
    '- [`docs/roadmap-stage-4.4.md`](docs/roadmap-stage-4.4.md)',
    '- [`docs/roadmap-stage-4.4.md`](docs/roadmap-stage-4.4.md)\n- [`docs/roadmap-stage-4.5.md`](docs/roadmap-stage-4.5.md)',
    'README stage 4.5 link'
)
readme = replace_once(
    readme,
    "Aktif geliştirme sürümü `1.3.1`dir. Üç görünürlük senaryosu, kayıt/raporlama, WGS84, arazi/DEM, jeoit ve su yüzeyi akışlarına ek olarak katmanlı meteorolojik atmosferin Ciddor/RK4 fizik yolu İdeal Küre görünürlük ve ufuk sonuçlarına bağlanmıştır. Sıradaki teknik aşama atmosfer katmanları ile geometrik/optik ışın yollarını 3B model sahnesinde yalnız görselleştirme amacıyla göstermektir.",
    "Aktif geliştirme sürümü `1.3.2`dir. Üç görünürlük senaryosu, kayıt/raporlama, WGS84, arazi/DEM, jeoit ve su yüzeyi akışlarına ek olarak katmanlı meteorolojik atmosferin Ciddor/RK4 fizik yolu İdeal Küre görünürlük ve ufuk sonuçlarına bağlanmış; atmosfer kabukları, optik ışın ve geometrik LOS 3B sahnede hesap motorundan bağımsız bir görsel katman olarak kullanılabilir hale gelmiştir. Sıradaki ana fiziksel ürün aşaması fotoğraf ve kamera/lens kalibrasyonudur.",
    'README status'
)
readme_path.write_text(readme)

roadmap_path = Path('docs/roadmap.md')
roadmap = roadmap_path.read_text()
roadmap = replace_once(
    roadmap,
    "## Aşama 4.5 — Atmosfer ve optik ışın görsel katmanı\n\n- Atmosfer Profili görsel anahtarını etkinleştirme\n- model sahnesinde profil katman yüksekliği işaretleri\n- İdeal Küre üzerinde geometrik görüş hattı ile katmanlı optik ışın yolunu ayrı gösterme\n- görselleştirmenin hesap motoruna geri besleme yapmaması\n",
    "## Aşama 4.5 — Atmosfer ve optik ışın görsel katmanı\n\nDurum: tamamlandı · `1.3.2`\n\n- Atmosfer Profili anahtarını yalnız Katmanlı profil modunda etkinleştirme\n- İdeal Küre sahnesinde ölçülmüş profil yüksekliklerini yarı saydam kabuklarla gösterme\n- 4.4 tahminindeki hedef-tepe/sınır başlangıç açısıyla aynı Ciddor + RK4 ışınını yalnız çizim için yeniden örnekleme\n- hedefli deneyde geometrik LOS ile katmanlı optik ışın yolunu ayrı gösterme\n- hedefli ışını mevcut WGS84 gözlemci-hedef rotasına görsel olarak ankrajlama\n- Ufuk Analizi için hedef koordinatı uydurmayan yerel büyük-daire kesiti\n- uzun ışın yollarını yalnız çizim amacıyla en fazla 420 noktaya düşürme\n- atmosfer yüksekliğini yalnız sahnede okunabilirlik için abartma ve bunu legend'de açıkça belirtme\n- Tanımlı Düzlem / azimutal referansa tanımsız fiziksel kırılma yolu uydurmama\n- görselleştirmenin fiziksel hesap motoruna geri besleme yapmaması\n\nAyrıntı: [`roadmap-stage-4.5.md`](roadmap-stage-4.5.md)\n",
    'roadmap stage 4.5'
)
roadmap_path.write_text(roadmap)

stage44_path = Path('docs/roadmap-stage-4.4.md')
stage44 = stage44_path.read_text()
stage44 = replace_once(
    stage44,
    "## Sonraki adım\n\nAşama 4.5'te Atmosfer Profili görsel katmanı etkinleştirilebilir: katman yükseklikleri, optik ışın yolu ve geometrik görüş hattı yalnız görselleştirme amacıyla model sahnesinde gösterilir. Görsel katman fiziksel hesabın kaynağı olmayacaktır.",
    "## Sonraki adım\n\nAşama 4.5 tamamlandı: Atmosfer Profili görsel katmanı katman yüksekliklerini, optik ışın yolunu ve geometrik görüş hattını İdeal Küre sahnesinde hesap motorundan bağımsız olarak gösterir. Sonraki ana fiziksel ürün aşaması Aşama 5 fotoğraf/kamera kalibrasyonudur.",
    'stage 4.4 next step'
)
stage44_path.write_text(stage44)

stage45_path = Path('docs/roadmap-stage-4.5.md')
stage45 = stage45_path.read_text()
stage45 = replace_once(stage45, 'Durum: tamamlanma adayı · `1.3.2`', 'Durum: tamamlandı · `1.3.2`', 'stage 4.5 status')
stage45_path.write_text(stage45)
