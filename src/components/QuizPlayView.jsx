// QuizPlayView.jsx - クイズの実行画面と結果表示を担当するコンポーネント

import React from 'react';

function QuizPlayView({
  step,
  setStep,
  quizItems,
  qIndex,
  currentInput,
  setCurrentInput,
  quizReview,
  practice,
  setPractice,
  selectedBook,
  mode,
  isKobunMode,
  speakEn,
  submitQuizAnswer,
  proceedToNext,
  finishPractice,
  quizAnswers,
  resetQuizState,
  setSelectedBook
}) {
  if (step !== 'quiz-main' && step !== 'quiz-result') return null;

  return (
    <>
      {/* 🚀 クイズ実行画面（テスト本体） */}
      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: 'white', border: 'none', height: '100px', marginBottom: '20px' }}>
            {mode === 'en-ja' && !isKobunMode && (
              <div className="q-audio-area" style={{ flex: '0 0 70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button className="audio-btn" onClick={() => speakEn(quizItems[qIndex].en)} style={{ fontSize: '18px', background: 'none', border: 'none', opacity: '0.6' }}>🔊</button>
              </div>
            )}
            <div className="q-word-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {(mode === 'en-ja' && !isKobunMode) && <div style={{ position: 'absolute', left: 0, top: '15px', bottom: '15px', width: '1px', background: '#eee' }}></div>}
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#444' }}>{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
            </div>
          </div>
          
          <input 
            className="q-input" 
            value={currentInput} 
            onChange={(e) => setCurrentInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} 
            autoFocus 
            placeholder="答えを入力..." 
          />
          
          {!quizReview.visible && <button className="nav-btn" onClick={submitQuizAnswer}>回答する</button>}
          
          {quizReview.visible && (
            <div className="review-box" style={{ textAlign: 'left' }}>
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"} style={{ textAlign: 'center' }}>
                {quizReview.record.ok ? "✅ 正解！" : "❌ 不正解"}
              </p>
              {!quizReview.record.ok && selectedBook.name === '書き単' ? (
                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '15px', marginBottom: '15px' }}>
                  <div>正解：<span style={{ color: '#666' }}>[{quizReview.record.rawItem.part}]</span> <strong>{quizReview.record.correct}</strong> 　{quizReview.record.rawItem.pron}</div>
                  <div style={{ marginLeft: '45px', fontSize: '13px', color: '#888' }}>{quizReview.record.rawItem.detailPron}</div>
                </div>
              ) : (
                !quizReview.record.ok && <p className="txt-ng" style={{ textAlign: 'center', marginBottom: '15px' }}>正解: {quizReview.record.correct}</p>
              )}
              
              {quizReview.record.ok ? (
                <button className="nav-btn" onClick={proceedToNext}>次へ進む</button>
              ) : (
                <div className="practice-area">
                  <input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} autoFocus />
                  <button className="nav-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 📊 結果発表画面 */}
      {step === 'quiz-result' && (
        <div className="quiz-container">
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px', margin: '10px 0' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          <div style={{ maxHeight: '350px', overflowY: 'auto', width: '100%', border: '1px solid #eee' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '5px' }}>No</th>
                  <th style={{ padding: '5px' }}>問題</th>
                  {selectedBook.name === '書き単' && <th style={{ padding: '5px' }}>品詞</th>}
                  <th style={{ padding: '5px' }}>解答</th>
                  {selectedBook.name === '書き単' && <th style={{ padding: '5px' }}>発音</th>}
                  {/* 【追加】「自分の回答」列のヘッダー */}
                  <th style={{ padding: '5px' }}>自分の回答</th>
                  <th style={{ padding: '5px' }}>正誤</th>
                </tr>
              </thead>
              <tbody>
                {quizAnswers.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ textAlign: 'center', padding: '5px' }}>{i + 1}</td>
                    <td style={{ padding: '5px' }}>{a.q}</td>
                    {selectedBook.name === '書き単' && <td style={{ padding: '5px' }}>{a.rawItem.part}</td>}
                    <td style={{ padding: '5px', fontWeight: '500' }}>{a.correct}</td>
                    {selectedBook.name === '書き単' && <td style={{ padding: '5px' }}>{a.rawItem.pron}</td>}
                    {/* 【追加】生徒自身がタイピング、または選択した回答を出すセルを追加 */}
                    <td style={{ padding: '5px', color: a.ok ? '#444' : '#ef4444' }}>
                      {a.a || <span style={{ color: '#aaa', fontStyle: 'italic' }}>未入力</span>}
                    </td>
                    <td style={{ color: a.ok ? 'green' : 'red', fontWeight: 'bold', textAlign: 'center', padding: '5px' }}>{a.ok ? '○' : '×'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="secondary" onClick={() => { resetQuizState(); setSelectedBook({ name: '', data: [] }); setStep('menu'); }}>メニューへ戻る</button>
        </div>
      )}
    </>
  );
}

export default QuizPlayView;