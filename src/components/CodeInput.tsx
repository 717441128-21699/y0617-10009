import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  accentColor?: 'red' | 'green';
}

export function CodeInput({
  value,
  onChange,
  label,
  placeholder,
  accentColor,
}: CodeInputProps) {
  const lineNumbers = useMemo(() => {
    const lines = value.split('\n');
    return lines.map((_, i) => i + 1);
  }, [value]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-catppuccin-surface0 bg-catppuccin-mantle shadow-lg">
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
        <span className="ml-auto text-xs text-catppuccin-overlay0">
          {lineNumbers.length} 行
        </span>
      </div>
      <div className="flex flex-1 overflow-hidden">
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
      </div>
    </div>
  );
}
