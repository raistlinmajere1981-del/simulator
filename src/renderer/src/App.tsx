import { useMemo, useState } from 'react';

type ModelView = {
  id: string;
  name: string;
  tone: 'green' | 'amber' | 'violet';
  shape: 'globe' | 'disk' | 'gleason';
  visible: string;
  hidden: string;
  horizon: string;
  angle: string;
  agreement: number;
  status: string;
};

const scenarios = [
  'Ufuk Analizi',
  'Gemi Kaybolma Testi',
  'Uzun Mesafe Görüş',
  'Güneş ve Ay Gözlemleri',
  'Yıldız Gözlemleri',
  'Tutulma Simülasyonları'
];

const models: ModelView[] = [
  {
    id: 'sphere',
    name: 'İdeal Küre',
    tone: 'green',
    shape: 'globe',
    visible: '%38,7',
    hidden: '%61,3',
    horizon: '22,41 km',
    angle: '-0,869°',
    agreement: 92,
    status: 'Gözlem aralığıyla uyumlu'
  },
  {
    id: 'plane',
    name: 'Tanımlı Düzlem',
    tone: 'amber',
    shape: 'disk',
    visible: '%100',
    hidden: '%0',
    horizon: '∞',
    angle: '0,000°',
    agreement: 18,
    status: 'Gözlem aralığıyla uyumsuz'
  },
  {
    id: 'gleason',
    name: 'Azimutal Gösterim',
    tone: 'violet',
    shape: 'gleason',
    visible: '%72,1',
    hidden: '%27,9',
    horizon: '42,15 km',
    angle: '-0,236°',
    agreement: 46,
    status: 'Model kuralları tamamlanmalı'
  }
];

function Sidebar(): React.JSX.Element {
  const [active, setActive] = useState('Gemi Kaybolma Testi');

  return (
    <aside className="sidebar">
      <section className="side-section">
        <div className="section-heading"><span>Test senaryoları</span><button>+</button></div>
        <nav className="scenario-list">
          {scenarios.map((scenario, index) => (
            <button
              className={active === scenario ? 'active' : ''}
              key={scenario}
              onClick={() => setActive(scenario)}
            >
              <span className="nav-icon">{['◫', '▰', '⌁', '☀', '✦', '◐'][index]}</span>
              {scenario}
            </button>
          ))}
        </nav>
      </section>

      <section className="side-section compact">
        <div className="section-heading"><span>Kaydedilen senaryolar</span></div>
        <div className="saved-row">İstanbul – Prens Adaları <span>☁</span></div>
        <div className="saved-row">Ankara – Kule Gözlemi <span>☁</span></div>
        <div className="saved-row">Antalya – Ufuk Çizgisi <span>☁</span></div>
      </section>

      <section className="side-section compact">
        <div className="section-heading"><span>Modeller</span><button>+</button></div>
        {models.map((model) => (
          <div className="model-toggle" key={model.id}>
            <span className={`model-dot ${model.tone}`} />
            <span>{model.name}</span>
            <span className="enabled-dot" />
          </div>
        ))}
        <div className="model-toggle"><span className="model-dot coral" /><span>Toroidal Model</span><span /></div>
        <div className="model-toggle"><span className="model-dot blue" /><span>İçbükey Dünya</span><span /></div>
      </section>

      <section className="side-section compact grow">
        <div className="section-heading"><span>Görünüm / katmanlar</span></div>
        {['Kıta / Ülke Sınırları', 'Topografya', 'Gece Işıkları', 'Atmosfer', 'Izgara'].map((item, index) => (
          <label className="switch-row" key={item}>
            <span>{item}</span>
            <input type="checkbox" defaultChecked={index !== 2} />
            <span className="switch" />
          </label>
        ))}
      </section>

      <section className="time-card">
        <div className="section-heading"><span>Zaman ve tarih</span></div>
        <div className="time-values"><span>18 Mayıs 2025</span><span>15:30</span></div>
        <input type="range" defaultValue="42" />
        <div className="time-actions"><button>▶</button><button className="primary">▶</button><span>● CANLI</span></div>
      </section>
    </aside>
  );
}

function ScenarioSummary(): React.JSX.Element {
  return (
    <section className="scenario-summary panel">
      <div className="panel-title-row">
        <div><span className="eyebrow">Aktif senaryo</span><h2>Gemi Kaybolma Testi</h2></div>
        <button className="edit-button">Senaryoyu düzenle</button>
      </div>
      <div className="summary-grid">
        <div><strong>Gözlemci</strong><p>Konum: İstanbul, Türkiye</p><p>Rakım: 50 m</p><p>41,0136° N · 28,9550° E</p></div>
        <div><strong>Hedef</strong><p>Kargo gemisi</p><p>Yükseklik: 15 m</p><p>40,8452° N · 29,1207° E</p></div>
        <div><strong>Mesafe</strong><p>Yüzey: 22,38 km</p><p>Görüş: 22,41 km</p><p className="demo-tag">DEMO SENARYO</p></div>
      </div>
    </section>
  );
}

function ObservationPanel(): React.JSX.Element {
  return (
    <section className="observation panel">
      <span className="eyebrow">Gerçek gözlem / görsel</span>
      <div className="observation-image">
        <div className="reticle">＋</div>
        <div className="ship"><span /><i /><b /></div>
        <div className="scale">5°<br />2,5°<br />0°<br />−2,5°</div>
      </div>
      <div className="observation-meta"><span>18 Mayıs 2025 · 15:30</span><span>Kamera: 50 m · 100 mm</span><button>Görsel yükle</button></div>
    </section>
  );
}

function ModelCard({ model }: { model: ModelView }): React.JSX.Element {
  return (
    <article className={`model-card ${model.tone}`}>
      <header><h3>{model.name}</h3><span>Durum: deneysel</span></header>
      <div className={`world-visual ${model.shape}`}>
        <span className="observer-pin">●</span>
        <span className="target-pin">●</span>
        <span className="route" />
      </div>
      <div className="profile-view">
        <div className="profile-label left">Gözlemci<br /><b>50 m</b></div>
        <div className="profile-label right">Hedef<br /><b>15 m</b></div>
        <span className="line-of-sight" />
        <span className={`surface ${model.shape}`} />
      </div>
      <div className="metric-grid">
        <div><small>Beklenen görünürlük</small><strong>{model.visible}</strong></div>
        <div><small>Gizlenen kısım</small><strong>{model.hidden}</strong></div>
        <div><small>Ufuk mesafesi</small><strong>{model.horizon}</strong></div>
        <div><small>Görüş açısı</small><strong>{model.angle}</strong></div>
      </div>
    </article>
  );
}

function ResultsTable(): React.JSX.Element {
  const rows = useMemo(() => models, []);

  return (
    <section className="results panel">
      <span className="eyebrow">Sonuç karşılaştırma</span>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Model</th><th>Beklenen görünürlük</th><th>Gizlenen</th><th>Görüş açısı</th><th>Ufuk</th><th>Gözleme uyum</th></tr></thead>
          <tbody>
            {rows.map((model) => (
              <tr key={model.id}>
                <td><span className={`model-dot ${model.tone}`} />{model.name}<small>{model.status}</small></td>
                <td>{model.visible}</td><td>{model.hidden}</td><td>{model.angle}</td><td>{model.horizon}</td>
                <td><div className="agreement"><span><i style={{ width: `${model.agreement}%` }} /></span><b>%{model.agreement}</b></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><button className="menu-button">☰</button><strong>GEOMETRİK GÖZLEM LABORATUVARI</strong><span>Simülasyon Odası</span></div>
        <div className="top-actions"><button>▤ Veri Yöneticisi</button><button>⚙ Ayarlar</button><button>ⓘ Yardım</button></div>
      </header>
      <div className="workspace">
        <Sidebar />
        <main className="main-content">
          <div className="top-grid"><ScenarioSummary /><ObservationPanel /></div>
          <div className="model-grid">{models.map((model) => <ModelCard key={model.id} model={model} />)}</div>
          <div className="bottom-grid">
            <ResultsTable />
            <section className="notes panel"><span className="eyebrow">Notlar</span><ul><li>Gözlemde geminin yaklaşık %40'ı görünmektedir.</li><li>Hava durumu: açık</li><li>Deniz seviyesi belirsizliği: ±0,5 m</li><li>Standart kırılma varsayımı: k = 0,13</li></ul><p>Bu ekrandaki sonuçlar tasarım amaçlı demo veridir.</p></section>
          </div>
        </main>
      </div>
    </div>
  );
}
