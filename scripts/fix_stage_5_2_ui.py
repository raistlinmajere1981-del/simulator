from pathlib import Path

path = Path('src/renderer/src/PhotoCalibrationControl.tsx')
text = path.read_text()
text = text.replace(
    "  }, [experimentId, savedCalibration]);\n",
    "  // Parent calibration updates in the same experiment must not discard the session photo preview.\n  }, [experimentId]);\n",
    1
)
text = text.replace(
    "  const source = draft.source;\n  const marks = draft.marks;\n",
    "  const source = draft.source;\n  const marks = draft.marks;\n  const markerRadius = source ? Math.max(8, source.imageWidthPx * 0.012) : 10;\n  const markerLabelSize = source ? Math.max(16, source.imageWidthPx * 0.024) : 24;\n",
    1
)
text = text.replace(
    "                    <circle cx={mark.xPx} cy={mark.yPx} r={10} />\n                    <text x={mark.xPx + 14} y={mark.yPx - 14}>{markShortLabels[key]}</text>\n",
    "                    <circle cx={mark.xPx} cy={mark.yPx} r={markerRadius} />\n                    <text\n                      style={{ fontSize: `${markerLabelSize}px` }}\n                      x={mark.xPx + markerRadius * 1.35}\n                      y={mark.yPx - markerRadius * 1.35}\n                    >{markShortLabels[key]}</text>\n",
    1
)
path.write_text(text)

path = Path('src/renderer/src/photo-calibration-control.css')
text = path.read_text()
text = text.replace('  font-size: 24px;\n  font-weight: 800;\n', '  font-weight: 800;\n', 1)
path.write_text(text)
