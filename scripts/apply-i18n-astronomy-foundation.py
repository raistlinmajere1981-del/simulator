#!/usr/bin/env python3
"""Localize astronomy time card and astronomy scenario summary shells.

Temporary helper: remove before merge. This slice intentionally does not localize
specialized Sun/Moon/eclipse/shadow/stellar result panels or machine contracts.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        fail(f"expected marker not found in {path.relative_to(ROOT)}: {old[:80]!r}")
    if text.count(old) != 1:
        fail(f"expected exactly one marker in {path.relative_to(ROOT)}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def require_absent(path: Path) -> None:
    if path.exists():
        fail(f"target already exists: {path.relative_to(ROOT)}")


i18n = ROOT / "src/renderer/src/i18n.ts"
celestial = ROOT / "src/renderer/src/CelestialTimeCard.tsx"
solar = ROOT / "src/renderer/src/SolarScenarioSummary.tsx"
eclipse = ROOT / "src/renderer/src/EclipseScenarioSummary.tsx"
shadow = ROOT / "src/renderer/src/ShadowScenarioSummary.tsx"
stellar = ROOT / "src/renderer/src/StellarScenarioSummary.tsx"
docs = ROOT / "docs/localization.md"
test_path = ROOT / "tests/astronomy-shell-i18n.test.ts"
require_absent(test_path)

tr_tail = "  'results.open': 'Aç'\n} as const;"
tr_new = """  'results.open': 'Aç',
  'time.title': 'Zaman ve tarih',
  'time.astronomyModule': 'astronomi modülü',
  'time.inactiveNote': 'Astronomi gözlem senaryolarında etkinleşir.',
  'time.astronomyUtc': 'ASTRONOMİ · UTC',
  'time.localDateTime': 'Yerel tarih / saat · sistem görünümü',
  'time.localDateTimeAria': 'Astronomi gözlemi yerel tarih ve saati',
  'time.exactLocalTime': 'Kesin yerel zaman · 24 saat',
  'time.exactAria': '24 saatlik kesin yerel gözlem zamanı {time} {offset}',
  'time.utcOffset': 'UTC ofseti',
  'time.utcOffsetAria': 'Astronomi gözlemi UTC ofseti saat',
  'time.now': 'Şimdi',
  'time.nowAria': 'Astronomi gözlem zamanını şimdi yap',
  'astronomy.controlledSearch': 'KONTROLLÜ ARAMA',
  'astronomy.eclipse.activeStage': 'Aktif senaryo · Aşama 7.4',
  'astronomy.summary.sunMoonScope': 'Aşama 6.2 Güneşin geometrik yerel konumunu ve Ayın düşük hassasiyetli topocentrik konum/faz referansını aynı gözlem anında hesaplar. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Hedef, rota, arazi, su yüzeyi, fotoğraf görünürlük hesabı ve atmosferik kırılma bu astronomik referanslara katılmaz.',
  'astronomy.summary.eclipseScope': 'Bu ayrı iş akışı seçili UTC anındaki Güneş–Ay apparent disk geometrisini ve kullanıcı tarafından başlatılan yerel zaman penceresi taramasını kaydedilebilir deney sonucu olarak taşır. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Sonuç resmi tutulma efemerisi, C1–C4 temasları veya Dünya üzerindeki tutulma yolu değildir.',
  'astronomy.summary.shadowScope': 'Dikey bir gnomonun yerel yatay yüzeyde oluşturacağı gölge geometrisi hesaplanır. İstersen ikinci WGS84 gözlem noktasını aynı UTC anında eşzamanlı karşılaştırmaya ekleyebilirsin. Tarih/saat sol alttaki Zaman ve tarih kartından yönetilir. Bu astronomik referans herhangi bir Dünya modeli için fiziksel Güneş kuralı uydurmaz.',
  'astronomy.summary.stellarScope': 'Parlak yıldız kataloğu çevrimdışı tutulur. Katalogdaki J2000 yönü gözlem tarihine açık IAU 2006 precession adımıyla dönüştürülür; ardından geometrik yükseklik, azimut ve yıldız izi hesaplanır. Proper motion, atmosferik kırılma, gökyüzü parlaklığı ve topoğrafik ufuk bu aşamada uygulanmaz.'
} as const;"""
replace_once(i18n, tr_tail, tr_new)

en_tail = "  'results.open': 'Open'\n};"
en_new = """  'results.open': 'Open',
  'time.title': 'Time and date',
  'time.astronomyModule': 'astronomy module',
  'time.inactiveNote': 'Enabled for astronomy observation scenarios.',
  'time.astronomyUtc': 'ASTRONOMY · UTC',
  'time.localDateTime': 'Local date / time · system view',
  'time.localDateTimeAria': 'Astronomy observation local date and time',
  'time.exactLocalTime': 'Exact local time · 24-hour',
  'time.exactAria': 'Exact 24-hour local observation time {time} {offset}',
  'time.utcOffset': 'UTC offset',
  'time.utcOffsetAria': 'Astronomy observation UTC offset hours',
  'time.now': 'Now',
  'time.nowAria': 'Set astronomy observation time to now',
  'astronomy.controlledSearch': 'CONTROLLED SEARCH',
  'astronomy.eclipse.activeStage': 'Active scenario · Stage 7.4',
  'astronomy.summary.sunMoonScope': 'Stage 6.2 calculates the Sun’s geometric local position and the Moon’s low-precision topocentric position/phase reference at the same observation instant. Date/time is managed from the Time and date card at lower left. Target, route, terrain, water surface, photo visibility calculation and atmospheric refraction do not participate in these astronomical references.',
  'astronomy.summary.eclipseScope': 'This separate workflow stores the Sun–Moon apparent disk geometry at the selected UTC instant and a user-started local time-window scan as a saveable experiment result. Date/time is managed from the Time and date card at lower left. The result is not an official eclipse ephemeris, C1–C4 contact solution or eclipse path over Earth.',
  'astronomy.summary.shadowScope': 'The shadow geometry produced by a vertical gnomon on the local horizontal surface is calculated. A second WGS84 observation point may optionally be added for simultaneous comparison at the same UTC instant. Date/time is managed from the Time and date card at lower left. This astronomical reference does not invent a physical Sun rule for any Earth model.',
  'astronomy.summary.stellarScope': 'The bright-star catalog is kept offline. The catalog J2000 direction is transformed to the observation date with an explicit IAU 2006 precession step; geometric altitude, azimuth and star trail are then calculated. Proper motion, atmospheric refraction, sky brightness and topographic horizon are not applied in this stage.'
};"""
replace_once(i18n, en_tail, en_new)

# Celestial time card
replace_once(
    celestial,
    "import { PanelHelpButton } from './HelpSystem';\n",
    "import { PanelHelpButton } from './HelpSystem';\nimport { useI18n } from './I18nProvider';\nimport { appLocaleTag } from './i18n';\n"
)
replace_once(
    celestial,
    "}): React.JSX.Element {\n  if (!active) {",
    "}): React.JSX.Element {\n  const { locale, t } = useI18n();\n\n  if (!active) {"
)
replacements = [
    ("<span>Zaman ve tarih</span>", "<span>{t('time.title')}</span>"),
    ("<span className=\"section-state\">astronomi modülü</span>", "<span className=\"section-state\">{t('time.astronomyModule')}</span>"),
    ("<div className=\"time-placeholder\">Astronomi gözlem senaryolarında etkinleşir.</div>", "<div className=\"time-placeholder\">{t('time.inactiveNote')}</div>"),
    ("<span className=\"section-state\">ASTRONOMİ · UTC</span>", "<span className=\"section-state\">{t('time.astronomyUtc')}</span>"),
    ("<span>Yerel tarih / saat · sistem görünümü</span>", "<span>{t('time.localDateTime')}</span>"),
    ("aria-label=\"Astronomi gözlemi yerel tarih ve saati\"", "aria-label={t('time.localDateTimeAria')}"),
    ("lang=\"tr-TR\"", "lang={appLocaleTag(locale)}"),
    ("<div className=\"celestial-time-exact\" aria-label={`24 saatlik kesin yerel gözlem zamanı ${explicitLocalTime} ${offsetLabel}`}>", "<div className=\"celestial-time-exact\" aria-label={t('time.exactAria', { time: explicitLocalTime, offset: offsetLabel })}>"),
    ("<span>Kesin yerel zaman · 24 saat</span>", "<span>{t('time.exactLocalTime')}</span>"),
    ("<span>UTC ofseti</span>", "<span>{t('time.utcOffset')}</span>"),
    ("ariaLabel=\"Astronomi gözlemi UTC ofseti saat\"", "ariaLabel={t('time.utcOffsetAria')}"),
    ("aria-label=\"Astronomi gözlem zamanını şimdi yap\"", "aria-label={t('time.nowAria')}"),
    ("        Şimdi\n", "        {t('time.now')}\n"),
]
for old, new in replacements:
    replace_once(celestial, old, new)


def localize_summary(path: Path, scenario_id: str, scope_key: str, *, eclipse_mode: bool = False) -> None:
    replace_once(
        path,
        "import { PanelHelpButton } from './HelpSystem';\n",
        "import { PanelHelpButton } from './HelpSystem';\nimport { useI18n } from './I18nProvider';\nimport { getScenarioPresentation } from './app/app-config';\n"
    )
    replace_once(
        path,
        "}): React.JSX.Element {\n  return (",
        f"}}): React.JSX.Element {{\n  const {{ locale, t }} = useI18n();\n  const scenario = getScenarioPresentation(locale, '{scenario_id}');\n\n  return ("
    )
    if eclipse_mode:
        replace_once(path, '<span className="eyebrow">Aktif senaryo · Aşama 7.4</span>', '<span className="eyebrow">{t(\'astronomy.eclipse.activeStage\')}</span>')
        replace_once(path, '<span className="calculation-badge">KONTROLLÜ ARAMA</span>', '<span className="calculation-badge">{t(\'astronomy.controlledSearch\')}</span>')
    else:
        replace_once(path, '<span className="eyebrow">Aktif senaryo</span>', '<span className="eyebrow">{t(\'core.activeScenario\')}</span>')
        replace_once(path, '<span className="calculation-badge">CANLI HESAPLAMA</span>', '<span className="calculation-badge">{t(\'core.liveCalculation\')}</span>')
    # Active-name fallback differs by file but always sits in the only h2.
    text = path.read_text(encoding="utf-8")
    import re
    text, count = re.subn(r"<h2>\{activeName \|\| '[^']+'\}</h2>", "<h2>{activeName || scenario.label}</h2>", text, count=1)
    if count != 1:
        fail(f"summary h2 marker not found in {path.relative_to(ROOT)}")
    path.write_text(text, encoding="utf-8")
    common = [
        ('<span className="dirty-badge">KAYDEDİLMEDİ</span>', '<span className="dirty-badge">{t(\'core.unsaved\')}</span>'),
        ('>Deneyi Kaydet</button>', '>{t(\'core.saveExperiment\')}</button>'),
        ('>Yeni / Varsayılan</button>', '>{t(\'core.newDefault\')}</button>'),
        ('<span>Gözlemci enlemi</span>', '<span>{t(\'field.observerLatitude\')}</span>'),
        ('<span>Gözlemci boylamı</span>', '<span>{t(\'field.observerLongitude\')}</span>'),
    ]
    for old, new in common:
        replace_once(path, old, new)
    text = path.read_text(encoding="utf-8")
    text, count = re.subn(
        r'<p className="scenario-scope-note">\s*.*?\s*</p>',
        f'<p className="scenario-scope-note">{{t(\'{scope_key}\')}}</p>',
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        fail(f"scope note marker not found in {path.relative_to(ROOT)}")
    path.write_text(text, encoding="utf-8")


localize_summary(solar, 'sun-moon-observation', 'astronomy.summary.sunMoonScope')
localize_summary(eclipse, 'eclipse-simulation', 'astronomy.summary.eclipseScope', eclipse_mode=True)
localize_summary(shadow, 'shadow-observation', 'astronomy.summary.shadowScope')
localize_summary(stellar, 'stellar-observation', 'astronomy.summary.stellarScope')

# Tests: human presentation only; canonical UTC identifiers remain unchanged.
test_path.write_text("""import { describe, expect, it } from 'vitest';
import { appLocaleTag, translate } from '../src/renderer/src/i18n';
import { getScenarioPresentation } from '../src/renderer/src/app/app-config';

describe('astronomy shell localization', () => {
  it('localizes the astronomy time-card shell while keeping UTC terminology stable', () => {
    expect(translate('tr', 'time.title')).toBe('Zaman ve tarih');
    expect(translate('en', 'time.title')).toBe('Time and date');
    expect(translate('en', 'time.utcOffset')).toBe('UTC offset');
    expect(appLocaleTag('tr')).toBe('tr-TR');
    expect(appLocaleTag('en')).toBe('en-US');
  });

  it('interpolates the exact local-time accessibility label', () => {
    expect(translate('en', 'time.exactAria', { time: '2026-08-13 14:00:00', offset: 'UTC+03:00' }))
      .toBe('Exact 24-hour local observation time 2026-08-13 14:00:00 UTC+03:00');
  });

  it('uses localized scenario presentation for astronomy summary fallbacks', () => {
    expect(getScenarioPresentation('en', 'sun-moon-observation').label).toBe('Sun and Moon Observations');
    expect(getScenarioPresentation('en', 'shadow-observation').label).toBe('Shadow Experiment');
    expect(getScenarioPresentation('en', 'stellar-observation').label).toBe('Stellar Observations');
    expect(getScenarioPresentation('en', 'eclipse-simulation').label).toBe('Eclipse Simulations');
  });
});
""", encoding="utf-8")

replace_once(
    docs,
    "- Core panel slice: visibility/horizon scenario summary, observation reference panels, vertical datum presentation and explicit locale-aware number/coordinate/bearing/percent formatting.\n- Model result slice: visibility/horizon model cards, result status presentation, metric labels and comparison tables use the active locale while engine warnings/assumptions remain untouched.\n\nAstronomy time card, specialized panels, dialogs, help/AI guidance and reports remain separate follow-up slices.\n",
    "- Core panel slice: visibility/horizon scenario summary, observation reference panels, vertical datum presentation and explicit locale-aware number/coordinate/bearing/percent formatting.\n- Model result slice: visibility/horizon model cards, result status presentation, metric labels and comparison tables use the active locale while engine warnings/assumptions remain untouched.\n- Astronomy shell slice: astronomy time/date card plus Sun/Moon, eclipse, shadow and stellar scenario summary shells use the active locale; UTC and machine identifiers remain invariant.\n\nSpecialized astronomy result panels, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.\n"
)

print('Astronomy localization foundation applied successfully.')
