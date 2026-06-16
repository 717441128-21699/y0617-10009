import { DiffLine, DiffLineType, ViewMode } from '@/types/diff';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInlineDiffs(line: DiffLine, side: 'old' | 'new'): string {
  if (!line.inlineDiffs || line.inlineDiffs.length === 0) {
    return escapeHtml(line.content);
  }

  const relevantDiffs = line.inlineDiffs.filter((d) => {
    if (side === 'old') return d.type !== DiffLineType.INSERT;
    return d.type !== DiffLineType.DELETE;
  });

  return relevantDiffs
    .map((diff) => {
      const escaped = escapeHtml(diff.value);
      if (diff.type === DiffLineType.INSERT) {
        return `<span class="inline-insert">${escaped}</span>`;
      }
      if (diff.type === DiffLineType.DELETE) {
        return `<span class="inline-delete">${escaped}</span>`;
      }
      return escaped;
    })
    .join('');
}

function getLinePrefix(type: DiffLineType): string {
  switch (type) {
    case DiffLineType.INSERT:
      return '+';
    case DiffLineType.DELETE:
      return '-';
    default:
      return ' ';
  }
}

function getLineClass(type: DiffLineType): string {
  switch (type) {
    case DiffLineType.INSERT:
      return 'line-insert';
    case DiffLineType.DELETE:
      return 'line-delete';
    default:
      return 'line-equal';
  }
}

export function exportToHtml(
  diffLines: DiffLine[],
  oldCode: string,
  newCode: string,
  viewMode: ViewMode
): string {
  let diffHtml = '';

  if (viewMode === 'unified') {
    diffHtml = `<table class="diff-table unified">
      <thead>
        <tr>
          <th class="lineno old-line">原始行号</th>
          <th class="lineno new-line">新行号</th>
          <th class="diff-content">内容</th>
        </tr>
      </thead>
      <tbody>`;

    for (const line of diffLines) {
      const rowClass = getLineClass(line.type);
      const prefix = getLinePrefix(line.type);
      const content =
        line.type === DiffLineType.EQUAL
          ? escapeHtml(line.content)
          : renderInlineDiffs(line, line.type === DiffLineType.DELETE ? 'old' : 'new');

      diffHtml += `<tr class="${rowClass}">
        <td class="lineno old-line">${line.oldLineNumber ?? ''}</td>
        <td class="lineno new-line">${line.newLineNumber ?? ''}</td>
        <td class="diff-prefix">${prefix}</td>
        <td class="diff-code"><pre>${content || '&nbsp;'}</pre></td>
      </tr>`;
    }

    diffHtml += '</tbody></table>';
  } else {
    diffHtml = `<table class="diff-table split">
      <thead>
        <tr>
          <th class="lineno old-line">原始行号</th>
          <th class="diff-content old-side">原始代码</th>
          <th class="lineno new-line">新行号</th>
          <th class="diff-content new-side">修改后代码</th>
        </tr>
      </thead>
      <tbody>`;

    let i = 0;
    while (i < diffLines.length) {
      const line = diffLines[i];

      if (
        line.type === DiffLineType.DELETE &&
        i + 1 < diffLines.length &&
        diffLines[i + 1].type === DiffLineType.INSERT
      ) {
        const nextLine = diffLines[i + 1];
        diffHtml += `<tr>
          <td class="lineno old-line line-delete">${line.oldLineNumber ?? ''}</td>
          <td class="diff-code old-side line-delete"><pre>- ${renderInlineDiffs(line, 'old') || '&nbsp;'}</pre></td>
          <td class="lineno new-line line-insert">${nextLine.newLineNumber ?? ''}</td>
          <td class="diff-code new-side line-insert"><pre>+ ${renderInlineDiffs(nextLine, 'new') || '&nbsp;'}</pre></td>
        </tr>`;
        i += 2;
      } else if (line.type === DiffLineType.DELETE) {
        diffHtml += `<tr>
          <td class="lineno old-line line-delete">${line.oldLineNumber ?? ''}</td>
          <td class="diff-code old-side line-delete"><pre>- ${renderInlineDiffs(line, 'old') || '&nbsp;'}</pre></td>
          <td class="lineno new-line line-empty"></td>
          <td class="diff-code new-side line-empty"><pre>&nbsp;</pre></td>
        </tr>`;
        i++;
      } else if (line.type === DiffLineType.INSERT) {
        diffHtml += `<tr>
          <td class="lineno old-line line-empty"></td>
          <td class="diff-code old-side line-empty"><pre>&nbsp;</pre></td>
          <td class="lineno new-line line-insert">${line.newLineNumber ?? ''}</td>
          <td class="diff-code new-side line-insert"><pre>+ ${renderInlineDiffs(line, 'new') || '&nbsp;'}</pre></td>
        </tr>`;
        i++;
      } else {
        diffHtml += `<tr>
          <td class="lineno old-line line-equal">${line.oldLineNumber ?? ''}</td>
          <td class="diff-code old-side line-equal"><pre>&nbsp;${escapeHtml(line.content) || '&nbsp;'}</pre></td>
          <td class="lineno new-line line-equal">${line.newLineNumber ?? ''}</td>
          <td class="diff-code new-side line-equal"><pre>&nbsp;${escapeHtml(line.content) || '&nbsp;'}</pre></td>
        </tr>`;
        i++;
      }
    }

    diffHtml += '</tbody></table>';
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>代码差异对比报告</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 24px;
    min-height: 100vh;
  }
  h1 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 20px;
    color: #f5c2e7;
  }
  .info-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    font-size: 13px;
    color: #a6adc8;
  }
  .diff-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    border: 1px solid #313244;
    border-radius: 8px;
    overflow: hidden;
  }
  .diff-table th {
    background: #181825;
    color: #a6adc8;
    font-weight: 500;
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid #313244;
    font-size: 12px;
  }
  .diff-table td {
    padding: 0;
    vertical-align: top;
    border-bottom: 1px solid #313244;
  }
  .diff-table tr:last-child td { border-bottom: none; }
  .lineno {
    width: 60px;
    min-width: 60px;
    text-align: right;
    padding: 2px 10px;
    color: #6c7086;
    background: #181825;
    user-select: none;
    font-size: 12px;
    line-height: 24px;
  }
  .diff-prefix {
    width: 24px;
    min-width: 24px;
    text-align: center;
    color: #6c7086;
    user-select: none;
    line-height: 24px;
  }
  .diff-code pre {
    margin: 0;
    padding: 2px 12px;
    white-space: pre;
    overflow-x: auto;
    line-height: 24px;
  }
  .line-insert { background: rgba(34, 197, 94, 0.15); }
  .line-insert > td { border-left: 3px solid #22c55e; }
  .line-delete { background: rgba(239, 68, 68, 0.15); }
  .line-delete > td { border-left: 3px solid #ef4444; }
  .line-equal > td { border-left: 3px solid transparent; }
  .line-empty { background: #181825; }
  .inline-insert {
    background: rgba(34, 197, 94, 0.45);
    color: #86efac;
    padding: 1px 2px;
    border-radius: 2px;
  }
  .inline-delete {
    background: rgba(239, 68, 68, 0.45);
    color: #fca5a5;
    text-decoration: line-through;
    padding: 1px 2px;
    border-radius: 2px;
  }
  .diff-content { width: 50%; }
  .split .diff-code { width: 45%; }
</style>
</head>
<body>
  <h1>代码差异对比报告</h1>
  <div class="info-bar">
    <span>视图模式: ${viewMode === 'unified' ? '统一视图' : '并排视图'}</span>
    <span>生成时间: ${new Date().toLocaleString('zh-CN')}</span>
  </div>
  ${diffHtml}
</body>
</html>`;

  return html;
}

export function downloadHtml(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
