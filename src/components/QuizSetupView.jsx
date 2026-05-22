// QuizSetupView.jsx - クイズの設定画面を担当するコンポーネント

import React from 'react';

function QuizSetupView({
  step,
  setStep,
  gradeList,
  selectedGrade,
  setSelectedGrade,
  mode,
  setMode,
  startUnit,
  setStartUnit,
  filteredUnits,
  startPart,
  setStartPart,
  endUnit,
  setEndUnit,
  endPart,
  setEndPart,
  allData,
  resetQuizState,
  setQuizItems,
  QUESTION_COUNT,
  fetchAndFilterWrongWords,
  showWrongList,
  setShowWrongList,
  wrongWordsList
}) {
  if (step !== 'quiz-setup') return null;

  return (
    <div className="quiz-container">
      <h2 style={{ color: '#333' }}>🚀 クイズ設定</h2>
      <div className="config-group">
        <label>学年:</label>
        <div className="grade-selector">
          {gradeList.map(g => (
            <button 
              key={g} 
              className={selectedGrade === g ? "grade-btn active" : "grade-btn"} 
              onClick={() => setSelectedGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
        
        <label>形式:</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="en-ja">英語→日本語</option>
          <option value="ja-en">日本語→英語</option>
        </select>
        
        <label>範囲:</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
            {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
            {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
            {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
            {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      
      {/* 過去の間違えたものリストを表示するボタン */}
      <button 
        className="nav-btn" 
        style={{ backgroundColor: '#dc3545', marginBottom: '10px' }} 
        onClick={() => {
          const sKey = startUnit + startPart; const eKey = endUnit + endPart;
          const sIdx = allData.findIndex(d => d.key === sKey); const eIdx = allData.findLastIndex(d => d.key === eKey);
          if (sIdx === -1 || eIdx === -1) return alert("選択した範囲のデータが見つかりません");
          const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
          fetchAndFilterWrongWords("1問ずつテスト(自習)", range);
        }}
      >
        🔍 過去の間違えたものリストを表示
      </button>

      <button className="nav-btn" onClick={() => {
        const sKey = startUnit + startPart; const eKey = endUnit + endPart;
        const sIdx = allData.findIndex(d => d.key === sKey); const eIdx = allData.findLastIndex(d => d.key === eKey);
        if (sIdx === -1 || eIdx === -1) return alert("選択した範囲のデータが見つかりません");
        const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
        resetQuizState(); 
        setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); 
        setStep('quiz-main');
      }}>
        スタート！
      </button>
      <button className="secondary" onClick={() => { setStep('menu'); setShowWrongList(false); }}>
        戻る
      </button>

      {/* 要復習リストテーブル表示エリア */}
      {showWrongList && wrongWordsList.length > 0 && (
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
          }}>
            🔥 間違えた問題のみトライ！
          </button>
        </div>
      )}
    </div>
  );
}

export default QuizSetupView;