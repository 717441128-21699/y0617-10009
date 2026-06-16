import {
  GitCompare,
  Columns,
  AlignLeft,
  Download,
  Expand,
  Shrink,
  Trash2,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Filter,
  Search,
  Settings2,
  History,
  FileCode,
  ChevronDown as ChevronDownIcon,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { useDiffStore } from '@/store/diffStore';
import { cn } from '@/lib/utils';
import { exportToHtml, downloadHtml } from '@/utils/exportHtml';
import { generateUnifiedDiff, downloadText } from '@/utils/generatePatch';
import { encodeSnapshot, generateShareUrl } from '@/utils/shareSnapshot';
import { CompareOptions, FileEntry } from '@/types/diff';
import { useState, useRef, useEffect, useCallback } from 'react';
import { HistoryPanel } from './HistoryPanel';

export function Toolbar() {
  const {
    viewMode,
    setViewMode,
    compare,
    expandAll,
    collapseAll,
    clearAll,
    diffLines,
    oldCode,
    newCode,
    oldFileName,
    newFileName,
    hasCompared,
    stats,
    compareOptions,
    setCompareOption,
    showChangesOnly,
    setShowChangesOnly,
    searchKeyword,
    setSearchKeyword,
    goToNextDiff,
    goToPrevDiff,
    currentDiffIndex,
    diffLineIndices,
    saveSession,
    appMode,
    projectFiles,
    getSelectedFiles,
  } = useDiffStore();

  const [showOptions, setShowOptions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleExportHtml = () => {
    if (!hasCompared || diffLines.length === 0) return;
    if (appMode === 'project') {
      const selectedFiles = getSelectedFiles();
      if (selectedFiles.length === 0) return;
      const html = exportMultiFileHtml(selectedFiles, viewMode, compareOptions);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadHtml(`diff-report-${timestamp}.html`, html);
    } else {
      const html = exportToHtml(
        diffLines,
        oldCode,
        newCode,
        viewMode,
        oldFileName,
        newFileName,
        stats,
        compareOptions
      );
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadHtml(`diff-report-${timestamp}.html`, html);
    }
    setShowExportMenu(false);
  };

  const handleExportPatch = () => {
    if (!hasCompared || diffLines.length === 0) return;
    if (appMode === 'project') {
      const selectedFiles = getSelectedFiles();
      if (selectedFiles.length === 0) return;
      const patch = selectedFiles
        .filter((f) => f.status !== 'unchanged')
        .map((f) => generateUnifiedDiff(`a/${f.path}`, `b/${f.path}`, f.diffLines))
        .join('\n');
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadText(`diff-${timestamp}.patch`, patch, 'text/x-diff');
    } else {
      const patch = generateUnifiedDiff(oldFileName, newFileName, diffLines);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadText(`diff-${timestamp}.patch`, patch, 'text/x-diff');
    }
    setShowExportMenu(false);
  };

  const handleShareSnapshot = useCallback(() => {
    const encoded = encodeSnapshot({
      oldCode,
      newCode,
      oldFileName,
      newFileName,
      viewMode,
      compareOptions,
    });
    const url = generateShareUrl(encoded);
    setShareUrl(url);
    setShowShareModal(true);
  }, [oldCode, newCode, oldFileName, newFileName, viewMode, compareOptions]);

  const handleCopyShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleSwap = () => {
    const store = useDiffStore.getState();
    const currentOld = oldCode;
    const currentNew = newCode;
    const currentOldName = oldFileName;
    const currentNewName = newFileName;
    store.setOldCode(currentNew);
    store.setNewCode(currentOld);
    store.setOldFileName(currentNewName);
    store.setNewFileName(currentOldName);
  };

  const handleSaveSession = () => {
    saveSession();
  };

  const optionLabels: { key: keyof CompareOptions; label: string; desc: string }[] = [
    {
      key: 'ignoreTrailingWhitespace',
      label: '忽略行尾空格',
      desc: '比较时忽略每行末尾的空白字符',
    },
    {
      key: 'ignoreAllWhitespace',
      label: '忽略所有空白',
      desc: '比较时忽略所有空白字符变化',
    },
    {
      key: 'ignoreCase',
      label: '忽略大小写',
      desc: '比较时不区分大小写',
    },
    {
      key: 'ignoreBlankLines',
      label: '忽略空行',
      desc: '比较时忽略空行的增删',
    },
  ];

  const activeOptionCount = Object.values(compareOptions).filter(Boolean).length;
  const selectedFileCount = appMode === 'project' ? getSelectedFiles().length : 0;

  return (
    <div className="flex flex-col gap-2 p-4 bg-catppuccin-mantle rounded-xl border border-catppuccin-surface0 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-catppuccin-mauve" />
          <span className="font-semibold text-catppuccin-text">代码差异对比</span>
        </div>

        <div className="h-6 w-px bg-catppuccin-surface0 mx-2" />

        <div className="flex items-center bg-catppuccin-surface0/50 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'split'
                ? 'bg-catppuccin-surface1 text-catppuccin-text shadow-sm'
                : 'text-catppuccin-subtext0 hover:text-catppuccin-text'
            )}
          >
            <Columns className="w-3.5 h-3.5" />
            并排视图
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'unified'
                ? 'bg-catppuccin-surface1 text-catppuccin-text shadow-sm'
                : 'text-catppuccin-subtext0 hover:text-catppuccin-text'
            )}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            统一视图
          </button>
        </div>

        <div className="h-6 w-px bg-catppuccin-surface0 mx-2" />

        <button
          onClick={handleSwap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all"
          title="交换两侧代码"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          交换
        </button>

        <button
          onClick={expandAll}
          disabled={!hasCompared}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Expand className="w-3.5 h-3.5" />
          全部展开
        </button>

        <button
          onClick={collapseAll}
          disabled={!hasCompared}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Shrink className="w-3.5 h-3.5" />
          全部折叠
        </button>

        <button
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            showOptions || activeOptionCount > 0
              ? 'bg-catppuccin-surface0/80 text-catppuccin-text'
              : 'text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50'
          )}
        >
          <Settings2 className="w-3.5 h-3.5" />
          对比选项
          {activeOptionCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-catppuccin-mauve text-catppuccin-crust text-[10px] flex items-center justify-center font-bold">
              {activeOptionCount}
            </span>
          )}
        </button>

        <button
          onClick={handleSaveSession}
          disabled={!hasCompared}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-green hover:bg-catppuccin-green/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="保存当前对比到历史"
        >
          <Download className="w-3.5 h-3.5 rotate-180" />
          保存
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all"
          title="对比会话历史"
        >
          <History className="w-3.5 h-3.5" />
          历史
        </button>

        <button
          onClick={handleShareSnapshot}
          disabled={!hasCompared}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-sapphire hover:bg-catppuccin-sapphire/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="生成分享快照链接"
        >
          <Share2 className="w-3.5 h-3.5" />
          分享
        </button>

        <div className="h-6 w-px bg-catppuccin-surface0 mx-2" />

        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-red hover:bg-red-950/30 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          清空
        </button>

        <div className="flex-1" />

        {hasCompared && (
          <div className="flex items-center gap-3 px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-catppuccin-green">+{stats.insertions}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-catppuccin-red">-{stats.deletions}</span>
            </span>
          </div>
        )}

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!hasCompared || diffLines.length === 0}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
              'bg-catppuccin-blue/20 text-catppuccin-blue hover:bg-catppuccin-blue/30'
            )}
          >
            <Download className="w-3.5 h-3.5" />
            导出
            {appMode === 'project' && selectedFileCount > 0 && (
              <span className="text-[10px] opacity-70">({selectedFileCount})</span>
            )}
            <ChevronDownIcon className="w-3 h-3 opacity-70" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-52 rounded-lg border border-catppuccin-surface0 bg-catppuccin-mantle shadow-xl overflow-hidden z-20">
              <button
                onClick={handleExportHtml}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {appMode === 'project' ? 'HTML 报告（选中文件）' : 'HTML 报告'}
              </button>
              <button
                onClick={handleExportPatch}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/60 transition-colors border-t border-catppuccin-surface0"
              >
                <FileCode className="w-3.5 h-3.5" />
                {appMode === 'project' ? 'Patch（选中文件）' : 'Patch / Unified Diff'}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={compare}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-catppuccin-mauve text-catppuccin-crust hover:bg-catppuccin-mauve/90 transition-all shadow-md hover:shadow-lg"
        >
          <GitCompare className="w-3.5 h-3.5" />
          对比
        </button>
      </div>

      {showOptions && (
        <div className="flex flex-wrap items-center gap-3 px-2 py-2 bg-catppuccin-surface0/30 rounded-lg">
          {optionLabels.map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer group"
              title={desc}
            >
              <div
                className={cn(
                  'w-8 h-4.5 rounded-full relative transition-colors',
                  compareOptions[key] ? 'bg-catppuccin-mauve' : 'bg-catppuccin-surface1'
                )}
                onClick={() => setCompareOption(key, !compareOptions[key])}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
                    compareOptions[key] ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </div>
              <span className="text-xs text-catppuccin-subtext0 group-hover:text-catppuccin-text transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      )}

      {hasCompared && (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 bg-catppuccin-surface0/20 rounded-lg">
          <div className="flex items-center bg-catppuccin-surface0/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowChangesOnly(!showChangesOnly)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all',
                showChangesOnly
                  ? 'bg-catppuccin-mauve/30 text-catppuccin-mauve'
                  : 'text-catppuccin-subtext0 hover:text-catppuccin-text'
              )}
            >
              <Filter className="w-3 h-3" />
              只看变更
            </button>
          </div>

          <div className="h-4 w-px bg-catppuccin-surface0" />

          <button
            onClick={goToPrevDiff}
            disabled={diffLineIndices.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            上一处
          </button>

          <button
            onClick={goToNextDiff}
            disabled={diffLineIndices.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            下一处
          </button>

          {diffLineIndices.length > 0 && (
            <span className="text-xs text-catppuccin-overlay0">
              {currentDiffIndex + 1}/{diffLineIndices.length}
            </span>
          )}

          <div className="h-4 w-px bg-catppuccin-surface0" />

          <div className="flex items-center gap-1.5 bg-catppuccin-surface0/50 rounded-md px-2 py-1">
            <Search className="w-3 h-3 text-catppuccin-overlay0" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索关键字..."
              className="bg-transparent text-xs text-catppuccin-text placeholder:text-catppuccin-overlay0 outline-none w-28"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="text-catppuccin-overlay0 hover:text-catppuccin-text"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      <HistoryPanel open={showHistory} onClose={() => setShowHistory(false)} />

      {showShareModal && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShareModal(false)}>
          <div className="bg-catppuccin-mantle rounded-xl border border-catppuccin-surface0 p-5 w-[520px] max-w-[90vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-catppuccin-text mb-3">分享快照</h3>
            <p className="text-xs text-catppuccin-subtext0 mb-3">
              以下链接包含当前对比的完整内容，任何人打开即可恢复。适用于小型代码片段分享。
            </p>
            <div className="flex items-center gap-2 bg-catppuccin-surface0/50 rounded-lg p-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs text-catppuccin-text outline-none truncate"
              />
              <button
                onClick={handleCopyShare}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  shareCopied
                    ? 'bg-catppuccin-green/20 text-catppuccin-green'
                    : 'bg-catppuccin-blue/20 text-catppuccin-blue hover:bg-catppuccin-blue/30'
                )}
              >
                {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {shareCopied ? '已复制' : '复制'}
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-1.5 rounded-md text-xs text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function exportMultiFileHtml(
  files: FileEntry[],
  viewMode: string,
  compareOptions: CompareOptions
): string {
  const sections = files
    .filter((f) => f.status !== 'unchanged')
    .map((file) => {
      const stats = file.stats;
      const statusLabel =
        file.status === 'added' ? '新增' :
        file.status === 'deleted' ? '删除' : '修改';
      const statusColor =
        file.status === 'added' ? '#a6e3a1' :
        file.status === 'deleted' ? '#f38ba8' : '#f9e2af';

      return `
        <div style="margin-bottom:32px;">
          <div style="padding:8px 12px;background:#1e1e2e;border:1px solid #313244;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;font-weight:600;color:#cdd6f4;">${escapeHtml(file.path)}</span>
            <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${statusColor}22;color:${statusColor};">${statusLabel}</span>
            <span style="font-size:11px;color:#a6e3a1;">+${stats.insertions}</span>
            <span style="font-size:11px;color:#f38ba8;">-${stats.deletions}</span>
          </div>
          <div style="border:1px solid #313244;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
            <pre style="margin:0;padding:12px;font-family:'Cascadia Code',monospace;font-size:12px;line-height:1.6;overflow-x:auto;background:#11111b;">${renderDiffLinesHtml(file.diffLines)}</pre>
          </div>
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>差异对比报告 - ${new Date().toISOString().slice(0, 10)}</title>
<style>
  body{margin:0;padding:20px;background:#11111b;color:#cdd6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  h1{font-size:18px;color:#cba6f7;margin-bottom:16px;}
</style>
</head>
<body>
<h1>差异对比报告</h1>
${sections}
</body>
</html>`;
}

function renderDiffLinesHtml(diffLines: import('@/types/diff').DiffLine[]): string {
  return diffLines
    .map((line) => {
      const escaped = escapeHtml(line.content);
      if (line.type === 'insert') return `<div style="background:#a6e3a115;color:#a6e3a1;"><span style="color:#a6e3a1;margin-right:8px;">+</span>${escaped}</div>`;
      if (line.type === 'delete') return `<div style="background:#f38ba815;color:#f38ba8;"><span style="color:#f38ba8;margin-right:8px;">-</span>${escaped}</div>`;
      return `<div><span style="color:#6c7086;margin-right:8px;"> </span>${escaped}</div>`;
    })
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
