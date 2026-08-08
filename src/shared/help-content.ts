export type HelpPanelId =
  | 'scenario-summary'
  | 'photo-calibration'
  | 'atmosphere'
  | 'terrain-datum'
  | 'water-surface'
  | 'model-visualization'
  | 'model-uncertainty'
  | 'photo-comparison'
  | 'results'
  | 'calculation-scope'
  | 'data-manager';

export type HelpCategory =
  | 'Deney'
  | 'Fotoğraf'
  | 'Atmosfer'
  | 'Arazi ve datum'
  | 'Su yüzeyi'
  | 'Modeller'
  | 'Belirsizlik'
  | 'Veri ve izlenebilirlik';

export interface HelpField {
  label: string;
  description: string;
  unit?: string;
  calculationEffect?: string;
}

export interface HelpPanelContent {
  id: HelpPanelId;
  category: HelpCategory;
  title: string;
  summary: string;
  fields: readonly HelpField[];
  assumptions: readonly string[];
  commonMistakes: readonly string[];
  example?: string;
  relatedTerms: readonly string[];
}

export interface HelpTermContent {
  id: string;
  label: string;
  definition: string;
  caution?: string;
}

export const HELP_TERMS: readonly HelpTermContent[] = [
  {
    id: 'datum',
    label: 'Datum',
    definition: 'Yüksekliklerin hangi düşey referansa göre ölçüldüğünü tanımlar. Ortometrik deniz seviyesi, WGS84 elipsoidi ve yerel datum birbirinin yerine kullanılamaz.',
    caution: 'Gözlemci, hedef, arazi, su ve atmosfer profili aynı düşey referansta yorumlanmalıdır.'
  },
  {
    id: 'fov',
    label: 'FOV',
    definition: 'Field of View / görüş açısı. Kameranın yatay veya düşey eksende gördüğü toplam açıdır ve piksel koordinatını görüş açısına çevirmek için kullanılır.',
    caution: 'Tahmini FOV ile yapılan sonuç yalnız test amaçlı olabilir; gerçek ölçüm için kamera/lens bilgisi veya doğrulanmış FOV gerekir.'
  },
  {
    id: 'k',
    label: 'k kırılma katsayısı',
    definition: 'Standart atmosfer modunda Dünya eğriliğine göre ışık eğriliğini etkin yarıçap yaklaşımıyla temsil eden boyutsuz katsayıdır.',
    caution: 'k sabiti gerçek atmosferin katmanlı yapısının yerine geçen yaklaşık bir modeldir.'
  },
  {
    id: 'rss',
    label: 'RSS',
    definition: 'Root Sum Square. Bağımsız olduğu kabul edilen belirsizlik katkılarını kareler toplamının kareköküyle birleştirme yöntemidir.',
    caution: 'Bileşenler bağımsız değilse RSS belirsizliği gereğinden küçük gösterebilir.'
  },
  {
    id: 'provenance',
    label: 'Provenans',
    definition: 'Bir değerin nereden geldiğini, hangi zamanda ve hangi yöntem/sürümle üretildiğini izleyen kaynak bilgisidir.'
  },
  {
    id: 'azimuth',
    label: 'Azimut',
    definition: 'Kuzeyden saat yönünde ölçülen yatay yön açısıdır. Jeodezik başlangıç ve bitiş yönlerinde kullanılır.'
  },
  {
    id: 'geodesic',
    label: 'Jeodezik',
    definition: 'Bir referans yüzeyi üzerindeki iki konum arasında yüzeye bağlı en kısa rota hesabıdır. Koordinat modunda WGS84 ters jeodezik çözümü kullanılır.'
  },
  {
    id: 'orthometric',
    label: 'Ortometrik yükseklik',
    definition: 'Jeoit/ortalama deniz seviyesi referansına bağlı fiziksel yükseklik türüdür.'
  },
  {
    id: 'ellipsoidal',
    label: 'Elipsoidal yükseklik',
    definition: 'GNSS sistemlerinde yaygın olan WGS84 referans elipsoidinden ölçülen geometrik yüksekliktir.'
  },
  {
    id: 'ciddor',
    label: 'Ciddor',
    definition: 'Hava sıcaklığı, basıncı, nemi, CO₂ ve dalga boyundan optik kırılma indisini hesaplamak için kullanılan fiziksel formül ailesidir.'
  },
  {
    id: 'dem',
    label: 'DEM',
    definition: 'Digital Elevation Model / sayısal yükseklik modeli. Rota boyunca arazi kotlarını örneklemek için kullanılan grid tabanlı yükseklik verisidir.',
    caution: 'DEM çözünürlüğü, datum, NODATA bölgeleri ve rota örnekleme aralığı ölçüm kalitesini sınırlar.'
  },
  {
    id: 'uncertainty',
    label: 'Belirsizlik',
    definition: 'Bir ölçüm veya girdinin tek bir kesin sayı yerine kabul edilen ± aralığını ifade eder.',
    caution: 'Bu uygulamadaki kullanıcı ± aralıkları kendiliğinden 1σ veya belirli bir güven düzeyi anlamına gelmez.'
  }
] as const;

export const HELP_PANELS: readonly HelpPanelContent[] = [
  {
    id: 'scenario-summary',
    category: 'Deney',
    title: 'Aktif senaryo ve temel gözlem girdileri',
    summary: 'Deneyin gözlemci, hedef, mesafe/koordinat, görünürlük ve standart kırılma gibi ana girdilerini yönetir. Fiziksel modeller aynı deney girdilerini bağımsız olarak çözer.',
    fields: [
      { label: 'Göz yüksekliği', unit: 'm', description: 'Gözlemcinin zemin kotunun üzerindeki optik merkez yüksekliği.', calculationEffect: 'Ufuk ve hedef görüş geometrisini doğrudan etkiler.' },
      { label: 'Hedef yüksekliği', unit: 'm', description: 'Hedef nesnenin tabanından tepesine fiziksel yüksekliği.', calculationEffect: 'Görünür yüzdesi ve tepe açısını etkiler.' },
      { label: 'Yüzey mesafesi', unit: 'km', description: 'Manuel modda gözlemci ile hedef arasındaki yüzey boyunca mesafe.' },
      { label: 'Koordinat modu', description: 'WGS84 enlem/boylam çiftinden jeodezik mesafe ve azimutları hesaplar.' },
      { label: 'Gözlenen görünürlük', unit: '%', description: 'Sahada veya görüntüden bağımsız olarak bildirilen görünür hedef oranı; model girdisini üretmek için değil, sonuç değerlendirmesi için kullanılır.' }
    ],
    assumptions: ['Koordinat modu WGS84 kullanır.', 'Manuel ve koordinat mesafesi aynı anda fiziksel mesafe kaynağı değildir.'],
    commonMistakes: ['Kamera fotoğrafından tahmini görünürlük yüzdesini kesin ölçüm gibi girmek.', 'Göz yüksekliği ile gözlemci zemin kotunu birbirine karıştırmak.'],
    example: 'Gözlemci zeminden 2 m yüksekte, hedef 20 km uzakta ve 30 m yüksekse; göz yüksekliği 2 m, hedef yüksekliği 30 m olarak girilir.',
    relatedTerms: ['geodesic', 'azimuth', 'k', 'uncertainty']
  },
  {
    id: 'photo-calibration',
    category: 'Fotoğraf',
    title: 'Fotoğraf / kamera kalibrasyonu',
    summary: 'Fotoğraftaki referans çizgisi ile hedef tabanı/tepesini piksel koordinatlarından açısal gözleme dönüştürür. Fotoğraf ölçümü model hesabına geri beslenmez; bağımsız gözlem kanalıdır.',
    fields: [
      { label: 'U1 / U2', description: 'Fotoğraftaki referans çizgisinin iki noktası. Varsayılan olarak yalnız görsel referanstır.' },
      { label: 'TABAN / TEPE', description: 'Hedef nesnenin ölçülecek fiziksel alt ve üst noktaları.' },
      { label: 'Yatay / düşey FOV', unit: '°', description: 'Kameranın toplam görüş açısı. Piksel→açı dönüşümünün temel kalibrasyon parametresidir.' },
      { label: 'İşaret belirsizliği', unit: 'px', description: 'İşaret noktasının fotoğraftaki olası konum aralığı.' },
      { label: 'Lens distorsiyonu', description: 'Görüntü önceden düzeltilmediyse özellikle kenarlardaki piksel→açı dönüşümü sistematik hata taşıyabilir.' }
    ],
    assumptions: ['Pinhole kamera modeli kullanılır.', 'U1–U2 yalnız kullanıcı açıkça seçerse fiziksel yerel yatay kabul edilir.'],
    commonMistakes: ['TABAN ve TEPE noktalarını ters işaretlemek.', 'Test amaçlı FOV değerlerini gerçek kamera kalibrasyonu sanmak.', 'Deniz ufkunu otomatik olarak yerel yatay kabul etmek.'],
    relatedTerms: ['fov', 'uncertainty', 'provenance']
  },
  {
    id: 'atmosphere',
    category: 'Atmosfer',
    title: 'Atmosfer ve optik kırılma',
    summary: 'Atmosfer kapalı, standart k yaklaşımı veya ölçülmüş katmanlı meteorolojik profil arasında seçim yapar.',
    fields: [
      { label: 'Standart k', description: 'İdeal Küre için etkin yarıçap yaklaşımını kullanır.' },
      { label: 'Katmanlı profil', description: 'Yükseklik, sıcaklık, basınç ve nem örneklerinden Ciddor kırılma indisi ve RK4 ışın yolu üretir.' },
      { label: 'Vakum dalga boyu', unit: 'nm', description: 'Optik kırılma indisi hesabında kullanılan ışık dalga boyu.' },
      { label: 'Işın adımı', unit: 'm', description: 'RK4 ışın izinin sayısal adım uzunluğu; daha küçük adım daha pahalı ama daha ince çözünürlüktür.' }
    ],
    assumptions: ['Katman yükseklikleri deneyle aynı düşey datumda yorumlanır.', 'Profil kapsamı dışına otomatik meteorolojik ekstrapolasyon yapılmaz.'],
    commonMistakes: ['Standart k ile katmanlı profili aynı anda fiziksel olarak uygulanıyor sanmak.', 'Farklı datumdaki atmosfer yüksekliklerini doğrudan kullanmak.'],
    relatedTerms: ['k', 'ciddor', 'datum', 'uncertainty']
  },
  {
    id: 'terrain-datum',
    category: 'Arazi ve datum',
    title: 'Düşey referans, arazi ve DEM',
    summary: 'Gözlemci/hedef zemin kotlarını, ortak düşey datum seçimini ve rota boyunca arazi profilini yönetir.',
    fields: [
      { label: 'Düşey datum', description: 'Tüm kotların hangi referansa göre yorumlanacağını belirler.' },
      { label: 'Zemin kotları', unit: 'm', description: 'Gözlemci ve hedefin fiziksel taban yükseklikleri.' },
      { label: 'Manuel profil', description: 'Rota boyunca kullanıcı tanımlı ara mesafe/kot noktaları.' },
      { label: 'DEM', description: 'Koordinat rotası boyunca grid tabanlı arazi yüksekliklerinin örneklenmesi.' }
    ],
    assumptions: ['Profil noktaları aynı düşey datum sözleşmesine bağlıdır.', 'DEM çözünürlüğü ve kapsama sınırları sonuç izinde korunur.'],
    commonMistakes: ['Elipsoidal ve ortometrik kotları dönüşüm yapmadan karıştırmak.', 'DEM piksel/hücre çözünürlüğünü gerçek ölçüm doğruluğu sanmak.'],
    relatedTerms: ['datum', 'orthometric', 'ellipsoidal', 'dem', 'provenance']
  },
  {
    id: 'water-surface',
    category: 'Su yüzeyi',
    title: 'Su seviyesi, gelgit ve dalga',
    summary: 'Su yüzeyi ölçümünü provenans ve belirsizlikle kaydeder; kullanıcı seçerse yalnız gözlemci/hedef uç kotlarına kontrollü olarak uygular.',
    fields: [
      { label: 'Su seviyesi', unit: 'm', description: 'Seçili düşey datumdaki su yüzeyi kotu.' },
      { label: 'Su seviyesi belirsizliği', unit: 'm', description: 'Ölçüm/tahmin kaynağının ± düşey aralığı.' },
      { label: 'Dalga düşey belirsizliği', unit: 'm', description: 'Anlık dalga nedeniyle referans yüzeyin düşey oynama aralığı.' },
      { label: 'Anlamlı dalga yüksekliği Hs', unit: 'm', description: 'Kaynak provenansı olarak saklanır; otomatik geometrik düzeltme değildir.' },
      { label: 'Azami zaman farkı', unit: 'dk', description: 'Su gözlemi ile deney zamanı arasındaki kabul edilen maksimum fark.' }
    ],
    assumptions: ['Su seviyesi ve deney uç kotları aynı düşey datumda olmalıdır.'],
    commonMistakes: ['Hs değerini doğrudan hedef kotuna eklemek.', 'Gelgit tahmin zamanını gerçek ölçüm zamanı gibi değerlendirmek.'],
    relatedTerms: ['datum', 'uncertainty', 'rss', 'provenance']
  },
  {
    id: 'model-visualization',
    category: 'Modeller',
    title: 'Model görselleştirmeleri',
    summary: 'Küre, tanımlı düzlem ve azimutal referansı Three.js sahnelerinde gösterir. Görsel katmanlar fiziksel hesap motoruna geri besleme yapmaz.',
    fields: [
      { label: 'İdeal Küre', description: 'Fiziksel küre modelinin 3B görsel referansı.' },
      { label: 'Tanımlı Düzlem', description: 'Yerel düzlem geometrisi; küresel koordinat projeksiyonu uydurulmaz.' },
      { label: 'Azimutal Gösterim', description: 'Kartografik referanstır; tek başına fiziksel görüş modeli değildir.' },
      { label: 'Atmosfer / topografya katmanları', description: 'Hesaplanmış verilerin görsel temsilleridir; hesap sonucunu değiştirmez.' }
    ],
    assumptions: ['Atmosfer ve arazi yükseklikleri sahnede okunabilirlik için görsel olarak abartılabilir.'],
    commonMistakes: ['Görsel ölçeklendirmeyi fiziksel ölçek sanmak.', 'Azimutal haritayı kendi başına fiziksel düz-Dünya modeli saymak.'],
    relatedTerms: ['azimuth', 'geodesic', 'dem']
  },
  {
    id: 'model-uncertainty',
    category: 'Belirsizlik',
    title: 'Model girdi belirsizliği',
    summary: 'Nominal model girdilerini değiştirmeden, kullanıcı tarafından açıkça verilen ± aralıkların model açı tahminine hassasiyetini hesaplar.',
    fields: [
      { label: 'Etkin yüzey mesafesi ±', unit: 'm', description: 'Mesafenin kabul edilen hassasiyet sınırı.' },
      { label: 'Göz / zemin / hedef ±', unit: 'm', description: 'Geometrik yükseklik ve kot girdilerinin hassasiyet aralıkları.' },
      { label: 'k ±', description: 'Yalnız Standart k atmosfer modunda kırılma katsayısı hassasiyeti.' },
      { label: 'Birleştirme', description: 'Koruyucu doğrusal toplam veya açık bağımsızlık varsayımıyla RSS.' }
    ],
    assumptions: ['Girilen ± değerler deterministik hassasiyet sınırlarıdır; otomatik güven aralığı değildir.'],
    commonMistakes: ['Boş alanı ±0 sanmak.', 'Ölçülmemiş bir belirsizliğe sırf form dolsun diye sayı yazmak.', 'Bağımsız olmayan bileşenlerde RSS kullanmak.'],
    relatedTerms: ['uncertainty', 'rss', 'k']
  },
  {
    id: 'photo-comparison',
    category: 'Belirsizlik',
    title: 'Fotoğraf açısal gözlem karşılaştırması',
    summary: 'Fotoğraf kalibrasyonundan gelen bağımsız açı gözlemini, model kendi girdileriyle hesaplandıktan sonra model tahminiyle karşılaştırır.',
    fields: [
      { label: 'Fotoğraf ±', unit: '°', description: 'Piksel işaret ve tanımlı kamera parametresi hassasiyetinden gelen gözlem zarfı.' },
      { label: 'Model ±', unit: '°', description: 'Tanımlanmış model girdi aralıklarının açı tahminine hassasiyeti.' },
      { label: 'Birleşik ±', unit: '°', description: 'Seçilen toplama yöntemiyle karşılaştırmada kullanılan toplam hassasiyet zarfı.' },
      { label: 'Mutlak fark', unit: '°', description: 'Nominal model açısı ile nominal fotoğraf açısı arasındaki fark.' }
    ],
    assumptions: ['Fotoğraf modeli beslemez.', 'Fiziksel olarak tanımsız açı kanalına uyum puanı verilmez.'],
    commonMistakes: ['Uyumlu sonucunu modelin kanıtı veya olasılık yüzdesi gibi yorumlamak.', 'Görsel U1–U2 referansını yerel yatay sanmak.'],
    relatedTerms: ['fov', 'uncertainty', 'rss']
  },
  {
    id: 'results',
    category: 'Modeller',
    title: 'Model sonuç karşılaştırması',
    summary: 'Aynı deney girdilerinin her fiziksel modelde ürettiği görünürlük, açı, ufuk ve değerlendirme sonuçlarını yan yana gösterir.',
    fields: [
      { label: 'Beklenen görünürlük', unit: '%', description: 'Modelin hedefin görünür kısmı için tahmini.' },
      { label: 'Gözlem farkı', description: 'Model sonucu ile kullanıcı gözlemi arasındaki değerlendirme farkı.' },
      { label: 'İz', description: 'Formül, varsayım, ara değer ve model sürümünü gösteren hesap izi.' }
    ],
    assumptions: ['Unsupported sonuç model eksikliği değil, ilgili gösterim için fiziksel kural tanımlanmadığını ifade edebilir.'],
    commonMistakes: ['Farklı modellerin varsayımlarını görmeden yalnız puana bakmak.'],
    relatedTerms: ['provenance', 'uncertainty']
  },
  {
    id: 'calculation-scope',
    category: 'Veri ve izlenebilirlik',
    title: 'Hesaplama kapsamı ve sınırlar',
    summary: 'Bu sürümde hangi fiziksel etkilerin hesaba dahil olduğunu ve hangi özelliklerin yalnız provenans/görselleştirme olduğunu özetler.',
    fields: [],
    assumptions: ['Bu bölüm deney sonucunun yorumlama sınırlarını hatırlatır; yeni fiziksel hesap eklemez.'],
    commonMistakes: ['Listede bulunmayan bir etkinin otomatik olarak hesaba dahil edildiğini varsaymak.'],
    relatedTerms: ['provenance', 'datum', 'ciddor', 'dem']
  },
  {
    id: 'data-manager',
    category: 'Veri ve izlenebilirlik',
    title: 'Veri yöneticisi, kayıt ve dışa aktarma',
    summary: 'Yerel deney kayıtlarını açar, siler ve sürümlü .ggl.json / HTML rapor olarak dışa aktarır.',
    fields: [
      { label: '.ggl.json', description: 'Deney girdileri, provenans, model sürümleri ve sonuç snapshotlarını taşır; fotoğraf baytlarını gömmez.' },
      { label: 'HTML rapor', description: 'Çevrimdışı okunabilir/yazdırılabilir deney raporu.' },
      { label: 'Hesap izi', description: 'Sonucun hangi formül ve varsayımlarla üretildiğini denetlenebilir biçimde gösterir.' }
    ],
    assumptions: ['Fotoğraf dosyasının kendisi yalnız oturum önizlemesidir; kayıt provenansını taşır.'],
    commonMistakes: ['Deney JSON’unu ham fotoğraf arşivi sanmak.', 'Eski model snapshotını güncel model hesabı sanmak.'],
    relatedTerms: ['provenance']
  }
] as const;

export function getHelpPanel(id: HelpPanelId): HelpPanelContent {
  const content = HELP_PANELS.find((panel) => panel.id === id);
  if (!content) throw new Error(`Bilinmeyen yardım paneli: ${id}`);
  return content;
}

export function getHelpTerm(id: string): HelpTermContent | undefined {
  return HELP_TERMS.find((term) => term.id === id);
}

export function searchHelp(query: string): { panels: HelpPanelContent[]; terms: HelpTermContent[] } {
  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  if (!normalized) return { panels: [...HELP_PANELS], terms: [...HELP_TERMS] };
  const includes = (value: string): boolean => value.toLocaleLowerCase('tr-TR').includes(normalized);
  return {
    panels: HELP_PANELS.filter((panel) => includes([
      panel.title,
      panel.summary,
      panel.category,
      ...panel.fields.flatMap((field) => [field.label, field.description, field.unit ?? '', field.calculationEffect ?? '']),
      ...panel.assumptions,
      ...panel.commonMistakes,
      panel.example ?? ''
    ].join(' '))),
    terms: HELP_TERMS.filter((term) => includes(`${term.label} ${term.definition} ${term.caution ?? ''}`))
  };
}
