import { DiffLineType, InlineDiff } from '@/types/diff';

function longestCommonSubstring(a: string, b: string): { startA: number; startB: number; length: number } {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  let maxLen = 0;
  let endA = 0;
  let endB = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endA = i;
          endB = j;
        }
      } else {
        dp[i][j] = 0;
      }
    }
  }

  return {
    startA: endA - maxLen,
    startB: endB - maxLen,
    length: maxLen,
  };
}

function computeDiffRanges(
  oldStr: string,
  newStr: string,
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number,
  pairs: Array<{ oldIdx: number; newIdx: number; length: number }>
): void {
  if (oldStart >= oldEnd || newStart >= newEnd) return;

  const oldSub = oldStr.slice(oldStart, oldEnd);
  const newSub = newStr.slice(newStart, newEnd);
  const lcs = longestCommonSubstring(oldSub, newSub);

  if (lcs.length < 1) return;

  const absOldStart = oldStart + lcs.startA;
  const absNewStart = newStart + lcs.startB;

  pairs.push({ oldIdx: absOldStart, newIdx: absNewStart, length: lcs.length });

  computeDiffRanges(oldStr, newStr, oldStart, absOldStart, newStart, absNewStart, pairs);
  computeDiffRanges(
    oldStr,
    newStr,
    absOldStart + lcs.length,
    oldEnd,
    absNewStart + lcs.length,
    newEnd,
    pairs
  );
}

export function computeInlineDiff(oldContent: string, newContent: string): {
  oldDiffs: InlineDiff[];
  newDiffs: InlineDiff[];
} {
  if (oldContent === newContent) {
    return {
      oldDiffs: [{ type: DiffLineType.EQUAL, value: oldContent }],
      newDiffs: [{ type: DiffLineType.EQUAL, value: newContent }],
    };
  }

  const pairs: Array<{ oldIdx: number; newIdx: number; length: number }> = [];
  computeDiffRanges(oldContent, newContent, 0, oldContent.length, 0, newContent.length, pairs);
  pairs.sort((a, b) => a.oldIdx - b.oldIdx);

  const oldDiffs: InlineDiff[] = [];
  let oldPos = 0;
  for (const pair of pairs) {
    if (pair.oldIdx > oldPos) {
      oldDiffs.push({
        type: DiffLineType.DELETE,
        value: oldContent.slice(oldPos, pair.oldIdx),
      });
    }
    oldDiffs.push({
      type: DiffLineType.EQUAL,
      value: oldContent.slice(pair.oldIdx, pair.oldIdx + pair.length),
    });
    oldPos = pair.oldIdx + pair.length;
  }
  if (oldPos < oldContent.length) {
    oldDiffs.push({
      type: DiffLineType.DELETE,
      value: oldContent.slice(oldPos),
    });
  }

  const newPairs = [...pairs].sort((a, b) => a.newIdx - b.newIdx);
  const newDiffs: InlineDiff[] = [];
  let newPos = 0;
  for (const pair of newPairs) {
    if (pair.newIdx > newPos) {
      newDiffs.push({
        type: DiffLineType.INSERT,
        value: newContent.slice(newPos, pair.newIdx),
      });
    }
    newDiffs.push({
      type: DiffLineType.EQUAL,
      value: newContent.slice(pair.newIdx, pair.newIdx + pair.length),
    });
    newPos = pair.newIdx + pair.length;
  }
  if (newPos < newContent.length) {
    newDiffs.push({
      type: DiffLineType.INSERT,
      value: newContent.slice(newPos),
    });
  }

  if (oldDiffs.length === 0) {
    oldDiffs.push({ type: DiffLineType.DELETE, value: oldContent });
  }
  if (newDiffs.length === 0) {
    newDiffs.push({ type: DiffLineType.INSERT, value: newContent });
  }

  return { oldDiffs, newDiffs };
}
