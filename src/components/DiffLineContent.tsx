import { DiffLine, DiffLineType, InlineDiff } from '@/types/diff';
import { cn } from '@/lib/utils';

interface DiffLineContentProps {
  line: DiffLine;
  side?: 'old' | 'new';
}

export function DiffLineContent({ line, side }: DiffLineContentProps) {
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

    return filtered.map((diff, i) => (
      <span key={i} className={getInlineSpanClass(diff.type)}>
        {diff.value}
      </span>
    ));
  };

  if (!line.inlineDiffs || line.inlineDiffs.length === 0) {
    return <span>{line.content || '\u00A0'}</span>;
  }

  if (line.type === DiffLineType.EQUAL) {
    return <span>{line.content || '\u00A0'}</span>;
  }

  return <span className={cn('whitespace-pre')}>{renderInlineDiffs(line.inlineDiffs)}</span>;
}
