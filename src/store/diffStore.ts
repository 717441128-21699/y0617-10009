import { create } from 'zustand';
import { DiffLine, ViewMode, DiffStats, CollapsedRegion, CompareOptions } from '@/types/diff';
import { formatDiff, computeStats, findCollapsedRegions } from '@/utils/diffFormatter';

interface DiffState {
  oldCode: string;
  newCode: string;
  oldFileName: string;
  newFileName: string;
  diffLines: DiffLine[];
  stats: DiffStats;
  collapsedRegions: CollapsedRegion[];
  expandedRegions: Set<number>;
  viewMode: ViewMode;
  hasCompared: boolean;
  compareOptions: CompareOptions;
  showChangesOnly: boolean;
  searchKeyword: string;
  currentDiffIndex: number;
  diffLineIndices: number[];

  setOldCode: (code: string) => void;
  setNewCode: (code: string) => void;
  setOldFileName: (name: string) => void;
  setNewFileName: (name: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setCompareOption: (key: keyof CompareOptions, value: boolean) => void;
  setShowChangesOnly: (value: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  compare: () => void;
  toggleRegion: (regionIndex: number) => void;
  expandAll: () => void;
  collapseAll: () => void;
  clearAll: () => void;
  goToNextDiff: () => void;
  goToPrevDiff: () => void;
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

const defaultCompareOptions: CompareOptions = {
  ignoreTrailingWhitespace: false,
  ignoreAllWhitespace: false,
  ignoreCase: false,
  ignoreBlankLines: false,
};

function getDiffLineIndices(diffLines: DiffLine[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < diffLines.length; i++) {
    if (diffLines[i].type !== 'equal') {
      indices.push(i);
    }
  }
  return indices;
}

function applySearchHighlight(diffLines: DiffLine[], keyword: string): DiffLine[] {
  if (!keyword.trim()) return diffLines;
  const lowerKeyword = keyword.toLowerCase();
  return diffLines.map((line) => ({
    ...line,
    isSearchMatch: line.content.toLowerCase().includes(lowerKeyword),
  }));
}

function applyCurrentDiffHighlight(
  diffLines: DiffLine[],
  diffLineIndices: number[],
  currentDiffIndex: number
): DiffLine[] {
  if (diffLineIndices.length === 0 || currentDiffIndex < 0 || currentDiffIndex >= diffLineIndices.length) {
    return diffLines.map((line) => ({ ...line, isCurrentDiff: false }));
  }
  const targetIdx = diffLineIndices[currentDiffIndex];
  return diffLines.map((line, i) => ({
    ...line,
    isCurrentDiff: i === targetIdx,
  }));
}

export const useDiffStore = create<DiffState>((set, get) => ({
  oldCode: sampleOld,
  newCode: sampleNew,
  oldFileName: '',
  newFileName: '',
  diffLines: [],
  stats: { insertions: 0, deletions: 0, equal: 0 },
  collapsedRegions: [],
  expandedRegions: new Set<number>(),
  viewMode: 'split',
  hasCompared: false,
  compareOptions: defaultCompareOptions,
  showChangesOnly: false,
  searchKeyword: '',
  currentDiffIndex: -1,
  diffLineIndices: [],

  setOldCode: (code: string) => set({ oldCode: code, hasCompared: false }),
  setNewCode: (code: string) => set({ newCode: code, hasCompared: false }),
  setOldFileName: (name: string) => set({ oldFileName: name }),
  setNewFileName: (name: string) => set({ newFileName: name }),
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  setCompareOption: (key: keyof CompareOptions, value: boolean) => {
    const { compareOptions } = get();
    const newOptions = { ...compareOptions, [key]: value };
    set({ compareOptions: newOptions });
    if (get().hasCompared) {
      get().compare();
    }
  },

  setShowChangesOnly: (value: boolean) => set({ showChangesOnly: value }),
  setSearchKeyword: (keyword: string) => {
    const { diffLines } = get();
    const updated = applySearchHighlight(diffLines, keyword);
    set({ searchKeyword: keyword, diffLines: updated });
  },

  compare: () => {
    const { oldCode, newCode, compareOptions, searchKeyword } = get();
    const diffLines = formatDiff(oldCode, newCode, compareOptions);
    const stats = computeStats(diffLines);
    const collapsedRegions = findCollapsedRegions(diffLines, 3);
    const diffLineIndices = getDiffLineIndices(diffLines);
    const withSearch = applySearchHighlight(diffLines, searchKeyword);
    const withCurrent = applyCurrentDiffHighlight(withSearch, diffLineIndices, 0);
    set({
      diffLines: withCurrent,
      stats,
      collapsedRegions,
      expandedRegions: new Set<number>(),
      hasCompared: true,
      currentDiffIndex: diffLineIndices.length > 0 ? 0 : -1,
      diffLineIndices,
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
      oldFileName: '',
      newFileName: '',
      diffLines: [],
      stats: { insertions: 0, deletions: 0, equal: 0 },
      collapsedRegions: [],
      expandedRegions: new Set<number>(),
      hasCompared: false,
      showChangesOnly: false,
      searchKeyword: '',
      currentDiffIndex: -1,
      diffLineIndices: [],
    });
  },

  goToNextDiff: () => {
    const { diffLineIndices, currentDiffIndex, diffLines, searchKeyword } = get();
    if (diffLineIndices.length === 0) return;
    const nextIdx = (currentDiffIndex + 1) % diffLineIndices.length;
    const updated = applyCurrentDiffHighlight(diffLines, diffLineIndices, nextIdx);
    const withSearch = applySearchHighlight(updated, searchKeyword);
    set({ currentDiffIndex: nextIdx, diffLines: withSearch });
  },

  goToPrevDiff: () => {
    const { diffLineIndices, currentDiffIndex, diffLines, searchKeyword } = get();
    if (diffLineIndices.length === 0) return;
    const prevIdx = currentDiffIndex <= 0 ? diffLineIndices.length - 1 : currentDiffIndex - 1;
    const updated = applyCurrentDiffHighlight(diffLines, diffLineIndices, prevIdx);
    const withSearch = applySearchHighlight(updated, searchKeyword);
    set({ currentDiffIndex: prevIdx, diffLines: withSearch });
  },
}));
