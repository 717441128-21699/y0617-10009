import { useState, useMemo } from 'react';
import { File, FilePlus, FileMinus, FileEdit, ArrowUpDown, CheckSquare, Square, Search } from 'lucide-react';
import type { FileEntry } from '@/types/diff';
import { FileChangeStatus, FileListSortKey, FileListSortDir, FileListFilter } from '@/types/diff';
import { cn } from '@/lib/utils';

interface FileListPanelProps {
  files: FileEntry[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const STATUS_ORDER: Record<FileChangeStatus, number> = {
  added: 0,
  modified: 1,
  deleted: 2,
  unchanged: 3,
};

const STATUS_CONFIG: Record<FileChangeStatus, {
  icon: typeof FilePlus;
  label: string;
  badgeClass: string;
  iconClass: string;
}> = {
  added: {
    icon: FilePlus,
    label: '新增',
    badgeClass: 'bg-emerald-900/40 text-emerald-400',
    iconClass: 'text-emerald-400',
  },
  deleted: {
    icon: FileMinus,
    label: '删除',
    badgeClass: 'bg-red-900/40 text-red-400',
    iconClass: 'text-red-400',
  },
  modified: {
    icon: FileEdit,
    label: '修改',
    badgeClass: 'bg-amber-900/40 text-amber-400',
    iconClass: 'text-amber-400',
  },
  unchanged: {
    icon: File,
    label: '未变',
    badgeClass: 'bg-catppuccin-surface0 text-catppuccin-overlay0',
    iconClass: 'text-catppuccin-overlay0',
  },
};

const FILTER_OPTIONS: { value: FileListFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'added', label: '新增' },
  { value: 'deleted', label: '删除' },
  { value: 'modified', label: '修改' },
  { value: 'unchanged', label: '未变' },
];

const SORT_OPTIONS: { value: FileListSortKey; label: string }[] = [
  { value: 'name', label: '文件名' },
  { value: 'status', label: '状态' },
  { value: 'changes', label: '变更量' },
];

export function FileListPanel({
  files,
  selectedFileId,
  onSelectFile,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: FileListPanelProps) {
  const [sortKey, setSortKey] = useState<FileListSortKey>('name');
  const [sortDir, setSortDir] = useState<FileListSortDir>('asc');
  const [filter, setFilter] = useState<FileListFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const processedFiles = useMemo(() => {
    let result = [...files];

    if (filter !== 'all') {
      result = result.filter((f) => f.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.path.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.path.localeCompare(b.path);
      } else if (sortKey === 'status') {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      } else if (sortKey === 'changes') {
        const aTotal = a.stats.insertions + a.stats.deletions;
        const bTotal = b.stats.insertions + b.stats.deletions;
        cmp = aTotal - bTotal;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [files, sortKey, sortDir, filter, searchQuery]);

  const handleSortToggle = (key: FileListSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allSelected = files.length > 0 && files.every((f) => f.selected);

  return (
    <div className="flex flex-col h-full bg-catppuccin-base">
      <div className="flex flex-col gap-2 p-3 border-b border-catppuccin-surface0 bg-catppuccin-mantle">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-catppuccin-overlay0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文件..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-catppuccin-surface0 border border-catppuccin-surface1 text-catppuccin-text placeholder-catppuccin-overlay0 focus:outline-none focus:ring-1 focus:ring-catppuccin-mauve"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FileListFilter)}
            className="text-xs px-2 py-1 rounded-md bg-catppuccin-surface0 border border-catppuccin-surface1 text-catppuccin-text focus:outline-none focus:ring-1 focus:ring-catppuccin-mauve"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortToggle(opt.value)}
                className={cn(
                  'flex items-center gap-0.5 text-xs px-2 py-1 rounded-md border transition-colors',
                  sortKey === opt.value
                    ? 'bg-catppuccin-surface1 border-catppuccin-mauve text-catppuccin-mauve'
                    : 'bg-catppuccin-surface0 border-catppuccin-surface1 text-catppuccin-subtext0 hover:text-catppuccin-text'
                )}
              >
                {opt.label}
                <ArrowUpDown className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-catppuccin-surface0 border border-catppuccin-surface1 text-catppuccin-subtext0 hover:text-catppuccin-text transition-colors"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                取消全选
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5" />
                全选
              </>
            )}
          </button>
          <span className="text-xs text-catppuccin-overlay0">
            {processedFiles.length} 个文件
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {processedFiles.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-catppuccin-overlay0 text-sm">
            无匹配文件
          </div>
        ) : (
          <ul className="divide-y divide-catppuccin-surface0">
            {processedFiles.map((file) => {
              const config = STATUS_CONFIG[file.status];
              const StatusIcon = config.icon;
              const isSelected = file.id === selectedFileId;

              return (
                <li
                  key={file.id}
                  onClick={() => onSelectFile(file.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-catppuccin-surface0/60'
                      : 'hover:bg-catppuccin-surface0/30'
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(file.id);
                    }}
                    className="shrink-0 text-catppuccin-subtext0 hover:text-catppuccin-text transition-colors"
                  >
                    {file.selected ? (
                      <CheckSquare className="w-4 h-4 text-catppuccin-mauve" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <StatusIcon className={cn('w-4 h-4 shrink-0', config.iconClass)} />

                  <span
                    className="flex-1 text-sm text-catppuccin-text truncate min-w-0"
                    title={file.path}
                  >
                    {file.path}
                  </span>

                  {file.status === 'modified' ? (
                    <span className="shrink-0 text-xs font-mono">
                      <span className="text-emerald-400">+{file.stats.insertions}</span>{' '}
                      <span className="text-red-400">-{file.stats.deletions}</span>
                    </span>
                  ) : (
                    <span className={cn('shrink-0 text-xs px-1.5 py-0.5 rounded', config.badgeClass)}>
                      {config.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
