import { create } from 'zustand';
import {
  DiffLine,
  ViewMode,
  DiffStats,
  CollapsedRegion,
  CompareOptions,
  DiffSession,
  FileEntry,
  AppMode,
  FileChangeStatus,
} from '@/types/diff';
import { formatDiff, computeStats, findCollapsedRegions } from '@/utils/diffFormatter';

const STORAGE_KEY = 'diff-tool-sessions-v1';

interface DiffState {
  appMode: AppMode;
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
  sessions: DiffSession[];
  projectFiles: FileEntry[];
  activeFileId: string | null;

  setAppMode: (mode: AppMode) => void;
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

  loadSessions: () => void;
  saveSession: (name?: string) => string;
  restoreSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  deleteSession: (id: string) => void;

  loadProjectFiles: (oldFiles: Map<string, string>, newFiles: Map<string, string>) => void;
  setActiveFileId: (id: string | null) => void;
  toggleFileSelection: (id: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  getSelectedFiles: () => FileEntry[];
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

function readSessionsFromStorage(): DiffSession[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DiffSession[];
    return [];
  } catch {
    return [];
  }
}

function writeSessionsToStorage(sessions: DiffSession[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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
    isSearchMatch:
      line.oldContent.toLowerCase().includes(lowerKeyword) ||
      line.newContent.toLowerCase().includes(lowerKeyword) ||
      line.content.toLowerCase().includes(lowerKeyword),
  }));
}

function applyCurrentDiffHighlight(
  diffLines: DiffLine[],
  diffLineIndices: number[],
  currentDiffIndex: number
): DiffLine[] {
  if (
    diffLineIndices.length === 0 ||
    currentDiffIndex < 0 ||
    currentDiffIndex >= diffLineIndices.length
  ) {
    return diffLines.map((line) => ({ ...line, isCurrentDiff: false }));
  }
  const targetIdx = diffLineIndices[currentDiffIndex];
  return diffLines.map((line, i) => ({
    ...line,
    isCurrentDiff: i === targetIdx,
  }));
}

function computeFileStatus(oldContent: string | undefined, newContent: string | undefined): FileChangeStatus {
  if (oldContent === undefined && newContent !== undefined) return 'added';
  if (oldContent !== undefined && newContent === undefined) return 'deleted';
  if (oldContent === newContent) return 'unchanged';
  return 'modified';
}

export const useDiffStore = create<DiffState>((set, get) => ({
  appMode: 'single',
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
  sessions: readSessionsFromStorage(),
  projectFiles: [],
  activeFileId: null,

  setAppMode: (mode: AppMode) => set({ appMode: mode }),
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
      projectFiles: [],
      activeFileId: null,
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

  loadSessions: () => {
    set({ sessions: readSessionsFromStorage() });
  },

  saveSession: (name?: string) => {
    const {
      oldCode,
      newCode,
      oldFileName,
      newFileName,
      viewMode,
      compareOptions,
      sessions,
    } = get();

    const displayName =
      name && name.trim()
        ? name.trim()
        : oldFileName && newFileName
        ? `${oldFileName} vs ${newFileName}`
        : `会话 ${new Date().toLocaleString('zh-CN')}`;

    const session: DiffSession = {
      id: genId(),
      name: displayName,
      createdAt: Date.now(),
      oldCode,
      newCode,
      oldFileName,
      newFileName,
      viewMode,
      compareOptions: { ...compareOptions },
    };

    const newSessions = [session, ...sessions].slice(0, 50);
    writeSessionsToStorage(newSessions);
    set({ sessions: newSessions });
    return session.id;
  },

  restoreSession: (id: string) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === id);
    if (!session) return;

    set({
      oldCode: session.oldCode,
      newCode: session.newCode,
      oldFileName: session.oldFileName,
      newFileName: session.newFileName,
      viewMode: session.viewMode,
      compareOptions: { ...session.compareOptions },
      hasCompared: false,
      diffLines: [],
      stats: { insertions: 0, deletions: 0, equal: 0 },
      collapsedRegions: [],
      expandedRegions: new Set<number>(),
      showChangesOnly: false,
      searchKeyword: '',
      currentDiffIndex: -1,
      diffLineIndices: [],
      appMode: 'single',
      projectFiles: [],
      activeFileId: null,
    });

    setTimeout(() => {
      get().compare();
    }, 0);
  },

  renameSession: (id: string, name: string) => {
    const { sessions } = get();
    const newSessions = sessions.map((s) =>
      s.id === id ? { ...s, name: name.trim() || s.name } : s
    );
    writeSessionsToStorage(newSessions);
    set({ sessions: newSessions });
  },

  deleteSession: (id: string) => {
    const { sessions } = get();
    const newSessions = sessions.filter((s) => s.id !== id);
    writeSessionsToStorage(newSessions);
    set({ sessions: newSessions });
  },

  loadProjectFiles: (oldFiles: Map<string, string>, newFiles: Map<string, string>) => {
    const { compareOptions } = get();
    const allPaths = new Set<string>();
    oldFiles.forEach((_, path) => allPaths.add(path));
    newFiles.forEach((_, path) => allPaths.add(path));

    const sortedPaths = Array.from(allPaths).sort();
    const projectFiles: FileEntry[] = sortedPaths.map((path) => {
      const oldContent = oldFiles.get(path);
      const newContent = newFiles.get(path);
      const status = computeFileStatus(oldContent, newContent);

      let diffLines: DiffLine[] = [];
      let stats: DiffStats = { insertions: 0, deletions: 0, equal: 0 };

      if (status !== 'unchanged') {
        diffLines = formatDiff(oldContent ?? '', newContent ?? '', compareOptions);
        stats = computeStats(diffLines);
      }

      return {
        id: genId(),
        path,
        status,
        oldContent: oldContent ?? '',
        newContent: newContent ?? '',
        diffLines,
        stats,
        selected: status !== 'unchanged',
      };
    });

    const firstChanged = projectFiles.find((f) => f.status !== 'unchanged');

    set({
      projectFiles,
      activeFileId: firstChanged?.id ?? null,
      appMode: 'project',
      hasCompared: true,
    });

    if (firstChanged) {
      get().setActiveFileId(firstChanged.id);
    }
  },

  setActiveFileId: (id: string | null) => {
    const { projectFiles, compareOptions, searchKeyword } = get();
    const file = projectFiles.find((f) => f.id === id);
    if (!file) {
      set({ activeFileId: null });
      return;
    }

    const diffLines = formatDiff(file.oldContent, file.newContent, compareOptions);
    const stats = computeStats(diffLines);
    const collapsedRegions = findCollapsedRegions(diffLines, 3);
    const diffLineIndices = getDiffLineIndices(diffLines);
    const withSearch = applySearchHighlight(diffLines, searchKeyword);
    const withCurrent = applyCurrentDiffHighlight(withSearch, diffLineIndices, 0);

    set({
      activeFileId: id,
      oldCode: file.oldContent,
      newCode: file.newContent,
      oldFileName: file.path,
      newFileName: file.path,
      diffLines: withCurrent,
      stats,
      collapsedRegions,
      expandedRegions: new Set<number>(),
      currentDiffIndex: diffLineIndices.length > 0 ? 0 : -1,
      diffLineIndices,
    });
  },

  toggleFileSelection: (id: string) => {
    const { projectFiles } = get();
    const newFiles = projectFiles.map((f) =>
      f.id === id ? { ...f, selected: !f.selected } : f
    );
    set({ projectFiles: newFiles });
  },

  selectAllFiles: () => {
    const { projectFiles } = get();
    const newFiles = projectFiles.map((f) => ({ ...f, selected: true }));
    set({ projectFiles: newFiles });
  },

  deselectAllFiles: () => {
    const { projectFiles } = get();
    const newFiles = projectFiles.map((f) => ({ ...f, selected: false }));
    set({ projectFiles: newFiles });
  },

  getSelectedFiles: () => {
    const { projectFiles } = get();
    return projectFiles.filter((f) => f.selected);
  },
}));
