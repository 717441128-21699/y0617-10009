import { useEffect, useRef } from 'react';
import { useDiffStore } from '@/store/diffStore';
import { DiffLineType } from '@/types/diff';
import { cn } from '@/lib/utils';
import { DiffLineContent } from './DiffLineContent';
import { CollapsedHunk } from './CollapsedHunk';

export function UnifiedView() {
  const {
    diffLines,
    collapsedRegions,
    expandedRegions,
    toggleRegion,
    showChangesOnly,
    searchKeyword,
  } = useDiffStore();

  const currentDiffRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (currentDiffRef.current) {
      currentDiffRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [diffLines]);

  if (diffLines.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-catppuccin-overlay0">
        <p className="text-sm">点击"对比"按钮查看差异结果</p>
      </div>
    );
  }

  const filteredLines = showChangesOnly
    ? diffLines.filter((line) => line.type !== DiffLineType.EQUAL)
    : diffLines;

  const filteredCollapsedRegions = showChangesOnly
    ? []
    : collapsedRegions;

  const isInCollapsedRegion = (lineIndex: number): { inRegion: boolean; regionIndex: number } => {
    for (let i = 0; i < filteredCollapsedRegions.length; i++) {
      const region = filteredCollapsedRegions[i];
      if (lineIndex >= region.startIndex && lineIndex <= region.endIndex) {
        return { inRegion: true, regionIndex: i };
      }
    }
    return { inRegion: false, regionIndex: -1 };
  };

  const renderedRows: JSX.Element[] = [];
  let lastRenderedRegion = -1;

  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    const originalIndex = diffLines.indexOf(line);
    const { inRegion, regionIndex } = isInCollapsedRegion(originalIndex);

    if (inRegion) {
      if (regionIndex !== lastRenderedRegion) {
        lastRenderedRegion = regionIndex;
        const region = filteredCollapsedRegions[regionIndex];
        const isExpanded = expandedRegions.has(regionIndex);

        renderedRows.push(
          <CollapsedHunk
            key={`collapsed-${regionIndex}`}
            lineCount={region.lineCount}
            isExpanded={isExpanded}
            onToggle={() => toggleRegion(regionIndex)}
            colSpan={4}
          />
        );

        if (isExpanded) {
          for (let j = region.startIndex; j <= region.endIndex; j++) {
            renderedRows.push(renderLine(diffLines[j], j));
          }
        }
      }
    } else {
      renderedRows.push(renderLine(line, originalIndex));
    }
  }

  function renderLine(line: typeof diffLines[number], key: number) {
    const isInsert = line.type === DiffLineType.INSERT;
    const isDelete = line.type === DiffLineType.DELETE;
    const isEqual = line.type === DiffLineType.EQUAL;

    return (
      <tr
        key={key}
        ref={line.isCurrentDiff ? currentDiffRef : undefined}
        className={cn(
          'font-mono text-sm',
          isInsert && 'bg-emerald-950/30',
          isDelete && 'bg-red-950/30',
          isEqual && 'hover:bg-catppuccin-surface0/20',
          line.isCurrentDiff && 'ring-2 ring-catppuccin-mauve ring-inset',
          line.isSearchMatch && 'bg-catppuccin-yellow/10'
        )}
      >
        <td
          className={cn(
            'w-14 px-2 py-0.5 text-right text-xs select-none border-r border-catppuccin-surface0',
            isDelete && 'bg-red-950/40 text-red-300',
            isEqual && 'text-catppuccin-overlay0 bg-catppuccin-mantle'
          )}
        >
          {line.oldLineNumber ?? ''}
        </td>
        <td
          className={cn(
            'w-14 px-2 py-0.5 text-right text-xs select-none border-r border-catppuccin-surface0',
            isInsert && 'bg-emerald-950/40 text-emerald-300',
            isEqual && 'text-catppuccin-overlay0 bg-catppuccin-mantle'
          )}
        >
          {line.newLineNumber ?? ''}
        </td>
        <td
          className={cn(
            'w-6 px-1 py-0.5 text-center text-xs select-none border-r border-catppuccin-surface0',
            isInsert && 'text-emerald-400 font-bold',
            isDelete && 'text-red-400 font-bold',
            isEqual && 'text-catppuccin-overlay0'
          )}
        >
          {isInsert ? '+' : isDelete ? '-' : ' '}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6">
          <DiffLineContent line={line} searchKeyword={searchKeyword} />
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-catppuccin-surface0 bg-catppuccin-base shadow-lg">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-catppuccin-mantle">
            <th className="w-14 px-2 py-2 text-right text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0">
              旧
            </th>
            <th className="w-14 px-2 py-2 text-right text-xs font-medium text-catppuccin-subtext0 border-b border-r border-catppuccin-surface0">
              新
            </th>
            <th className="w-6 px-1 py-2 text-center text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0"></th>
            <th className="px-3 py-2 text-left text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0">
              差异内容
            </th>
          </tr>
        </thead>
        <tbody>{renderedRows}</tbody>
      </table>
    </div>
  );
}
