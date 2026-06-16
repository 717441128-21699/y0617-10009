import { DiffLine, DiffLineType, EditOperation, DiffStats, CollapsedRegion } from '@/types/diff';
import { myersDiff } from './myersDiff';
import { computeInlineDiff } from './inlineDiff';

export function formatDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const operations = myersDiff(oldLines, newLines);
  const diffLines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  const groupedOperations: EditOperation[][] = [];
  let currentGroup: EditOperation[] = [];

  for (const op of operations) {
    if (currentGroup.length === 0) {
      currentGroup.push(op);
    } else {
      const last = currentGroup[currentGroup.length - 1];
      if (
        (last.type === 'delete' && op.type === 'insert') ||
        (last.type === 'insert' && op.type === 'delete') ||
        last.type === op.type
      ) {
        currentGroup.push(op);
      } else {
        groupedOperations.push(currentGroup);
        currentGroup = [op];
      }
    }
  }
  if (currentGroup.length > 0) {
    groupedOperations.push(currentGroup);
  }

  for (const group of groupedOperations) {
    const deletes = group.filter((op) => op.type === 'delete');
    const inserts = group.filter((op) => op.type === 'insert');
    const equals = group.filter((op) => op.type === 'equal');

    if (equals.length > 0) {
      for (const op of equals) {
        diffLines.push({
          type: DiffLineType.EQUAL,
          content: oldLines[op.oldIndex] ?? '',
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
        });
        oldLineNum++;
        newLineNum++;
      }
    }

    if (deletes.length > 0 && inserts.length > 0) {
      const minLen = Math.min(deletes.length, inserts.length);
      for (let i = 0; i < minLen; i++) {
        const oldContent = oldLines[deletes[i].oldIndex] ?? '';
        const newContent = newLines[inserts[i].newIndex] ?? '';
        const { oldDiffs, newDiffs } = computeInlineDiff(oldContent, newContent);

        diffLines.push({
          type: DiffLineType.DELETE,
          content: oldContent,
          oldLineNumber: oldLineNum,
          newLineNumber: null,
          inlineDiffs: oldDiffs,
        });
        oldLineNum++;

        diffLines.push({
          type: DiffLineType.INSERT,
          content: newContent,
          oldLineNumber: null,
          newLineNumber: newLineNum,
          inlineDiffs: newDiffs,
        });
        newLineNum++;
      }

      for (let i = minLen; i < deletes.length; i++) {
        diffLines.push({
          type: DiffLineType.DELETE,
          content: oldLines[deletes[i].oldIndex] ?? '',
          oldLineNumber: oldLineNum,
          newLineNumber: null,
          inlineDiffs: [{ type: DiffLineType.DELETE, value: oldLines[deletes[i].oldIndex] ?? '' }],
        });
        oldLineNum++;
      }

      for (let i = minLen; i < inserts.length; i++) {
        diffLines.push({
          type: DiffLineType.INSERT,
          content: newLines[inserts[i].newIndex] ?? '',
          oldLineNumber: null,
          newLineNumber: newLineNum,
          inlineDiffs: [{ type: DiffLineType.INSERT, value: newLines[inserts[i].newIndex] ?? '' }],
        });
        newLineNum++;
      }
    } else {
      for (const op of deletes) {
        diffLines.push({
          type: DiffLineType.DELETE,
          content: oldLines[op.oldIndex] ?? '',
          oldLineNumber: oldLineNum,
          newLineNumber: null,
          inlineDiffs: [{ type: DiffLineType.DELETE, value: oldLines[op.oldIndex] ?? '' }],
        });
        oldLineNum++;
      }
      for (const op of inserts) {
        diffLines.push({
          type: DiffLineType.INSERT,
          content: newLines[op.newIndex] ?? '',
          oldLineNumber: null,
          newLineNumber: newLineNum,
          inlineDiffs: [{ type: DiffLineType.INSERT, value: newLines[op.newIndex] ?? '' }],
        });
        newLineNum++;
      }
    }
  }

  return diffLines;
}

export function computeStats(diffLines: DiffLine[]): DiffStats {
  let insertions = 0;
  let deletions = 0;
  let equal = 0;

  for (const line of diffLines) {
    if (line.type === DiffLineType.INSERT) insertions++;
    else if (line.type === DiffLineType.DELETE) deletions++;
    else equal++;
  }

  return { insertions, deletions, equal };
}

export function findCollapsedRegions(
  diffLines: DiffLine[],
  threshold: number = 3
): CollapsedRegion[] {
  const regions: CollapsedRegion[] = [];
  let start = -1;
  let count = 0;

  for (let i = 0; i < diffLines.length; i++) {
    if (diffLines[i].type === DiffLineType.EQUAL) {
      if (start === -1) {
        start = i;
        count = 1;
      } else {
        count++;
      }
    } else {
      if (start !== -1 && count > threshold) {
        regions.push({ startIndex: start, endIndex: i - 1, lineCount: count });
      }
      start = -1;
      count = 0;
    }
  }

  if (start !== -1 && count > threshold) {
    regions.push({ startIndex: start, endIndex: diffLines.length - 1, lineCount: count });
  }

  return regions;
}
