import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsedHunkProps {
  lineCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  colSpan?: number;
}

export function CollapsedHunk({ lineCount, isExpanded, onToggle, colSpan = 4 }: CollapsedHunkProps) {
  return (
    <tr className="bg-catppuccin-mantle/50 hover:bg-catppuccin-surface0/30 transition-colors cursor-pointer group" onClick={onToggle}>
      <td colSpan={colSpan} className="py-1 px-4">
        <div className="flex items-center gap-2 text-catppuccin-subtext0 text-xs">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-catppuccin-blue" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-catppuccin-blue" />
          )}
          <span className="font-medium text-catppuccin-blue">
            {isExpanded ? '收起' : '展开'} {lineCount} 行未变化的内容
          </span>
          <div className="flex-1 border-t border-dashed border-catppuccin-surface1" />
        </div>
      </td>
    </tr>
  );
}
