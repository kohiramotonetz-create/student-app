import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';

const source = readFileSync(new URL('../src/components/QuizPlayView.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
let handler, label;
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXElement' && node.openingElement.name.name === 'button'
    && source.slice(node.start, node.end).includes('合宿メニューへ戻る')) {
    handler = node.openingElement.attributes.find((attr) => attr.name?.name === 'onClick').value.expression;
    label = node.children.find((child) => child.type === 'JSXExpressionContainer').expression;
  }
  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  });
}
visit(parse(source, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } }));
assert.ok(handler);
assert.ok(label);

test('App supplies authoritative active content to the shared result screen', () => {
  const call = app.slice(app.indexOf('<QuizPlayView'), app.indexOf('/>', app.indexOf('<QuizPlayView')));
  assert.match(call, /activeContentId=\{activeContentId\}/);
});

for (const contentId of ['camp_science_qa', 'camp_social_qa', 'camp_kagawa_kanji', 'kanji_test', 'preposition_test', 'kakitan', 'target_1900']) {
  for (const review of [false, true]) {
    test(`${contentId}: ${review ? 'review' : 'normal'} result returns to the existing correct menu without saving`, () => {
      // Camp kanji can start with no selectedBook ID. A stale ID must not
      // override the active content, including when returning to normal kanji.
      const state = {
        activeContentId: contentId,
        selectedBook: { name: '', data: [], contentId: contentId === 'kanji_test' ? 'camp_science_qa' : undefined },
        qIndex: 19, quizAnswers: [{ ok: false }], isCampReviewMode: review,
        campDraftAnswers: ['old'], isCampGrading: false, resetCount: 0,
        resetQuizState() {
          state.resetCount++;
          state.qIndex = 0; state.quizAnswers = []; state.campDraftAnswers = []; state.isCampReviewMode = false;
        },
        setSelectedBook: (book) => { state.selectedBook = book; },
        setStep: (step) => { state.step = step; },
        fetch: () => { throw Error('Result navigation must not save or grade'); }
      };
      const context = vm.createContext(state);
      const camp = contentId.startsWith('camp_');
      assert.equal(vm.runInContext(source.slice(label.start, label.end), context), camp ? '合宿メニューへ戻る' : 'メニューへ戻る');
      vm.runInContext(`(${source.slice(handler.start, handler.end)})()`, context);
      assert.equal(state.step, camp ? 'camp-menu' : 'menu');
      assert.equal(state.resetCount, 1);
      assert.equal(state.qIndex, 0);
      assert.equal(state.isCampReviewMode, false);
      assert.equal(state.quizAnswers.length, 0);
      assert.equal(state.selectedBook.contentId, undefined);
    });
  }
}
