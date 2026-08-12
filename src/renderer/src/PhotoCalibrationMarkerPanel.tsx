import type { PointerEvent, RefObject } from 'react';
import type {
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoSourceMetadata
} from '../../shared/photo-calibration';
import {
  markLabels,
  markOrder,
  markShortLabels,
  markSummary,
  type MarkKey
} from './photo-calibration-state';

export function PhotoCalibrationMarkerPanel({
  preview,
  source,
  marks,
  selectedMark,
  touchedMarks,
  viewportRef,
  onPlaceSelectedMark,
  onSelectMark
}: {
  preview?: ImportedObservationPhoto;
  source?: PhotoSourceMetadata;
  marks?: PhotoCalibrationMarks;
  selectedMark: MarkKey;
  touchedMarks: ReadonlySet<MarkKey>;
  viewportRef: RefObject<HTMLDivElement | null>;
  onPlaceSelectedMark(event: PointerEvent<SVGSVGElement>): void;
  onSelectMark(mark: MarkKey): void;
}): React.JSX.Element {
  const markerRadius = source ? Math.max(8, source.imageWidthPx * 0.012) : 10;
  const markerLabelSize = source ? Math.max(14, source.imageWidthPx * 0.018) : 20;

  return (
    <>
      {preview && (
        <p className="photo-calibration-note">
          Sıradaki işaret: <strong>{markLabels[selectedMark]}</strong>. Fotoğraf üzerinde ilgili noktaya tıkla;
          seçim otomatik olarak sonraki işarete geçer.
        </p>
      )}

      {preview ? (
        <div
          className="photo-marking-viewport"
          ref={viewportRef}
          style={{ aspectRatio: `${preview.imageWidthPx} / ${preview.imageHeightPx}` }}
        >
          <img alt="Kalibrasyon için yüklenen gözlem" src={preview.dataUrl} />
          {marks && (
            <svg
              aria-label="Fotoğraf kalibrasyon işaretleri"
              onPointerDown={onPlaceSelectedMark}
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 ${preview.imageWidthPx} ${preview.imageHeightPx}`}
            >
              <line
                className="photo-horizon-line"
                x1={marks.horizonStart.xPx}
                y1={marks.horizonStart.yPx}
                x2={marks.horizonEnd.xPx}
                y2={marks.horizonEnd.yPx}
              />
              {markOrder.map((key) => {
                const mark = marks[key];
                return (
                  <g className={`photo-mark ${selectedMark === key ? 'active' : ''}`} key={key}>
                    <circle cx={mark.xPx} cy={mark.yPx} r={markerRadius} />
                    <text
                      style={{ fontSize: `${markerLabelSize}px` }}
                      x={mark.xPx + markerRadius * 1.35}
                      y={mark.yPx - markerRadius * 1.35}
                    >{markShortLabels[key]}</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ) : source ? (
        <div className="photo-preview-missing">
          Fotoğraf provenansı ve işaretler kayıtlı, ancak kaynak görüntü varlığı bu makinede yok.
          Aynı dosyayı yeniden seç; SHA-256 eşleşirse mevcut kalibrasyon ve işaretler korunur.
        </div>
      ) : null}

      {source && marks && (
        <>
          <div className="photo-mark-tools">
            {markOrder.map((key) => (
              <button
                className={selectedMark === key ? 'active' : ''}
                key={key}
                type="button"
                onClick={() => onSelectMark(key)}
              >
                <b>{markShortLabels[key]}</b>
                <span>{markLabels[key]}</span>
                <small>{touchedMarks.has(key) ? markSummary(marks[key]) : 'fotoğrafta tıkla'}</small>
              </button>
            ))}
          </div>
          {touchedMarks.size < markOrder.length && (
            <p className="photo-warning">
              Yeni fotoğraftaki örnek işaretler ölçüm değildir. Kalibrasyon için dört işaretin
              her birini fotoğraf üzerinde bir kez yerleştir ({touchedMarks.size}/4).
            </p>
          )}
        </>
      )}
    </>
  );
}
