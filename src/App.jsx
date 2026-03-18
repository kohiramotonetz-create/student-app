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
  const [showAnswer, setShowAnswer] = useState(false);
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

  // --- 送信先シート名を予約するステート ---
  const [targetSheetName, setTargetSheetName] = useState("定期テスト英単語");

  // --- 高校生用データのステート ---
  const [targetData, setTargetData] = useState([]);
  const [targetminiData, setTargetminiData] = useState([]);
  const [sokudokuData, setSokudokuData] = useState([]);
  const [dragonData, setDragonData] = useState([]);
  const [yumetannData, setYumetannData] = useState([]);

  // --- 高校生用範囲設定のステート ---
  const [selectedBook, setSelectedBook] = useState({ name: '', data: [] });
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(100);

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
        const data = results.data.map(d => ({ key: d["学年ユニット単元"], unitGroup: d["学年ユニット"], part: d["単元"], en: d["英語"], ja: d["日本語"] })).filter(d => d.en);
        setAllData(data);
      }});
      const resF = await fetch('/wordlist-fukisoku.csv?v=' + new Date().getTime());
      const textF = await resF.text();
      Papa.parse(textF, { header: true, skipEmptyLines: true, complete: (results) => {
        const data = results.data.map(d => ({ ja: d["日本語"], en: d["英語"] })).filter(d => d.en);
        setFukisokuData(data);
      }});
      const resK = await fetch('/wordlist-junior_high_school-kobun.csv?v=' + new Date().getTime());
      const textK = await resK.text();
      Papa.parse(textK, { header: true, skipEmptyLines: true, complete: (results) => {
        const data = results.data.map(d => ({ en: d["古文"], ja: d["現代語訳"] })).filter(d => d.en);
        setKobunData(data);
      }});

      const hsFiles = [
        { name: 'target1900.csv', setter: setTargetData },
        { name: 'target1200.csv', setter: setTargetminiData },
        { name: 'sokudoku.csv', setter: setSokudokuData },
        { name: 'dragon.csv', setter: setDragonData },
        { name: 'yumetann.csv', setter: setYumetannData },
      ];

      for (const file of hsFiles) {
        const res = await fetch(`/${file.name}?v=` + new Date().getTime());
        const text = await res.text();
        Papa.parse(text, { header: true, skipEmptyLines: true, complete: (results) => {
          const data = results.data.map(d => ({ 
            no: parseInt(d["No"]), 
            en: d["英語"], 
            ja: d["日本語"],
            unit: d["単元"]
          })).filter(d => d.en); 
          file.setter(data);
        }});
      }
    } catch (e) { console.error(e); }
  };

  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "login", userId, password }), { headers: { 'Content-Type': 'text/plain' } });
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
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "changePassword", userId, newPassword }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") { alert("更新完了"); setStep('menu'); loadCsv(); }
      else alert("更新失敗");
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  const speakEn = (text) => {
    if (isKobunMode || !text) return; 
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
  };

  const startQuiz = () => {
    const sKey = startUnit + startPart; const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲エラー");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);

    // モード完全初期化
    setTargetSheetName("定期テスト英単語");
    setSelectedBook({ name: '', data: [] });
    setIsFukisokuMode(false);
    setIsKobunMode(false);

    setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
    setQIndex(0); setQuizAnswers([]); 
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const questionText = (mode === 'ja-en') ? item.ja : item.en;
    const rawCorrect = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isCorrect = rawCorrect.split('/').some(ans => clean(currentInput) === clean(ans));
    
    // 安全に en プロパティをセット
    const record = { 
      q: questionText, 
      a: currentInput, 
      correct: rawCorrect, 
      en: item.en || "", 
      ok: isCorrect, 
      rawItem: item 
    };
    
    setQuizAnswers(prev => [...prev, record]);
    setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isOk = quizReview.record.correct.split('/').some(ans => clean(practice) === clean(ans));
    if (isOk) {
      setPractice(""); setQuizReview({ visible: false, record: null }); setCurrentInput("");
      if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1);
      else { setStep('quiz-result'); sendQuizResultToGAS([...quizAnswers]); }
    } else alert("正解を入力してください");
  };

  const sendQuizResultToGAS = async (finalAnswers) => {
    const resultData = { 
      action: "saveLog", 
      sheetName: targetSheetName, 
      userName, 
      testRange: (selectedBook && selectedBook.name) ? `No.${startNo}～${endNo}` : (isKobunMode ? "古文（全範囲）" : (isFukisokuMode ? "不規則（全範囲）" : `${startUnit}${startPart}～${endUnit}${endPart}`)), 
      mode, 
      score: finalAnswers.filter(a => a.ok).length, 
      total: finalAnswers.length, 
      percentage: Math.round((finalAnswers.filter(a => a.ok).length / finalAnswers.length) * 100) + "%", 
      history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ') 
    };

    try { 
      await axios.post(LOG_GAS_URL, JSON.stringify(resultData), { headers: { 'Content-Type': 'text/plain' } }); 
    } catch (e) { 
      console.error("送信エラー:", e); 
    }
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
            <button className="nav-btn" onClick={() => setStep('test-setup')}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { setSelectedGrade(''); setStep('quiz-setup'); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => setStep('fukisoku-setup')}>🔄 英単語（不規則変化）</button>
            <button className="nav-btn" style={{ backgroundColor: '#6f42c1', color: 'white' }} onClick={() => {
              if (kobunData.length === 0) return alert("データなし");
              setTargetSheetName("古文単語");
              setIsKobunMode(true); setIsFukisokuMode(false); setMode('en-ja');
              setSelectedBook({ name: '', data: [] });
              setQuizItems([...kobunData].sort(() => 0.5 - Math.random()).slice(0, 20));
              setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setStep('quiz-main');
            }}>📚 古文単語（自習）</button>
            <button className="nav-btn" onClick={() => setStep('highschool-menu')}> 🎓 高校生英単語</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {step === 'highschool-menu' && (
        <div className="menu-box">
          <h1>高校生英単語</h1>
          <div className="button-grid">
            {[
              { name: 'ターゲット1900', data: targetData },
              { name: 'ターゲット1200', data: targetminiData },
              { name: '速読英単語', data: sokudokuData },
              { name: 'ドラゴンイングリッシュ', data: dragonData },
              { name: 'ユメタン', data: yumetannData },
            ].map((book) => (
              <button key={book.name} className="nav-btn" onClick={() => {
                if (book.data.length === 0) return alert("データがありません");
                setSelectedBook(book);
                setStartNo(1);
                setEndNo(Math.min(book.data.length, 100));
                setStep('highschool-setup');
              }}>
                {book.name}
              </button>
            ))}
          </div>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
              
      {step === 'highschool-setup' && (
        <div className="quiz-container">
          <h2>🚀 {selectedBook.name}</h2>
          <div className="config-group" style={{textAlign: 'left'}}>
            <label>出題モード:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ja-en">日本語 → 英語</option>
              <option value="en-ja">英語 → 日本語</option>
            </select>
            <label style={{marginTop: '20px'}}>▼ 単語No.で範囲指定</label>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <input type="number" value={startNo} onChange={(e) => setStartNo(Number(e.target.value))} style={{width:'80px'}} />
              〜
              <input type="number" value={endNo} onChange={(e) => setEndNo(Number(e.target.value))} style={{width:'80px'}} />
            </div>
            <button className="nav-btn" style={{marginTop:'20px'}} onClick={() => {
              const range = selectedBook.data.filter(d => d.no >= startNo && d.no <= endNo);
              if (range.length === 0) return alert("範囲内に単語がありません");
              setTargetSheetName(selectedBook.name);
              setIsKobunMode(false); setIsFukisokuMode(false);
              setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, 20));
              setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setStep('quiz-main');
            }}>スタート！</button>
          </div>
          <button className="secondary" onClick={() => setStep('highschool-menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-setup' && (
        <div className="quiz-container">
          <h2>🚀 クイズ設定</h2>
          <div className="config-group" style={{textAlign: 'left'}}>
            <label>学年:</label>
            <div className="grade-selector">
              {gradeList.map(g => (
                <button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>
              ))}
            </div>
            <label style={{marginTop: '15px'}}>出題モード:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ja-en">日本語 → 英語</option>
              <option value="en-ja">英語 → 日本語</option>
            </select>
          </div>
          <button className="nav-btn" onClick={startQuiz}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus />
          {!quizReview.visible && <button className="nav-btn" onClick={submitQuizAnswer}>回答する</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {!quizReview.record.ok && <button className="secondary" onClick={() => speakEn(quizReview.record.en)}>🔊 音声を聴く</button>}
              <button className="nav-btn" onClick={() => { setQuizReview({ visible: false }); setCurrentInput(""); if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1); else setStep('quiz-result'); }}>次へ進む</button>
            </div>
          )}
        </div>
      )}

      {step === 'fukisoku-setup' && (
        <div className="quiz-container">
          <h2>🔄 不規則変化</h2>
          <button className="nav-btn" onClick={() => {
            const sel = [...fukisokuData].sort(() => 0.5 - Math.random()).slice(0, 20);
            setTargetSheetName("英単語（不規則変化）"); 
            setIsFukisokuMode(true); setIsKobunMode(false); setSelectedBook({ name: '', data: [] });
            setQuizItems(sel); setQIndex(0); setQuizAnswers([]); setMode('ja-en'); setStep('quiz-main');
          }}>スタート</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="quiz-container">
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          <button className="secondary" onClick={() => setStep('menu')}>メニューへ戻る</button>
        </div>
      )}
    </div>
  );
}

export default App;