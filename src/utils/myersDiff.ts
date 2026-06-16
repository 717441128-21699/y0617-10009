import { EditOperation } from '@/types/diff';

export function myersDiff(oldLines: string[], newLines: string[]): EditOperation[] {
  const n = oldLines.length;
  const m = newLines.length;
  const max = n + m;

  const v: number[] = new Array(2 * max + 1);
  const trace: number[][] = [];
  const offset = max;
  v[1 + offset] = 0;

  let foundD = -1;
  for (let d = 0; d <= max; d++) {
    const vCopy = [...v];
    trace.push(vCopy);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset];
      } else {
        x = v[k - 1 + offset] + 1;
      }
      let y = x - k;

      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }

      v[k + offset] = x;

      if (x >= n && y >= m) {
        foundD = d;
        break;
      }
    }
    if (foundD !== -1) break;
  }

  return backtrack(oldLines, newLines, trace, foundD, offset);
}

function backtrack(
  oldLines: string[],
  newLines: string[],
  trace: number[][],
  d: number,
  offset: number
): EditOperation[] {
  const operations: EditOperation[] = [];
  let x = oldLines.length;
  let y = newLines.length;

  for (let dIdx = d; dIdx > 0; dIdx--) {
    const v = trace[dIdx];
    const k = x - y;

    let prevK: number;
    if (k === -dIdx || (k !== dIdx && v[k - 1 + offset] < v[k + 1 + offset])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = trace[dIdx - 1][prevK + offset];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      operations.push({
        type: 'equal',
        oldIndex: x - 1,
        newIndex: y - 1,
      });
      x--;
      y--;
    }

    if (dIdx > 0) {
      if (x !== prevX) {
        operations.push({
          type: 'delete',
          oldIndex: x - 1,
          newIndex: -1,
        });
        x--;
      } else if (y !== prevY) {
        operations.push({
          type: 'insert',
          oldIndex: -1,
          newIndex: y - 1,
        });
        y--;
      }
    }
  }

  while (x > 0 && y > 0) {
    operations.push({
      type: 'equal',
      oldIndex: x - 1,
      newIndex: y - 1,
    });
    x--;
    y--;
  }

  return operations.reverse();
}
