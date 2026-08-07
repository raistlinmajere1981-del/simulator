from pathlib import Path

path = Path('docs/roadmap.md')
text = path.read_text()
current = """## Aşama 4.2 — Optik kırılma indisi ve katmanlı ışın izi

- görünür ışık için açık dalga boyu seçimi
- formülü ve geçerlilik sınırları izlenebilir optik kırılma indisi
- katman sınırlarında ışın ilerleme hesabı
- küresel ve düzlemsel yüzey geometrisinden ayrı atmosfer çözümü
- standart `k` yaklaşımıyla karşılaştırma

## Aşama 4.3 — Atmosfer profili arayüzü ve kayıt

- profil noktası editörü
- profil görsel katmanı
- deney kaydı / yeniden açma / taşınabilir provenans
- standart ve gelişmiş atmosfer sonuçlarının yan yana gösterimi
"""
expected = """## Aşama 4.2 — Optik kırılma ve katmanlı ışın izi

- görünür ışık için dalga boyuna bağlı kırılma indisi
- meteorolojik profilden `dn/dh`
- katmanlı ışın izi
- standart `k` yaklaşımıyla ayrı sonuç yolu

## Aşama 4.3 — Atmosfer arayüzü ve deney entegrasyonu

- sıcaklık / basınç / nem profil editörü
- dalga boyu ve optik ayarlar
- deney kayıtlarında atmosfer provenansı
- standart ve gelişmiş sonuçların karşılaştırılması
"""
if current in text:
    path.write_text(text.replace(current, expected, 1))
elif expected not in text:
    raise SystemExit('roadmap normalization anchor not found')
