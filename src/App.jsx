import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const QUESTION_COUNT = 20;

function App() {
  // --- 1：共通ステート ---
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]); // CSV全データ
  const [selectedGrade, setSelectedGrade] = useState('中1'); // 学年選択用

  // --- 2：紙テスト用ステート ---
  const [startUnit, setStartUnit] = useState('');
  const [startPart, setStartPart] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [endPart, setEndPart] = useState('');
  const [school, setSchool] = useState('木太中');
  const [mode, setMode] = useState('en-ja');
  const [testWords, setTestWords] = useState([]);
  const [rangeText, setRangeText] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  // --- 3：自習クイズ用ステート ---
  const [quizItems, setQuizItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [quizReview, setQuizReview] = useState({ visible: false, record: null });
  const [practice, setPractice] = useState("");

  // --- ロジック：自動範囲補正 ---
  
  // 1. 学年が切り替わった時に、ユニットの初期値をセットする
  useEffect(() => {
    const filtered = [...new Set(allData
      .filter(d => d.unitGroup.startsWith(selectedGrade))
      .map(d => d.unitGroup)
    )];
    if (filtered.length > 0) {
      setStartUnit(filtered[0]);
      setEndUnit(filtered[0]);
    }
  }, [selectedGrade, allData]);

  // 2. ユニットが切り替わった時に、そのユニットの最初のPartを自動選択する
  useEffect(() => {
    if (allData.length === 0) return;

    // 開始Partの補正
    const sParts = [...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))];
    if (sParts.length > 0 && (!startPart || !sParts.includes(startPart))) {
      setStartPart(sParts[0]);
    }

    // 終了Partの補正
    const eParts = [...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))];
    if (eParts.length > 0 && (!endPart || !eParts.includes(endPart))) {
      setEndPart(eParts[0]);
    }
  }, [startUnit, endUnit, allData]);

  // --- 共通ロジック：CSV読込 ---
  const loadCsv = async () => {
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
        }
      });
    } catch (e) { console.error("CSV load error"); }
  };

  // 学年リスト自動抽出
  const gradeList = useMemo(() => {
    const grades = allData.map(d => d.unitGroup.substring(0, 2));
    return [...new Set(grades)].sort();
  }, [allData]);

  // 表示用のユニット一覧
  const filteredUnits = useMemo(() => {
    return [...new Set(allData
      .filter(d => d.unitGroup.startsWith(selectedGrade))
      .map(d => d.unitGroup)
    )];
  }, [allData, selectedGrade]);

  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ action: "login", userId, password }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        setUserName(response.data.name);
        setStep('menu');
        loadCsv();
      } else { alert("認証失敗"); }
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  // --- テスト生成系ロジック ---
  const generatePaperTest = () => {
    const sKey = startUnit + startPart;
    const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲が見つかりません");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    const selected = [...range].sort(() => 0.5 - Math.random()).slice(0, 20);
    setTestWords(selected);
    setRangeText(`範囲: ${sKey} ～ ${eKey} (全${range.length}問から20問抽出)`);
  };

  const startQuiz = () => {
    const sKey = startUnit + startPart;
    const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲エラー");
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
    setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    if (practice.trim().toLowerCase() === quizReview.record.correct.toLowerCase()) {
      setPractice("");
      setQuizReview({ visible: false, record: null });
      setCurrentInput("");
      if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1);
      else setStep('quiz-result');
    } else { alert("正解を打ってください"); }
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
            <button className="nav-btn" onClick={() => setStep('test-setup')}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => setStep('quiz-setup')}>🚀 1問ずつテスト(自習)</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            <div className="config-group">
              <label>基本設定</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option><option value="玉藻中">玉藻中</option><option value="桜町中">桜町中</option><option value="附属中">附属中</option>
              </select>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="en-ja">英語 → 日本語</option><option value="ja-en">日本語 → 英語</option>
              </select>
            </div>

            <div className="config-group">
              <label>対象学年</label>
              <div className="grade-selector">
                {gradeList.map(g => (
                  <button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>
                ))}
              </div>
            </div>

            <div className="config-group">
              <label>▼ 開始範囲 ({selectedGrade})</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
                  {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
                  {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <label style={{marginTop: '10px', display: 'block'}}>▼ 終了範囲 ({selectedGrade})</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
                  {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
                  {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <button className="btn-main" onClick={generatePaperTest}>🔄 問題を生成</button>
            <button className="btn-sub" onClick={() => setShowAnswer(!showAnswer)}>👁 解答表示：{showAnswer ? 'ON' : 'OFF'}</button>
            <button className="btn-print" onClick={() => window.print()}>🖨 印刷 / PDF保存</button>
            <button className="btn-back" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper" id="paper">
              <div className="header-area">
                <div style={{fontSize: '14px'}}>名前 ____________________</div>
                <h1 style={{fontSize: '24px'}}>英単語テスト</h1>
                <div style={{fontSize: '14px', fontWeight: 'bold'}}>{school}</div>
              </div>
              <p style={{fontSize: '12px', margin: '5px 0', color: '#444'}}>{rangeText}</p>
              <table>
                <thead>
                  <tr><th style={{width: '40px'}}>No.</th><th>{mode==='en-ja'?'英単語':'日本語訳'}</th><th>{mode==='en-ja'?'日本語訳':'英単語'}</th></tr>
                </thead>
                <tbody>
                  {testWords.length > 0 ? testWords.map((d, i) => (
                    <tr key={i}>
                      <td style={{textAlign:'center'}}>{i+1}</td>
                      <td>{mode==='en-ja'?d.en:d.ja}</td>
                      <td>{showAnswer ? (mode==='en-ja'?d.ja:d.en) : ''}</td>
                    </tr>
                  )) : [...Array(20)].map((_, i) => <tr key={i}><td>{i+1}</td><td></td><td></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'quiz-setup' && (
        <div className="login-box">
          <h2>🚀 自習クイズ設定</h2>
          <div className="config-group">
            <label>学年選択</label>
            <div className="grade-selector">
              {gradeList.map(g => (
                <button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>
              ))}
            </div>
          </div>

          <div className="config-group">
            <label>▼ 開始範囲（{selectedGrade}）</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
                {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <label style={{ marginTop: '10px', display: 'block' }}>▼ 終了範囲（{selectedGrade}）</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
                {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <button className="primary-btn" onClick={startQuiz}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">{quizItems[qIndex].ja}</div>
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus />
          {!quizReview.visible && <button className="ans-btn" onClick={submitQuizAnswer}>答え合わせ</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {quizReview.record.ok ? <button className="next-btn" onClick={() => { setQuizReview({ visible: false }); setCurrentInput(""); if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1); else setStep('quiz-result'); }}>次へ</button> :
              <div className="practice-area"><input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} autoFocus /><button className="next-btn" onClick={finishPractice}>確認</button></div>}
            </div>
          )}
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="login-box">
          <h2>結果発表</h2>
          <div style={{fontSize: '32px', margin: '20px 0'}}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length} 点</div>
          <button className="primary-btn" onClick={() => setStep('menu')}>メニューへ戻る</button>
        </div>
      )}
    </div>
  )
}

export default App