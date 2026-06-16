import { DiffLine, DiffLineType, ViewMode, DiffStats, CompareOptions, CollapsedRegion } from '@/types/diff';
import { findCollapsedRegions } from './diffFormatter';

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

function getOptionLabels(options: CompareOptions): string[] {
  const labels: string[] = [];
  if (options.ignoreTrailingWhitespace) labels.push('忽略行尾空格');
  if (options.ignoreAllWhitespace) labels.push('忽略所有空白');
  if (options.ignoreCase) labels.push('忽略大小写');
  if (options.ignoreBlankLines) labels.push('忽略空行');
  return labels;
}

export function exportToHtml(
  diffLines: DiffLine[],
  oldCode: string,
  newCode: string,
  viewMode: ViewMode,
  oldFileName: string,
  newFileName: string,
  stats: DiffStats,
  compareOptions: CompareOptions
): string {
  const collapsedRegions = findCollapsedRegions(diffLines, 3);

  let diffHtml = '';

  if (viewMode === 'unified') {
    diffHtml = renderUnifiedTable(diffLines, collapsedRegions);
  } else {
    diffHtml = renderSplitTable(diffLines, collapsedRegions);
  }

  const optionLabels = getOptionLabels(compareOptions);
  const optionsHtml = optionLabels.length > 0
    ? `<div class="options"><strong>对比选项：</strong>${optionLabels.map(l => `<span class="option-tag">${l}</span>`).join(' ')}</div>`
    : '';

  const oldName = oldFileName || '原始代码';
  const newName = newFileName || '修改后代码';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>代码差异对比报告 - ${escapeHtml(oldName)} vs ${escapeHtml(newName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 24px;
    min-height: 100vh;
  }
  .report-header {
    margin-bottom: 24px;
    padding: 20px;
    background: #181825;
    border-radius: 12px;
    border: 1px solid #313244;
  }
  h1 {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #f5c2e7;
  }
  .file-names {
    display: flex;
    gap: 24px;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .file-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .file-name .label {
    color: #a6adc8;
    font-size: 12px;
  }
  .file-name .name {
    color: #89b4fa;
    font-weight: 500;
  }
  .stats-bar {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #a6adc8;
    margin-bottom: 8px;
  }
  .stat-item { display: flex; align-items: center; gap: 6px; }
  .stat-dot { width: 8px; height: 8px; border-radius: 50%; }
  .stat-dot.green { background: #22c55e; }
  .stat-dot.red { background: #ef4444; }
  .stat-dot.gray { background: #6c7086; }
  .options {
    font-size: 13px;
    color: #a6adc8;
  }
  .option-tag {
    display: inline-block;
    padding: 2px 8px;
    background: #313244;
    border-radius: 4px;
    font-size: 11px;
    color: #cba6f7;
    margin-left: 4px;
  }
  .meta-row {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #6c7086;
    margin-top: 8px;
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
  .line-insert > td:first-child { border-left: 3px solid #22c55e; }
  .line-delete { background: rgba(239, 68, 68, 0.15); }
  .line-delete > td:first-child { border-left: 3px solid #ef4444; }
  .line-equal > td:first-child { border-left: 3px solid transparent; }
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
  .collapsed-hunk {
    cursor: pointer;
  }
  .collapsed-hunk td {
    padding: 6px 12px;
    background: rgba(49, 50, 68, 0.5);
    color: #89b4fa;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: center;
    border-left: 3px solid transparent;
  }
  .collapsed-hunk:hover td {
    background: rgba(49, 50, 68, 0.8);
  }
  .hunk-content { display: none; }
  .hunk-content.expanded { display: table-row-group; }
</style>
<script>
function toggleHunk(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.toggle('expanded'); }
}
</script>
</head>
<body>
  <div class="report-header">
    <h1>代码差异对比报告</h1>
    <div class="file-names">
      <div class="file-name">
        <span class="label">原始：</span>
        <span class="name">${escapeHtml(oldName)}</span>
      </div>
      <div class="file-name">
        <span class="label">修改后：</span>
        <span class="name">${escapeHtml(newName)}</span>
      </div>
    </div>
    <div class="stats-bar">
      <span class="stat-item"><span class="stat-dot green"></span> 新增 ${stats.insertions} 行</span>
      <span class="stat-item"><span class="stat-dot red"></span> 删除 ${stats.deletions} 行</span>
      <span class="stat-item"><span class="stat-dot gray"></span> 未变 ${stats.equal} 行</span>
    </div>
    ${optionsHtml}
    <div class="meta-row">
      <span>视图模式: ${viewMode === 'unified' ? '统一视图' : '并排视图'}</span>
      <span>生成时间: ${new Date().toLocaleString('zh-CN')}</span>
    </div>
  </div>
  ${diffHtml}
</body>
</html>`;

  return html;
}

function renderUnifiedTable(diffLines: DiffLine[], collapsedRegions: CollapsedRegion[]): string {
  let html = `<table class="diff-table unified">
    <thead>
      <tr>
        <th class="lineno">原始行号</th>
        <th class="lineno">新行号</th>
        <th class="diff-prefix"></th>
        <th class="diff-content">内容</th>
      </tr>
    </thead>
    <tbody>`;

  const isInCollapsed = (idx: number) => {
    for (let r = 0; r < collapsedRegions.length; r++) {
      if (idx >= collapsedRegions[r].startIndex && idx <= collapsedRegions[r].endIndex) return r;
    }
    return -1;
  };

  let lastRegion = -1;
  let hunkId = 0;

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];
    const regionIdx = isInCollapsed(i);

    if (regionIdx !== -1) {
      if (regionIdx !== lastRegion) {
        lastRegion = regionIdx;
        const region = collapsedRegions[regionIdx];
        const id = `hunk-unified-${hunkId++}`;
        html += `<tr class="collapsed-hunk" onclick="toggleHunk('${id}')"><td colspan="4">▶ 展开 ${region.lineCount} 行未变化的内容</td></tr>`;
        html += `<tbody id="${id}" class="hunk-content">`;
        for (let j = region.startIndex; j <= region.endIndex; j++) {
          html += renderUnifiedRow(diffLines[j]);
        }
        html += `</tbody>`;
      }
    } else {
      html += renderUnifiedRow(line);
    }
  }

  html += '</tbody></table>';
  return html;
}

function renderUnifiedRow(line: DiffLine): string {
  const rowClass = getLineClass(line.type);
  const prefix = getLinePrefix(line.type);
  const content =
    line.type === DiffLineType.EQUAL
      ? escapeHtml(line.content)
      : renderInlineDiffs(line, line.type === DiffLineType.DELETE ? 'old' : 'new');

  return `<tr class="${rowClass}">
    <td class="lineno">${line.oldLineNumber ?? ''}</td>
    <td class="lineno">${line.newLineNumber ?? ''}</td>
    <td class="diff-prefix">${prefix}</td>
    <td class="diff-code"><pre>${content || '&nbsp;'}</pre></td>
  </tr>`;
}

function renderSplitTable(diffLines: DiffLine[], collapsedRegions: CollapsedRegion[]): string {
  let html = `<table class="diff-table split">
    <thead>
      <tr>
        <th class="lineno">原始行号</th>
        <th class="diff-content">原始代码</th>
        <th class="lineno">新行号</th>
        <th class="diff-content">修改后代码</th>
      </tr>
    </thead>
    <tbody>`;

  const isInCollapsed = (idx: number) => {
    for (let r = 0; r < collapsedRegions.length; r++) {
      if (idx >= collapsedRegions[r].startIndex && idx <= collapsedRegions[r].endIndex) return r;
    }
    return -1;
  };

  let lastRegion = -1;
  let hunkId = 0;
  let i = 0;

  while (i < diffLines.length) {
    const line = diffLines[i];
    const regionIdx = isInCollapsed(i);

    if (regionIdx !== -1) {
      if (regionIdx !== lastRegion) {
        lastRegion = regionIdx;
        const region = collapsedRegions[regionIdx];
        const id = `hunk-split-${hunkId++}`;
        html += `<tr class="collapsed-hunk" onclick="toggleHunk('${id}')"><td colspan="4">▶ 展开 ${region.lineCount} 行未变化的内容</td></tr>`;
        html += `<tbody id="${id}" class="hunk-content">`;
        for (let j = region.startIndex; j <= region.endIndex; j++) {
          html += renderSplitEqualRow(diffLines[j]);
        }
        html += `</tbody>`;
        i = region.endIndex + 1;
        continue;
      }
      i++;
      continue;
    }

    if (
      line.type === DiffLineType.DELETE &&
      i + 1 < diffLines.length &&
      diffLines[i + 1].type === DiffLineType.INSERT
    ) {
      const nextLine = diffLines[i + 1];
      html += `<tr>
        <td class="lineno line-delete">${line.oldLineNumber ?? ''}</td>
        <td class="diff-code line-delete"><pre>${renderInlineDiffs(line, 'old') || '&nbsp;'}</pre></td>
        <td class="lineno line-insert">${nextLine.newLineNumber ?? ''}</td>
        <td class="diff-code line-insert"><pre>${renderInlineDiffs(nextLine, 'new') || '&nbsp;'}</pre></td>
      </tr>`;
      i += 2;
    } else if (line.type === DiffLineType.DELETE) {
      html += `<tr>
        <td class="lineno line-delete">${line.oldLineNumber ?? ''}</td>
        <td class="diff-code line-delete"><pre>${renderInlineDiffs(line, 'old') || '&nbsp;'}</pre></td>
        <td class="lineno line-empty"></td>
        <td class="diff-code line-empty"><pre>&nbsp;</pre></td>
      </tr>`;
      i++;
    } else if (line.type === DiffLineType.INSERT) {
      html += `<tr>
        <td class="lineno line-empty"></td>
        <td class="diff-code line-empty"><pre>&nbsp;</pre></td>
        <td class="lineno line-insert">${line.newLineNumber ?? ''}</td>
        <td class="diff-code line-insert"><pre>${renderInlineDiffs(line, 'new') || '&nbsp;'}</pre></td>
      </tr>`;
      i++;
    } else {
      html += renderSplitEqualRow(line);
      i++;
    }
  }

  html += '</tbody></table>';
  return html;
}

function renderSplitEqualRow(line: DiffLine): string {
  const leftContent = escapeHtml(line.oldContent) || '&nbsp;';
  const rightContent = escapeHtml(line.newContent) || '&nbsp;';
  return `<tr class="line-equal">
    <td class="lineno">${line.oldLineNumber ?? ''}</td>
    <td class="diff-code"><pre>${leftContent}</pre></td>
    <td class="lineno">${line.newLineNumber ?? ''}</td>
    <td class="diff-code"><pre>${rightContent}</pre></td>
  </tr>`;
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
