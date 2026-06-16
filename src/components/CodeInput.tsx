import { useMemo, useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';
import { useDiffStore } from '@/store/diffStore';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  accentColor?: 'red' | 'green';
  fileName: string;
  onFileNameChange: (name: string) => void;
  onFileClear: () => void;
}

export function CodeInput({
  value,
  onChange,
  label,
  placeholder,
  accentColor,
  fileName,
  onFileNameChange,
  onFileClear,
}: CodeInputProps) {
  const lineNumbers = useMemo(() => {
    const lines = value.split('\n');
    return lines.map((_, i) => i + 1);
  }, [value]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onChange(text);
        onFileNameChange(file.name);
      };
      reader.readAsText(file);
    },
    [onChange, onFileNameChange]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClearFile = useCallback(() => {
    onFileClear();
    onFileNameChange('');
  }, [onFileClear, onFileNameChange]);

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl overflow-hidden border bg-catppuccin-mantle shadow-lg transition-colors',
        isDragOver
          ? 'border-catppuccin-blue border-2'
          : 'border-catppuccin-surface0'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          'flex items-center px-4 py-2.5 border-b border-catppuccin-surface0',
          accentColor === 'red' && 'bg-red-950/30',
          accentColor === 'green' && 'bg-emerald-950/30',
          !accentColor && 'bg-catppuccin-mantle'
        )}
      >
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full mr-2',
            accentColor === 'red' && 'bg-catppuccin-redIntense',
            accentColor === 'green' && 'bg-catppuccin-greenIntense',
            !accentColor && 'bg-catppuccin-surface2'
          )}
        />
        <span className="text-sm font-medium text-catppuccin-subtext1">{label}</span>

        {fileName && (
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-catppuccin-surface0/60 text-catppuccin-blue max-w-[120px] truncate">
            {fileName}
          </span>
        )}

        <span className="ml-auto text-xs text-catppuccin-overlay0">
          {lineNumbers.length} 行
        </span>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded hover:bg-catppuccin-surface0/50 text-catppuccin-subtext0 hover:text-catppuccin-text transition-colors"
            title="上传文件"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          {fileName && (
            <button
              onClick={handleClearFile}
              className="p-1 rounded hover:bg-catppuccin-surface0/50 text-catppuccin-subtext0 hover:text-catppuccin-red transition-colors"
              title="清除文件"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept=".txt,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.css,.html,.json,.xml,.yaml,.yml,.md,.sh,.sql,.go,.rs,.rb,.php,.swift,.kt,.scala,.r,.lua,.pl,.m,.mm,.cmake,.make,.toml,.ini,.cfg,.conf,.env,.gitignore,.dockerfile,.dockerignore"
        />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-shrink-0 py-3 px-2 bg-catppuccin-mantle border-r border-catppuccin-surface0 text-right select-none overflow-y-auto">
          {lineNumbers.map((num) => (
            <div
              key={num}
              className="text-xs text-catppuccin-overlay0 leading-6 font-mono"
            >
              {num}
            </div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="flex-1 bg-catppuccin-base text-catppuccin-text p-3 text-sm font-mono leading-6 overflow-auto placeholder:text-catppuccin-overlay0"
        />

        {isDragOver && (
          <div className="absolute inset-0 bg-catppuccin-blue/10 border-2 border-catppuccin-blue border-dashed rounded flex items-center justify-center z-10">
            <span className="text-catppuccin-blue text-sm font-medium">释放以加载文件</span>
          </div>
        )}
      </div>
    </div>
  );
}
