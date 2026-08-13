export type HelpPanelId =
  | 'scenario-summary'
  | 'celestial-time'
  | 'solar-position'
  | 'solar-day-events'
  | 'lunar-position'
  | 'shadow-observation'
  | 'dual-shadow-comparison'
  | 'text-experiment-setup'
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

export type HelpLocale = 'tr' | 'en';

export type HelpCategory =
  | 'Deney'
  | 'Astronomi'
  | 'Fotoğraf'
  | 'Atmosfer'
  | 'Arazi ve datum'
  | 'Su yüzeyi'
  | 'Modeller'
  | 'Belirsizlik'
  | 'Veri ve izlenebilirlik'
  | 'Experiment'
  | 'Astronomy'
  | 'Photography'
  | 'Atmosphere'
  | 'Terrain and datum'
  | 'Water surface'
  | 'Models'
  | 'Uncertainty'
  | 'Data and traceability';

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

import { HELP_PANELS_EN, HELP_TERMS_EN } from './help-content-en';

export const HELP_TERMS: readonly HelpTermContent[] = [
  {
    id: 'utc-offset',
    label: 'UTC ofseti',
    definition: 'Yerel saat ile UTC arasındaki farktır. Aynı yerel saat farklı UTC ofsetleriyle farklı fiziksel anları temsil eder.',
    caution: 'Astronomi hesabında saat dilimi/ofset açık olmalıdır; yalnız yerel saat metni yeniden üretilebilir bir an değildir.'
  },
  {
    id: 'solar-elevation',
    label: 'Güneş yüksekliği',
    definition: 'Güneş merkezinin yerel geometrik ufka göre açısal yüksekliğidir. 0° geometrik ufuk, pozitif değerler ufuk üstü, negatif değerler ufuk altıdır.',
    caution: 'Aşama 6.1 değeri atmosferik kırılma ve yerel topoğrafik ufuk düzeltmesi içermez.'
  },
  {
    id: 'declination',
    label: 'Deklinasyon',
    definition: 'Gök cisminin gök ekvatoruna göre kuzey/güney açısal konumudur.'
  },
  {
    id: 'hour-angle',
    label: 'Saat açısı',
    definition: 'Yerel meridyen ile gök cisminin saat dairesi arasındaki açıdır ve zaman/konumla değişir.'
  },
  {
    id: 'lunar-parallax',
    label: 'Ay paralaksı',
    definition: 'Ayın Dünya’ya yakınlığı nedeniyle gözlemcinin Dünya üzerindeki konumunun Ayın görünen yönünü geocentrik yöne göre değiştirmesidir.',
    caution: 'Ay için yaklaşık derece ölçeğine ulaşabildiğinden yerel yükseklik/azimut hesabında ihmal edilmemelidir.'
  },
  {
    id: 'lunar-phase',
    label: 'Ay fazı',
    definition: 'Ayın Güneş tarafından aydınlatılan yarısının Dünya’dan görülen oranı ve Güneş-Ay-Dünya geometrisiyle ilişkili çevrim durumudur.',
    caution: 'Yeni Ay veya Dolunay olmak tek başına tutulma anlamına gelmez; yörünge düğümü geometrisi ayrıca gerekir.'
  },
  {
    id: 'gnomon',
    label: 'Gnomon',
    definition: 'Gölge deneyinde yüksekliği bilinen ve yerel düşeye paralel yerleştirilen dik çubuk/referanstır.',
    caution: 'Gnomon düşey değilse veya ölçüm yüzeyi yatay değilse basit L = h / tan(α) geometrisi sistematik hata taşır.'
  },
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
    id: 'celestial-time',
    category: 'Astronomi',
    title: 'Astronomi gözlem zamanı',
    summary: 'Güneş/Ay/yıldız hesaplarının yeniden üretilebilir fiziksel anını yönetir. Yerel tarih-saat, açık UTC ofsetiyle UTC anına dönüştürülür.',
    fields: [
      { label: 'Yerel tarih / saat', description: 'Saha kaydındaki yerel takvim ve saat değeri.' },
      { label: 'UTC ofseti', description: 'Yerel saatin UTC’den dakika/saat farkı. Hesaplanan fiziksel anı doğrudan belirler.' },
      { label: 'UTC', description: 'Yerel saat + ofsetten türetilen ve deney kaydında kullanılan tekil fiziksel an.' }
    ],
    assumptions: ['UTC ofseti kullanıcı tarafından doğru seçilmiştir.', 'Bu aşamada saat dilimi adı/DST kuralı yerine açık ofset provenansı kullanılır.'],
    commonMistakes: ['Türkiye yerel saatini UTC sanmak.', 'Eski bir gözlem için bugünkü saat dilimi ofsetini otomatik doğru kabul etmek.'],
    example: '2026-08-08 21:30 ve UTC+03:00, 2026-08-08T18:30:00Z fiziksel anına karşılık gelir.',
    relatedTerms: ['utc-offset', 'solar-elevation', 'hour-angle']
  },
  {
    id: 'solar-position',
    category: 'Astronomi',
    title: 'Güneşin geometrik yerel konumu',
    summary: 'UTC gözlem anı ve WGS84 gözlemci koordinatından Güneş merkezinin geometrik yükseklik ve azimutunu hesaplayan astronomik referanstır.',
    fields: [
      { label: 'Geometrik yükseklik', unit: '°', description: 'Güneş merkezinin geometrik yerel ufka göre açısı.' },
      { label: 'Azimut', unit: '°', description: 'Coğrafi kuzeyden saat yönünde 0°–360° yön açısı.' },
      { label: 'Deklinasyon', unit: '°', description: 'Güneşin gök ekvatoruna göre açısal konumu.' },
      { label: 'Saat açısı', unit: '°', description: 'Güneşin yerel meridyene göre zaman açısı.' },
      { label: 'Zaman denklemi', unit: 'dk', description: 'Ortalama güneş zamanı ile görünür güneş zamanı arasındaki astronomik fark.' }
    ],
    assumptions: ['NOAA Solar Calculator denklem setinin düşük maliyetli astronomik yaklaşımı kullanılır.', 'Atmosferik kırılma uygulanmaz.', 'Azimut coğrafi kuzeyden saat yönündedir.'],
    commonMistakes: ['Geometrik 0° yüksekliği fotoğraftaki deniz ufkuyla aynı kabul etmek.', 'Negatif yüksekliği hesap hatası sanmak; bu değer Güneşin geometrik ufkun altında olduğunu gösterebilir.'],
    example: 'Aynı koordinatta tarih veya saati değiştirince Güneş yüksekliği ve azimutu canlı olarak yeniden hesaplanır.',
    relatedTerms: ['solar-elevation', 'azimuth', 'declination', 'hour-angle', 'utc-offset']
  },
  {
    id: 'solar-day-events',
    category: 'Astronomi',
    title: 'Gün doğumu, gün batımı ve güneş öğlesi',
    summary: 'Seçilen WGS84 konumu ve açık UTC ofsetli yerel sivil gün için Güneşin ufuk geçişlerini ve gün içindeki en yüksek geometrik konumunu hesaplar. Geometrik 0° ile standart -0,833° görünür referans birbirinden ayrılır.',
    fields: [
      { label: 'Geometrik doğuş/batış', unit: 'saat', description: 'Güneş merkezinin geometrik yerel ufukta 0° eşiğini geçtiği olaylar.' },
      { label: 'Standart görünür doğuş/batış', unit: 'saat', description: 'Güneş merkezi için -0,833° sabit eşiği kullanan yaklaşık takvim referansı; gerçek atmosfer ölçümü değildir.' },
      { label: 'Eşik üstü süre', unit: 'sa/dk', description: 'Seçilen yerel sivil günün ne kadarında ilgili Güneş merkezi eşiğinin üstünde kalındığı.' },
      { label: 'Güneş öğlesi', unit: 'saat', description: 'Seçilen yerel gün penceresinde geometrik Güneş yüksekliğinin maksimum olduğu an.' },
      { label: 'Doğuş/batış azimutu', unit: '°', description: 'İlgili eşik geçişindeki coğrafi kuzeyden saat yönlü Güneş azimutu.' }
    ],
    assumptions: ['Yerel gün kaydedilmiş sabit UTC ofsetiyle 00:00–24:00 olarak kurulmuştur.', '0° kanalı atmosferik kırılma ve topoğrafik ufuk içermez.', '-0,833° kanalı sabit üst-kenar + standart kırılma yaklaşımıdır; sahadaki gerçek atmosfer değildir.', 'Bu astronomik referans Dünya şekli modellerine otomatik Güneş/ışık fiziği atamaz.'],
    commonMistakes: ['-0,833° sonucunu ölçülmüş gerçek atmosferik kırılma sanmak.', 'Yerel topoğrafik ufkun düz geometrik ufukla aynı olduğunu varsaymak.', 'Saat dilimi adı/DST kuralı yerine kaydedilen açık UTC ofsetinin kullanıldığını gözden kaçırmak.', 'Kutup günü/gecesinde doğuş veya batış saati uydurulmasını beklemek.'],
    example: 'Aynı tarih ve koordinatta standart -0,833° doğuş geometrik 0° merkez doğuşundan biraz daha erken, batış ise biraz daha geç olur.',
    relatedTerms: ['solar-elevation', 'azimuth', 'utc-offset']
  },
  {
    id: 'lunar-position',
    category: 'Astronomi',
    title: 'Ayın topocentrik konumu ve fazı',
    summary: 'Aynı UTC gözlem anı ve WGS84 konumunda Ayın düşük hassasiyetli topocentrik yüksekliği/azimutu, uzaklığı ve faz geometrisini üretir.',
    fields: [
      { label: 'Geometrik yükseklik', unit: '°', description: 'Ay merkezinin yerel geometrik ufka göre topocentrik açısı.' },
      { label: 'Azimut', unit: '°', description: 'Coğrafi kuzeyden saat yönünde Ay yönü.' },
      { label: 'Aydınlık oranı', unit: '%', description: 'Güneş-Ay uzanımından yaklaşık hesaplanan aydınlık disk oranı.' },
      { label: 'Faz / Ay yaşı', description: 'Yeni Ay çevriminden itibaren yaklaşık faz sınıfı ve sinodik yaş.' },
      { label: 'Yatay paralaks', unit: '°', description: 'Ayın yakınlığı nedeniyle gözlemci konumunun göksel yöne yaptığı büyük topocentrik düzeltmenin ölçeği.' }
    ],
    assumptions: ['Düşük hassasiyetli analitik Ay yörüngesi ve başlıca periyodik düzeltmeler kullanılır.', 'Gözlemci deniz seviyesinde kabul edilir.', 'Atmosferik kırılma ve yerel topoğrafik ufuk uygulanmaz.', 'Tutulma geometrisi bu panelin kapsamı değildir.'],
    commonMistakes: ['Bu düşük hassasiyetli referansı JPL/Horizons hassasiyetinde efemeris saymak.', 'Aydınlık oranını Ayın ufuk üstünde görünürlüğüyle karıştırmak.', 'Faz bilgisinden otomatik tutulma sonucu çıkarmak.'],
    example: 'Tarih/saat değiştirildiğinde Güneş ve Ay aynı gözlem anında birlikte yeniden hesaplanır.',
    relatedTerms: ['azimuth', 'declination', 'utc-offset', 'lunar-parallax', 'lunar-phase']
  },
  {
    id: 'shadow-observation',
    category: 'Astronomi',
    title: 'Gölge deneyi ve dikey gnomon',
    summary: 'Aynı UTC/WGS84 Güneş referansından dikey gnomonun beklenen gölge uzunluğu ve yönünü üretir; isteğe bağlı saha ölçümünü yalnız kullanıcı tarafından verilen ± belirsizliklerle karşılaştırır.',
    fields: [
      { label: 'Gnomon yüksekliği', unit: 'm', description: 'Yerel düşeye paralel referans çubuğunun fiziksel yüksekliği.', calculationEffect: 'Beklenen gölge uzunluğunu doğrusal olarak ölçekler.' },
      { label: 'Gözlenen gölge uzunluğu', unit: 'm', description: 'Gnomon tabanından gölge ucuna yerel yatay yüzey üzerinde ölçülen mesafe.' },
      { label: 'Uzunluk belirsizliği', unit: 'm', description: 'Saha uzunluk ölçümünün açık ± aralığı. Girilmezse uzunluk kanalı uyum kararı üretmez.' },
      { label: 'Gözlenen gölge azimutu', unit: '°', description: 'Gnomon tabanından gölge ucuna yön; coğrafi kuzeyden saat yönünde.' },
      { label: 'Azimut belirsizliği', unit: '°', description: 'Gölge yönü ölçümünün açık ± açısal aralığı.' },
      { label: 'Gölgeden türetilen Güneş yüksekliği', unit: '°', description: 'Ölçülen uzunluk ve gnomon yüksekliğinden atan2(h, L) ile bağımsız türetilen açı.' }
    ],
    assumptions: ['Gnomon yerel düşeye paraleldir.', 'Ölçüm yüzeyi yerel yataydır.', 'Güneş yüksekliği geometriktir; atmosferik kırılma ve topoğrafik ufuk uygulanmaz.', 'Bu astronomik referans Dünya modellerine fiziksel Güneş davranışı atamaz.'],
    commonMistakes: ['Gölge yönünü Güneş azimutuyla aynı sanmak; gölge yaklaşık 180° ters yöndedir.', 'Gnomon yüksekliği yerine gözlemci boyunu kullanmak.', 'Belirsizlik girmeden kesin uyum/uyumsuzluk kararı beklemek.', 'Eğimli zemindeki gölgeyi yatay düzlem ölçümü gibi kullanmak.'],
    example: '1 m dikey gnomon ve 1 m gölge, ideal yatay geometride yaklaşık 45° Güneş yüksekliğine karşılık gelir.',
    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'uncertainty', 'utc-offset']
  },
  {
    id: 'dual-shadow-comparison',
    category: 'Astronomi',
    title: 'İki konumlu eşzamanlı gölge karşılaştırması',
    summary: 'A ve B noktalarındaki dikey gnomon gölgelerini aynı UTC fiziksel anında çözer; farklı gnomon yüksekliklerini açıya dönüştürerek ortak bir karşılaştırma kanalı üretir.',
    fields: [
      { label: 'B enlem / boylam', unit: '°', description: 'İkinci saha gözlem noktasının WGS84 koordinatları.' },
      { label: 'B gnomon yüksekliği', unit: 'm', description: 'İkinci noktadaki dikey referansın fiziksel yüksekliği. A ile aynı olmak zorunda değildir.' },
      { label: 'B gözlenen gölge', unit: 'm', description: 'İkinci noktada aynı UTC anında ölçülen gölge uzunluğu.' },
      { label: 'WGS84 nokta ayrımı', unit: 'km', description: 'A ile B arasındaki jeodezik referans mesafesi; model tahmini değil ölçüm bağlamıdır.' },
      { label: 'Güneş yükseklik farkı B−A', unit: '°', description: 'İki geometrik Güneş yüksekliği arasındaki eşzamanlı fark.' },
      { label: 'Gözlenen gölgelerden fark', unit: '°', description: 'Her gölgede atan2(h,L) ile türetilen Güneş yüksekliklerinin farkı.' }
    ],
    assumptions: ['İki istasyon aynı UTC fiziksel anını temsil eder.', 'Her iki gnomon yerel düşeye paraleldir ve ölçüm yüzeyleri yerel yataydır.', 'Atmosferik kırılma ve topoğrafik ufuk uygulanmaz.', 'WGS84 baz çizgisi bir referanstır; Dünya şekli modellerine otomatik Güneş kuralı atanmaz.'],
    commonMistakes: ['Yerel saatleri aynı yazarak farklı saat dilimlerindeki gözlemleri eşzamanlı sanmak.', 'Farklı gnomon yüksekliklerindeki ham gölge uzunluklarını doğrudan karşılaştırmak.', 'Belirsizlik girmeden fark uyumu hakkında kesin karar beklemek.', 'Bu referans hesabından doğrudan Dünya yarıçapı veya şekli sonucu çıkarmak.'],
    example: 'A noktasında 1 m, B noktasında 2 m gnomon kullanılabilir; gölgeler ham metre değerleri yerine her noktadan türetilen Güneş yüksekliği üzerinden karşılaştırılır.',
    relatedTerms: ['gnomon', 'solar-elevation', 'azimuth', 'geodesic', 'uncertainty', 'utc-offset']
  },
  {
    id: 'text-experiment-setup',
    category: 'Deney',
    title: 'Metinden deney hazırlama',
    summary: 'Serbest gözlem notunu deterministik kurallarla tipli bir taslağa dönüştürür. Bulunan değerler kullanıcı onayı olmadan deney state’ine yazılmaz.',
    fields: [
      { label: 'Bulundu', description: 'Birim, bağlam ve aralık bakımından güvenle eşlenen; seçilirse uygulanabilen alan.' },
      { label: 'Kontrol gerekli', description: 'Eksik birim, çelişen tekrar veya ek fiziksel bağlam gerektiren ifade. Otomatik uygulanmaz.' },
      { label: 'Kullanılamadı', description: 'Mevcut sözleşmede tek başına güvenli uygulanamayan ifade; örneğin provenansı eksik su seviyesi veya fotoğrafsız FOV.' },
      { label: 'Mevcut → önerilen', description: 'Forma yazmadan önce mevcut değer ile metinden çıkarılan aday değeri yan yana gösterir.' }
    ],
    assumptions: ['İlk sürüm çevrimdışı ve kural tabanlıdır; harici AI servisi kullanmaz.', 'Metinde bulunmayan değerler için fiziksel varsayım uydurulmaz.'],
    commonMistakes: ['Birimsiz sayının metre/km olduğu varsayımını beklemek.', 'Kontrol gerekli satırın otomatik uygulanacağını sanmak.', 'Metinden hazırlama provenansını gerçek ölçüm kaynağının yerine koymak.'],
    example: '“Gözlemci deniz seviyesinden 12 m, kamera yerden 1,7 m; hedef 34,2 km uzakta ve 42 m yüksekliğinde; standart kırılma k=0,13.” metni önce taslak önizlemesine dönüşür.',
    relatedTerms: ['provenance', 'uncertainty', 'datum', 'k']
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

export function getHelpPanels(locale: HelpLocale = 'tr'): readonly HelpPanelContent[] {
  return locale === 'en' ? HELP_PANELS_EN : HELP_PANELS;
}

export function getHelpTerms(locale: HelpLocale = 'tr'): readonly HelpTermContent[] {
  return locale === 'en' ? HELP_TERMS_EN : HELP_TERMS;
}

export function getHelpPanel(
  id: HelpPanelId,
  locale: HelpLocale = 'tr'
): HelpPanelContent {
  const content = getHelpPanels(locale).find((panel) => panel.id === id);
  if (!content) throw new Error(`Unknown help panel / Bilinmeyen yardım paneli: ${id}`);
  return content;
}

export function getHelpTerm(
  id: string,
  locale: HelpLocale = 'tr'
): HelpTermContent | undefined {
  return getHelpTerms(locale).find((term) => term.id === id);
}

export function searchHelp(
  query: string,
  locale: HelpLocale = 'tr'
): { panels: HelpPanelContent[]; terms: HelpTermContent[] } {
  const panels = getHelpPanels(locale);
  const terms = getHelpTerms(locale);
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  const normalized = query.trim().toLocaleLowerCase(localeTag);
  if (!normalized) return { panels: [...panels], terms: [...terms] };
  const includes = (value: string): boolean =>
    value.toLocaleLowerCase(localeTag).includes(normalized);
  return {
    panels: panels.filter((panel) => includes([
      panel.title,
      panel.summary,
      panel.category,
      ...panel.fields.flatMap((field) => [
        field.label,
        field.description,
        field.unit ?? '',
        field.calculationEffect ?? ''
      ]),
      ...panel.assumptions,
      ...panel.commonMistakes,
      panel.example ?? ''
    ].join(' '))),
    terms: terms.filter((term) =>
      includes(`${term.label} ${term.definition} ${term.caution ?? ''}`)
    )
  };
}
