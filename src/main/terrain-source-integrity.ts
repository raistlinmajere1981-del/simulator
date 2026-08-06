import { createHash } from 'node:crypto';
import type { TerrainSourceIntegrity } from '../shared/simulator';

export function calculateTerrainSourceIntegrity(
  bytes: Uint8Array
): TerrainSourceIntegrity {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Kaynak dosya özeti için bayt dizisi gerekli.');
  }
  return {
    fileSizeBytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}

export function attachTerrainSourceIntegrity<T extends object>(
  profile: T,
  integrity: TerrainSourceIntegrity
): T & TerrainSourceIntegrity {
  return { ...profile, ...integrity };
}
