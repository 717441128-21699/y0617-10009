import { DiffLine, DiffLineType, EditOperation, DiffStats, CollapsedRegion, CompareOptions } from '@/types/diff';
import { myersDiff } from './myersDiff';
import { computeInlineDiff } from './inlineDiff';

const defaultOptions: CompareOptions = {
  ignoreTrailingWhitespace: false,
  ignoreAllWhitespace: false,
  ignoreCase: false,
  ignoreBlankLines: false,
};

function normalizeLine(line: string, options: CompareOptions): string {
  let result = line;
  if (options.ignoreTrailingWhitespace) {
    result = result.trimEnd();
  }
  if (options.ignoreAllWhitespace) {
    result = result.replace(/\s+/g, '');
  }
  if (options.ignoreCase) {
    result = result.toLowerCase();
  }
  return result;
}

function preprocessLines(
  lines: string[],
  options: CompareOptions
): { normalized: string[]; originalMap: number[] } {
  const filtered = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => {
      if (options.ignoreBlankLines && line.trim() === '') return false;
      return true;
    });

  const normalized = filtered.map(({ line }) => normalizeLine(line, options));
  const originalMap = filtered.map(({ idx }) => idx);

  return { normalized, originalMap };
}

export function formatDiff(
  oldText: string,
  newText: string,
  options: CompareOptions = defaultOptions
): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  if (oldText === '' && newText === '') {
    return [];
  }

  if (oldText === '') {
    return newLines.map((line, i) => ({
      type: DiffLineType.INSERT,
      content: line,
      originalContent: line,
      oldLineNumber: null,
      newLineNumber: i + 1,
      inlineDiffs: [{ type: DiffLineType.INSERT, value: line }],
    }));
  }

  if (newText === '') {
    return oldLines.map((line, i) => ({
      type: DiffLineType.DELETE,
      content: line,
      originalContent: line,
      oldLineNumber: i + 1,
      newLineNumber: null,
      inlineDiffs: [{ type: DiffLineType.DELETE, value: line }],
    }));
  }

  const needNormalize =
    options.ignoreTrailingWhitespace ||
    options.ignoreAllWhitespace ||
    options.ignoreCase ||
    options.ignoreBlankLines;

  if (!needNormalize) {
    return formatDiffRaw(oldLines, newLines);
  }

  const { normalized: oldNorm, originalMap: oldMap } = preprocessLines(oldLines, options);
  const { normalized: newNorm, originalMap: newMap } = preprocessLines(newLines, options);

  if (oldNorm.length === 0 && newNorm.length === 0) {
    return [];
  }
  if (oldNorm.length === 0) {
    return newMap.map((origIdx, i) => ({
      type: DiffLineType.INSERT,
      content: newLines[origIdx],
      originalContent: newLines[origIdx],
      oldLineNumber: null,
      newLineNumber: origIdx + 1,
      inlineDiffs: [{ type: DiffLineType.INSERT, value: newLines[origIdx] }],
    }));
  }
  if (newNorm.length === 0) {
    return oldMap.map((origIdx, i) => ({
      type: DiffLineType.DELETE,
      content: oldLines[origIdx],
      originalContent: oldLines[origIdx],
      oldLineNumber: origIdx + 1,
      newLineNumber: null,
      inlineDiffs: [{ type: DiffLineType.DELETE, value: oldLines[origIdx] }],
    }));
  }

  const normalizedEqual =
    oldNorm.length === newNorm.length && oldNorm.every((l, i) => l === newNorm[i]);
  if (normalizedEqual) {
    return oldMap.map((origOldIdx, i) => {
      const origNewIdx = newMap[i];
      return {
        type: DiffLineType.EQUAL,
        content: oldLines[origOldIdx],
        originalContent: oldLines[origOldIdx],
        oldLineNumber: origOldIdx + 1,
        newLineNumber: origNewIdx + 1,
      };
    });
  }

  const operations = myersDiff(oldNorm, newNorm);
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
        const origOldIdx = oldMap[op.oldIndex];
        const origNewIdx = newMap[op.newIndex];
        diffLines.push({
          type: DiffLineType.EQUAL,
          content: oldLines[origOldIdx] ?? '',
          originalContent: oldLines[origOldIdx] ?? '',
          oldLineNumber: origOldIdx + 1,
          newLineNumber: origNewIdx + 1,
        });
        oldLineNum++;
        newLineNum++;
      }
    }

    if (deletes.length > 0 && inserts.length > 0) {
      const minLen = Math.min(deletes.length, inserts.length);
      for (let i = 0; i < minLen; i++) {
        const origOldIdx = oldMap[deletes[i].oldIndex];
        const origNewIdx = newMap[inserts[i].newIndex];
        const oldContent = oldLines[origOldIdx] ?? '';
        const newContent = newLines[origNewIdx] ?? '';
        const { oldDiffs, newDiffs } = computeInlineDiff(oldContent, newContent);

        diffLines.push({
          type: DiffLineType.DELETE,
          content: oldContent,
          originalContent: oldContent,
          oldLineNumber: origOldIdx + 1,
          newLineNumber: null,
          inlineDiffs: oldDiffs,
        });
        oldLineNum++;

        diffLines.push({
          type: DiffLineType.INSERT,
          content: newContent,
          originalContent: newContent,
          oldLineNumber: null,
          newLineNumber: origNewIdx + 1,
          inlineDiffs: newDiffs,
        });
        newLineNum++;
      }

      for (let i = minLen; i < deletes.length; i++) {
        const origOldIdx = oldMap[deletes[i].oldIndex];
        const content = oldLines[origOldIdx] ?? '';
        diffLines.push({
          type: DiffLineType.DELETE,
          content,
          originalContent: content,
          oldLineNumber: origOldIdx + 1,
          newLineNumber: null,
          inlineDiffs: [{ type: DiffLineType.DELETE, value: content }],
        });
        oldLineNum++;
      }

      for (let i = minLen; i < inserts.length; i++) {
        const origNewIdx = newMap[inserts[i].newIndex];
        const content = newLines[origNewIdx] ?? '';
        diffLines.push({
          type: DiffLineType.INSERT,
          content,
          originalContent: content,
          oldLineNumber: null,
          newLineNumber: origNewIdx + 1,
          inlineDiffs: [{ type: DiffLineType.INSERT, value: content }],
        });
        newLineNum++;
      }
    } else {
      for (const op of deletes) {
        const origOldIdx = oldMap[op.oldIndex];
        const content = oldLines[origOldIdx] ?? '';
        diffLines.push({
          type: DiffLineType.DELETE,
          content,
          originalContent: content,
          oldLineNumber: origOldIdx + 1,
          newLineNumber: null,
          inlineDiffs: [{ type: DiffLineType.DELETE, value: content }],
        });
        oldLineNum++;
      }
      for (const op of inserts) {
        const origNewIdx = newMap[op.newIndex];
        const content = newLines[origNewIdx] ?? '';
        diffLines.push({
          type: DiffLineType.INSERT,
          content,
          originalContent: content,
          oldLineNumber: null,
          newLineNumber: origNewIdx + 1,
          inlineDiffs: [{ type: DiffLineType.INSERT, value: content }],
        });
        newLineNum++;
      }
    }
  }

  return diffLines;
}

function formatDiffRaw(oldLines: string[], newLines: string[]): DiffLine[] {
  if (oldLines.join('\n') === newLines.join('\n')) {
    return oldLines.map((line, i) => ({
      type: DiffLineType.EQUAL,
      content: line,
      originalContent: line,
      oldLineNumber: i + 1,
      newLineNumber: i + 1,
    }));
  }

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
          originalContent: oldLines[op.oldIndex] ?? '',
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
          originalContent: oldContent,
          oldLineNumber: oldLineNum,
          newLineNumber: null,
          inlineDiffs: oldDiffs,
        });
        oldLineNum++;

        diffLines.push({
          type: DiffLineType.INSERT,
          content: newContent,
          originalContent: newContent,
          oldLineNumber: null,
          newLineNumber: newLineNum,
          inlineDiffs: newDiffs,
        });
        newLineNum++;
      }

      for (let i = minLen; i < deletes.length; i++) {
        const content = oldLines[deletes[i].oldIndex] ?? '';
        diffLines.push({
          type: DiffLineType.DELETE,
          content,
          originalContent: content,
          oldLineNumber: oldLineNum,
          newLineNumber: null,
          inlineDiffs: [{ type: DiffLineType.DELETE, value: content }],
        });
        oldLineNum++;
      }

      for (let i = minLen; i < inserts.length; i++) {
        const content = newLines[inserts[i].newIndex] ?? '';
        diffLines.push({
          type: DiffLineType.INSERT,
          content,
          originalContent: content,
          oldLineNumber: null,
          newLineNumber: newLineNum,
          inlineDiffs: [{ type: DiffLineType.INSERT, value: content }],
        });
        newLineNum++;
      }
    } else {
      for (const op of deletes) {
        const content = oldLines[op.oldIndex] ?? '';
        diffLines.push({
          type: DiffLineType.DELETE,
          content,
          originalContent: content,
          oldLineNumber: oldLineNum,
          newLineNumber: null,
          inlineDiffs: [{ type: DiffLineType.DELETE, value: content }],
        });
        oldLineNum++;
      }
      for (const op of inserts) {
        const content = newLines[op.newIndex] ?? '';
        diffLines.push({
          type: DiffLineType.INSERT,
          content,
          originalContent: content,
          oldLineNumber: null,
          newLineNumber: newLineNum,
          inlineDiffs: [{ type: DiffLineType.INSERT, value: content }],
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
