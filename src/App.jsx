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
  const [fukisokuData, setFukisokuData] = useState([]);
  const [kobunData, setKobunData] = useState([]);
  const [targetData, setTargetData] = useState([]);
  const [targetminiData, setTargetminiData] = useState([]);
  const [sokudokuData, setSokudokuData] = useState([]);
  const [dragonData, setDragonData] = useState([]);
  const [yumetannData, setYumetannData] = useState([]);

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
  const [isFukisokuMode, setIsFukisokuMode] = useState(false);
  const [isKobunMode, setIsKobunMode] = useState(false); 
  const [selectedBook, setSelectedBook] = useState({ name: '', data: [] });
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(100);
  const [showPaperAnswers, setShowPaperAnswers] = useState(false);

  const [quizItems, setQuizItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [quizReview, setQuizReview] = useState({ visible: false, record: null });
  const [practice, setPractice] = useState("");

  const resetQuizState = () => {
    setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setPractice(""); setQuizReview({ visible: false, record: null });
  };

  const sendResultToGAS = (finalAnswers, sheetName) => {
    if (!sheetName || !LOG_GAS_URL) return;
    const payload = {
      action: "saveLog", sheetName, userName,
      testRange: (selectedBook && selectedBook.name) ? `No.${startNo}～${endNo}` : (isKobunMode ? "古文" : (isFukisokuMode ? "不規則" : `${startUnit}${startPart}～${endUnit}${endPart}`)), 
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
      let sheet = isFukisokuMode ? "英単語（不規則変化）" : isKobunMode ? "古文単語（自習）" : (selectedBook.name || "1問ずつテスト(自習)");
      setStep('quiz-result'); sendResultToGAS(finalAnswers, sheet);
    }
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const qText = (mode === 'ja-en') ? item.ja : item.en;
    const rawC = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (s) => s ? s.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isCorrect = rawC.split('/').some(ans => clean(currentInput) === clean(ans));
    const record = { q: qText, a: currentInput, correct: rawC, en: item.en || "", ok: isCorrect, rawItem: item };
    setQuizAnswers(prev => [...prev, record]); setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    const clean = (s) => s ? s.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    if (quizReview.record.correct.split('/').some(ans => clean(practice) === clean(ans))) proceedToNext(); else alert("正解を入力してください");
  };

  const speakEn = (text) => {
    if (isKobunMode || !text) return; 
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text); uttr.lang = 'en-US'; uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
  };

  const loadCsv = async () => {
    try {
      const fetchAndParse = async (url) => {
        const res = await fetch(url + '?v=' + new Date().getTime());
        const text = await res.text();
        return new Promise(resolve => Papa.parse(text, { header: true, skipEmptyLines: true, complete: (results) => resolve(results.data) }));
      };
      const data = await fetchAndParse('/wordlist.csv');
      setAllData(data.map(d => ({ key: d["学年ユニット単元"], unitGroup: d["学年ユニット"], part: d["単元"], en: d["英語"], ja: d["日本語"] })).filter(d => d.en));
      const dataF = await fetchAndParse('/wordlist-fukisoku.csv');
      setFukisokuData(dataF.map(d => ({ ja: d["日本語"], en: d["英語"] })).filter(d => d.en));
      const dataK = await fetchAndParse('/wordlist-junior_high_school-kobun.csv');
      setKobunData(dataK.map(d => ({ en: d["古文"], ja: d["現代語訳"] })).filter(d => d.en));
      const hsFiles = [{ n: 'target1900.csv', s: setTargetData }, { n: 'target1200.csv', s: setTargetminiData }, { n: 'sokudoku.csv', s: setSokudokuData }, { n: 'dragon.csv', s: setDragonData }, { n: 'yumetann.csv', s: setYumetannData }];
      for (const f of hsFiles) {
        const d = await fetchAndParse('/' + f.n);
        f.s(d.map(x => ({ no: parseInt(x["No"]), en: x["英語"], ja: x["日本語"], unit: x["単元"] })).filter(x => x.en));
      }
    } catch (e) { console.error(e); }
  };

  // ✅ ログイン：JSON形式 + text/plain ヘッダーに完全復旧
  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "login", userId, password }), {
        headers: { 'Content-Type': 'text/plain' }
      });
      if (response.data.result === "success") {
        setUserName(response.data.name);
        if (response.data.isInitial) setStep('change-password');
        else { setStep('menu'); loadCsv(); }
      } else alert("認証失敗");
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "changePassword", userId, newPassword }), {
        headers: { 'Content-Type': 'text/plain' }
      });
      if (response.data.result === "success") { alert("更新完了"); setStep('menu'); loadCsv(); }
      else alert("更新失敗");
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

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
            <button className="nav-btn" onClick={() => { setIsKobunMode(false); setIsFukisokuMode(false); setSelectedBook({ name: '', data: [] }); setStep('test-setup'); }}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { setIsFukisokuMode(false); setIsKobunMode(false); setSelectedBook({ name: '', data: [] }); setStep('quiz-setup'); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => { const sel = [...fukisokuData].sort(() => 0.5 - Math.random()).slice(0, 20); resetQuizState(); setQuizItems(sel); setMode('ja-en'); setIsFukisokuMode(true); setStep('quiz-main'); }}>🔄 英単語（不規則変化）</button>
            <button className="nav-btn" style={{ backgroundColor: '#6f42c1', color: 'white' }} onClick={() => { resetQuizState(); setIsKobunMode(true); setMode('en-ja'); setQuizItems([...kobunData].sort(() => 0.5 - Math.random()).slice(0, 20)); setStep('quiz-main'); }}>📚 古文単語（自習）</button>
            <button className="nav-btn" onClick={() => setStep('highschool-menu')}> 🎓 高校生英単語</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            <div className="config-group">
              <label>学年:</label>
              <div className="grade-selector">{gradeList.map(g => (<button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>))}</div>
              <label>形式:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}><option value="en-ja">英語→日本語</option><option value="ja-en">日本語→英語</option></select>
              <label>範囲:</label>
              <div style={{display:'flex', gap:'5px'}}><select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div style={{display:'flex', gap:'5px'}}><select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            </div>
            <button className="nav-btn" onClick={() => {
              const sKey = startUnit + startPart; const eKey = endUnit + endPart;
              const sIdx = allData.findIndex(d => d.key === sKey); const eIdx = allData.findLastIndex(d => d.key === eKey);
              const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
              setTestWords([...range].sort(() => 0.5 - Math.random()).slice(0, 20)); setRangeText(`範囲: ${sKey} ～ ${eKey}`);
            }}>🔄 生成</button>
            <button className="nav-btn" style={{backgroundColor: '#17a2b8'}} onClick={() => setShowPaperAnswers(!showPaperAnswers)}>👁 {showPaperAnswers ? "解答を隠す" : "解答を表示"}</button>
            <button className="nav-btn" style={{backgroundColor: '#28a745'}} onClick={() => window.print()}>🖨 印刷</button>
            <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper">
              <div className="header-area"><h1>英単語テスト</h1><div className="header-right">{school === 'custom' ? customSchool : school}</div></div>
              <table className="paper-table">
                <tbody>{testWords.map((d, i) => (<tr key={i}><td className="col-no">{i + 1}</td>
                <td className="q-cell" style={{position:'relative', paddingLeft:'40px'}}>
                  {/* 赤印：セルの左端に音声ボタンを一列に揃える */}
                  <button className="audio-btn no-print" onClick={() => speakEn(d.en)} style={{position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', fontSize:'14px', opacity:0.6}}>🔊</button>
                  {mode === 'en-ja' ? d.en : d.ja}
                </td>
                <td className="a-cell" style={{width:'250px'}}>{showPaperAnswers ? (mode === 'en-ja' ? d.ja : d.en) : ""}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'quiz-setup' && (
        <div className="quiz-container">
          <h2>🚀 クイズ設定</h2>
          <div className="config-group">
            <label>学年:</label>
            <div className="grade-selector">{gradeList.map(g => (<button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>))}</div>
            <label>範囲:</label>
            <div style={{display:'flex', gap:'5px'}}><select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
            <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <button className="nav-btn" onClick={() => {
              const sKey = startUnit + startPart; const eKey = endUnit + endPart;
              const sIdx = allData.findIndex(d => d.key === sKey); const eIdx = allData.findLastIndex(d => d.key === eKey);
              const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
              resetQuizState(); setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); setStep('quiz-main');
          }}>スタート！</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          
          {/* レイアウト：背景白、単語周りの枠なし、音声専用スペースあり */}
          <div className="q-display-box" style={{
            display: 'flex', alignItems: 'stretch', justifyContent: 'center', 
            background: 'white', border: '1px solid #ddd', borderRadius: '12px', 
            overflow: 'hidden', marginBottom: '20px', height: '100px'
          }}>
            <div className="q-audio-area" style={{
              flex: '0 0 70px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              border: '1px solid #eee', borderRadius: '8px', margin: '15px 0 15px 15px', background: '#fcfcfc'
            }}>
              {!isKobunMode && (
                <button className="audio-btn" onClick={() => speakEn(quizItems[qIndex].en)} style={{
                  fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer', opacity: '0.6'
                }}>🔊</button>
              )}
            </div>
            <div className="q-word-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{position:'absolute', left:0, top:'15px', bottom:'15px', width:'1px', background:'#eee'}}></div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#444' }}>
                {mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}
              </div>
            </div>
          </div>

          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus placeholder="答えを入力..." />
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

      {step === 'highschool-menu' && (
        <div className="menu-box">
          <h1>🎓 高校生英単語</h1>
          <div className="button-grid">
            {[{ n: 'ターゲット1900', d: targetData }, { n: 'ターゲット1200', d: targetminiData }, { n: '速読英単語', d: sokudokuData }, { n: 'ドラゴンイングリッシュ', d: dragonData }, { n: 'ユメタン', d: yumetannData }].map((b) => (
              <button key={b.n} className="nav-btn" onClick={() => { setSelectedBook({name:b.n, data:b.d}); setStartNo(1); setEndNo(Math.min(b.d.length, 100)); setStep('highschool-setup'); }}>{b.n}</button>
            ))}
          </div>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'highschool-setup' && (
        <div className="quiz-container">
          <h2>🚀 {selectedBook.name}</h2>
          <div className="config-group">
            <label>範囲(No.):</label>
            <div style={{display:'flex', gap:'10px'}}><input type="number" value={startNo} onChange={(e) => setStartNo(Number(e.target.value))} />〜<input type="number" value={endNo} onChange={(e) => setEndNo(Number(e.target.value))} /></div>
          </div>
          <button className="nav-btn" onClick={() => {
            const range = selectedBook.data.filter(d => d.no >= startNo && d.no <= endNo);
            resetQuizState(); setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); setStep('quiz-main');
          }}>スタート！</button>
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="quiz-container">
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px', margin: '10px 0' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          <div style={{maxHeight: '350px', overflowY: 'auto', width: '100%', border: '1px solid #eee'}}>
            <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
              <thead style={{background: '#f8f9fa', position:'sticky', top:0}}><tr><th>判定</th><th>問題</th><th>正解</th><th>回答</th></tr></thead>
              <tbody>{quizAnswers.map((a, i) => (<tr key={i} style={{borderBottom: '1px solid #eee'}}><td style={{color: a.ok ? 'green' : 'red', fontWeight:'bold', textAlign:'center'}}>{a.ok ? '○' : '×'}</td><td>{a.q}</td><td>{a.correct}</td><td>{a.a}</td></tr>))}</tbody>
            </table>
          </div>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
    </div>
  );
}

export default App;