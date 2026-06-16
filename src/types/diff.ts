export enum DiffLineType {
  EQUAL = 'equal',
  INSERT = 'insert',
  DELETE = 'delete',
}

export interface InlineDiff {
  type: DiffLineType;
  value: string;
}

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  inlineDiffs?: InlineDiff[];
}

export interface EditOperation {
  type: 'insert' | 'delete' | 'equal';
  oldIndex: number;
  newIndex: number;
}

export interface CollapsedRegion {
  startIndex: number;
  endIndex: number;
  lineCount: number;
}

export type ViewMode = 'unified' | 'split';

export interface DiffStats {
  insertions: number;
  deletions: number;
  equal: number;
}
