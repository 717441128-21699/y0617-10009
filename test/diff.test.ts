import { formatDiff } from '../src/utils/diffFormatter';
import { computeInlineDiff } from '../src/utils/inlineDiff';
import { myersDiff } from '../src/utils/myersDiff';
import { DiffLineType } from '../src/types/diff';

function runTests() {
  console.log('🧪 开始测试代码差异对比...\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ ${name}`);
      console.log(`   错误: ${(e as Error).message}`);
      failed++;
    }
  }

  function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
  }

  function assertEqual(actual: unknown, expected: unknown, message: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `${message}\n   期望: ${JSON.stringify(expected)}\n   实际: ${JSON.stringify(actual)}`
      );
    }
  }

  console.log('📝 场景1: 单行替换 - a → b');
  test('Myers算法输出正确', () => {
    const ops = myersDiff(['a'], ['b']);
    assertEqual(ops.length, 2, '应该有2个操作');
    assertEqual(ops[0].type, 'delete', '第一个操作应该是delete');
    assertEqual(ops[1].type, 'insert', '第二个操作应该是insert');
  });

  test('格式化后正确显示删除和新增', () => {
    const diff = formatDiff('a', 'b');
    assertEqual(diff.length, 2, '应该有2行差异');
    assertEqual(diff[0].type, DiffLineType.DELETE, '第一行应该是DELETE');
    assertEqual(diff[0].content, 'a', '删除内容应该是a');
    assertEqual(diff[1].type, DiffLineType.INSERT, '第二行应该是INSERT');
    assertEqual(diff[1].content, 'b', '新增内容应该是b');
  });

  test('行内差异正确标记整行', () => {
    const { oldDiffs, newDiffs } = computeInlineDiff('a', 'b');
    assertEqual(oldDiffs.length, 1, '旧内容应该有1个片段');
    assertEqual(oldDiffs[0].type, DiffLineType.DELETE, '旧内容应该标记为DELETE');
    assertEqual(newDiffs.length, 1, '新内容应该有1个片段');
    assertEqual(newDiffs[0].type, DiffLineType.INSERT, '新内容应该标记为INSERT');
  });

  console.log('\n📝 场景2: 行内单字符修改 - abc → axc');
  test('只高亮变化的字符b和x', () => {
    const { oldDiffs, newDiffs } = computeInlineDiff('abc', 'axc');
    console.log('  oldDiffs:', oldDiffs);
    console.log('  newDiffs:', newDiffs);

    const hasEqualA = oldDiffs.some((d) => d.type === DiffLineType.EQUAL && d.value === 'a');
    const hasEqualC = oldDiffs.some((d) => d.type === DiffLineType.EQUAL && d.value === 'c');
    const hasDeleteB = oldDiffs.some((d) => d.type === DiffLineType.DELETE && d.value === 'b');

    const hasEqualA_new = newDiffs.some((d) => d.type === DiffLineType.EQUAL && d.value === 'a');
    const hasEqualC_new = newDiffs.some((d) => d.type === DiffLineType.EQUAL && d.value === 'c');
    const hasInsertX = newDiffs.some((d) => d.type === DiffLineType.INSERT && d.value === 'x');

    assert(hasEqualA, '旧内容中a应该标记为EQUAL');
    assert(hasEqualC, '旧内容中c应该标记为EQUAL');
    assert(hasDeleteB, '旧内容中b应该标记为DELETE');
    assert(hasEqualA_new, '新内容中a应该标记为EQUAL');
    assert(hasEqualC_new, '新内容中c应该标记为EQUAL');
    assert(hasInsertX, '新内容中x应该标记为INSERT');
  });

  console.log('\n📝 场景3: 边界场景 - 左边为空');
  test('左边为空时全量新增', () => {
    const diff = formatDiff('', 'line1\nline2\nline3');
    assertEqual(diff.length, 3, '应该有3行新增');
    diff.forEach((line, i) => {
      assertEqual(line.type, DiffLineType.INSERT, `第${i}行应该是INSERT`);
    });
  });

  console.log('\n📝 场景4: 边界场景 - 右边为空');
  test('右边为空时全量删除', () => {
    const diff = formatDiff('line1\nline2', '');
    assertEqual(diff.length, 2, '应该有2行删除');
    diff.forEach((line, i) => {
      assertEqual(line.type, DiffLineType.DELETE, `第${i}行应该是DELETE`);
    });
  });

  console.log('\n📝 场景5: 边界场景 - 两边完全相同');
  test('两边完全相同时只显示未变化', () => {
    const diff = formatDiff('line1\nline2', 'line1\nline2');
    assertEqual(diff.length, 2, '应该有2行');
    diff.forEach((line, i) => {
      assertEqual(line.type, DiffLineType.EQUAL, `第${i}行应该是EQUAL`);
      assert(!line.inlineDiffs, '不应该有行内差异');
    });
  });

  console.log('\n📝 场景6: 边界场景 - 两边都为空');
  test('两边都为空时返回空数组', () => {
    const diff = formatDiff('', '');
    assertEqual(diff.length, 0, '应该返回空数组');
  });

  console.log('\n📝 场景7: 多行中某一整行被替换');
  test('多行中整行替换显示正确', () => {
    const oldText = 'line1\nline2\nline3';
    const newText = 'line1\nmodified\nline3';
    const diff = formatDiff(oldText, newText);

    assert(diff.length >= 3, '至少有3行');
    assertEqual(diff[0].type, DiffLineType.EQUAL, '第一行应该是EQUAL');
    assertEqual(diff[1].type, DiffLineType.DELETE, '第二行应该是DELETE（line2）');
    assertEqual(diff[2].type, DiffLineType.INSERT, '第三行应该是INSERT（modified）');
    assertEqual(diff[3].type, DiffLineType.EQUAL, '第四行应该是EQUAL（line3）');
  });

  console.log('\n📝 场景8: 行内修改 - 更复杂的情况');
  test('hello world → hello trae', () => {
    const { oldDiffs, newDiffs } = computeInlineDiff('hello world', 'hello trae');
    console.log('  oldDiffs:', oldDiffs);
    console.log('  newDiffs:', newDiffs);

    const hasEqualHello = oldDiffs.some(
      (d) => d.type === DiffLineType.EQUAL && d.value.startsWith('hello ')
    );
    assert(hasEqualHello, '"hello " 应该标记为EQUAL');
  });

  console.log('\n📊 测试结果:');
  console.log(`  通过: ${passed}`);
  console.log(`  失败: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
