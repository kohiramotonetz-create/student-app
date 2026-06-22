// HighSchoolView.jsx - 高校生モードのメニューと設定画面を担当するコンポーネント

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
  mikiData, // 【改善：新規追加】親から降りてくる三木高校のデータ
  higashiData, // 💡【新規追加】親から降りてくる高松東高校のデータ
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
  isKobunMode,
  fetchAndFilterWrongWords,
  showWrongList,
  setShowWrongList,
  wrongWordsList
}) {
  if (step !== 'highschool-menu' && step !== 'highschool-setup') return null;

  // 【改善：内部共通フラグ】定期テスト対策用の高校が選択されているかを判定するヘルパー
  const isRegularExamBook = 
    selectedBook.name === '高松工芸美術科' || 
    selectedBook.name === '三木高校文理コース' || 
    selectedBook.name === '高松東高校２年人文コース';

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
            <h3 style={{ color: '#333', marginBottom: '10px' }}>🎨 定期テスト</h3>
            <div className="button-grid">
              {/* 【改善：名称変更】定期対策_工芸 ➔ 高松工芸美術科 */}
              <button 
                className="nav-btn" 
                style={{ backgroundColor: '#2ecc71', color: 'white' }} 
                onClick={() => { 
                  setIsKobunMode(false); 
                  setSelectedBook({ name: '高松工芸美術科', data: kougeiData }); 
                  setStartNo(1); 
                  setEndNo(Math.min(kougeiData.length, 100)); 
                  setStep('highschool-setup'); 
                }}
              >
                高松工芸美術科
              </button>

              {/* 【改善：新規追加】三木高校文理コースボタン */}
              <button 
                className="nav-btn" 
                style={{ backgroundColor: '#2ecc71', color: 'white' }} 
                onClick={() => { 
                  setIsKobunMode(false); 
                  setSelectedBook({ name: '三木高校文理コース', data: mikiData }); 
                  setStartNo(1); 
                  setEndNo(Math.min(mikiData.length, 100)); 
                  setStep('highschool-setup'); 
                }}
              >
                三木高校文理コース
              </button>

              {/* 💡【新規追加】高松東高校２年人文コースボタン */}
              <button 
                className="nav-btn" 
                style={{ backgroundColor: '#2ecc71', color: 'white' }} 
                onClick={() => { 
                  setIsKobunMode(false); 
                  setSelectedBook({ name: '高松東高校２年人文コース', data: higashiData }); 
                  setStartNo(1); 
                  setEndNo(Math.min(higashiData.length, 100)); 
                  setStep('highschool-setup'); 
                }}
              >
                高松東高校２年人文コース
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
            
            {/* 【改善：条件式変更】定期テスト枠の高校以外で範囲（No.）を出す */}
            {!isRegularExamBook && (
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
            
            {/* 【改善：条件式変更】定期テスト枠の高校のときに単元セレクトボックスを表示 */}
            {isRegularExamBook && availableKougeiUnits.length > 0 && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <label>教科書ページ:</label>
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

          <button className="nav-btn" style={{ backgroundColor: '#dc3545', marginBottom: '10px' }} onClick={() => {
            let range = [];
            {/* 【改善：条件式変更】定期テスト枠の高校データのスコープ判定 */}
            if (isRegularExamBook) {
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

            if (range.length === 0) return alert("選択した範囲のデータが見つかりません");

            fetchAndFilterWrongWords(selectedBook.name, range);
          }}>🔍 過去の間違えたものリストを表示</button>

          <button className="nav-btn" onClick={() => {
            let range = [];
            {/* 【改善：条件式変更】定期テスト枠の高校データのスコープ判定 */}
            if (isRegularExamBook) {
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
          
          <button className="secondary" onClick={() => { setStep('highschool-menu'); setSelectedParts([]); setShowWrongList(false); }}>戻る</button>

          {/* 高校生モード用の要復習リストテーブル表示エリア */}
          {showWrongList && wrongWordsList.length > 0 && step === 'highschool-setup' && (
            <div style={{ marginTop: '20px', borderTop: '2px solid #dc3545', paddingTop: '20px', textAlign: 'left' }}>
              <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>⚠️ 要復習リスト（残り {wrongWordsList.length} 問）</h3>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', background: '#fff', borderRadius: '6px', marginBottom: '15px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '8px' }}>No.</th>
                      <th style={{ padding: '8px' }}>問題</th>
                      <th style={{ padding: '8px' }}>答え</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wrongWordsList.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', color: '#666' }}>{item.rawItem.no || idx + 1}</td>
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
    </>
  );
}

export default HighSchoolView;