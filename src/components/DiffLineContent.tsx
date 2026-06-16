import { DiffLine, DiffLineType, InlineDiff } from '@/types/diff';
import { cn } from '@/lib/utils';

interface DiffLineContentProps {
  line: DiffLine;
  side?: 'old' | 'new';
  searchKeyword?: string;
}

function getSideContent(line: DiffLine, side?: 'old' | 'new'): string {
  if (side === 'old') return line.oldContent;
  if (side === 'new') return line.newContent;
  return line.content;
}

function highlightSearchText(text: string, keyword: string): JSX.Element[] {
  if (!keyword.trim()) return [<span key={0}>{text}</span>];

  const parts: JSX.Element[] = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let lastIndex = 0;
  let key = 0;

  while (true) {
    const idx = lowerText.indexOf(lowerKeyword, lastIndex);
    if (idx === -1) break;

    if (idx > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, idx)}</span>);
    }
    parts.push(
      <mark key={key++} className="bg-catppuccin-yellow/40 text-catppuccin-text rounded-sm px-0.5">
        {text.slice(idx, idx + keyword.length)}
      </mark>
    );
    lastIndex = idx + keyword.length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

export function DiffLineContent({ line, side, searchKeyword }: DiffLineContentProps) {
  const getInlineSpanClass = (type: DiffLineType) => {
    if (type === DiffLineType.INSERT) return 'inline-insert';
    if (type === DiffLineType.DELETE) return 'inline-delete';
    return '';
  };

  const renderInlineDiffs = (diffs: InlineDiff[]) => {
    const filtered = side
      ? diffs.filter((d) => {
          if (side === 'old') return d.type !== DiffLineType.INSERT;
          return d.type !== DiffLineType.DELETE;
        })
      : diffs;

    return filtered.map((diff, i) => {
      if (searchKeyword && searchKeyword.trim()) {
        const highlighted = highlightSearchText(diff.value, searchKeyword);
        return (
          <span key={i} className={getInlineSpanClass(diff.type)}>
            {highlighted}
          </span>
        );
      }
      return (
        <span key={i} className={getInlineSpanClass(diff.type)}>
            {diff.value}
          </span>
      );
    });
  };

  if (!line.inlineDiffs || line.inlineDiffs.length === 0) {
    const content = getSideContent(line, side) || '\u00A0';
    if (searchKeyword && searchKeyword.trim()) {
      return (
        <span className={cn('whitespace-pre')}>{highlightSearchText(content, searchKeyword)}</span>
      );
    }
    return <span>{content}</span>;
  }

  if (line.type === DiffLineType.EQUAL) {
    const content = getSideContent(line, side) || '\u00A0';
    if (searchKeyword && searchKeyword.trim()) {
      return (
        <span className={cn('whitespace-pre')}>{highlightSearchText(content, searchKeyword)}</span>
      );
    }
    return <span>{content}</span>;
  }

  return <span className={cn('whitespace-pre')}>{renderInlineDiffs(line.inlineDiffs)}</span>;
}
