import fs from 'node:fs';

function patchFile(path, patches) {
  let source = fs.readFileSync(path, 'utf8');
  for (const { label, before, after } of patches) {
    const first = source.indexOf(before);
    if (first < 0) throw new Error(`${path} [${label}] beklenen kaynak parçası bulunamadı`);
    if (source.indexOf(before, first + before.length) >= 0) {
      throw new Error(`${path} [${label}] kaynak parçası birden fazla kez bulundu`);
    }
    source = source.slice(0, first) + after + source.slice(first + before.length);
  }
  fs.writeFileSync(path, source);
}

patchFile('src/report/html-report.ts', [
  {
    label: 'stellar model name',
    before: "  'dual-shadow-comparison': 'İki Konumlu Gölge Karşılaştırması · Astronomik Referans'\n};",
    after: "  'dual-shadow-comparison': 'İki Konumlu Gölge Karşılaştırması · Astronomik Referans',\n  'stellar-observation-reference': 'Yıldız Gözlemi · Astronomik Referans'\n};"
  }
]);

patchFile('docs/roadmap.md', [
  {
    label: 'stages 6.7 and 6.8',
    before: "### Sonraki astronomi dilimleri\n\n- yıldız görünürlüğü ve yıldız izleri",
    after: "### Aşama 6.6 — Yıldız konumu ve iz geometrisi çekirdeği\n\nDurum: tamamlandı · `1.12.1`\n\n- gözlem tarihine ait RA/Dec → geometrik yükseklik/azimut\n- GMST / LMST ve saat açısı\n- circumpolar / doğup-batan / hiç-doğmayan / ufka teğet sınıfları\n- 48 saate kadar geometrik yıldız izi ve ufuk geçişleri\n\nAyrıntı: [`roadmap-stage-6.6.md`](roadmap-stage-6.6.md)\n\n### Aşama 6.7 — Yıldız katalog koordinatı ve gözlem tarihine dönüşüm\n\nDurum: tamamlandı · `1.12.2`\n\n- IAU 2006 precession ve açık ICRS / ortalama J2000 çerçeve ayrımı\n- SOFA referans matrisine bağlı regresyon\n- BSC5P tabanlı çevrimdışı parlak-yıldız referans altkümesi\n- J2000 katalog yönünü sessizce of-date kabul etmeme\n\nAyrıntı: [`roadmap-stage-6.7.md`](roadmap-stage-6.7.md)\n\n### Aşama 6.8 — Yıldız Gözlemleri arayüzü ve kayıt entegrasyonu\n\nDurum: tamamlandı · `1.13.0`\n\n- Yıldız Gözlemleri senaryosunu etkinleştirme\n- katalog yıldızı seçimi, J2000 → gözlem tarihi provenansı\n- anlık geometrik konum, LMST ve günlük ufuk sınıfı\n- 3–48 saat yıldız izi, geometrik ufuk geçişleri ve ufuk-üstü süre\n- prediction snapshot üzerinden reopen ve portable kayıt korunumu\n- HTML rapor ve hesap izi entegrasyonu\n\nAyrıntı: [`roadmap-stage-6.8.md`](roadmap-stage-6.8.md)\n\n### Sonraki astronomi dilimleri\n\n- proper motion ve katalog epoch düzeltmeleri\n- optik yıldız görünürlüğü ve topoğrafik ufuk\n- çoklu yıldız / gökyüzü görselleştirmesi"
  }
]);

console.log('Stellar report/roadmap integration applied successfully.');
