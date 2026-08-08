from pathlib import Path

path = Path('src/renderer/src/AppNext.tsx')
text = path.read_text()

def replace_once(old: str, new: str, label: str) -> None:
    global text
    if old not in text:
        raise RuntimeError(f'{label}: anchor missing')
    text = text.replace(old, new, 1)

replace_once(
    '<span className="section-state">2 fiziksel</span>',
    '<span className="section-state">{activeScenarioId === \'sun-moon-observation\' ? \'1 astronomik referans\' : \'2 fiziksel\'}</span>',
    'model count label'
)

start = '''      <section className="side-section compact grow">
        <div className="section-heading">
          <span>Görsel katmanlar</span>
          <span className="section-state">4 / 5 hazır</span>
        </div>'''
replacement = '''      {activeScenarioId === 'sun-moon-observation' ? (
        <section className="side-section compact grow celestial-visual-placeholder">
          <div className="section-heading">
            <span>Görsel katmanlar</span>
            <span className="section-state">astronomi · sonraki dilim</span>
          </div>
          <div className="saved-empty">
            Güneş gökyüzü/ufuk görselleştirme katmanları daha sonraki astronomi aşamasında etkinleşecek. 6.1 sonucu şu anda sayısal geometrik referanstır.
          </div>
        </section>
      ) : (
      <section className="side-section compact grow">
        <div className="section-heading">
          <span>Görsel katmanlar</span>
          <span className="section-state">4 / 5 hazır</span>
        </div>'''
replace_once(start, replacement, 'visual layer conditional start')

end = '''        </label>
      </section>

      <CelestialTimeCard'''
replacement_end = '''        </label>
      </section>
      )}

      <CelestialTimeCard'''
replace_once(end, replacement_end, 'visual layer conditional end')

path.write_text(text)
Path('scripts/polish_stage_6_1_sidebar.py').unlink(missing_ok=True)
Path('.github/workflows/polish-stage-6-1-sidebar.yml').unlink(missing_ok=True)
