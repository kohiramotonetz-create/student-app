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
  isKobunMode
}) {
  // 該当するステップでない場合は何も表示しない
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
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {/* 🔄 不規則変化 ＆ 📚 古文単語 設定画面 */}
      {(step === 'fukisoku-setup' || step === 'kobun-setup') && (
        <div className="quiz-container">
          <h2 style={{ color: '#333' }}>🚀 {isFukisokuMode ? "不規則変化" : "古文単語"} 設定</h2>
          <div className="config-group">
            <label>形式:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="en-ja">{isKobunMode ? "古文→現代語訳" : "英語→日本語"}</option>
              <option value="ja-en">{isKobunMode ? "現代語訳→古文" : "日本語→英語"}</option>
            </select>
          </div>
          <button className="nav-btn" onClick={() => {
            const baseData = isFukisokuMode ? fukisokuData : kobunData;
            resetQuizState(); 
            setQuizItems([...baseData].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); 
            setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
    </>
  );
}

export default OtherSetupsView;