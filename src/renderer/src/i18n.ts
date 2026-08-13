export type AppLocale = 'tr' | 'en';

export const UI_LOCALE_STORAGE_KEY = 'ggl.ui.locale.v1';

export function parseAppLocale(value: unknown): AppLocale | undefined {
  return value === 'tr' || value === 'en' ? value : undefined;
}

export function resolveInitialAppLocale(
  storedLocale: unknown,
  preferredLanguages: readonly string[]
): AppLocale {
  const stored = parseAppLocale(storedLocale);
  if (stored) return stored;
  return preferredLanguages.some((language) => language.toLocaleLowerCase('en-US').startsWith('tr'))
    ? 'tr'
    : 'en';
}

export function appLocaleTag(locale: AppLocale): 'tr-TR' | 'en-US' {
  return locale === 'tr' ? 'tr-TR' : 'en-US';
}

const trMessages = {
  'app.title': 'Geometrik Gözlem Laboratuvarı',
  'app.brand': 'GEOMETRİK GÖZLEM LABORATUVARI',
  'calculation.busy': 'Hesaplanıyor…',
  'calculation.ready': 'Hesaplama hazır',
  'action.textSetup': 'Metinden Hazırla',
  'action.aiAnalysis': 'AI ile Analiz',
  'action.aiGuide': 'AI Kılavuzu',
  'action.dataManager': 'Veri Yöneticisi',
  'action.settings': 'Ayarlar',
  'action.settingsUnavailable': 'Ayarlar modülü sonraki aşamada',
  'action.help': 'Yardım',
  'language.label': 'Uygulama dili',
  'language.tr': 'Türkçe',
  'language.en': 'English',
  'error.rootMissing': 'Uygulama kök elemanı bulunamadı.',
  'ai.waitCalculation': 'Hesaplama tamamlanmadan AI paketi hazırlanmadı.',
  'ai.waitUncertainty': 'Model girdi belirsizliği hesabı tamamlanmadan AI paketi hazırlanmadı.',
  'common.reference': 'REFERANS',
  'common.soon': 'YAKINDA',
  'common.active': 'AKTİF',
  'common.ready': 'HAZIR',
  'sidebar.testScenarios': 'Test senaryoları',
  'sidebar.readyCount': '{ready} / {total} hazır',
  'sidebar.unavailableScenario': 'Bu deney henüz uygulanmadı',
  'sidebar.savedExperiments': 'Kaydedilen deneyler',
  'sidebar.savedCount': '{count} kayıt',
  'sidebar.noSaved': 'Henüz yerel kayıt yok.',
  'sidebar.models': 'Modeller',
  'sidebar.modelCount.sunMoon': '3 astronomik referans',
  'sidebar.modelCount.eclipse': '2 tutulma referansı',
  'sidebar.modelCount.singleAstronomy': '1 astronomik referans',
  'sidebar.modelCount.visibility': '2 fiziksel',
  'sidebar.includedInCalculation': 'Hesaplamaya dahil',
  'sidebar.visualLayers': 'Görsel katmanlar',
  'sidebar.astronomyNextSlice': 'astronomi · sonraki dilim',
  'sidebar.visualReadyCount': '4 / 5 hazır',
  'model.solarPosition': 'Güneş Konumu · Astronomik Referans',
  'model.lunarPosition': 'Ay Konumu ve Fazı · Astronomik Referans',
  'model.solarDayEvents': 'Gün Doğumu / Batımı · Astronomik Referans',
  'model.eclipseGeometry': 'Anlık Güneş–Ay Disk Geometrisi',
  'model.eclipseSearch': 'Yerel Tutulma Zaman Araması',
  'model.shadowGeometry': 'Gölge Geometrisi · Astronomik Referans',
  'model.stellarObservation': 'Yıldız Gözlemi · Astronomik Referans',
  'model.idealSphere': 'İdeal Küre',
  'model.definedPlane': 'Tanımlı Düzlem',
  'model.azimuthalProjection': 'Azimutal Projeksiyon',
  'model.toroidal': 'Toroidal Model',
  'model.concaveEarth': 'İçbükey Dünya',
  'visual.geographicBoundaries': 'Kıta / Ülke Sınırları',
  'visual.terrain': 'Topografya Görselleştirme',
  'visual.nightLights': 'Gece Işıkları',
  'visual.atmosphereProfile': 'Atmosfer Profili',
  'visual.grid': 'Izgara',
  'visual.terrainHorizonUnavailable': 'Ufuk Analizi yerel arazi profilini kullanmaz',
  'visual.terrainDescription': 'Arazi profili etkin olduğunda rota boyunca göreli yükselti şeridini gösterir',
  'visual.atmosphereEnabledDescription': 'Ölçülmüş atmosfer katmanlarını ve İdeal Küre optik ışın yolunu görselleştirir',
  'visual.atmosphereSelectProfile': 'Atmosfer Profili görsel katmanı için Katmanlı profil modunu seçin',
  'astronomy.placeholder.eclipse': 'Anlık Güneş–Ay disk geometrisi ve kullanıcı kontrollü yerel tutulma zaman penceresi ana deney alanında gösterilir.',
  'astronomy.placeholder.shadow': 'Gölge yön diyagramı ana deney panelinde gösterilir. Dünya modellerine fiziksel Güneş davranışı atanmaz.',
  'astronomy.placeholder.stellar': 'Katalog yıldızı, J2000→gözlem tarihi dönüşümü, geometrik yıldız izi ve isteğe bağlı yerel skyline ana deney alanında gösterilir.',
  'astronomy.placeholder.sunMoon': 'Güneş/Ay konumu ile günlük doğuş-batış zaman çizgisi ana deney alanında gösterilir; ek gökyüzü katmanları sonraki dilimlerde genişletilecektir.',
  'scenario.targetVisibility.label': 'Hedef Görünürlüğü',
  'scenario.targetVisibility.description': 'Belirli bir hedefin ne kadarının görünmesi gerektiğini ölçümle karşılaştırır.',
  'scenario.horizon.label': 'Ufuk Analizi',
  'scenario.horizon.description': 'Gözlemci kotu ve atmosfer varsayımından geometrik ufuk mesafesini hesaplar.',
  'scenario.longDistanceVisibility.label': 'Uzun Mesafe Görüş',
  'scenario.longDistanceVisibility.description': 'Aynı görünürlük motorunu rota, arazi ve uzak hedef bağlamını öne çıkaran ayrı bir iş akışında kullanır.',
  'scenario.sunMoon.label': 'Güneş ve Ay Gözlemleri',
  'scenario.sunMoon.description': 'Tarih, saat ve WGS84 gözlem konumundan Güneş ve Ay için ayrı astronomik referans sonuçları üretir.',
  'scenario.shadow.label': 'Gölge Deneyi',
  'scenario.shadow.description': 'Dikey gnomon gölgesinin uzunluk ve yönünü geometrik Güneş referansından hesaplar; isteğe bağlı saha ölçümünü belirsizliğiyle karşılaştırır.',
  'scenario.stellar.label': 'Yıldız Gözlemleri',
  'scenario.stellar.description': 'Çevrimdışı parlak yıldız kataloğundan seçilen yıldızın J2000 koordinatını gözlem tarihine dönüştürür; geometrik konum ve zaman içindeki yıldız izini hesaplar.',
  'scenario.eclipse.label': 'Tutulma Simülasyonları',
  'scenario.eclipse.description': 'Seçili gözlemci ve zaman için Güneş–Ay apparent disk geometrisini ve kullanıcı kontrollü yerel örtüşme zaman penceresini düşük hassasiyetli astronomik referansla inceler.',
  'scenario.readyMessage': '{scenario} senaryosu hazırlandı.',
  'experiment.newReady': 'Yeni deney hazırlandı.'
} as const;

export type TranslationKey = keyof typeof trMessages;
export type TranslationValues = Readonly<Record<string, string | number>>;

const enMessages: Record<TranslationKey, string> = {
  'app.title': 'Geometric Observation Laboratory',
  'app.brand': 'GEOMETRIC OBSERVATION LABORATORY',
  'calculation.busy': 'Calculating…',
  'calculation.ready': 'Calculation ready',
  'action.textSetup': 'Prepare from Text',
  'action.aiAnalysis': 'Analyze with AI',
  'action.aiGuide': 'AI Guide',
  'action.dataManager': 'Data Manager',
  'action.settings': 'Settings',
  'action.settingsUnavailable': 'Settings module will be added in a later stage',
  'action.help': 'Help',
  'language.label': 'Application language',
  'language.tr': 'Türkçe',
  'language.en': 'English',
  'error.rootMissing': 'Application root element was not found.',
  'ai.waitCalculation': 'The AI package was not prepared before the calculation finished.',
  'ai.waitUncertainty': 'The AI package was not prepared before model-input uncertainty finished.',
  'common.reference': 'REFERENCE',
  'common.soon': 'SOON',
  'common.active': 'ACTIVE',
  'common.ready': 'READY',
  'sidebar.testScenarios': 'Test scenarios',
  'sidebar.readyCount': '{ready} / {total} ready',
  'sidebar.unavailableScenario': 'This experiment is not implemented yet',
  'sidebar.savedExperiments': 'Saved experiments',
  'sidebar.savedCount': '{count} saved',
  'sidebar.noSaved': 'No local records yet.',
  'sidebar.models': 'Models',
  'sidebar.modelCount.sunMoon': '3 astronomical references',
  'sidebar.modelCount.eclipse': '2 eclipse references',
  'sidebar.modelCount.singleAstronomy': '1 astronomical reference',
  'sidebar.modelCount.visibility': '2 physical',
  'sidebar.includedInCalculation': 'Included in calculation',
  'sidebar.visualLayers': 'Visual layers',
  'sidebar.astronomyNextSlice': 'astronomy · next slice',
  'sidebar.visualReadyCount': '4 / 5 ready',
  'model.solarPosition': 'Solar Position · Astronomical Reference',
  'model.lunarPosition': 'Lunar Position and Phase · Astronomical Reference',
  'model.solarDayEvents': 'Sunrise / Sunset · Astronomical Reference',
  'model.eclipseGeometry': 'Instantaneous Sun–Moon Disk Geometry',
  'model.eclipseSearch': 'Local Eclipse Time Search',
  'model.shadowGeometry': 'Shadow Geometry · Astronomical Reference',
  'model.stellarObservation': 'Stellar Observation · Astronomical Reference',
  'model.idealSphere': 'Ideal Sphere',
  'model.definedPlane': 'Defined Plane',
  'model.azimuthalProjection': 'Azimuthal Projection',
  'model.toroidal': 'Toroidal Model',
  'model.concaveEarth': 'Concave Earth',
  'visual.geographicBoundaries': 'Continent / Country Boundaries',
  'visual.terrain': 'Topography Visualization',
  'visual.nightLights': 'Night Lights',
  'visual.atmosphereProfile': 'Atmosphere Profile',
  'visual.grid': 'Grid',
  'visual.terrainHorizonUnavailable': 'Horizon Analysis does not use the local terrain profile',
  'visual.terrainDescription': 'Shows the relative elevation strip along the route when the terrain profile is enabled',
  'visual.atmosphereEnabledDescription': 'Visualizes measured atmospheric layers and the Ideal Sphere optical ray path',
  'visual.atmosphereSelectProfile': 'Select Layered profile mode to enable the Atmosphere Profile visual layer',
  'astronomy.placeholder.eclipse': 'Instantaneous Sun–Moon disk geometry and the user-controlled local eclipse time window are shown in the main experiment area.',
  'astronomy.placeholder.shadow': 'The shadow-direction diagram is shown in the main experiment panel. Physical Sun behavior is not assigned to world models.',
  'astronomy.placeholder.stellar': 'The catalog star, J2000-to-observation-date transform, geometric star trail and optional local skyline are shown in the main experiment area.',
  'astronomy.placeholder.sunMoon': 'Sun/Moon position and the daily rise-set timeline are shown in the main experiment area; additional sky layers will be expanded in later slices.',
  'scenario.targetVisibility.label': 'Target Visibility',
  'scenario.targetVisibility.description': 'Compares the expected visible fraction of a specific target with the observation.',
  'scenario.horizon.label': 'Horizon Analysis',
  'scenario.horizon.description': 'Calculates geometric horizon distance from observer elevation and the atmosphere assumption.',
  'scenario.longDistanceVisibility.label': 'Long-Distance Visibility',
  'scenario.longDistanceVisibility.description': 'Uses the same visibility engine in a separate workflow emphasizing route, terrain and distant-target context.',
  'scenario.sunMoon.label': 'Sun and Moon Observations',
  'scenario.sunMoon.description': 'Produces separate astronomical reference results for the Sun and Moon from date, time and WGS84 observer location.',
  'scenario.shadow.label': 'Shadow Experiment',
  'scenario.shadow.description': 'Calculates vertical-gnomon shadow length and direction from the geometric Sun reference and optionally compares a field measurement with uncertainty.',
  'scenario.stellar.label': 'Stellar Observations',
  'scenario.stellar.description': 'Transforms a selected offline bright-star catalog entry from J2000 coordinates to the observation date and calculates geometric position and trail over time.',
  'scenario.eclipse.label': 'Eclipse Simulations',
  'scenario.eclipse.description': 'Examines apparent Sun–Moon disk geometry and a user-controlled local overlap time window using the low-precision astronomical reference.',
  'scenario.readyMessage': '{scenario} scenario is ready.',
  'experiment.newReady': 'New experiment is ready.'
};

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  values?: TranslationValues
): string {
  const template = locale === 'tr' ? trMessages[key] : enMessages[key];
  if (!values) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}
