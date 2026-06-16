import { create } from 'zustand';
import { DiffLine, ViewMode, DiffStats, CollapsedRegion } from '@/types/diff';
import { formatDiff, computeStats, findCollapsedRegions } from '@/utils/diffFormatter';

interface DiffState {
  oldCode: string;
  newCode: string;
  diffLines: DiffLine[];
  stats: DiffStats;
  collapsedRegions: CollapsedRegion[];
  expandedRegions: Set<number>;
  viewMode: ViewMode;
  hasCompared: boolean;

  setOldCode: (code: string) => void;
  setNewCode: (code: string) => void;
  setViewMode: (mode: ViewMode) => void;
  compare: () => void;
  toggleRegion: (regionIndex: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  clearAll: () => void;
}

const sampleOld = `function calculateSum(arr) {
  let result = 0;
  for (let i = 0; i < arr.length; i++) {
    result += arr[i];
  }
  return result;
}

const numbers = [1, 2, 3, 4, 5];
console.log(calculateSum(numbers));`;

const sampleNew = `function calculateSum(arr) {
  return arr.reduce((sum, num) => sum + num, 0);
}

function calculateAverage(arr) {
  if (arr.length === 0) return 0;
  return calculateSum(arr) / arr.length;
}

const numbers = [1, 2, 3, 4, 5, 6];
console.log('Sum:', calculateSum(numbers));
console.log('Average:', calculateAverage(numbers));`;

export const useDiffStore = create<DiffState>((set, get) => ({
  oldCode: sampleOld,
  newCode: sampleNew,
  diffLines: [],
  stats: { insertions: 0, deletions: 0, equal: 0 },
  collapsedRegions: [],
  expandedRegions: new Set<number>(),
  viewMode: 'split',
  hasCompared: false,

  setOldCode: (code: string) => set({ oldCode: code, hasCompared: false }),
  setNewCode: (code: string) => set({ newCode: code, hasCompared: false }),
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  compare: () => {
    const { oldCode, newCode } = get();
    const diffLines = formatDiff(oldCode, newCode);
    const stats = computeStats(diffLines);
    const collapsedRegions = findCollapsedRegions(diffLines, 3);
    set({
      diffLines,
      stats,
      collapsedRegions,
      expandedRegions: new Set<number>(),
      hasCompared: true,
    });
  },

  toggleRegion: (regionIndex: number) => {
    const { expandedRegions } = get();
    const newSet = new Set(expandedRegions);
    if (newSet.has(regionIndex)) {
      newSet.delete(regionIndex);
    } else {
      newSet.add(regionIndex);
    }
    set({ expandedRegions: newSet });
  },

  expandAll: () => {
    const { collapsedRegions } = get();
    const newSet = new Set<number>();
    collapsedRegions.forEach((_, i) => newSet.add(i));
    set({ expandedRegions: newSet });
  },

  collapseAll: () => {
    set({ expandedRegions: new Set<number>() });
  },

  clearAll: () => {
    set({
      oldCode: '',
      newCode: '',
      diffLines: [],
      stats: { insertions: 0, deletions: 0, equal: 0 },
      collapsedRegions: [],
      expandedRegions: new Set<number>(),
      hasCompared: false,
    });
  },
}));
