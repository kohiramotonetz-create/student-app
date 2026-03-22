import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL; // 送信用URL
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

  // --- ★追加: アプリ名管理用のステート ---
  const [currentAppName, setCurrentAppName] = useState('');

  const [targetData, setTargetData] = useState([]);
  const [targetminiData, setTargetminiData] = useState([]);
  const [sokudokuData, setSokudokuData] = useState([]);
  const [dragonData, setDragonData] = useState([]);
  const [yumetannData, setYumetannData] = useState([]);

  const [selectedBook, setSelectedBook] = useState({ name: '', data: [] });
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(100);

  // --- ★追加: 送信関数 (fetch + no-cors + keepalive) ---
  const sendResultToGAS = (finalAnswers) => {
    if (!currentAppName || !LOG_GAS_URL) return;

    // GAS側が待っている項目名に合わせてパッキング
    const payload = {
      action: "saveLog",
      sheetName: currentAppName,
      userName: userName,
      testRange: (selectedBook && selectedBook.name) ? `No.${startNo}～${endNo}` : (isKobunMode ? "古文（全範囲）" : (isFukisokuMode ? "不規則（全範囲）" : `${startUnit}${startPart}～${endUnit}${endPart}`)), 
      mode: mode,
      score: finalAnswers.filter(a => a.ok).length,
      total: finalAnswers.length,
      percentage: Math.round((finalAnswers.filter(a => a.ok).length / finalAnswers.length) * 100) + "%",
      history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ')
    };

    const body = new URLSearchParams({ payload: JSON.stringify(payload) });

    fetch(LOG_GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
      mode: "no-cors",
      keepalive: true,
    });
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
          const data = results.data.map(d => ({ no: parseInt(d["No"]), en: d["英語"], ja: d["日本語"], unit: d["単元"] })).filter(d => d.en); 
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

  const generatePaperTest = () => {
    const sKey = startUnit + startPart; const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲エラー");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    setTestWords([...range].sort(() => 0.5 - Math.random()).slice(0, 20));
    setRangeText(`範囲: ${sKey} ～ ${eKey}`);
  };

  const startQuiz = () => {
    const sKey = startUnit + startPart; const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲エラー");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);

    setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
    setQIndex(0); setQuizAnswers([]); setIsFukisokuMode(false); setIsKobunMode(false);
    setSelectedBook({ name: '', data: [] });
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const questionText = (mode === 'ja-en') ? item.ja : item.en;
    const rawCorrect = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isCorrect = rawCorrect.split('/').some(ans => clean(currentInput) === clean(ans));
    const record = { q: questionText, a: currentInput, correct: rawCorrect, en: item.en || "", ok: isCorrect, rawItem: item };
    setQuizAnswers(prev => [...prev, record]);
    setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isOk = quizReview.record.correct.split('/').some(ans => clean(practice) === clean(ans));
    if (isOk) {
      const finalAnswers = [...quizAnswers]; // 送信用に現在の全回答をキャプチャ
      setPractice(""); setQuizReview({ visible: false, record: null }); setCurrentInput("");
      if (qIndex + 1 < quizItems.length) {
        setQIndex(qIndex + 1);
      } else {
        setStep('quiz-result'); 
        sendResultToGAS(finalAnswers); // ★ここで送信実行
      }
    } else alert("正解を入力してください");
  };

  const retryWrongQuestions = () => {
    const wrongItems = quizAnswers.filter(a => !a.ok).map(ans => ans.rawItem);
    if (wrongItems.length === 0) return alert("間違いはありません！");
    setQuizItems([...wrongItems].sort(() => 0.5 - Math.random()));
    setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setStep('quiz-main');
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
            <button className="nav-btn" onClick={() => { 
              setCurrentAppName(''); // 紙は空にする（送信されない）
              setIsKobunMode(false); setSelectedGrade(''); setStep('test-setup'); 
            }}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { 
              setCurrentAppName('1問ずつテスト(自習)');
              setIsFukisokuMode(false); setIsKobunMode(false); setSelectedGrade(''); setStep('quiz-setup'); 
            }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => { 
              setCurrentAppName('英単語（不規則変化）');
              setIsFukisokuMode(true); setIsKobunMode(false); setStep('fukisoku-setup'); 
            }}>🔄 英単語（不規則変化）</button>
            <button className="nav-btn" style={{ backgroundColor: '#6f42c1', color: 'white' }} onClick={() => {
              if (kobunData.length === 0) return alert("データなし");
              setCurrentAppName('古文単語（自習）');
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
          <p>単語帳を選択してください</p>
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
                setSelectedBook(book); setStartNo(1); setEndNo(Math.min(book.data.length, 100));
                setStep('highschool-setup');
              }}>{book.name}</button>
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
              <option value="ja-en">日本語 → 英語</option><option value="en-ja">英語 → 日本語</option>
            </select>
            <label style={{marginTop: '20px'}}>▼ 単語No.で範囲指定</label>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <input type="number" value={startNo} onChange={(e) => setStartNo(Number(e.target.value))} style={{width:'80px'}} />〜
              <input type="number" value={endNo} onChange={(e) => setEndNo(Number(e.target.value))} style={{width:'80px'}} />
            </div>
            <button className="nav-btn" style={{marginTop:'20px'}} onClick={() => {
              const range = selectedBook.data.filter(d => d.no >= startNo && d.no <= endNo);
              if (range.length === 0) return alert("範囲内に単語がありません");
              setCurrentAppName(selectedBook.name);
              setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, 20));
              setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setIsKobunMode(false); setIsFukisokuMode(false);
              setStep('quiz-main');
            }}>この範囲でスタート！</button>
            <button className="nav-btn" style={{backgroundColor: '#6c757d', marginTop:'10px'}} onClick={() => {
              setCurrentAppName(selectedBook.name);
              setQuizItems([...selectedBook.data].sort(() => 0.5 - Math.random()).slice(0, 20));
              setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setIsKobunMode(false); setIsFukisokuMode(false);
              setStep('quiz-main');
            }}>全範囲からランダムに出題</button>
          </div>
          <button className="secondary" onClick={() => setStep('highschool-menu')}>戻る</button>
        </div>
      )}

      {/* 以下、quiz-main, quiz-result などの UI コードは既存のまま維持 */}
      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            <div className="config-group">
              <label>学校名:</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option><option value="玉藻中">玉藻中</option><option value="桜町中">桜町中</option><option value="附属中">附属中</option><option value="custom">-- 直接入力 --</option>
              </select>
              {school === 'custom' && <input type="text" value={customSchool} onChange={(e) => setCustomSchool(e.target.value)} placeholder="学校名を入力" />}
              <label>学年:</label>
              <div className="grade-selector">
                {gradeList.map(g => (<button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>))}
              </div>
              <label>出題モード:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="en-ja">英語 → 日本語</option><option value="ja-en">日本語 → 英語</option>
              </select>
            </div>
            <div className="config-group">
              <label>▼ 範囲指定 ({selectedGrade})</label>
              <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
                <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <div style={{display:'flex', gap:'5px'}}>
                <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
                <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
            </div>
            <button className="nav-btn" onClick={generatePaperTest}>🔄 生成</button>
            <button className="secondary" onClick={() => setShowAnswer(!showAnswer)}>👁 {showAnswer ? '隠す' : '解答表示'}</button>
            <button className="nav-btn" style={{backgroundColor: '#28a745'}} onClick={() => window.print()}>🖨 印刷</button>
            <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper">
              <div className="header-area"><div className="header-left">氏名 ____________________</div><h1 className="test-title">英単語テスト</h1><div className="header-right">{school === 'custom' ? customSchool : school}</div></div>
              <p style={{fontSize:'12px', textAlign:'center'}}>{rangeText}</p>
              <table className="paper-table">
                <thead><tr><th className="col-no">No.</th><th>問題</th><th>解答欄</th></tr></thead>
                <tbody>
                  {testWords.map((d, i) => (
                    <tr key={i}><td className="col-no">{i + 1}</td><td className="q-cell">
                      {!isKobunMode && <button className="no-print-speaker no-print" onClick={() => speakEn(d.en)}>🔊</button>}
                      <span className="q-text">{mode === 'en-ja' ? d.en : d.ja}</span>
                    </td><td className="a-cell">{showAnswer ? (mode === 'en-ja' ? d.ja : d.en) : ''}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'quiz-setup' && (
        <div className="quiz-container">
          <h2>🚀 クイズ設定</h2>
          <div className="config-group" style={{textAlign: 'left'}}>
            <label>学年:</label>
            <div className="grade-selector">{gradeList.map(g => (<button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)}>{g}</button>))}</div>
            <label style={{marginTop: '15px'}}>出題モード:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ja-en">日本語 → 英語</option><option value="en-ja">英語 → 日本語</option>
            </select>
            <label style={{marginTop: '15px'}}>▼ 開始範囲 ({selectedGrade})</label>
            <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
              <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <label style={{marginTop: '10px'}}>▼ 終了範囲 ({selectedGrade})</label>
            <div style={{display:'flex', gap:'5px'}}>
              <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select>
            </div>
          </div>
          <button className="nav-btn" onClick={startQuiz}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus placeholder="答えを入力..." />
          {!quizReview.visible && <button className="nav-btn" onClick={submitQuizAnswer}>回答する</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {!quizReview.record.ok && !isKobunMode && <button className="secondary" onClick={() => speakEn(quizReview.record.en)} style={{marginBottom: '10px'}}>🔊 音声を聴く</button>}
              {quizReview.record.ok ? (
                <button className="nav-btn" onClick={() => { setQuizReview({ visible: false }); setCurrentInput(""); if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1); else setStep('quiz-result'); }}>次へ進む</button>
              ) : (
                <div className="practice-area">
                  <p style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>練習（正解を入力して次へ）</p>
                  <input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} autoFocus />
                  <button className="nav-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'fukisoku-setup' && (
        <div className="quiz-container">
          <h2>🔄 不規則変化</h2>
          <p>全範囲から20問ランダムに出題されます</p>
          <button className="nav-btn" onClick={() => {
            const sel = [...fukisokuData].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT);
            setQuizItems(sel); setQIndex(0); setQuizAnswers([]); setMode('ja-en'); setIsFukisokuMode(true); setIsKobunMode(false); setSelectedBook({ name: '', data: [] }); setStep('quiz-main');
          }}>スタート</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="quiz-container" style={{maxWidth: '600px'}}>
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px', margin: '10px 0' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          <div className="result-table-container" style={{maxHeight: '400px', overflowY: 'auto', marginBottom: '20px'}}>
            <table className="result-detail-table" style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
              <thead><tr style={{background: '#f8f9fa'}}><th style={{border: '1px solid #ddd', padding: '8px'}}>判定</th><th style={{border: '1px solid #ddd', padding: '8px'}}>問題</th><th style={{border: '1px solid #ddd', padding: '8px'}}>正解</th><th style={{border: '1px solid #ddd', padding: '8px'}}>あなたの回答</th></tr></thead>
              <tbody>{quizAnswers.map((a, i) => (<tr key={i}><td style={{border: '1px solid #ddd', padding: '8px', textAlign: 'center'}}>{a.ok ? '○' : '×'}</td><td style={{border: '1px solid #ddd', padding: '8px'}}>{a.q}</td><td style={{border: '1px solid #ddd', padding: '8px'}}>{a.correct}</td><td style={{border: '1px solid #ddd', padding: '8px', color: a.ok ? 'inherit' : '#dc3545'}}>{a.a || '未回答'}</td></tr>))}</tbody>
            </table>
          </div>
          <div className="button-grid">
            {quizAnswers.some(a => !a.ok) && (<button className="nav-btn" onClick={retryWrongQuestions} style={{backgroundColor: '#ffc107', color: '#000'}}>❌ 間違い直し</button>)}
            <button className="secondary" onClick={() => { setStep('menu'); setSelectedBook({ name: '', data: [] }); }}>メニューへ戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;