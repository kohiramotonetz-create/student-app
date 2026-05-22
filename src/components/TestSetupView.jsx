// TestSetupView.jsx - 英単語テスト作成画面のコンポーネント

import React from 'react';

function TestSetupView({
  step,
  setStep,
  gradeList,
  selectedGrade,
  setSelectedGrade,
  mode,
  setMode,
  school,
  setSchool,
  customSchool,
  setCustomSchool,
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
  testWords,
  setTestWords,
  showPaperAnswers,
  setShowPaperAnswers,
  speakEn,
  QUESTION_COUNT
}) {
  if (step !== 'test-setup') return null;

  return (
    <div className="test-builder-layout">
      <div className="settings-panel no-print">
        <h3>📝 テスト作成設定</h3>
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
          
          <label>学校名:</label>
          <select value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="木太中">木太中</option>
            <option value="玉藻中">玉藻中</option>
            <option value="桜町中">桜町中</option>
            <option value="附属中">附属中</option>
            <option value="custom">-- 直接入力 --</option>
          </select>
          {school === 'custom' && (
            <input type="text" value={customSchool} onChange={(e) => setCustomSchool(e.target.value)} placeholder="学校名を入力" />
          )}
          
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
        
        <button className="nav-btn" onClick={() => {
          const sKey = startUnit + startPart; const eKey = endUnit + endPart;
          const sIdx = allData.findIndex(d => d.key === sKey); const eIdx = allData.findLastIndex(d => d.key === eKey);
          if (sIdx === -1 || eIdx === -1) return alert("選択した範囲のデータが見つかりません");
          const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
          setTestWords([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
        }}>🔄 問題作成</button>
        
        <button className="nav-btn" style={{ backgroundColor: '#17a2b8' }} onClick={() => setShowPaperAnswers(!showPaperAnswers)}>
          👁 {showPaperAnswers ? "解答隠す" : "解答表示"}
        </button>
        <button className="nav-btn" style={{ backgroundColor: '#28a745' }} onClick={() => window.print()}>🖨 印刷</button>
        <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
      </div>
      
      <div className="preview-panel">
        <div className="test-paper">
          <div className="header-area">
            <div className="header-left">氏名 ____________________</div>
            <h1 style={{ color: '#333' }}>英単語テスト</h1>
            <div className="header-right">{school === 'custom' ? customSchool : school}</div>
          </div>
          <table className="paper-table">
            <tbody>
              {testWords.map((d, i) => (
                <tr key={i}>
                  <td className="col-no">{i + 1}</td>
                  <td className="q-cell-grid">
                    <div className="audio-wrapper no-print">
                      <button className="audio-btn-fixed" onClick={() => speakEn(d.en)}>🔊</button>
                    </div>
                    <div className="text-wrapper">
                      <span>{mode === 'en-ja' ? d.en : d.ja}</span>
                    </div>
                  </td>
                  <td className="a-cell">
                    {showPaperAnswers ? (mode === 'en-ja' ? d.ja : d.en) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TestSetupView;