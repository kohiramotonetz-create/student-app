// KanjiTestView.jsx - 漢字テストの設定画面と実行画面を担当するコンポーネント

import React from 'react';
import { CONTENT_IDS, getContentDefinition } from '../constants/sukimakunContents';
import KanjiWritingCanvas from './KanjiWritingCanvas';
import { getKanjiCharacters } from '../utils/kanjiWriting';

function KanjiTestView({
  step,
  setStep,
  kanjiMode,
  setKanjiMode,
  selectedText,
  setSelectedText,
  startPage,
  setStartPage,
  endPage,
  setEndPage,
  kanjiList,
  selectedKanjiIds,
  toggleKanji,
  startKanjiTest,
  quizItems,
  qIndex,
  strokes,
  kanjiBusy,
  clearKanjiCanvas,
  judgeKanji,
  skipKanji,
  setStrokes,
  setQuizItems,
  resetQuizState,
  // 【追加箇所】間違えたものリスト用のPropsを受け取る
  fetchAndFilterWrongWords,
  showWrongList,
  setShowWrongList,
  wrongWordsList,
  canStartContent,
  contentId = CONTENT_IDS.kanji_test,
  setupStep = 'kanji-setup',
  mainStep = 'kanji-main',
  returnStep = 'menu',
  title = '漢字テスト 設定',
  randomAllCount = null,
  keepWrongHistory = false,
  setIsCampReviewMode,
}) {
  if (step !== setupStep && step !== mainStep) return null;

  return (
    <>
      {/* 🖋 漢字テスト 設定画面 */}
      {step === setupStep && (
        <div className="quiz-container">
          <h2 style={{ color: '#333' }}>🚀 {title}</h2>
          {randomAllCount ? (
            <div className="config-group">
              <p>全{kanjiList.length}問からランダムで{Math.min(randomAllCount, kanjiList.length)}問を出題します。</p>
            </div>
          ) : <div className="config-group">
            <label>出題方法:</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button className="nav-btn" onClick={() => setKanjiMode('page')}>① ページで選択</button>
              <button className="nav-btn" onClick={() => setKanjiMode('individual')}>② 1つずつ選ぶ</button>
            </div>
            
            {kanjiMode === 'page' ? (
              <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'left' }}>
                <label>1. テキストを選択:</label>
                <select value={selectedText} onChange={(e) => {
                  const text = e.target.value; setSelectedText(text);
                  const pages = [...new Set(kanjiList.filter(k => k.textName === text).map(k => k.page))].sort((a,b)=>a-b);
                  if(pages.length > 0) { setStartPage(pages[0]); setEndPage(pages[0]); }
                }} style={{ width: '100%', padding: '10px', marginBottom: '15px' }}>
                  <option value="">-- テキストを選択 --</option>
                  {[...new Set(kanjiList.map(k => k.textName))].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {selectedText && (
                  <>
                    <label>2. ページ範囲を指定:</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <select value={startPage} onChange={(e) => setStartPage(e.target.value)} style={{ flex: 1, padding: '8px' }}>
                        {[...new Set(kanjiList.filter(k => k.textName === selectedText).map(k => k.page))].sort((a,b)=>a-b).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <span>〜</span>
                      <select value={endPage} onChange={(e) => setEndPage(e.target.value)} style={{ flex: 1, padding: '8px' }}>
                        {[...new Set(kanjiList.filter(k => k.textName === selectedText).map(k => k.page))].sort((a,b)=>a-b).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* 個別選択モード */
              <div style={{ textAlign: 'left' }}>
                <label>1. テキストを選択して絞り込み:</label>
                <select 
                  value={selectedText} 
                  onChange={(e) => setSelectedText(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }}
                >
                  <option value="">-- すべて表示 --</option>
                  {[...new Set(kanjiList.map(k => k.textName))].map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                  2. 出題する漢字にチェック（{selectedKanjiIds.length}問選択中）
                </p>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '5px', background: 'white', borderRadius: '8px' }}>
                  {kanjiList
                    .map((k, idx) => ({ ...k, originalIdx: idx })) 
                    .filter(k => !selectedText || k.textName === selectedText) 
                    .map((k) => (
                      <label key={k.originalIdx} style={{ 
                        display: 'flex', alignItems: 'center', padding: '10px 5px', borderBottom: '1px solid #eee', cursor: 'pointer',
                        WebkitUserSelect: 'none', userSelect: 'none'
                      }}>
                        <div style={{ flex: '0 0 30px', display: 'flex', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedKanjiIds.includes(k.originalIdx)} 
                            onChange={() => toggleKanji(k.originalIdx)} 
                            style={{ transform: 'scale(1.2)' }}
                          />
                        </div>
                        <div style={{ flex: 1, marginLeft: '10px', fontSize: '14px', lineHeight: '1.4' }}>
                          <div style={{ color: '#888', fontSize: '11px' }}>{k.page}</div>
                          <div><strong>{k.answer}</strong> <span style={{ color: '#666' }}>({k.question})</span></div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* 【修正箇所】漢字テスト用の「間違えたものリスト」ボタンを追加 */}
            <button
              className="nav-btn" 
              style={{ backgroundColor: '#dc3545', width: '100%' }} 
              disabled={!randomAllCount && kanjiMode === 'page' && !selectedText}
              onClick={() => {
                let range = [];
                if (randomAllCount) {
                  range = kanjiList;
                } else if (kanjiMode === 'page') {
                  // ① ページ範囲選択の場合の抽出（"p" を除外して数字として比較できるように修正）
                  const sNum = Number(String(startPage).replace(/[^\d]/g, ''));
                  const eNum = Number(String(endPage).replace(/[^\d]/g, ''));
                  const startNum = Math.min(sNum, eNum);
                  const endNum = Math.max(sNum, eNum);

                  range = kanjiList.filter(k => {
                    if (k.textName !== selectedText) return false;
                    // アプリ内のデータ（k.page）が "p3" や "3" のどちらでも対応できるようにする
                    const kNum = Number(String(k.page).replace(/[^\d]/g, ''));
                    return kNum >= startNum && kNum <= endNum;
                  });
                } else {
                  // ② 1つずつ個別選択の場合の抽出
                  range = kanjiList.filter((_, idx) => selectedKanjiIds.includes(idx));
                }

                if (range.length === 0) return alert("選択された範囲に漢字データがありません");

                // ⭕️ 親の保存シート名「漢字テスト」と完全に一致させる
                fetchAndFilterWrongWords(getContentDefinition(contentId).logSheetName, range, {
                  keepWrongHistory,
                  resolveWithReviewSuccess: contentId === CONTENT_IDS.camp_kagawa_kanji,
                  isKanji: true,
                  contentId: keepWrongHistory ? contentId : null,
                  emptyMessage: keepWrongHistory ? '現在、間違えた問題はありません。' : undefined
                });
              }}
            >
              🔍 過去の間違えたものリストを表示
            </button>

            <button className="nav-btn" onClick={startKanjiTest} disabled={!randomAllCount && kanjiMode === 'page' && !selectedText} style={{ width: '100%' }}>🚀 テスト開始！</button>
            <button className="secondary" onClick={() => { setStep(returnStep); setShowWrongList(false); }} style={{ width: '100%' }}>戻る</button>
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* 【新設】漢字テスト用の間違えた問題の一覧表示 ＆ リトライUI */}
          {/* ──────────────────────────────────────────────────────── */}
          {showWrongList && wrongWordsList.length > 0 && step === setupStep && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #dc3545', paddingTop: '20px', textAlign: 'left' }}>
              <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>⚠️ 要復習リスト（残り {wrongWordsList.length} 問）</h3>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', background: '#fff', borderRadius: '6px', marginBottom: '15px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '8px' }}>ページ</th>
                      <th style={{ padding: '8px' }}>問題 (よみ)</th>
                      <th style={{ padding: '8px' }}>答え (漢字)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wrongWordsList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', color: '#666' }}>{item.unit || "個別"}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.q}</td>
                        <td style={{ padding: '8px' }}>{item.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="nav-btn" style={{ backgroundColor: '#28a745', width: '100%' }} onClick={() => {
                if (!canStartContent(contentId)) return;
                const targetItems = wrongWordsList.map(w => keepWrongHistory || contentId === CONTENT_IDS.kanji_test ? {
                  id: w.rawItem.id,
                  ja: w.rawItem.question,
                  en: w.rawItem.answer,
                  page: w.rawItem.page,
                  textName: w.rawItem.textName
                } : w.rawItem);
                
                // 漢字テスト専用のクイズ初期化処理
                setStrokes([]);
                resetQuizState();
                setIsCampReviewMode(contentId === CONTENT_IDS.camp_kagawa_kanji);
                // 間違えた問題のみをランダムにセットして手書きテストへ進む
                const shuffledItems = [...targetItems].sort(() => 0.5 - Math.random());
                setQuizItems(contentId === CONTENT_IDS.camp_kagawa_kanji ? shuffledItems.slice(0, randomAllCount) : shuffledItems);
                setShowWrongList(false);
                setStep(mainStep);
              }}>🔥 間違えた問題のみトライ！</button>
            </div>
          )}
        </div>
      )}

      {/* 実行画面（手書き画面） */}
      {step === mainStep && quizItems[qIndex] && (
        <div className="quiz-container kanji-writing-quiz" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}>
          <div className="q-header">漢字 Q {qIndex + 1} / {quizItems.length}</div>
          
          <div style={{ fontSize: '22px', marginBottom: '15px', fontWeight: 'bold' }}>
            問題： 「{quizItems[qIndex].ja}」
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px', fontWeight: 'normal' }}>
              上から1文字ずつ、送り仮名も枠内に書いてください
            </div>
          </div>

          <p className="kanji-writing-hint">枠を使って大きめに、とめ・はね・はらいを意識して書こう。画面は枠の外でスクロールできます。</p>
          <KanjiWritingCanvas key={`${mainStep}:${qIndex}`} characters={getKanjiCharacters(quizItems[qIndex].en)}
            strokes={strokes} setStrokes={setStrokes} disabled={kanjiBusy} />

          <div className="kanji-writing-actions">
            <button className="secondary" onClick={clearKanjiCanvas} disabled={kanjiBusy} style={{ flex: 1 }}>消去</button>
            <button className="nav-btn" onClick={judgeKanji} disabled={kanjiBusy} style={{ flex: 2 }}>判定する</button>
          </div>
          
          <button 
            className="secondary" 
            style={{ width: '100%' }} 
            onClick={skipKanji}
            disabled={kanjiBusy}
          >
            覚えていない
          </button>
        </div>
      )}
    </>
  );
}

export default KanjiTestView;
