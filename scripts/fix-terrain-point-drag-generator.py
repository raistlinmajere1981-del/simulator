from pathlib import Path

path = Path('scripts/apply-terrain-point-drag.py')
text = path.read_text(encoding='utf-8')

old_ref = "  const dragState = useRef<TerrainPointDragState>();"
new_ref = "  const dragState = useRef<TerrainPointDragState | undefined>(undefined);"
if text.count(old_ref) != 1:
    raise RuntimeError(f'Expected one drag ref template, found {text.count(old_ref)}')
text = text.replace(old_ref, new_ref, 1)

start_marker = "replace_once(\n    'docs/terrain-profile.md',"
end_marker = "\nreplace_once(\n    'docs/roadmap.md',"
start = text.index(start_marker)
end = text.index(end_marker, start)
replacement = '''replace_once(
    'docs/terrain-profile.md',
    """## Görüş hattı açıklığı
""",
    """## Grafik üzerinde düzenleme

Manuel ara noktalar profil grafiğindeki işaretlerinden sürüklenebilir. Yatay hareket
rota yüzdesini, düşey hareket zemin yüksekliğini değiştirir. Noktalar komşularını
geçemez; başlangıç ve bitiş uçları sürüklenemez. Her hareket aynı manuel profil
doğrulamasından geçer ve içe aktarılmış bir kaynağı değiştirilmiş olarak işaretler.

## Görüş hattı açıklığı
""",
    'terrain profile drag documentation'
)
replace_once(
    'docs/terrain-profile.md',
    """- CSV veya GeoJSON profil içe aktarma,
- profil noktalarını grafik üzerinde sürükleyerek düzenleme,
""",
    """""",
    'remove completed terrain profile limits'
)'''
text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
