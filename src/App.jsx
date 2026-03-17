import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const QUESTION_COUNT = 20;

function App() {
  // --- 1：共通ステート ---
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]); 
  const [selectedGrade, setSelectedGrade] = useState('中1');

  // --- 2：紙テスト用・自習用ステート ---
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

  // --- 3：クイズ実行用共通ステート ---
  const [quizItems, setQuizItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [quizReview, setQuizReview] = useState({ visible: false, record: null });
  const [practice, setPractice] = useState("");
  const [quizType, setQuizType] = useState('normal'); // 'normal' または 'fukisoku'

  // --- 自動範囲補正ロジック ---
  useEffect(() => {
    const filtered = [...new Set(allData
      .filter(d => d.unitGroup && d.unitGroup.startsWith(selectedGrade))
      .map(d => d.unitGroup)
    )];
    if (filtered.length > 0) {
      setStartUnit(filtered[0]);
      setEndUnit(filtered[0]);
    }
  }, [selectedGrade, allData]);

  useEffect(() => {
    if (allData.length === 0 || !startUnit) return;
    const sParts = [...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))];
    if (sParts.length > 0 && (!startPart || !sParts.includes(startPart))) {
      setStartPart(sParts[0]);
    }
    const eParts = [...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))];
    if (eParts.length > 0 && (!endPart || !eParts.includes(endPart))) {
      setEndPart(eParts[0]);
    }
  }, [startUnit, endUnit, allData]);

  // --- CSV読込ロジック ---
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
    } catch (e) { console.error("CSV load error"); setLoading(false); }
  };

  const loadFukisokuCsv = async () => {
    setLoading(true);
    try {
      const res = await fetch('/wordlist-fukisoku.csv?v=' + new Date().getTime());
      const text = await res.text();
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        complete: (results) => {
          const data = results.data.map(d => ({
            en: d["英語"],
            ja: d["日本語"]
          })).filter(d => d.en);
          setAllData(data);
          setLoading(false);
        }
      });
    } catch (e) { console.error("Fukisoku CSV load error"); setLoading(false); }
  };

  const gradeList = useMemo(() => {
    const grades = allData.filter(d => d.unitGroup).map(d => d.unitGroup.substring(0, 2));
    return [...new Set(grades)].sort();
  }, [allData]);

  const filteredUnits = useMemo(() => {
    return [...new Set(allData
      .filter(d => d.unitGroup && d.unitGroup.startsWith(selectedGrade))
      .map(d => d.unitGroup)
    )];
  }, [allData, selectedGrade]);

  // --- 認証系 ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "login", userId, password 
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setUserName(response.data.name);
        if (response.data.isInitial) {
          setStep('change-password');
        } else {
          setStep('menu');
          loadCsv();
        }
      } else { alert("認証失敗"); }
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert("新しいパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "changePassword", userId, newPassword 
      }), { headers: { 'Content-Type': 'text/plain' } });
      if (response.data.result === "success") {
        alert("パスワードを更新しました。");
        setStep('menu');
        loadCsv();
      }
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  // --- テスト生成ロジック ---
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
    setQuizType('normal');
    setQuizItems(selected);
    setQIndex(0);
    setQuizAnswers([]);
    setStep('quiz-main');
  };

  const startFukisokuQuiz = () => {
    if (allData.length === 0) return alert("データがありません");
    const selected = [...allData].sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuizType('fukisoku');
    setQuizItems(selected);
    setQIndex(0);
    setQuizAnswers([]);
    setMode('ja-en');
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const correctAnswer = (mode === 'ja-en') ? item.en : item.ja;
    const questionText = (mode === 'ja-en') ? item.ja : item.en;
    const isCorrect = currentInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const record = { q: questionText, a: currentInput, correct: correctAnswer, ok: isCorrect };
    setQuizAnswers(prev => [...prev, record]);
    setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    const correctAnswer = quizReview.record.correct;
    if (practice.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      setPractice("");
      setQuizReview({ visible: false, record: null });
      setCurrentInput("");
      if (qIndex + 1 < quizItems.length) {
        setQIndex(qIndex + 1);
      } else {
        const finalAnswers = [...quizAnswers]; 
        setStep('quiz-result');
        sendQuizResultToGAS(finalAnswers);
      }
    } else { alert("正解を正しく入力してください"); }
  };

  const retryWrongQuestions = () => {
    const wrongItems = quizAnswers
      .filter(a => !a.ok)
      .map(ans => allData.find(d => (mode === 'ja-en' ? d.ja : d.en) === ans.q))
      .filter(Boolean);
    if (wrongItems.length === 0) return alert("間違えた問題はありません！");
    setQuizItems([...wrongItems].sort(() => 0.5 - Math.random()));
    setQIndex(0);
    setQuizAnswers([]);
    setCurrentInput("");
    setStep('quiz-main');
  };

  const sendQuizResultToGAS = async (finalAnswers) => {
    const correctCount = finalAnswers.filter(a => a.ok).length;
    const totalCount = finalAnswers.length;

    // ここで送信先シート名と範囲テキストを切り分ける
    const isFukisoku = quizType === 'fukisoku';
    const sheetName = isFukisoku ? "英単語（不規則変化）" : "定期テスト英単語";
    const testRange = isFukisoku ? "全範囲(不規則変化)" : `${startUnit} ${startPart} ～ ${endUnit} ${endPart}`;

    const resultData = {
      action: "saveLog",
      sheetName: sheetName,
      userName: userName,
      testRange: testRange,
      mode: mode,
      score: correctCount,
      total: totalCount,
      percentage: Math.round((correctCount / totalCount) * 100) + "%",
      history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ')
    };

    try {
      await axios.post(LOG_GAS_URL, JSON.stringify(resultData), {
        headers: { 'Content-Type': 'text/plain' }
      });
      console.log(`${sheetName}にログを送信しました`);
    } catch (e) { console.error("ログ送信エラー:", e); }
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

      {step === 'change-password' && (
        <div className="login-box">
          <h2>🔐 パスワード変更</h2>
          <input type="password" placeholder="新しいパスワード" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword}>変更して開始</button>
        </div>
      )}

      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button className="nav-btn" onClick={() => { setStep('test-setup'); loadCsv(); }}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { setStep('quiz-setup'); loadCsv(); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => { setStep('fukisoku-setup'); loadFukisokuCsv(); }}>🔄 英単語（不規則変化）</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {step === 'fukisoku-setup' && (
        <div className="login-box">
          <h2>🔄 不規則動詞 特訓</h2>
          <p>全範囲からランダムに20問出題されます。</p>
          <button className="primary-btn" onClick={startFukisokuQuiz}>スタート！</button>
          <button className="secondary" onClick={() => { setStep('menu'); loadCsv(); }}>戻る</button>
        </div>
      )}

      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            <div className="config-group">
              <label>基本設定</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option><option value="玉藻中">玉藻中</option><option value="桜町中">桜町中</option><option value="附属中">附属中</option><option value="custom">-- 直接入力 --</option>
              </select>
              {school === 'custom' && <input type="text" placeholder="学校名" value={customSchool} onChange={(e) => setCustomSchool(e.target.value)} style={{ marginTop: '5px', width: '100%' }} />}
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
              <label>▼ 範囲指定</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
                <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
                <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
            </div>
            <button className="btn-main" onClick={generatePaperTest}>🔄 問題生成</button>
            <button className="btn-print" onClick={() => window.print()}>🖨 印刷</button>
            <button className="btn-back" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper" id="paper">
              <div className="header-area">
                <h1 style={{ textAlign: 'center' }}>英単語テスト</h1>
                <p style={{ textAlign: 'right' }}>{school === 'custom' ? customSchool : school}</p>
              </div>
              <p style={{fontSize: '12px'}}>{rangeText}</p>
              <table>
                <thead><tr><th>No.</th><th>問題</th><th>解答</th></tr></thead>
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

      {step === 'quiz-setup' && (
        <div className="login-box">
          <h2>🚀 自習クイズ設定</h2>
          <div className="grade-selector">
            {gradeList.map(g => <button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>)}
          </div>
          <div className="mode-selector" style={{display:'flex', gap:'10px', margin:'15px 0'}}>
            <button className={mode === 'ja-en' ? "grade-btn active" : "grade-btn"} onClick={() => setMode('ja-en')} style={{flex:1}}>日→英</button>
            <button className={mode === 'en-ja' ? "grade-btn active" : "grade-btn"} onClick={() => setMode('en-ja')} style={{flex:1}}>英→日</button>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
            <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
          </div>
          <button className="primary-btn" onClick={startQuiz} style={{marginTop:'20px'}}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} placeholder="入力してください" autoFocus />
          {!quizReview.visible && <button className="ans-btn" onClick={submitQuizAnswer}>答え合わせ</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {quizReview.record.ok ? (
                <button className="next-btn" onClick={() => { setQuizReview({ visible: false }); setCurrentInput(""); qIndex + 1 < quizItems.length ? setQIndex(qIndex + 1) : (setStep('quiz-result'), sendQuizResultToGAS(quizAnswers)); }}>次へ</button>
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
        <div className="login-box" style={{ maxWidth: '800px' }}>
          <h2>結果発表 ({quizType === 'fukisoku' ? '不規則変化' : '通常単語'})</h2>
          <div style={{ fontSize: '32px', margin: '10px 0' }}>
            {quizAnswers.filter(a => a.ok).length} / {quizAnswers.length} 点
          </div>
          <div className="button-grid">
            {quizAnswers.some(a => !a.ok) && <button className="primary-btn" onClick={retryWrongQuestions}>❌ 間違えた問題のみ再トライ</button>}
            <button className="secondary" onClick={() => { setStep('menu'); loadCsv(); }}>メニューへ戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;