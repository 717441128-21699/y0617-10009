import { useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { CodeInput } from '@/components/CodeInput';
import { UnifiedView } from '@/components/UnifiedView';
import { SplitView } from '@/components/SplitView';
import { useDiffStore } from '@/store/diffStore';

export default function Home() {
  const { oldCode, newCode, setOldCode, setNewCode, viewMode, compare, hasCompared } =
    useDiffStore();

  useEffect(() => {
    if (oldCode && newCode && !hasCompared) {
      compare();
    }
  }, []);

  return (
    <div className="min-h-screen bg-catppuccin-base flex flex-col">
      <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 max-w-[1600px] mx-auto w-full">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-catppuccin-pink tracking-tight">
            代码差异对比工具
          </h1>
          <p className="text-sm text-catppuccin-subtext0">
            基于 Myers 差分算法 · 支持行级与字符级高亮 · 统一视图/并排视图切换
          </p>
        </header>

        <Toolbar />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[280px] max-h-[45vh]">
          <CodeInput
            value={oldCode}
            onChange={setOldCode}
            label="原始代码"
            placeholder="在此粘贴或输入原始代码..."
            accentColor="red"
          />
          <CodeInput
            value={newCode}
            onChange={setNewCode}
            label="修改后代码"
            placeholder="在此粘贴或输入修改后的代码..."
            accentColor="green"
          />
        </div>

        <div className="flex-1 min-h-[300px]">
          {viewMode === 'unified' ? <UnifiedView /> : <SplitView />}
        </div>

        <footer className="text-center text-xs text-catppuccin-overlay0 py-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-catppuccin-green" />
            新增行
            <span className="w-1.5 h-1.5 rounded-full bg-catppuccin-redIntense ml-2" />
            删除行
          </span>
          <span className="mx-3">·</span>
          <span>连续 3 行以上未变化的内容将自动折叠</span>
        </footer>
      </div>
    </div>
  );
}
