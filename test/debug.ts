import { myersDiff } from '../src/utils/myersDiff';
import { formatDiff } from '../src/utils/diffFormatter';
import { DiffLineType } from '../src/types/diff';

console.log('=== 调试: a → b ===');
const ops = myersDiff(['a'], ['b']);
console.log('myersDiff operations:', ops);

const diff = formatDiff('a', 'b');
console.log('formatDiff result:', diff.map((d) => ({ type: d.type, content: d.content })));

console.log('\n=== 调试: line1\\nline2\\nline3 → line1\\nmodified\\nline3 ===');
const oldLines = ['line1', 'line2', 'line3'];
const newLines = ['line1', 'modified', 'line3'];
const ops2 = myersDiff(oldLines, newLines);
console.log('myersDiff operations:', ops2);

const diff2 = formatDiff('line1\nline2\nline3', 'line1\nmodified\nline3');
console.log('formatDiff result:');
diff2.forEach((d, i) => {
  console.log(`  ${i}: ${d.type} "${d.content}" old=${d.oldLineNumber} new=${d.newLineNumber}`);
});
