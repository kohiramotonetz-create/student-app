import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const QUESTION_COUNT = 20;

function App() {
  // --- ステート管理 ---
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]); 
  const [selectedGrade, setSelectedGrade] = useState('中1');

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
  const [quizType, setQuizType] = useState('normal'); 

  // --- CSV読込 ---
  const loadCsv = async () => {
    setLoading(true);
    try {
      const res = await fetch('/wordlist.csv?v=' + new Date().getTime());
      const text = await res.text();
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const data = results.data.map(d => ({
            key: d["学年ユニット単元"],
            unitGroup: d["学年ユニット"],
            part: d["単元"],
            en: d["英語"],
            ja: d["日本語"]
          })).filter(d => d.en);
          setAllData(data);
          setLoading(false);
        }
      });
    } catch (e) { setLoading(false); }
  };

  const loadFukisokuCsv = async () => {
    setLoading(true);
    try {
      const res = await fetch('/wordlist-fukisoku.csv?v=' + new Date().getTime());
      const text = await res.text();
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const data = results.data.map(row => {
            const keys = Object.keys(row);
            return { en: row[keys[0]], ja: row[keys[1]] };
          }).filter(d => d.en && d.ja);
          setAllData(data);
          setLoading(false);
        }
      });
    } catch (e) { setLoading(false); }
  };

  // --- 認証 ---
  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "login", userId, password }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setUserName(response.data.name);
        response.data.isInitial ? setStep('change-password') : (setStep('menu'), loadCsv());
      } else { alert("認証失敗"); }
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  // --- クイズ制御 ---
  const startQuiz = () => {
    const sKey = startUnit + startPart;
    const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    setQuizType('normal');
    setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
    setQIndex(0); setQuizAnswers([]); setStep('quiz-main');
  };

  const startFukisokuQuiz = () => {
    if (allData.length === 0) return alert("データ読み込み中...");
    setQuizType('fukisoku');
    setQuizItems([...allData].sort(() => 0.5 - Math.random()).slice(0, 20));
    setQIndex(0); setQuizAnswers([]); 
    setMode('ja-en'); // ★日本語→英語モード
    setCurrentInput("");
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    // modeが ja-en の時、正解は en(英語)、問題は ja(日本語)
    const correct = (mode === 'ja-en') ? item.en : item.ja;
    const question = (mode === 'ja-en') ? item.ja : item.en;
    
    const isCorrect = currentInput.trim().toLowerCase() === correct.trim().toLowerCase();
    const record = { q: question, a: currentInput, correct: correct, ok: isCorrect };
    setQuizAnswers(prev => [...prev, record]);
    setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    if (practice.trim().toLowerCase() === quizReview.record.correct.trim().toLowerCase()) {
      setPractice(""); setQuizReview({ visible: false, record: null }); setCurrentInput("");
      if (qIndex + 1 < quizItems.length) { setQIndex(qIndex + 1); } 
      else { setStep('quiz-result'); sendQuizResultToGAS([...quizAnswers]); }
    } else { alert("正解を入力してください"); }
  };

  const sendQuizResultToGAS = async (finalAnswers) => {
    const isFukisoku = quizType === 'fukisoku';
    const resultData = {
      action: "saveLog",
      sheetName: isFukisoku ? "英単語（不規則変化）" : "定期テスト英単語",
      userName: userName,
      testRange: isFukisoku ? "全範囲(ランダム)" : `${startUnit} ${startPart} ～ ${endUnit} ${endPart}`,
      mode: mode,
      score: finalAnswers.filter(a => a.ok).length,
      total: finalAnswers.length,
      percentage: Math.round((finalAnswers.filter(a => a.ok).length / finalAnswers.length) * 100) + "%",
      history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ')
    };
    try { await axios.post(LOG_GAS_URL, JSON.stringify(resultData), { headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  };

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
            <button className="nav-btn" onClick={() => { setStep('quiz-setup'); loadCsv(); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => { setStep('fukisoku-setup'); loadFukisokuCsv(); }}>🔄 英単語（不規則変化）</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {step === 'fukisoku-setup' && (
        <div className="login-box">
          <h2>🔄 不規則動詞 特訓</h2>
          <p>日本語を見て、英語を入力してください。</p>
          <button className="primary-btn" onClick={startFukisokuQuiz}>スタート！</button>
          <button className="secondary" onClick={() => { setStep('menu'); loadCsv(); }}>戻る</button>
        </div>
      )}

      {step === 'quiz-setup' && (
        <div className="login-box">
          <h2>🚀 自習クイズ設定</h2>
          <div className="mode-selector" style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
            <button className={mode === 'ja-en' ? "grade-btn active" : "grade-btn"} onClick={() => setMode('ja-en')} style={{flex:1}}>日→英</button>
            <button className={mode === 'en-ja' ? "grade-btn active" : "grade-btn"} onClick={() => setMode('en-ja')} style={{flex:1}}>英→日</button>
          </div>
          <button className="primary-btn" onClick={startQuiz}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          {/* ここを修正：ja-en（日本語から英語）の時は日本語(ja)を表示する */}
          <div className="q-display-box">{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
          
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} placeholder="英語を入力..." autoFocus />
          {!quizReview.visible && <button className="ans-btn" onClick={submitQuizAnswer}>答え合わせ</button>}
          
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {quizReview.record.ok ? (
                <button className="next-btn" onClick={() => { setQuizReview({ visible: false }); setCurrentInput(""); qIndex + 1 < quizItems.length ? setQIndex(qIndex + 1) : setStep('quiz-result'); }}>次へ</button>
              ) : (
                <div className="practice-area">
                  <input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} placeholder="正解をタイプ" autoFocus />
                  <button className="next-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="login-box">
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length} 点</div>
          <button className="secondary" onClick={() => { setStep('menu'); loadCsv(); }}>メニューへ戻る</button>
        </div>
      )}
    </div>
  );
}

export default App;