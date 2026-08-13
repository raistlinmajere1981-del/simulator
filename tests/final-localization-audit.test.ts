import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string): string => readFileSync(resolve(root, path), 'utf-8');

describe('final localization audit', () => {
  it('carries optional UiLocale through the desktop file-operation contract', () => {
    const api = read('src/shared/simulator.ts');
    const preload = read('src/preload/index.ts');

    expect(api).toContain('saveExperiment(experiment: SavedExperiment, locale?: UiLocale)');
    expect(api).toContain('exportExperiment(id: string, locale?: UiLocale)');
    expect(api).toContain('importExperiment(locale?: UiLocale)');
    expect(api).toContain('importObservationPhoto(locale?: UiLocale)');
    expect(api).toContain('importStellarLocalHorizon(locale?: UiLocale)');
    expect(api).toContain('importStellarDemSkyline(locale?: UiLocale)');
    expect(api).toContain('importStellarPanoramaSkyline(locale?: UiLocale)');
    expect(api).toContain('locale?: UiLocale');

    expect(preload).toContain("ipcRenderer.invoke('experiments:export', id, locale)");
    expect(preload).toContain("ipcRenderer.invoke('photo:import', locale)");
    expect(preload).toContain("ipcRenderer.invoke('stellar-skyline-dem:import', locale)");
    expect(preload).toContain("ipcRenderer.invoke('stellar-skyline-panorama:import', locale)");
    expect(preload).toContain("ipcRenderer.invoke('terrain:import-csv', context, locale)");
    expect(preload).toContain("'terrain:import-dem'");
    expect(preload).toMatch(/'terrain:import-dem',[\s\S]*context,[\s\S]*locale/);
  });

  it('localizes IPC-owned dialog chrome while retaining Turkish as the default locale', () => {
    const experiment = read('src/main/experiment-ipc.ts');
    const photo = read('src/main/photo-ipc.ts');
    const terrain = read('src/main/terrain-import-ipc.ts');
    const stellarDem = read('src/main/stellar-dem-skyline-ipc.ts');
    const panorama = read('src/main/stellar-panorama-skyline-ipc.ts');

    expect(experiment).toContain("'Export Experiment'");
    expect(experiment).toContain("'Import Experiment File'");
    expect(photo).toContain("'Open Observation Photo'");
    expect(terrain).toContain("'Import CSV Terrain Profile'");
    expect(terrain).toContain("'Import GeoJSON Terrain Profile'");
    expect(stellarDem).toContain("'Select ESRI ASCII DEM for 360° Skyline'");
    expect(panorama).toContain("'Select Panorama for 360° Skyline'");

    expect(experiment).toContain("'Deneyi Dışa Aktar'");
    expect(photo).toContain("'Gözlem Fotoğrafını Aç'");
  });

  it('passes the active renderer locale to interactive desktop operations', () => {
    const app = read('src/renderer/src/AppNext.tsx');
    const photo = read('src/renderer/src/PhotoCalibrationControl.tsx');
    const terrain = read('src/renderer/src/MultiPointTerrainEditor.tsx');
    const stellarDem = read('src/renderer/src/StellarDemSkylineControl.tsx');
    const panorama = read('src/renderer/src/StellarPanoramaSkylineControl.tsx');

    expect(app).toContain('saveExperiment(record, locale)');
    expect(app).toContain('exportExperiment(saved.id, locale)');
    expect(app).toContain('importExperiment(locale)');
    expect(app).toContain('importStellarLocalHorizon(locale)');
    expect(app).toContain('importStellarMotionSource(locale)');
    expect(photo).toContain('importObservationPhoto(locale)');
    expect(photo).toContain('loadObservationPhoto(savedCalibration.source, locale)');
    expect(terrain).toContain('const { locale, t } = useI18n()');
    expect(stellarDem).toContain('importStellarDemSkyline(locale)');
    expect(panorama).toContain('importStellarPanoramaSkyline(locale)');
  });

  it('keeps raw source evidence and legacy persisted collision naming unchanged', () => {
    const panorama = read('src/main/stellar-panorama-skyline-ipc.ts');
    const experiment = read('src/main/experiment-ipc.ts');

    expect(panorama).toContain(
      'PNG görüntüsünde GPano JPEG XMP otomatik okuması uygulanmadı; yön/crop geometrisi manuel doğrulanmalıdır.'
    );
    expect(experiment).toContain('`${parsed.experiment.name} (İçe aktarıldı)`');
  });

  it('removes the accidentally tracked historical localization helper', () => {
    expect(
      existsSync(resolve(root, 'scripts/apply-i18n-stellar-panorama-assisted.py'))
    ).toBe(false);
  });
});
