import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const QUESTION_COUNT = 20;

function App() {
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]); 
  const [selectedGrade, setSelectedGrade] = useState('');
  const [startUnit, setStartUnit] = useState('');
  const [startPart, setStartPart] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [endPart, setEndPart] = useState('');
  const [school, setSchool] = useState('木太中');
  const [customSchool, setCustomSchool] = useState(''); 
  const [mode, setMode] = useState('en-ja'); 
  const [testWords, setTestWords] = useState([]);
  const [rangeText, setRangeText] = useState('');
  const [quizItems, setQuizItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [quizReview, setQuizReview] = useState({ visible: false, record: null });
  const [practice, setPractice] = useState("");
  const [fukisokuData, setFukisokuData] = useState([]);
  const [isFukisokuMode, setIsFukisokuMode] = useState(false);
  const [kobunData, setKobunData] = useState([]);
  const [isKobunMode, setIsKobunMode] = useState(false); 

  const [targetData, setTargetData] = useState([]);
  const [targetminiData, setTargetminiData] = useState([]);
  const [sokudokuData, setSokudokuData] = useState([]);
  const [dragonData, setDragonData] = useState([]);
  const [yumetannData, setYumetannData] = useState([]);

  const [selectedBook, setSelectedBook] = useState({ name: '', data: [] });
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(100);

  // 【復元】解答表示の状態
  const [showPaperAnswers, setShowPaperAnswers] = useState(false);

  // --- 状態リセット ---
  const resetQuizState = () => {
    setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setPractice(""); setQuizReview({ visible: false, record: null });
  };

  // --- GAS送信 ---
  const sendResultToGAS = (finalAnswers, sheetName) => {
    if (!sheetName || !LOG_GAS_URL) return;
    const payload = {
      action: "saveLog", sheetName, userName,
      testRange: selectedBook.name ? `No.${startNo}～${endNo}` : (isKobunMode ? "古文" : (isFukisokuMode ? "不規則" : `${startUnit}${startPart}～${endUnit}${endPart}`)),
      mode, score: finalAnswers.filter(a => a.ok).length, total: finalAnswers.length,
      percentage: Math.round((finalAnswers.filter(a => a.ok).length / finalAnswers.length) * 100) + "%",
      history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ')
    };
    fetch(LOG_GAS_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload), keepalive: true }).catch(e => console.error(e));
  };

  const proceedToNext = () => {
    const finalAnswers = [...quizAnswers]; 
    if (qIndex + 1 < quizItems.length) {
      setQIndex(qIndex + 1); setQuizReview({ visible: false, record: null }); setCurrentInput(""); setPractice("");
    } else {
      let dName = isFukisokuMode ? "英単語（不規則変化）" : isKobunMode ? "古文単語（自習）" : (selectedBook.name || "1問ずつテスト(自習)");
      setStep('quiz-result'); sendResultToGAS(finalAnswers, dName);
    }
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const qText = (mode === 'ja-en') ? item.ja : item.en;
    const rawC = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isCorrect = rawC.split('/').some(ans => clean(currentInput) === clean(ans));
    const record = { q: qText, a: currentInput, correct: rawC, en: item.en || "", ok: isCorrect, rawItem: item };
    setQuizAnswers(prev => [...prev, record]); setQuizReview({ visible: true, record });
    // ★自動再生はしない（ボタン押下のみ）
  };

  const speakEn = (text) => {
    if (isKobunMode || !text) return; 
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text); uttr.lang = 'en-US'; uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
  };

  const finishPractice = () => {
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    if (quizReview.record.correct.split('/').some(ans => clean(practice) === clean(ans))) proceedToNext(); else alert("正解を入力してください");
  };

  // --- CSV読み込み ---
  useEffect(() => {
    const filtered = [...new Set(allData.filter(d => d.unitGroup.startsWith(selectedGrade)).map(d => d.unitGroup))];
    if (filtered.length > 0) { setStartUnit(filtered[0]); setEndUnit(filtered[0]); }
  }, [selectedGrade, allData]);

  useEffect(() => {
    if (allData.length === 0) return;
    const sParts = [...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))];
    if (sParts.length > 0 && (!startPart || !sParts.includes(startPart))) setStartPart(sParts[0]);
    const eParts = [...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))];
    if (eParts.length > 0 && (!endPart || !eParts.includes(endPart))) setEndPart(eParts[0]);
  }, [startUnit, endUnit, allData]);

  const loadCsv = async () => {
    try {
      const res = await fetch('/wordlist.csv?v=' + new Date().getTime());
      const text = await res.text();
      Papa.parse(text, { header: true, skipEmptyLines: true, complete: (results) => {
        setAllData(results.data.map(d => ({ key: d["学年ユニット単元"], unitGroup: d["学年ユニット"], part: d["単元"], en: d["英語"], ja: d["日本語"] })).filter(d => d.en));
      }});
      // その他のHS用CSV読み込み（略）
      const hsFiles = [{ name: 'target1900.csv', setter: setTargetData }, { name: 'target1200.csv', setter: setTargetminiData }, { name: 'sokudoku.csv', setter: setSokudokuData }, { name: 'dragon.csv', setter: setDragonData }, { name: 'yumetann.csv', setter: setYumetannData }];
      for (const file of hsFiles) {
        const res = await fetch(`/${file.name}?v=` + new Date().getTime());
        const text = await res.text();
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: (results) => { file.setter(results.data.map(d => ({ no: parseInt(d["No"]), en: d["英語"], ja: d["日本語"], unit: d["単元"] })).filter(d => d.en)); }});
      }
    } catch (e) { console.error(e); }
  };

  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "login", userId, password }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") { setUserName(response.data.name); if (response.data.isInitial) setStep('change-password'); else { setStep('menu'); loadCsv(); } }
      else alert("認証失敗");
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  const gradeList = useMemo(() => [...new Set(allData.map(d => d.unitGroup.substring(0, 2)))].sort(), [allData]);
  const filteredUnits = useMemo(() => [...new Set(allData.filter(d => d.unitGroup.startsWith(selectedGrade)).map(d => d.unitGroup))], [allData, selectedGrade]);

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}
      
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="Pass" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button className="nav-btn" onClick={() => { setIsKobunMode(false); setIsFukisokuMode(false); setSelectedGrade(''); setStep('test-setup'); }}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { setIsFukisokuMode(false); setIsKobunMode(false); setSelectedGrade(''); setStep('quiz-setup'); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => { setStep('highschool-menu'); }}> 🎓 高校生英単語</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* --- 紙テスト作成画面 (全機能復元) --- */}
      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            <div className="config-group">
              <label>学年:</label>
              <div className="grade-selector">{gradeList.map(g => (<button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>))}</div>
              <label>出題形式:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="en-ja">英語 → 日本語</option><option value="ja-en">日本語 → 英語</option></select>
              <label>学校名:</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}><option value="木太中">木太中</option><option value="custom">-- 直接入力 --</option></select>
              {school === 'custom' && <input type="text" value={customSchool} onChange={(e) => setCustomSchool(e.target.value)} />}
              
              {/* 【復元】範囲選択UI */}
              <div style={{marginTop:'15px', fontWeight:'bold'}}>▼ 範囲指定</div>
              <label>開始:</label>
              <div style={{display:'flex', gap:'5px'}}><select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <label>終了:</label>
              <div style={{display:'flex', gap:'5px'}}><select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            </div>
            <button className="nav-btn" onClick={() => {
              const sKey = startUnit + startPart; const eKey = endUnit + endPart;
              const startIndex = allData.findIndex(d => d.key === sKey); const endIndex = allData.findLastIndex(d => d.key === eKey);
              const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
              setTestWords([...range].sort(() => 0.5 - Math.random()).slice(0, 20)); setRangeText(`範囲: ${sKey} ～ ${eKey}`);
            }}>🔄 生成</button>
            {/* 【復元】解答表示ボタン */}
            <button className="nav-btn" style={{backgroundColor: '#17a2b8'}} onClick={() => setShowPaperAnswers(!showPaperAnswers)}>👁 {showPaperAnswers ? "解答を隠す" : "解答を表示"}</button>
            <button className="nav-btn" style={{backgroundColor: '#28a745'}} onClick={() => window.print()}>🖨 印刷</button>
            <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper">
              <div className="header-area"><div className="header-left">氏名 ____________________</div><h1>英単語テスト</h1><div className="header-right">{school === 'custom' ? customSchool : school}</div></div>
              <p style={{fontSize:'12px', textAlign:'center', margin:'5px 0'}}>{rangeText}</p>
              <table className="paper-table"><tbody>{testWords.map((d, i) => (<tr key={i}><td className="col-no">{i + 1}</td>
                <td className="q-cell" style={{display:'flex', alignItems:'center', gap:'5px'}}>
                  {/* 【復元】プレビュー用音声ボタン */}
                  <button className="audio-btn no-print" onClick={() => speakEn(d.en)} style={{fontSize:'12px', background:'none', border:'none', cursor:'pointer', padding:0}}>🔊</button>
                  {mode === 'en-ja' ? d.en : d.ja}
                </td>
                <td className="a-cell">{showPaperAnswers ? (mode === 'en-ja' ? d.ja : d.en) : ""}</td></tr>))}
              </tbody></table>
            </div>
          </div>
        </div>
      )}

      {/* --- クイズ設定 --- */}
      {step === 'quiz-setup' && (
        <div className="quiz-container">
          <h2>🚀 クイズ設定</h2>
          <div className="config-group">
            <label>学年:</label>
            <div className="grade-selector">{gradeList.map(g => (<button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>))}</div>
            <label>モード:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="ja-en">日本語 → 英語</option><option value="en-ja">英語 → 日本語</option></select>
            <label>範囲:</label>
            <div style={{display:'flex', gap:'5px'}}><select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
            <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <button className="nav-btn" onClick={() => {
              const sKey = startUnit + startPart; const eKey = endUnit + endPart;
              const startIndex = allData.findIndex(d => d.key === sKey); const endIndex = allData.findLastIndex(d => d.key === eKey);
              const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
              resetQuizState(); setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); setStep('quiz-main');
          }}>スタート！</button>
        </div>
      )}

      {/* --- クイズ実行中 (手描き図レイアウト＆小型音声ボタン) --- */}
      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          
          {/* 【修正】手描き図（image_2.png）に基づくレイアウト */}
          <div className="q-problem-box" style={{
            display: 'flex', alignItems: 'stretch', justifyContent: 'center', 
            background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '8px', 
            overflow: 'hidden', marginBottom: '20px', height: '80px'
          }}>
            {/* 左側：音声ボタン専用エリア */}
            <div className="q-audio-area" style={{
              flex: '0 0 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              borderRight: '1px solid #ccc'
            }}>
              {!isKobunMode && (
                <button className="audio-btn" onClick={() => speakEn(quizItems[qIndex].en)} style={{
                  fontSize: '18px', /* ★小型化 */
                  background: 'none', border: 'none', cursor: 'pointer', opacity: '0.6', padding: 0
                }}>🔊</button>
              )}
            </div>
            {/* 右側：単語表示エリア（枠線付き） */}
            <div className="q-word-area" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px'
            }}>
              <span style={{
                fontSize: '24px', fontWeight: 'bold', border: '1px solid #999', borderRadius: '15px', padding: '5px 15px'
              }}>
                {mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}
              </span>
            </div>
          </div>

          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus placeholder="答えを入力..." style={{marginBottom: '10px'}} />
          {!quizReview.visible && <button className="nav-btn" onClick={submitQuizAnswer}>回答する</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {quizReview.record.ok ? ( <button className="nav-btn" onClick={proceedToNext}>次へ進む</button> ) : (
                <div className="practice-area">
                  <input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} autoFocus />
                  <button className="nav-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- 結果発表 (一覧テーブル復元) --- */}
      {step === 'quiz-result' && (
        <div className="quiz-container">
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px', margin: '10px 0' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          
          {/* 【復元】結果詳細テーブル */}
          <div className="result-table-container" style={{maxHeight: '350px', overflowY: 'auto', marginBottom: '20px', width: '100%', border: '1px solid #eee', borderRadius: '4px'}}>
            <table className="result-detail-table" style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
              <thead style={{background: '#f8f9fa', position: 'sticky', top: 0}}><tr><th>判定</th><th>問題</th><th>正解</th><th>あなたの回答</th></tr></thead>
              <tbody>
                {quizAnswers.map((a, i) => (
                  <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding: '8px', color: a.ok ? 'green' : 'red', fontWeight: 'bold', textAlign:'center'}}>{a.ok ? '○' : '×'}</td>
                    <td style={{padding: '8px'}}>{a.q}</td>
                    <td style={{padding: '8px'}}>{a.correct}</td>
                    <td style={{padding: '8px', color: a.ok ? 'inherit' : 'red'}}>{a.a || '(未回答)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button className="secondary" onClick={() => { setStep('menu'); setSelectedBook({ name: '', data: [] }); }}>メニューへ戻る</button>
        </div>
      )}

      {/* --- HS、パスワード変更（略） --- */}
    </div>
  );
}

export default App;