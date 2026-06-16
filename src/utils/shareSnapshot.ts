import LZString from 'lz-string';
import type { CompareOptions, ViewMode } from '@/types/diff';

export interface SnapshotParams {
  oldCode: string;
  newCode: string;
  oldFileName: string;
  newFileName: string;
  viewMode: ViewMode;
  compareOptions: CompareOptions;
}

export function encodeSnapshot(params: SnapshotParams): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(params));
}

export function decodeSnapshot(encoded: string): SnapshotParams | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (
      typeof parsed.oldCode !== 'string' ||
      typeof parsed.newCode !== 'string' ||
      typeof parsed.oldFileName !== 'string' ||
      typeof parsed.newFileName !== 'string' ||
      typeof parsed.viewMode !== 'string' ||
      typeof parsed.compareOptions !== 'object'
    ) {
      return null;
    }
    return parsed as SnapshotParams;
  } catch {
    return null;
  }
}

export function generateShareUrl(encoded: string): string {
  return `${window.location.origin}${window.location.pathname}#snapshot=${encoded}`;
}

export function extractSnapshotFromUrl(): SnapshotParams | null {
  const hash = window.location.hash;
  const match = hash.match(/^#snapshot=(.+)$/);
  if (!match) return null;
  return decodeSnapshot(match[1]);
}
