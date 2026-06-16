import { EditOperation } from '@/types/diff';

export function myersDiff(oldLines: string[], newLines: string[]): EditOperation[] {
  const n = oldLines.length;
  const m = newLines.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) {
    return newLines.map((_, i) => ({
      type: 'insert' as const,
      oldIndex: -1,
      newIndex: i,
    }));
  }
  if (m === 0) {
    return oldLines.map((_, i) => ({
      type: 'delete' as const,
      oldIndex: i,
      newIndex: -1,
    }));
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const operations: EditOperation[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      operations.unshift({
        type: 'equal',
        oldIndex: i - 1,
        newIndex: j - 1,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      operations.unshift({
        type: 'insert',
        oldIndex: -1,
        newIndex: j - 1,
      });
      j--;
    } else {
      operations.unshift({
        type: 'delete',
        oldIndex: i - 1,
        newIndex: -1,
      });
      i--;
    }
  }

  return operations;
}
