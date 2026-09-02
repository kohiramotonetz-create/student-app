import React from 'react';
import { getContentDefinition } from '../constants/sukimakunContents';
import {
  PREPOSITION_MODES,
  getPrepositionModeLabel,
  preparePrepositionItems,
  selectPrepositionItems
} from '../utils/prepositionQuiz';

const REVIEW_EMPTY_MESSAGE = '現在、間違えた問題はありません。';

function PrepositionTestView({
  step,
  setStep,
  contentId,
  data,
  mode,
  setMode,
  resetQuizState,
  setQuizItems,
  setSelectedBook,
  fetchAndFilterWrongWords,
  showWrongList,
  setShowWrongList,
  wrongWordsList,
  setIsReviewMode,
  canStartContent,
  beginLearningAttempt
}) {
  if (step !== 'preposition-setup') return null;
  const content = getContentDefinition(contentId);
  const directionalItems = preparePrepositionItems(data, mode);

  const start = (items, isReviewMode = false) => {
    if (!canStartContent(contentId)) return;
    resetQuizState();
    setIsReviewMode(isReviewMode);
    setSelectedBook({ name: content.displayName, data, contentId });
    setQuizItems(selectPrepositionItems(items));
    setShowWrongList(false);
    beginLearningAttempt(contentId, isReviewMode);
    setStep('quiz-main');
  };

  return (
    <div className="quiz-container">
      <h2>{content.icon} {content.displayName}</h2>
      <div className="config-group">
        <label>出題方向:</label>
        <select value={mode} onChange={(event) => {
          setMode(event.target.value);
          setShowWrongList(false);
        }}>
          <option value={PREPOSITION_MODES.JA_TO_EN}>日本語 → 英語</option>
          <option value={PREPOSITION_MODES.EN_TO_JA}>英語 → 日本語</option>
        </select>
        <p>全{data.length}項目からランダムに20問を出題します。</p>
      </div>
      <button className="nav-btn" onClick={() => start(directionalItems)}>スタート！</button>
      <button
        className="nav-btn"
        style={{ backgroundColor: '#dc3545' }}
        onClick={() => fetchAndFilterWrongWords(content.logSheetName, directionalItems, {
          resolveWithReviewSuccess: true,
          contentId,
          emptyMessage: REVIEW_EMPTY_MESSAGE
        })}
      >🔍 間違えた問題を復習（{getPrepositionModeLabel(mode)}）</button>
      {showWrongList && wrongWordsList.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '2px solid #dc3545', paddingTop: '20px', textAlign: 'left' }}>
          <h3 style={{ color: '#dc3545' }}>⚠️ 要復習リスト（{wrongWordsList.length}問）</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', background: '#fff', borderRadius: '6px', marginBottom: '15px' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ padding: '8px' }}>問題</th><th style={{ padding: '8px' }}>正解</th></tr></thead>
              <tbody>{wrongWordsList.map(({ rawItem }) => (
                <tr key={rawItem.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{mode === PREPOSITION_MODES.JA_TO_EN ? rawItem.ja : rawItem.en}</td>
                  <td style={{ padding: '8px' }}>{mode === PREPOSITION_MODES.JA_TO_EN ? rawItem.en : rawItem.ja}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <button className="nav-btn" style={{ backgroundColor: '#28a745' }} onClick={() => start(wrongWordsList.map(({ rawItem }) => rawItem), true)}>
            復習テストを開始
          </button>
        </div>
      )}
      <button className="secondary" onClick={() => { setShowWrongList(false); setStep('menu'); }}>戻る</button>
    </div>
  );
}

export default PrepositionTestView;
