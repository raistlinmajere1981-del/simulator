import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  HELP_PANELS,
  getHelpPanel,
  getHelpTerm,
  searchHelp,
  type HelpPanelId
} from '../../shared/help-content';
import './help-system.css';

interface HelpContextValue {
  openPanel(id: HelpPanelId): void;
  openCatalog(): void;
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

export function HelpProvider({
  children,
  onOpenPanel,
  onOpenCatalog
}: {
  children: React.ReactNode;
  onOpenPanel(id: HelpPanelId): void;
  onOpenCatalog(): void;
}): React.JSX.Element {
  const value = useMemo<HelpContextValue>(() => ({
    openPanel: onOpenPanel,
    openCatalog: onOpenCatalog
  }), [onOpenCatalog, onOpenPanel]);
  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  const value = useContext(HelpContext);
  if (!value) throw new Error('useHelp, HelpProvider içinde kullanılmalıdır.');
  return value;
}

export function PanelHelpButton({ panelId, label = 'Bu panel hakkında yardım' }: {
  panelId: HelpPanelId;
  label?: string;
}): React.JSX.Element {
  const { openPanel } = useHelp();
  return (
    <button
      aria-label={label}
      className="panel-help-button"
      title={label}
      type="button"
      onClick={() => openPanel(panelId)}
    >
      ?
    </button>
  );
}

function TermChip({ termId, onOpen }: { termId: string; onOpen(termId: string): void }): React.JSX.Element | null {
  const term = getHelpTerm(termId);
  if (!term) return null;
  return <button className="help-term-chip" type="button" onClick={() => onOpen(termId)}>{term.label}</button>;
}

function PanelArticle({ panelId, onOpenTerm }: { panelId: HelpPanelId; onOpenTerm(termId: string): void }): React.JSX.Element {
  const content = getHelpPanel(panelId);
  return (
    <article className="help-article">
      <div className="help-article-category">{content.category}</div>
      <h2>{content.title}</h2>
      <p className="help-summary">{content.summary}</p>

      {content.fields.length > 0 && (
        <section>
          <h3>Alanlar ve hesap etkisi</h3>
          <div className="help-field-list">
            {content.fields.map((field) => (
              <div className="help-field" key={field.label}>
                <div><strong>{field.label}</strong>{field.unit && <span>{field.unit}</span>}</div>
                <p>{field.description}</p>
                {field.calculationEffect && <small>{field.calculationEffect}</small>}
              </div>
            ))}
          </div>
        </section>
      )}

      {content.assumptions.length > 0 && (
        <section>
          <h3>Varsayımlar ve sınırlar</h3>
          <ul>{content.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}

      {content.commonMistakes.length > 0 && (
        <section>
          <h3>Yaygın hatalar</h3>
          <ul className="help-warning-list">{content.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}

      {content.example && (
        <section>
          <h3>Kısa örnek</h3>
          <p>{content.example}</p>
        </section>
      )}

      {content.relatedTerms.length > 0 && (
        <section>
          <h3>İlgili terimler</h3>
          <div className="help-term-row">
            {content.relatedTerms.map((termId) => <TermChip key={termId} termId={termId} onOpen={onOpenTerm} />)}
          </div>
        </section>
      )}
    </article>
  );
}

export function HelpOverlay({
  panelId,
  catalogOpen,
  onClose
}: {
  panelId?: HelpPanelId;
  catalogOpen: boolean;
  onClose(): void;
}): React.JSX.Element | null {
  const open = panelId !== undefined || catalogOpen;
  const [query, setQuery] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState<HelpPanelId | undefined>(panelId);
  const [selectedTermId, setSelectedTermId] = useState<string>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousActive.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousActive.current?.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedPanelId(panelId);
    setSelectedTermId(undefined);
    if (panelId !== undefined) setQuery('');
  }, [open, panelId]);

  const results = useMemo(() => searchHelp(query), [query]);
  if (!open) return null;

  const showCatalog = catalogOpen && selectedPanelId === undefined && selectedTermId === undefined;
  const selectedTerm = selectedTermId ? getHelpTerm(selectedTermId) : undefined;

  return (
    <div className="help-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div
        ref={dialogRef}
        aria-label="Uygulama yardımı"
        aria-modal="true"
        className="help-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <header className="help-dialog-header">
          <div>
            <span className="eyebrow">Bağlamsal yardım</span>
            <strong>{panelId ? getHelpPanel(panelId).title : 'Geometrik Gözlem Laboratuvarı Yardımı'}</strong>
          </div>
          <button aria-label="Yardımı kapat" className="help-close" type="button" onClick={onClose}>×</button>
        </header>

        {catalogOpen && (
          <div className="help-search-row">
            <input
              aria-label="Yardımda ara"
              autoComplete="off"
              placeholder="Panel veya terim ara: datum, FOV, DEM, kırılma…"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setSelectedPanelId(undefined);
                setSelectedTermId(undefined);
              }}
            />
            {(selectedPanelId || selectedTermId) && (
              <button type="button" onClick={() => {
                setSelectedPanelId(undefined);
                setSelectedTermId(undefined);
              }}>Tüm yardım</button>
            )}
          </div>
        )}

        <div className="help-dialog-body">
          {selectedPanelId ? (
            <PanelArticle panelId={selectedPanelId} onOpenTerm={(termId) => {
              setSelectedTermId(termId);
              setSelectedPanelId(undefined);
            }} />
          ) : selectedTerm ? (
            <article className="help-article help-term-article">
              <div className="help-article-category">Terim sözlüğü</div>
              <h2>{selectedTerm.label}</h2>
              <p className="help-summary">{selectedTerm.definition}</p>
              {selectedTerm.caution && <div className="help-term-caution">{selectedTerm.caution}</div>}
              <button type="button" onClick={() => setSelectedTermId(undefined)}>← Yardım listesine dön</button>
            </article>
          ) : showCatalog ? (
            <div className="help-catalog">
              <section>
                <h2>Paneller</h2>
                <div className="help-catalog-grid">
                  {results.panels.map((panel) => (
                    <button key={panel.id} type="button" onClick={() => setSelectedPanelId(panel.id)}>
                      <span>{panel.category}</span>
                      <strong>{panel.title}</strong>
                      <small>{panel.summary}</small>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2>Terimler</h2>
                <div className="help-term-row">
                  {results.terms.map((term) => (
                    <button className="help-term-chip" key={term.id} type="button" onClick={() => setSelectedTermId(term.id)}>{term.label}</button>
                  ))}
                </div>
              </section>
              {results.panels.length === 0 && results.terms.length === 0 && (
                <div className="help-empty">“{query}” için yardım kaydı bulunamadı.</div>
              )}
            </div>
          ) : panelId ? (
            <PanelArticle panelId={panelId} onOpenTerm={setSelectedTermId} />
          ) : (
            <div className="help-catalog">
              <section>
                <h2>Paneller</h2>
                <div className="help-catalog-grid">
                  {HELP_PANELS.map((panel) => (
                    <button key={panel.id} type="button" onClick={() => setSelectedPanelId(panel.id)}>
                      <span>{panel.category}</span><strong>{panel.title}</strong><small>{panel.summary}</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
