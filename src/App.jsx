import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const QUESTION_COUNT = 20;

function App() {
  // --- 1：共通ステート（ログイン・データ） ---
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]); // CSV全データ
  const [units, setUnits] = useState([]);

  // --- 2：紙テスト用ステート ---
  const [startUnit, setStartUnit] = useState('');
  const [startPart, setStartPart] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [endPart, setEndPart] = useState('');
  const [school, setSchool] = useState('木太中');
  const [testWords, setTestWords] = useState([]);
  const [rangeText, setRangeText] = useState('');
  const [mode, setMode] = useState('en-ja');

  // --- 3：自習クイズ用ステート ---
  const [quizItems, setQuizItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [showReview, setShowReview] = useState({ visible: false, record: null });
  const [practice, setPractice] = useState(""); // 練習用入力

  // --- A. 共通処理（ログイン・読込） ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "login", userId, password
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setUserName(response.data.name);
        setStep('menu');
        loadCsv();
      } else { alert("認証失敗"); }
    } catch (e) { alert("通信エラー"); }
    finally { setLoading(false); }
  };

  const loadCsv = async () => {
    try {
      const res = await fetch('/wordlist.csv?v=' + new Date().getTime());
      const text = await res.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data.map(d => ({
            key: d["学年ユニット単元"],
            unitGroup: d["学年ユニット"],
            part: d["単元"],
            en: d["英語"],
            ja: d["日本語"]
          })).filter(d => d.en);
          setAllData(data);
          const uniqueUnits = [...new Set(data.map(d => d.unitGroup))];
          setUnits(uniqueUnits);
          setStartUnit(uniqueUnits[0]);
          setEndUnit(uniqueUnits[0]);
        }
      });
    } catch (e) { console.error("CSV読み込み失敗"); }
  };

  // --- B. 紙テスト用ロジック ---
  const generatePaperTest = () => {
    const sKey = startUnit + startPart;
    const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲外です");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    const selected = [...range].sort(() => 0.5 - Math.random()).slice(0, 20);
    setTestWords(selected);
    setRangeText(`範囲: ${sKey} ～ ${eKey}`);
  };

  // --- C. 自習クイズ用ロジック ---
  const startQuiz = () => {
    const sKey = startUnit + startPart;
    const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲外です");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    const selected = [...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT);
    setQuizItems(selected);
    setQIndex(0);
    setQuizAnswers([]);
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const isCorrect = currentInput.trim().toLowerCase() === item.en.trim().toLowerCase();
    const record = { q: item.ja, a: currentInput, correct: item.en, ok: isCorrect };
    setQuizAnswers(prev => [...prev, record]);
    setShowReview({ visible: true, record });
  };

  const handlePracticeSubmit = () => {
    if (practice.trim().toLowerCase() === showReview.record.correct.toLowerCase()) {
      setPractice("");
      setShowReview({ visible: false, record: null });
      setCurrentInput("");
      if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1);
      else setStep('quiz-result');
    } else { alert("スペルが違います。もう一度！"); }
  };

  // --- 画面レンダリング ---
  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* レイヤー1：ログイン画面 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="Pass" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* レイヤー2：メニュー画面 */}
      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button className="nav-btn" onClick={() => setStep('test-setup')}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => setStep('quiz-setup')}>🚀 1問ずつテスト(自習)</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* レイヤー3-1：紙テスト（設定・プレビュー） */}
      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 紙テスト設定</h3>
            <div className="config-group">
              <label>学校名</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option><option value="玉藻中">玉藻中</option>
              </select>
              <label>出題</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="en-ja">英→日</option><option value="ja-en">日→英</option>
              </select>
            </div>
            <div className="config-group">
              <label>開始</label>
              <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <label>終了</label>
              <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button className="btn-main" onClick={generatePaperTest}>🔄 生成</button>
            <button className="btn-print" onClick={() => window.print()}>🖨 印刷</button>
            <button className="btn-back" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper">
              <div className="header-area">
                <div style={{fontSize: '14px'}}>名前 ________________</div>
                <h1>英単語テスト</h1>
                <div style={{fontSize: '14px', fontWeight: 'bold'}}>{school}</div>
              </div>
              <p style={{fontSize: '12px'}}>{rangeText}</p>
              <table>
                <thead><tr><th style={{width:'40px'}}>No.</th><th>問題</th><th>解答欄</th></tr></thead>
                <tbody>
                  {testWords.map((d, i) => (
                    <tr key={i}><td>{i+1}</td><td>{mode==='en-ja'?d.en:d.ja}</td><td></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* レイヤー3-2：自習クイズ（設定） */}
      {step === 'quiz-setup' && (
        <div className="login-box">
          <h2>🚀 クイズ設定</h2>
          <div className="config-group">
            <label>出題範囲を選択</label>
            <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
              {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button className="primary-btn" onClick={startQuiz}>クイズ開始！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {/* レイヤー3-2：自習クイズ（実行中） */}
      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">{quizItems[qIndex].ja}</div>
          <input 
            className="q-input"
            value={currentInput} 
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !showReview.visible && submitQuizAnswer()}
            placeholder="英語を入力してください"
            autoFocus
          />
          {!showReview.visible && <button className="ans-btn" onClick={submitQuizAnswer}>答え合わせ</button>}

          {showReview.visible && (
            <div className="review-box">
              <p className={showReview.record.ok ? "txt-ok" : "txt-ng"}>
                {showReview.record.ok ? "✅ 正解！" : `❌ 不正解！ 正解: ${showReview.record.correct}`}
              </p>
              {showReview.record.ok ? (
                <button className="next-btn" onClick={() => {
                  setShowReview({ visible: false });
                  setCurrentInput("");
                  if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1);
                  else setStep('quiz-result');
                }}>次へ</button>
              ) : (
                <div className="practice-area">
                  <p>練習：正解を入力して次へ進もう</p>
                  <input 
                    className="p-input"
                    value={practice} 
                    onChange={(e) => setPractice(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePracticeSubmit()}
                    placeholder="正解を打ってください"
                  />
                  <button className="next-btn" onClick={handlePracticeSubmit}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* レイヤー3-2：自習クイズ（結果） */}
      {step === 'quiz-result' && (
        <div className="login-box">
          <h2>結果発表</h2>
          <div style={{fontSize: '32px', margin: '20px 0'}}>
            {quizAnswers.filter(a => a.ok).length} / {quizAnswers.length} 点
          </div>
          <button className="primary-btn" onClick={() => setStep('menu')}>メニューへ戻る</button>
        </div>
      )}
    </div>
  )
}

export default App