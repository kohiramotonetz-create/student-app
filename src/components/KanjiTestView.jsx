import React from 'react';

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
  canvasRef,
  startDrawing,
  draw,
  setIsDrawing,
  clearKanjiCanvas,
  judgeKanji,
  setStrokes,
  setQuizAnswers
}) {
  if (step !== 'kanji-setup' && step !== 'kanji-main') return null;

  return (
    <>
      {/* 🖋 漢字テスト 設定画面 */}
      {step === 'kanji-setup' && (
        <div className="quiz-container">
          <h2 style={{ color: '#333' }}>🚀 漢字テスト 設定</h2>
          <div className="config-group">
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
          </div>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="nav-btn" onClick={startKanjiTest} disabled={kanjiMode === 'page' && !selectedText} style={{ width: '100%' }}>🚀 テスト開始！</button>
            <button className="secondary" onClick={() => setStep('menu')} style={{ width: '100%' }}>戻る</button>
          </div>
        </div>
      )}

      {/* 実行画面（手書き画面） */}
      {step === 'kanji-main' && quizItems[qIndex] && (
        <div className="quiz-container" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}>
          <div className="q-header">漢字 Q {qIndex + 1} / {quizItems.length}</div>
          
          <div style={{ fontSize: '22px', marginBottom: '15px', fontWeight: 'bold' }}>
            問題： 「{quizItems[qIndex].ja}」
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px', fontWeight: 'normal' }}>
              当てはまる漢字を枠内に書いてください
            </div>
          </div>

          <div style={{ 
            background: 'white', border: '3px solid #4A90E2', borderRadius: '10px', overflow: 'hidden', width: '270px', margin: '0 auto 15px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none'
          }}>
            <canvas 
              ref={canvasRef}
              width="270" 
              height="480" 
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={() => setIsDrawing(false)}
              style={{ touchAction: 'none', cursor: 'crosshair', display: 'block' }}
            ></canvas>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px', width: '270px', margin: '0 auto 15px' }}>
            <button className="secondary" onClick={clearKanjiCanvas} style={{ flex: 1 }}>消去</button>
            <button className="nav-btn" onClick={judgeKanji} style={{ flex: 2 }}>判定する</button>
          </div>
          
          <button 
            className="secondary" 
            style={{ width: '100%' }} 
            onClick={() => { 
              if(window.confirm("中断しますか？")) {
                setStrokes([]); 
                clearKanjiCanvas();
                setQuizAnswers([]); 
                setStep('menu');
              }
            }}
          >
            中断してメニューに戻る
          </button>
        </div>
      )}
    </>
  );
}

export default KanjiTestView;