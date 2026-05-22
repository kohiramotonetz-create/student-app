// OtherSetupsView.jsx - 書き単・不規則変化・古文単語の設定画面を担当するコンポーネント

import React from 'react';

function OtherSetupsView({
  step,
  setStep,
  mode,
  setMode,
  startDay,
  setStartDay,
  endDay,
  setEndDay,
  kakitanData,
  fukisokuData,
  kobunData,
  resetQuizState,
  setQuizItems,
  QUESTION_COUNT,
  isFukisokuMode,
  isKobunMode,
  fetchAndFilterWrongWords,
  showWrongList,
  setShowWrongList,
  wrongWordsList
}) {
  if (
    step !== 'kakitan-setup' && 
    step !== 'fukisoku-setup' && 
    step !== 'kobun-setup'
  ) return null;

  return (
    <>
      {/* ✍️ 書き単 設定画面 */}
      {step === 'kakitan-setup' && (
        <div className="quiz-container">
          <h2>✍️ 書き単 設定</h2>
          <div className="config-group">
            <label>形式:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="en-ja">英語 → 日本語</option>
              <option value="ja-en">日本語 → 英語</option>
            </select>
            <label>範囲 (単元):</label>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <select value={startDay} onChange={(e) => setStartDay(e.target.value)}>
                {[...new Set(kakitanData.map(d => d.unit))].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              〜
              <select value={endDay} onChange={(e) => setEndDay(e.target.value)}>
                {[...new Set(kakitanData.map(d => d.unit))].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <button className="nav-btn" style={{ backgroundColor: '#dc3545', marginBottom: '10px' }} onClick={() => {
            const units = [...new Set(kakitanData.map(d => d.unit))];
            const sIdx = units.indexOf(startDay);
            const eIdx = units.indexOf(endDay);
            const targetUnits = units.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
            const range = kakitanData.filter(d => targetUnits.includes(d.unit));
            if (range.length === 0) return alert("該当データがありません");

            fetchAndFilterWrongWords("書き単", range);
          }}>🔍 過去の間違えたものリストを表示</button>

          <button className="nav-btn" onClick={() => {
            const units = [...new Set(kakitanData.map(d => d.unit))];
            const sIdx = units.indexOf(startDay);
            const eIdx = units.indexOf(endDay);
            const targetUnits = units.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
            const range = kakitanData.filter(d => targetUnits.includes(d.unit));
            if (range.length === 0) return alert("該当データがありません");
            resetQuizState();
            setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
            setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => { setStep('menu'); setShowWrongList(false); }}>戻る</button>

          {showWrongList && wrongWordsList.length > 0 && step === 'kakitan-setup' && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #dc3545', paddingTop: '20px', textAlign: 'left' }}>
              <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>⚠️ 要復習リスト（残り {wrongWordsList.length} 問）</h3>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', background: '#fff', borderRadius: '6px', marginBottom: '15px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '8px' }}>単元名</th>
                      <th style={{ padding: '8px' }}>問題 (英語)</th>
                      <th style={{ padding: '8px' }}>答え (日本語)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wrongWordsList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', color: '#666' }}>{item.unit}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.q}</td>
                        <td style={{ padding: '8px' }}>{item.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="nav-btn" style={{ backgroundColor: '#28a745' }} onClick={() => {
                const targetItems = wrongWordsList.map(w => w.rawItem);
                resetQuizState();
                setQuizItems([...targetItems].sort(() => 0.5 - Math.random()));
                setShowWrongList(false);
                setStep('quiz-main');
              }}>🔥 間違えた問題のみトライ！</button>
            </div>
          )}
        </div>
      )}

      {/* 🔄 不規則変化 ＆ 📚 古文単語 設定画面 */}
      {(step === 'fukisoku-setup' || step === 'kobun-setup') && (
        <div className="quiz-container">
          <h2 style={{ color: '#333' }}>🚀 {isFukisokuMode ? "不規則変化" : "古文単語"} 設定</h2>
          <div className="config-group">
            <label>形式:</label>
            
            {/* 💡 不規則変化のときは「日本語→英語」、古文単語のときは「古文→現代語訳」でそれぞれ変更不可にする */}
            {isFukisokuMode ? (
              <select 
                value="ja-en" 
                disabled 
                style={{ 
                  backgroundColor: '#e2e8f0', 
                  color: '#475569', 
                  cursor: 'not-allowed', 
                  fontWeight: 'bold' 
                }}
              >
                <option value="ja-en">日本語 → 英語 (固定)</option>
              </select>
            ) : (
              <select 
                value="en-ja" 
                disabled 
                style={{ 
                  backgroundColor: '#e2e8f0', 
                  color: '#475569', 
                  cursor: 'not-allowed', 
                  fontWeight: 'bold' 
                }}
              >
                <option value="en-ja">古文 → 現代語訳 (固定)</option>
              </select>
            )}
          </div>

          <button className="nav-btn" style={{ backgroundColor: '#dc3545', marginBottom: '10px' }} onClick={() => {
            const baseData = isFukisokuMode ? fukisokuData : kobunData;
            const sheetName = isFukisokuMode ? "英単語(不規則変化)" : "古文単語(自習)";
            
            fetchAndFilterWrongWords(sheetName, baseData);
          }}>🔍 過去の間違えたものリストを表示</button>

          <button className="nav-btn" onClick={() => {
            const baseData = isFukisokuMode ? fukisokuData : kobunData;
            resetQuizState(); 
            setQuizItems([...baseData].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); 
            
            {/* ★ スタートした瞬間、各モードに応じた正しい識別子を親ステートに強制同期 */}
            if (isFukisokuMode) {
              setMode('ja-en'); // 不規則変化は「日本語→英語」
            } else {
              setMode('en-ja'); // 古文単語は「古文→現代語訳」
            }
            
            setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => { setStep('menu'); setShowWrongList(false); }}>戻る</button>

          {/* 不規則変化・古文自習用の要復習リストテーブル表示エリア */}
          {showWrongList && wrongWordsList.length > 0 && (step === 'fukisoku-setup' || step === 'kobun-setup') && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #dc3545', paddingTop: '20px', textAlign: 'left' }}>
              <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>⚠️ 要復習リスト（残り {wrongWordsList.length} 問）</h3>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', background: '#fff', borderRadius: '6px', marginBottom: '15px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '8px' }}>単元名</th>
                      <th style={{ padding: '8px' }}>問題 ({isKobunMode ? "古文" : "英語"})</th>
                      <th style={{ padding: '8px' }}>答え ({isKobunMode ? "現代語訳" : "日本語"})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wrongWordsList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', color: '#666' }}>{item.unit || "全般"}</td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.q}</td>
                        <td style={{ padding: '8px' }}>{item.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="nav-btn" style={{ backgroundColor: '#28a745' }} onClick={() => {
                const targetItems = wrongWordsList.map(w => w.rawItem);
                resetQuizState();
                setQuizItems([...targetItems].sort(() => 0.5 - Math.random()));
                
                {/* ★ 間違えた問題のみトライで復習するときも、確実に各モードの固定形式を適用 */}
                if (isFukisokuMode) {
                  setMode('ja-en');
                } else {
                  setMode('en-ja');
                }
                
                setShowWrongList(false);
                setStep('quiz-main');
              }}>🔥 間違えた問題のみトライ！</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default OtherSetupsView;