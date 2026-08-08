from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected 1 match, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'src/report/html-report.ts',
    "'Geometrik Güneş ve topocentrik Ay referansı'",
    "'Geometrik Güneş konumu ve topocentrik Ay referansı'"
)
replace_once(
    'docs/roadmap-stage-6.3.md',
    'Durum: geliştirmede · `1.10.0`',
    'Durum: tamamlandı · `1.10.0`'
)
print('stage 6.3 compatibility/docs patch applied')
