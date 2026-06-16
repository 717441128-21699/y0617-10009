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

function makeDiffLine(
  type: DiffLineType,
  oldText: string,
  newText: string,
  oldLineNumber: number | null,
  newLineNumber: number | null,
  inlineDiffs?: DiffLine['inlineDiffs']
): DiffLine {
  const primary = type === DiffLineType.DELETE ? oldText : type === DiffLineType.INSERT ? newText : oldText;
  return {
    type,
    content: primary,
    originalContent: primary,
    oldContent: oldText,
    newContent: newText,
    oldLineNumber,
    newLineNumber,
    inlineDiffs,
  };
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
    return newLines.map((line, i) =>
      makeDiffLine(
        DiffLineType.INSERT,
        '',
        line,
        null,
        i + 1,
        [{ type: DiffLineType.INSERT, value: line }]
      )
    );
  }

  if (newText === '') {
    return oldLines.map((line, i) =>
      makeDiffLine(
        DiffLineType.DELETE,
        line,
        '',
        i + 1,
        null,
        [{ type: DiffLineType.DELETE, value: line }]
      )
    );
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
    return newMap.map((origIdx) =>
      makeDiffLine(
        DiffLineType.INSERT,
        '',
        newLines[origIdx],
        null,
        origIdx + 1,
        [{ type: DiffLineType.INSERT, value: newLines[origIdx] }]
      )
    );
  }
  if (newNorm.length === 0) {
    return oldMap.map((origIdx) =>
      makeDiffLine(
        DiffLineType.DELETE,
        oldLines[origIdx],
        '',
        origIdx + 1,
        null,
        [{ type: DiffLineType.DELETE, value: oldLines[origIdx] }]
      )
    );
  }

  const normalizedEqual =
    oldNorm.length === newNorm.length && oldNorm.every((l, i) => l === newNorm[i]);
  if (normalizedEqual) {
    return oldMap.map((origOldIdx, i) => {
      const origNewIdx = newMap[i];
      return makeDiffLine(
        DiffLineType.EQUAL,
        oldLines[origOldIdx] ?? '',
        newLines[origNewIdx] ?? '',
        origOldIdx + 1,
        origNewIdx + 1
      );
    });
  }

  const operations = myersDiff(oldNorm, newNorm);
  const diffLines: DiffLine[] = [];

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
        diffLines.push(
          makeDiffLine(
            DiffLineType.EQUAL,
            oldLines[origOldIdx] ?? '',
            newLines[origNewIdx] ?? '',
            origOldIdx + 1,
            origNewIdx + 1
          )
        );
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

        diffLines.push(
          makeDiffLine(
            DiffLineType.DELETE,
            oldContent,
            '',
            origOldIdx + 1,
            null,
            oldDiffs
          )
        );

        diffLines.push(
          makeDiffLine(
            DiffLineType.INSERT,
            '',
            newContent,
            null,
            origNewIdx + 1,
            newDiffs
          )
        );
      }

      for (let i = minLen; i < deletes.length; i++) {
        const origOldIdx = oldMap[deletes[i].oldIndex];
        const content = oldLines[origOldIdx] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.DELETE,
            content,
            '',
            origOldIdx + 1,
            null,
            [{ type: DiffLineType.DELETE, value: content }]
          )
        );
      }

      for (let i = minLen; i < inserts.length; i++) {
        const origNewIdx = newMap[inserts[i].newIndex];
        const content = newLines[origNewIdx] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.INSERT,
            '',
            content,
            null,
            origNewIdx + 1,
            [{ type: DiffLineType.INSERT, value: content }]
          )
        );
      }
    } else {
      for (const op of deletes) {
        const origOldIdx = oldMap[op.oldIndex];
        const content = oldLines[origOldIdx] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.DELETE,
            content,
            '',
            origOldIdx + 1,
            null,
            [{ type: DiffLineType.DELETE, value: content }]
          )
        );
      }
      for (const op of inserts) {
        const origNewIdx = newMap[op.newIndex];
        const content = newLines[origNewIdx] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.INSERT,
            '',
            content,
            null,
            origNewIdx + 1,
            [{ type: DiffLineType.INSERT, value: content }]
          )
        );
      }
    }
  }

  return diffLines;
}

function formatDiffRaw(oldLines: string[], newLines: string[]): DiffLine[] {
  if (oldLines.join('\n') === newLines.join('\n')) {
    return oldLines.map((line, i) =>
      makeDiffLine(DiffLineType.EQUAL, line, line, i + 1, i + 1)
    );
  }

  const operations = myersDiff(oldLines, newLines);
  const diffLines: DiffLine[] = [];

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
        diffLines.push(
          makeDiffLine(
            DiffLineType.EQUAL,
            oldLines[op.oldIndex] ?? '',
            newLines[op.newIndex] ?? '',
            op.oldIndex + 1,
            op.newIndex + 1
          )
        );
      }
    }

    if (deletes.length > 0 && inserts.length > 0) {
      const minLen = Math.min(deletes.length, inserts.length);
      for (let i = 0; i < minLen; i++) {
        const oldContent = oldLines[deletes[i].oldIndex] ?? '';
        const newContent = newLines[inserts[i].newIndex] ?? '';
        const { oldDiffs, newDiffs } = computeInlineDiff(oldContent, newContent);

        diffLines.push(
          makeDiffLine(DiffLineType.DELETE, oldContent, '', deletes[i].oldIndex + 1, null, oldDiffs)
        );

        diffLines.push(
          makeDiffLine(DiffLineType.INSERT, '', newContent, null, inserts[i].newIndex + 1, newDiffs)
        );
      }

      for (let i = minLen; i < deletes.length; i++) {
        const content = oldLines[deletes[i].oldIndex] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.DELETE,
            content,
            '',
            deletes[i].oldIndex + 1,
            null,
            [{ type: DiffLineType.DELETE, value: content }]
          )
        );
      }

      for (let i = minLen; i < inserts.length; i++) {
        const content = newLines[inserts[i].newIndex] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.INSERT,
            '',
            content,
            null,
            inserts[i].newIndex + 1,
            [{ type: DiffLineType.INSERT, value: content }]
          )
        );
      }
    } else {
      for (const op of deletes) {
        const content = oldLines[op.oldIndex] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.DELETE,
            content,
            '',
            op.oldIndex + 1,
            null,
            [{ type: DiffLineType.DELETE, value: content }]
          )
        );
      }
      for (const op of inserts) {
        const content = newLines[op.newIndex] ?? '';
        diffLines.push(
          makeDiffLine(
            DiffLineType.INSERT,
            '',
            content,
            null,
            op.newIndex + 1,
            [{ type: DiffLineType.INSERT, value: content }]
          )
        );
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
