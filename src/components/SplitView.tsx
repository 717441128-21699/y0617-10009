import { useEffect, useRef } from 'react';
import { useDiffStore } from '@/store/diffStore';
import { DiffLineType } from '@/types/diff';
import { cn } from '@/lib/utils';
import { DiffLineContent } from './DiffLineContent';
import { CollapsedHunk } from './CollapsedHunk';

export function SplitView() {
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

  let i = 0;
  while (i < filteredLines.length) {
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
            renderedRows.push(renderEqualLine(diffLines[j], j));
          }
          i = region.endIndex + 1;
          continue;
        }
        i = region.endIndex + 1;
        continue;
      }
      i++;
      continue;
    }

    const canPair =
      !showChangesOnly &&
      line.type === DiffLineType.DELETE &&
      i + 1 < filteredLines.length &&
      filteredLines[i + 1].type === DiffLineType.INSERT;

    if (canPair) {
      renderedRows.push(renderModifiedPair(line, filteredLines[i + 1], originalIndex));
      i += 2;
    } else if (line.type === DiffLineType.DELETE) {
      renderedRows.push(renderDeleteLine(line, originalIndex));
      i++;
    } else if (line.type === DiffLineType.INSERT) {
      renderedRows.push(renderInsertLine(line, originalIndex));
      i++;
    } else {
      renderedRows.push(renderEqualLine(line, originalIndex));
      i++;
    }
  }

  function renderModifiedPair(
    oldLine: typeof diffLines[number],
    newLine: typeof diffLines[number],
    key: number
  ) {
    return (
      <tr
        key={key}
        ref={oldLine.isCurrentDiff || newLine.isCurrentDiff ? currentDiffRef : undefined}
        className={cn(
          'font-mono text-sm',
          (oldLine.isCurrentDiff || newLine.isCurrentDiff) && 'ring-2 ring-catppuccin-mauve ring-inset',
          (oldLine.isSearchMatch || newLine.isSearchMatch) && 'bg-catppuccin-yellow/10'
        )}
      >
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none bg-red-950/40 text-red-300 border-r border-catppuccin-surface0">
          {oldLine.oldLineNumber ?? ''}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 bg-red-950/20 border-r border-catppuccin-surface0">
          <DiffLineContent line={oldLine} side="old" searchKeyword={searchKeyword} />
        </td>
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none bg-emerald-950/40 text-emerald-300 border-r border-catppuccin-surface0">
          {newLine.newLineNumber ?? ''}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 bg-emerald-950/20">
          <DiffLineContent line={newLine} side="new" searchKeyword={searchKeyword} />
        </td>
      </tr>
    );
  }

  function renderDeleteLine(line: typeof diffLines[number], key: number) {
    return (
      <tr
        key={key}
        ref={line.isCurrentDiff ? currentDiffRef : undefined}
        className={cn(
          'font-mono text-sm',
          line.isCurrentDiff && 'ring-2 ring-catppuccin-mauve ring-inset',
          line.isSearchMatch && 'bg-catppuccin-yellow/10'
        )}
      >
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none bg-red-950/40 text-red-300 border-r border-catppuccin-surface0">
          {line.oldLineNumber ?? ''}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 bg-red-950/20 border-r border-catppuccin-surface0">
          <DiffLineContent line={line} side="old" searchKeyword={searchKeyword} />
        </td>
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none bg-catppuccin-mantle border-r border-catppuccin-surface0"></td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 bg-catppuccin-mantle"></td>
      </tr>
    );
  }

  function renderInsertLine(line: typeof diffLines[number], key: number) {
    return (
      <tr
        key={key}
        ref={line.isCurrentDiff ? currentDiffRef : undefined}
        className={cn(
          'font-mono text-sm',
          line.isCurrentDiff && 'ring-2 ring-catppuccin-mauve ring-inset',
          line.isSearchMatch && 'bg-catppuccin-yellow/10'
        )}
      >
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none bg-catppuccin-mantle border-r border-catppuccin-surface0"></td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 bg-catppuccin-mantle border-r border-catppuccin-surface0"></td>
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none bg-emerald-950/40 text-emerald-300 border-r border-catppuccin-surface0">
          {line.newLineNumber ?? ''}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 bg-emerald-950/20">
          <DiffLineContent line={line} side="new" searchKeyword={searchKeyword} />
        </td>
      </tr>
    );
  }

  function renderEqualLine(line: typeof diffLines[number], key: number) {
    return (
      <tr
        key={key}
        className={cn(
          'font-mono text-sm hover:bg-catppuccin-surface0/20',
          line.isSearchMatch && 'bg-catppuccin-yellow/10'
        )}
      >
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none text-catppuccin-overlay0 bg-catppuccin-mantle border-r border-catppuccin-surface0">
          {line.oldLineNumber ?? ''}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2 border-r border-catppuccin-surface0">
          <DiffLineContent line={line} side="old" searchKeyword={searchKeyword} />
        </td>
        <td className="w-14 px-2 py-0.5 text-right text-xs select-none text-catppuccin-overlay0 bg-catppuccin-mantle border-r border-catppuccin-surface0">
          {line.newLineNumber ?? ''}
        </td>
        <td className="px-3 py-0.5 whitespace-pre leading-6 w-1/2">
          <DiffLineContent line={line} side="new" searchKeyword={searchKeyword} />
        </td>
      </tr>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-catppuccin-surface0 bg-catppuccin-base shadow-lg">
      <table className="w-full border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-catppuccin-mantle">
            <th className="w-14 px-2 py-2 text-right text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0">
              行号
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0 w-1/2">
              原始代码
            </th>
            <th className="w-14 px-2 py-2 text-right text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0">
              行号
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-catppuccin-subtext0 border-b border-catppuccin-surface0 w-1/2">
              修改后代码
            </th>
          </tr>
        </thead>
        <tbody>{renderedRows}</tbody>
      </table>
    </div>
  );
}
