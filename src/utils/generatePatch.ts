import { DiffLine, DiffLineType } from '@/types/diff';

export function generateUnifiedDiff(
  oldFileName: string,
  newFileName: string,
  diffLines: DiffLine[]
): string {
  const oldName = oldFileName || 'a/file';
  const newName = newFileName || 'b/file';

  const hunks: string[] = [];
  let currentHunk: DiffLine[] = [];
  let contextLines: DiffLine[] = [];
  const CONTEXT = 3;

  const pushHunk = () => {
    if (currentHunk.length === 0) return;
    hunks.push(buildHunk(currentHunk));
    currentHunk = [];
    contextLines = [];
  };

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];
    if (line.type === DiffLineType.EQUAL) {
      if (currentHunk.length === 0) {
        contextLines.push(line);
        if (contextLines.length > CONTEXT) {
          contextLines.shift();
        }
      } else {
        currentHunk.push(line);
        let remainingCount = 0;
        for (let j = i + 1; j < diffLines.length; j++) {
          if (diffLines[j].type !== DiffLineType.EQUAL) break;
          remainingCount++;
        }
        if (remainingCount >= CONTEXT * 2) {
          while (currentHunk.length > 0 &&
                 currentHunk[currentHunk.length - 1].type === DiffLineType.EQUAL) {
            currentHunk.pop();
          }
          for (let c = 0; c < CONTEXT; c++) {
            const eq = diffLines[i - CONTEXT + c];
            if (eq && eq.type === DiffLineType.EQUAL) currentHunk.push(eq);
          }
          pushHunk();
          contextLines = [];
          for (let c = 0; c < CONTEXT; c++) {
            const eq = diffLines[i + c];
            if (eq && eq.type === DiffLineType.EQUAL) contextLines.push(eq);
          }
        }
      }
    } else {
      if (currentHunk.length === 0) {
        currentHunk = [...contextLines];
      }
      currentHunk.push(line);
    }
  }
  pushHunk();

  if (hunks.length === 0) {
    return `--- ${oldName}\n+++ ${newName}\n`;
  }

  const diff = `--- ${oldName}\n+++ ${newName}\n${hunks.join('\n')}\n`;
  return diff;
}

function buildHunk(lines: DiffLine[]): string {
  let oldStart = 0;
  let oldCount = 0;
  let newStart = 0;
  let newCount = 0;

  for (const line of lines) {
    if (line.type === DiffLineType.EQUAL) {
      if (oldStart === 0 && line.oldLineNumber !== null) oldStart = line.oldLineNumber;
      if (newStart === 0 && line.newLineNumber !== null) newStart = line.newLineNumber;
      if (line.oldLineNumber !== null) oldCount++;
      if (line.newLineNumber !== null) newCount++;
    } else if (line.type === DiffLineType.DELETE) {
      if (oldStart === 0 && line.oldLineNumber !== null) oldStart = line.oldLineNumber;
      if (line.oldLineNumber !== null) oldCount++;
    } else if (line.type === DiffLineType.INSERT) {
      if (newStart === 0 && line.newLineNumber !== null) newStart = line.newLineNumber;
      if (line.newLineNumber !== null) newCount++;
    }
  }

  const header = `@@ -${oldStart || 0},${oldCount} +${newStart || 0},${newCount} @@`;
  const body = lines.map((line) => {
    const content = line.content;
    if (line.type === DiffLineType.DELETE) return `-${content}`;
    if (line.type === DiffLineType.INSERT) return `+${content}`;
    return ` ${content}`;
  });

  return [header, ...body].join('\n');
}

export function downloadText(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
