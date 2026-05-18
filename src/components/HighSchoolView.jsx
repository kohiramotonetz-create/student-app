import React from 'react';

function HighSchoolView({
  step,
  setStep,
  mode,
  setMode,
  targetData,
  targetminiData,
  sokudokuData,
  dragonData,
  yumetannData,
  kikutanData,
  kakushinData,
  kobun315Data,
  irohaData,
  kobun325Data,
  formulaData,
  kougeiData,
  selectedBook,
  setSelectedBook,
  setIsKobunMode,
  startNo,
  setStartNo,
  endNo,
  setEndNo,
  availableParts,
  selectedParts,
  setSelectedParts,
  availableKougeiUnits,
  startDay,
  setStartDay,
  resetQuizState,
  setQuizItems,
  QUESTION_COUNT,
  isKobunMode
}) {
  if (step !== 'highschool-menu' && step !== 'highschool-setup') return null;

  return (
    <>
      {/* 🎓 高校生モード メニュー画面 */}
      {step === 'highschool-menu' && (
        <div className="menu-box">
          <h1>🎓 高校生モード</h1>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>🎓 高校生英単語</h3>
            <div className="button-grid">
              {[
                { n: 'ターゲット1900', d: targetData },
                { n: 'ターゲット1200', d: targetminiData },
                { n: '速読英単語', d: sokudokuData },
                { n: 'ドラゴンイングリッシュ', d: dragonData },
                { n: 'ユメタン', d: yumetannData },
                { n: 'キクタン準2級', d: kikutanData },
              ].map((b) => (
                <button key={b.n} className="nav-btn" onClick={() => { 
                  setIsKobunMode(false); 
                  setSelectedBook({ name: b.n, data: b.d }); 
                  setStartNo(1); 
                  setEndNo(Math.min(b.d.length, 100)); 
                  setStep('highschool-setup'); 
                }}>{b.n}</button>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '10px' }}>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>📚 高校生古文単語</h3>
            <div className="button-grid">
              {[
                { n: '核心古文単語351', d: kakushinData },
                { n: '古文単語315', d: kobun315Data },
                { n: 'いろはにほへと', d: irohaData },
                { n: '古文325', d: kobun325Data },
                { n: 'FORMULA600', d: formulaData }
              ].map((b) => (
                <button key={b.n} className="nav-btn" style={{ backgroundColor: '#6f42c1', color: 'white' }} onClick={() => { 
                  setIsKobunMode(true); 
                  setSelectedBook({ name: b.n, data: b.d }); 
                  setStartNo(1); 
                  setEndNo(Math.min(b.d.length, 100)); 
                  setStep('highschool-setup'); 
                }}>{b.n}</button>
              ))}
            </div>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '10px' }}>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>🎨 定期対策</h3>
            <div className="button-grid">
              <button 
                className="nav-btn" 
                style={{ backgroundColor: '#2ecc71', color: 'white' }} 
                onClick={() => { 
                  setIsKobunMode(false); 
                  setSelectedBook({ name: '定期対策_工芸', data: kougeiData }); 
                  setStartNo(1); 
                  setEndNo(Math.min(kougeiData.length, 100)); 
                  setStep('highschool-setup'); 
                }}
              >
                定期対策_工芸
              </button>
            </div>
          </div>
          <button className="secondary" style={{ marginTop: '20px' }} onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {/* 🚀 高校生モード 設定画面 */}
      {step === 'highschool-setup' && (
        <div className="quiz-container">
          <h2 style={{ color: '#333' }}>🚀 {selectedBook.name}</h2>
          <div className="config-group">
            <label>形式:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="en-ja">{isKobunMode ? "古文→現代語訳" : "英語→日本語"}</option>
              <option value="ja-en">{isKobunMode ? "現代語訳→古文" : "日本語→英語"}</option>
            </select>
            
            {selectedBook.name !== '定期対策_工芸' && (
              <>
                <label>範囲(No.):</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                  <input type="number" value={startNo} onChange={(e) => setStartNo(Number(e.target.value))} style={{ width: '80px' }} />
                  〜
                  <input type="number" value={endNo} onChange={(e) => setEndNo(Number(e.target.value))} style={{ width: '80px' }} />
                </div>
              </>
            )}

            {selectedBook.name === '古文単語315' && availableParts.length > 0 && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <label>品詞絞り込み (複数可):</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                  {availableParts.map(part => (
                    <button 
                      key={part} 
                      onClick={() => setSelectedParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part])}
                      style={{ 
                        padding: '5px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #6f42c1', cursor: 'pointer',
                        backgroundColor: selectedParts.includes(part) ? '#6f42c1' : 'white', color: selectedParts.includes(part) ? 'white' : '#6f42c1' 
                      }}
                    >
                      {part}
                    </button>
                  ))}
                </div>
                {selectedParts.length > 0 && (
                  <button onClick={() => setSelectedParts([])} style={{ fontSize: '11px', color: 'gray', background: 'none', border: 'none', marginTop: '5px', cursor: 'pointer' }}>全解除</button>
                )}
              </div>
            )}
            
            {selectedBook.name === '定期対策_工芸' && availableKougeiUnits.length > 0 && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <label>単元選択:</label>
                <select 
                  value={startDay} 
                  onChange={(e) => setStartDay(e.target.value)} 
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  <option value="">-- すべての単元 --</option>
                  {availableKougeiUnits.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button className="nav-btn" onClick={() => {
            let range = [];
            if (selectedBook.name === '定期対策_工芸') {
              if (startDay === 'DAY1' || startDay === "" || startDay.includes("すべての単元")) {
                range = selectedBook.data;
              } else {
                range = selectedBook.data.filter(d => d.unit === startDay);
              }
            } else {
              range = selectedBook.data.filter(d => d.no >= startNo && d.no <= endNo);
              if (selectedBook.name === '古文単語315' && selectedParts.length > 0) {
                range = range.filter(d => selectedParts.includes(d.part));
              }
            }

            if (range.length === 0) return alert("該当なし");
            resetQuizState(); 
            setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); 
            setStep('quiz-main');
          }}>スタート！</button>
          
          <button className="secondary" onClick={() => { setStep('highschool-menu'); setSelectedParts([]); }}>戻る</button>
        </div>
      )}
    </>
  );
}

export default HighSchoolView;