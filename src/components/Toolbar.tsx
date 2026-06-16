import { GitCompare, Columns, AlignLeft, Download, Expand, Shrink, Trash2, ArrowRightLeft } from 'lucide-react';
import { useDiffStore } from '@/store/diffStore';
import { cn } from '@/lib/utils';
import { exportToHtml, downloadHtml } from '@/utils/exportHtml';

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
    hasCompared,
    stats,
  } = useDiffStore();

  const handleExport = () => {
    if (!hasCompared || diffLines.length === 0) return;
    const html = exportToHtml(diffLines, oldCode, newCode, viewMode);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadHtml(`diff-report-${timestamp}.html`, html);
  };

  const handleSwap = () => {
    const currentOld = oldCode;
    const currentNew = newCode;
    useDiffStore.getState().setOldCode(currentNew);
    useDiffStore.getState().setNewCode(currentOld);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-catppuccin-mantle rounded-xl border border-catppuccin-surface0 shadow-lg">
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

      <button
        onClick={handleExport}
        disabled={!hasCompared || diffLines.length === 0}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
          'bg-catppuccin-blue/20 text-catppuccin-blue hover:bg-catppuccin-blue/30'
        )}
      >
        <Download className="w-3.5 h-3.5" />
        导出 HTML
      </button>

      <button
        onClick={compare}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-catppuccin-mauve text-catppuccin-crust hover:bg-catppuccin-mauve/90 transition-all shadow-md hover:shadow-lg"
      >
        <GitCompare className="w-3.5 h-3.5" />
        对比
      </button>
    </div>
  );
}
