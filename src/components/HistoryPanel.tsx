import { useEffect, useState } from 'react';
import {
  History,
  Trash2,
  Edit3,
  RotateCcw,
  FileDown,
  Check,
  X,
  Save,
  ChevronDown,
} from 'lucide-react';
import { useDiffStore } from '@/store/diffStore';
import { DiffSession } from '@/types/diff';
import { cn } from '@/lib/utils';
import { exportToHtml, downloadHtml } from '@/utils/exportHtml';
import { formatDiff, computeStats } from '@/utils/diffFormatter';

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const {
    sessions,
    loadSessions,
    restoreSession,
    renameSession,
    deleteSession,
    saveSession,
    hasCompared,
  } = useDiffStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  useEffect(() => {
    if (open) loadSessions();
  }, [open, loadSessions]);

  if (!open) return null;

  const handleSaveNew = () => {
    saveSession(saveName);
    setSaveName('');
    setShowSaveDialog(false);
  };

  const handleStartRename = (session: DiffSession) => {
    setRenamingId(session.id);
    setRenameValue(session.name);
  };

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameSession(renamingId, renameValue);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleExportSession = (session: DiffSession) => {
    const diffLines = formatDiff(
      session.oldCode,
      session.newCode,
      session.compareOptions
    );
    const stats = computeStats(diffLines);
    const html = exportToHtml(
      diffLines,
      session.oldCode,
      session.newCode,
      session.viewMode,
      session.oldFileName,
      session.newFileName,
      stats,
      session.compareOptions
    );
    const timestamp = new Date(session.createdAt).toISOString().slice(0, 10);
    downloadHtml(`diff-${timestamp}.html`, html);
  };

  const handleRestore = (id: string) => {
    restoreSession(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[75vh] bg-catppuccin-mantle rounded-xl border border-catppuccin-surface0 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-catppuccin-surface0">
          <History className="w-5 h-5 text-catppuccin-mauve" />
          <h2 className="font-semibold text-catppuccin-text">对比会话历史</h2>
          <button
            onClick={() => {
              setShowSaveDialog(!showSaveDialog);
              if (!showSaveDialog) setSaveName('');
            }}
            disabled={!hasCompared}
            className={cn(
              'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              showSaveDialog
                ? 'bg-catppuccin-mauve text-catppuccin-crust'
                : 'bg-catppuccin-green/20 text-catppuccin-green hover:bg-catppuccin-green/30',
              !hasCompared && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Save className="w-3.5 h-3.5" />
            保存当前
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showSaveDialog && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-catppuccin-surface0 bg-catppuccin-surface0/30">
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNew();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              placeholder="为会话命名（可选）..."
              className="flex-1 px-3 py-1.5 bg-catppuccin-base border border-catppuccin-surface1 rounded-md text-sm text-catppuccin-text placeholder:text-catppuccin-overlay0 outline-none focus:border-catppuccin-mauve"
            />
            <button
              onClick={handleSaveNew}
              className="p-1.5 rounded-md bg-catppuccin-green/20 text-catppuccin-green hover:bg-catppuccin-green/30"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-catppuccin-overlay0 text-sm">
              <History className="w-8 h-8 mb-2 opacity-40" />
              <p>暂无保存的会话</p>
              <p className="text-xs mt-1">点击"保存当前"保存这次对比</p>
            </div>
          ) : (
            <ul className="divide-y divide-catppuccin-surface0">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="px-4 py-3 hover:bg-catppuccin-surface0/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {renamingId === session.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          className="flex-1 px-2 py-1 bg-catppuccin-base border border-catppuccin-mauve rounded text-sm text-catppuccin-text outline-none"
                        />
                        <button
                          onClick={handleConfirmRename}
                          className="p-1 rounded text-catppuccin-green hover:bg-catppuccin-green/20"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="p-1 rounded text-catppuccin-overlay0 hover:bg-catppuccin-surface0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-catppuccin-text truncate">
                            {session.name}
                          </div>
                          <div className="mt-1 text-xs text-catppuccin-subtext0 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>
                              {session.oldFileName || '原始代码'} →{' '}
                              {session.newFileName || '修改后代码'}
                            </span>
                            <span className="text-catppuccin-overlay0">
                              {new Date(session.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleRestore(session.id)}
                            className="p-1.5 rounded text-catppuccin-blue hover:bg-catppuccin-blue/20 transition-colors"
                            title="恢复此会话"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartRename(session)}
                            className="p-1.5 rounded text-catppuccin-subtext0 hover:bg-catppuccin-surface0/70 transition-colors"
                            title="重命名"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExportSession(session)}
                            className="p-1.5 rounded text-catppuccin-subtext0 hover:bg-catppuccin-surface0/70 transition-colors"
                            title="导出 HTML 报告"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-1.5 rounded text-catppuccin-subtext0 hover:text-catppuccin-red hover:bg-red-950/30 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-catppuccin-surface0 text-xs text-catppuccin-overlay0 bg-catppuccin-surface0/20">
          共 {sessions.length} 个会话 · 最多保留 50 条 · 存储在浏览器本地
        </div>
      </div>
    </div>
  );
}
