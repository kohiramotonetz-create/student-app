import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';
import { formatKanjiInk, getEmptyKanjiFrames, getKanjiCandidates, getKanjiCharacters,
  getKanjiPoint, isInsideKanjiFrame } from '../src/utils/kanjiWriting.js';

test('grapheme count includes kana, supplementary kanji, combining marks and variation selectors', () => {
  for (const [value, count] of [['掛ける', 3], ['浮かび上がる', 6], ['ローマ帝国', 5], ['𠮷', 1], ['か\u3099', 1], ['葛\u{E0100}', 1], ['', 0]]) {
    assert.equal(getKanjiCharacters(value).length, count);
  }
  assert.equal(getKanjiCharacters('貸す」').length, 3, 'CSV is not silently corrected');
});

test('logical coordinates scale with the actual rectangle and accept clientX zero', () => {
  for (const side of [180, 270, 356]) {
    assert.deepEqual(getKanjiPoint({ clientX: side / 2, clientY: 200 + side / 2 },
      { left: 0, top: 200, width: side, height: side }), { x: 135, y: 135 });
  }
  assert.deepEqual(getKanjiPoint({ clientX: 0, clientY: 0 }, { left: 0, top: 0, width: 360, height: 360 }), { x: 0, y: 0 });
  assert.equal(isInsideKanjiFrame({ x: -1, y: 10 }), false);
  assert.equal(isInsideKanjiFrame({ x: NaN, y: 10 }), false);
});

test('top-to-bottom payload preserves each frame stroke order and excludes CSS guides', () => {
  const frames = Array.from({ length: 6 }, (_, index) => [[{ x: index, y: 0 }, { x: 270, y: 270 }]]);
  const before = JSON.stringify(frames);
  const ink = formatKanjiInk(frames, 6);
  assert.equal(ink.length, 6);
  assert.deepEqual(ink.map((stroke) => stroke[1]), [[0,80],[80,160],[160,240],[240,320],[320,400],[400,480]]);
  assert.ok(ink.every((stroke) => stroke[2].length === 0 && stroke[0].every((x) => x >= 0 && x <= 270)));
  assert.equal(JSON.stringify(frames), before);
  assert.deepEqual(getEmptyKanjiFrames([frames[0], [], frames[2]], 3), [1]);
});

test('only valid recognition candidate strings can be scored', () => {
  assert.deepEqual(getKanjiCandidates(['SUCCESS', [['mock', ['愛', '合']]]]), ['愛', '合']);
  for (const data of [null, [], ['ERROR'], ['SUCCESS', []], ['SUCCESS', [['mock', []]]], ['SUCCESS', [['mock', [false]]]]]) {
    assert.throws(() => getKanjiCandidates(data));
  }
});

const source = fs.readFileSync(new URL('../src/components/KanjiWritingCanvas.jsx', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
const component = ast.body.find((node) => node.type === 'ExportDefaultDeclaration').declaration;
const handlerSource = (name) => {
  const node = component.body.body.find((entry) => entry.type === 'VariableDeclaration' && entry.declarations[0].id.name === name);
  return source.slice(node.start, node.end);
};
function pointerHarness() {
  let ink = [];
  const capture = new Set();
  const target = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 360 }),
    setPointerCapture: (id) => capture.add(id), hasPointerCapture: (id) => capture.has(id), releasePointerCapture: (id) => capture.delete(id) };
  const state = { disabled: false, characters: ['掛', 'け', 'る'], ink: { current: [] }, active: { current: null },
    getKanjiPoint, isInsideKanjiFrame, setStrokes: (value) => { ink = value; } };
  const context = vm.createContext(state);
  for (const name of ['finish', 'start', 'move']) vm.runInContext(handlerSource(name), context);
  const event = (extra = {}) => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, currentTarget: target, ...extra });
  return { state, capture, event, getInk: () => ink, run: (code, eventValue = event()) => { context.event = eventValue; vm.runInContext(code, context); } };
}

test('actual pointer handlers ignore additional fingers, end outside a frame and preserve partial ink on cancel', () => {
  const h = pointerHarness();
  h.run('start(event, 2)');
  h.run('start(event, 0)', h.event({ pointerId: 2, isPrimary: false }));
  h.run('move(event, 2)', h.event({ clientX: 200 }));
  assert.equal(h.getInk()[0].length, 0);
  assert.equal(h.getInk()[2][0].length, 2);
  h.run('finish(event)');
  assert.equal(h.state.active.current, null);
  assert.equal(h.capture.size, 0);
  h.run('start(event, 0)');
  h.run('move(event, 0)', h.event({ clientX: 400 }));
  assert.equal(h.state.active.current, null);
  assert.equal(h.getInk()[0][0].length, 1);
  h.run('move(event, 1)');
  assert.equal(h.getInk()[1].length, 0);
});

test('actual paint redraws DPR-scaled canvases without changing logical ink or drawing guides', () => {
  const paint = ast.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'paint');
  for (const dpr of [1,2,3]) {
    const operations = [];
    const ctx = new Proxy({}, { get: (_, key) => (...args) => operations.push([key, ...args]), set: () => true });
    const canvas = { width: 270, height: 270, getBoundingClientRect: () => ({ width: 356, height: 356 }), getContext: () => ctx };
    const ink = [[{ x: 0, y: 0 }, { x: 270, y: 270 }]];
    const context = vm.createContext({ window: { devicePixelRatio: dpr }, KANJI_LOGICAL_SIDE: 270, canvas, ink });
    vm.runInContext(source.slice(paint.start, paint.end) + '; paint(canvas, ink);', context);
    assert.equal(canvas.width, 356 * dpr);
    assert.equal(canvas.height, 356 * dpr);
    assert.deepEqual(operations.find(([name]) => name === 'lineTo'), ['lineTo',270,270]);
    assert.equal(operations.filter(([name]) => name === 'lineTo').length, 1);
    assert.deepEqual(ink[0][1], { x: 270, y: 270 });
  }
});
