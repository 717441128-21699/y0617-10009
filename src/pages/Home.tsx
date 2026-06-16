import { useEffect, useRef, useCallback, useState } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { CodeInput } from '@/components/CodeInput';
import { UnifiedView } from '@/components/UnifiedView';
import { SplitView } from '@/components/SplitView';
import { FileListPanel } from '@/components/FileListPanel';
import { useDiffStore } from '@/store/diffStore';
import { extractSnapshotFromUrl } from '@/utils/shareSnapshot';
import { FolderOpen, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const {
    oldCode,
    newCode,
    oldFileName,
    newFileName,
    setOldCode,
    setNewCode,
    setOldFileName,
    setNewFileName,
    viewMode,
    compare,
    hasCompared,
    appMode,
    setAppMode,
    projectFiles,
    activeFileId,
    setActiveFileId,
    toggleFileSelection,
    selectAllFiles,
    deselectAllFiles,
    loadProjectFiles,
  } = useDiffStore();

  const oldFolderRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [pendingOldFiles, setPendingOldFiles] = useState<Map<string, string> | null>(null);
  const [pendingNewFiles, setPendingNewFiles] = useState<Map<string, string> | null>(null);
  const [pendingOldName, setPendingOldName] = useState('');
  const [pendingNewName, setPendingNewName] = useState('');
  const [loadingOld, setLoadingOld] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);

  useEffect(() => {
    const snapshot = extractSnapshotFromUrl();
    if (snapshot) {
      setOldCode(snapshot.oldCode);
      setNewCode(snapshot.newCode);
      setOldFileName(snapshot.oldFileName);
      setNewFileName(snapshot.newFileName);
      if (snapshot.viewMode) useDiffStore.getState().setViewMode(snapshot.viewMode);
      if (snapshot.compareOptions) {
        Object.entries(snapshot.compareOptions).forEach(([k, v]) => {
          useDiffStore.getState().setCompareOption(k as keyof typeof snapshot.compareOptions, v as boolean);
        });
      }
      setTimeout(() => compare(), 0);
      return;
    }
    if (oldCode && newCode && !hasCompared) {
      compare();
    }
  }, []);

  const parseFolderFiles = useCallback(
    (fileList: FileList): Promise<{ files: Map<string, string>; folderName: string }> => {
      return new Promise((resolve) => {
        const map = new Map<string, string>();
        let loaded = 0;
        const total = fileList.length;
        if (total === 0) {
          resolve({ files: map, folderName: '' });
          return;
        }
        let folderName = '';
        Array.from(fileList).forEach((file) => {
          if (!folderName && file.webkitRelativePath) {
            folderName = file.webkitRelativePath.split('/')[0];
          }
          const path = file.webkitRelativePath
            ? file.webkitRelativePath.split('/').slice(1).join('/')
            : file.name;
          if (file.type && !file.type.startsWith('text/') && !file.type.includes('json') && !file.type.includes('javascript') && !file.type.includes('xml') && !file.type.includes('yaml') && !file.type.includes('svg')) {
            if (!file.name.match(/\.(ts|tsx|js|jsx|py|java|c|cpp|h|css|html|json|xml|yaml|yml|md|sh|sql|go|rs|rb|php|swift|kt|scala|r|lua|pl|toml|ini|cfg|conf|env|txt|gitignore|dockerfile|editorconfig|prettierrc|eslintrc|babelrc)$/i)) {
              loaded++;
              if (loaded === total) resolve({ files: map, folderName });
              return;
            }
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            map.set(path, text);
            loaded++;
            if (loaded === total) resolve({ files: map, folderName });
          };
          reader.onerror = () => {
            loaded++;
            if (loaded === total) resolve({ files: map, folderName });
          };
          reader.readAsText(file);
        });
      });
    },
    []
  );

  const handleOldFolderChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setLoadingOld(true);
      const result = await parseFolderFiles(files);
      setPendingOldFiles(result.files);
      setPendingOldName(result.folderName);
      setLoadingOld(false);
      e.target.value = '';
    },
    [parseFolderFiles]
  );

  const handleNewFolderChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setLoadingNew(true);
      const result = await parseFolderFiles(files);
      setPendingNewFiles(result.files);
      setPendingNewName(result.folderName);
      setLoadingNew(false);
      e.target.value = '';
    },
    [parseFolderFiles]
  );

  const handleStartProjectCompare = useCallback(() => {
    if (!pendingOldFiles && !pendingNewFiles) return;
    loadProjectFiles(pendingOldFiles ?? new Map(), pendingNewFiles ?? new Map());
    setShowFolderModal(false);
    setPendingOldFiles(null);
    setPendingNewFiles(null);
    setPendingOldName('');
    setPendingNewName('');
  }, [pendingOldFiles, pendingNewFiles, loadProjectFiles]);

  const handleOldFileClear = () => {
    setOldCode('');
  };

  const handleNewFileClear = () => {
    setNewCode('');
  };

  return (
    <div className="min-h-screen bg-catppuccin-base flex flex-col">
      <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-catppuccin-pink tracking-tight">
            代码差异对比工具
          </h1>
          <p className="text-sm text-catppuccin-subtext0">
            Myers 差分算法 · 行级/字符级高亮 · 文件/文件夹上传 · 项目级对比 · 分享快照
          </p>
        </header>

        <Toolbar />

        {appMode === 'project' && projectFiles.length > 0 ? (
          <div className="flex-1 flex gap-4 min-h-[500px]">
            <div className="w-72 flex-shrink-0">
              <FileListPanel
                files={projectFiles}
                selectedFileId={activeFileId}
                onSelectFile={setActiveFileId}
                onToggleSelect={toggleFileSelection}
                onSelectAll={selectAllFiles}
                onDeselectAll={deselectAllFiles}
              />
            </div>
            <div className="flex-1 min-w-0">
              {activeFileId ? (
                <>
                  <div className="mb-2 px-2 py-1.5 bg-catppuccin-mantle rounded-lg border border-catppuccin-surface0 text-xs text-catppuccin-subtext0 flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-catppuccin-mauve" />
                    <span className="truncate">
                      {projectFiles.find((f) => f.id === activeFileId)?.path}
                    </span>
                  </div>
                  <div className="min-h-[400px]">
                    {viewMode === 'unified' ? <UnifiedView /> : <SplitView />}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-catppuccin-overlay0 text-sm bg-catppuccin-mantle rounded-xl border border-catppuccin-surface0">
                  从左侧选择一个文件查看差异
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFolderModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-catppuccin-subtext0 hover:text-catppuccin-blue hover:bg-catppuccin-blue/10 border border-catppuccin-surface0 transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                文件夹对比
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[280px] max-h-[45vh]">
              <CodeInput
                value={oldCode}
                onChange={setOldCode}
                label="原始代码"
                placeholder="在此粘贴、输入或拖拽文件..."
                accentColor="red"
                fileName={oldFileName}
                onFileNameChange={setOldFileName}
                onFileClear={handleOldFileClear}
              />
              <CodeInput
                value={newCode}
                onChange={setNewCode}
                label="修改后代码"
                placeholder="在此粘贴、输入或拖拽文件..."
                accentColor="green"
                fileName={newFileName}
                onFileNameChange={setNewFileName}
                onFileClear={handleNewFileClear}
              />
            </div>

            <div className="flex-1 min-h-[300px]">
              {viewMode === 'unified' ? <UnifiedView /> : <SplitView />}
            </div>
          </>
        )}

        <footer className="text-center text-xs text-catppuccin-overlay0 py-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-catppuccin-green" />
            新增行
            <span className="w-1.5 h-1.5 rounded-full bg-catppuccin-redIntense ml-2" />
            删除行
          </span>
          <span className="mx-3">·</span>
          <span>支持文件/文件夹上传 · 项目级对比 · 分享快照</span>
        </footer>
      </div>

      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowFolderModal(false)}>
          <div className="bg-catppuccin-mantle rounded-xl border border-catppuccin-surface0 p-6 w-[600px] max-w-[90vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-catppuccin-text">文件夹对比</h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-catppuccin-overlay0 hover:text-catppuccin-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-catppuccin-subtext0 mb-4">
              分别选择旧版本和新版本的文件夹，系统会自动匹配同路径文件进行对比。
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-catppuccin-red">旧版本文件夹</span>
                <button
                  onClick={() => oldFolderRef.current?.click()}
                  disabled={loadingOld}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed transition-all',
                    pendingOldFiles
                      ? 'border-catppuccin-red/40 bg-catppuccin-red/5'
                      : 'border-catppuccin-surface0 hover:border-catppuccin-red/40 hover:bg-catppuccin-red/5'
                  )}
                >
                  {loadingOld ? (
                    <span className="text-xs text-catppuccin-overlay0">加载中...</span>
                  ) : pendingOldFiles ? (
                    <>
                      <FolderOpen className="w-6 h-6 text-catppuccin-red" />
                      <span className="text-xs text-catppuccin-text font-medium">{pendingOldName}</span>
                      <span className="text-[10px] text-catppuccin-subtext0">{pendingOldFiles.size} 个文件</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-catppuccin-overlay0" />
                      <span className="text-xs text-catppuccin-subtext0">点击选择文件夹</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-catppuccin-green">新版本文件夹</span>
                <button
                  onClick={() => newFolderRef.current?.click()}
                  disabled={loadingNew}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed transition-all',
                    pendingNewFiles
                      ? 'border-catppuccin-green/40 bg-catppuccin-green/5'
                      : 'border-catppuccin-surface0 hover:border-catppuccin-green/40 hover:bg-catppuccin-green/5'
                  )}
                >
                  {loadingNew ? (
                    <span className="text-xs text-catppuccin-overlay0">加载中...</span>
                  ) : pendingNewFiles ? (
                    <>
                      <FolderOpen className="w-6 h-6 text-catppuccin-green" />
                      <span className="text-xs text-catppuccin-text font-medium">{pendingNewName}</span>
                      <span className="text-[10px] text-catppuccin-subtext0">{pendingNewFiles.size} 个文件</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-catppuccin-overlay0" />
                      <span className="text-xs text-catppuccin-subtext0">点击选择文件夹</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <input
              ref={oldFolderRef}
              type="file"
              className="hidden"
              onChange={handleOldFolderChange}
              multiple
              {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            />
            <input
              ref={newFolderRef}
              type="file"
              className="hidden"
              onChange={handleNewFolderChange}
              multiple
              {...{ webkitdirectory: '', directory: '' } as Record<string, string>}
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-catppuccin-overlay0">
                {pendingOldFiles && pendingNewFiles
                  ? `将对比 ${new Set([...pendingOldFiles.keys(), ...pendingNewFiles.keys()]).size} 个文件`
                  : pendingOldFiles
                  ? `已选 ${pendingOldFiles.size} 个旧文件，请选择新文件夹`
                  : pendingNewFiles
                  ? `已选 ${pendingNewFiles.size} 个新文件，请选择旧文件夹`
                  : '请分别选择旧/新文件夹'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-1.5 rounded-md text-xs text-catppuccin-subtext0 hover:text-catppuccin-text hover:bg-catppuccin-surface0/50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleStartProjectCompare}
                  disabled={!pendingOldFiles && !pendingNewFiles}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-catppuccin-mauve text-catppuccin-crust hover:bg-catppuccin-mauve/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  开始对比
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
