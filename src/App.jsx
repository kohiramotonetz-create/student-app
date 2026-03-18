import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const QUESTION_COUNT = 20;

function App() {
  // --- ステート群 ---
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

  // --- 自動範囲補正 ---
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

  // --- CSV読込 ---
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
    } catch (e) { console.error("CSV load error:", e); }
  };

  const gradeList = useMemo(() => [...new Set(allData.map(d => d.unitGroup.substring(0, 2)))].sort(), [allData]);
  const filteredUnits = useMemo(() => [...new Set(allData.filter(d => d.unitGroup.startsWith(selectedGrade)).map(d => d.unitGroup))], [allData, selectedGrade]);

  // --- 認証 ---
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

  // --- 音声 ---
  const speakEn = (text) => {
    if (isKobunMode || !text) return; 
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
  };

  // --- クイズロジック ---
  const generatePaperTest = () => {
    const sKey = startUnit + startPart; const eKey = endUnit + endPart;
    const startIndex = allData.findIndex(d => d.key === sKey);
    const endIndex = allData.findLastIndex(d => d.key === eKey);
    if (startIndex === -1 || endIndex === -1) return alert("範囲エラー");
    const range = allData.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    const selected = [...range].sort(() => 0.5 - Math.random()).slice(0, 20);
    setTestWords(selected);
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
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const questionText = (mode === 'ja-en') ? item.ja : item.en;
    const rawCorrect = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (str) => str ? str.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const isCorrect = rawCorrect.split('/').some(ans => clean(currentInput) === clean(ans));
    const record = { q: questionText, a: currentInput, correct: rawCorrect, en: isKobunMode ? "" : item.en, ok: isCorrect };
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

  const retryWrongQuestions = () => {
    const source = isKobunMode ? kobunData : (isFukisokuMode ? fukisokuData : allData);
    const wrongItems = quizAnswers.filter(a => !a.ok).map(ans => source.find(d => (mode === 'ja-en' ? d.ja : d.en) === ans.q)).filter(Boolean);
    if (wrongItems.length === 0) return alert("間違いなし！");
    setQuizItems([...wrongItems].sort(() => 0.5 - Math.random()));
    setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setStep('quiz-main');
  };

  const sendQuizResultToGAS = async (finalAnswers) => {
    let targetSheet = isKobunMode ? "古文単語" : (isFukisokuMode ? "英単語（不規則変化）" : "定期テスト英単語");
    let targetRange = isKobunMode ? "古文単語（全範囲）" : (isFukisokuMode ? "全範囲" : `${startUnit}${startPart}～${endUnit}${endPart}`);
    const resultData = { action: "saveLog", sheetName: targetSheet, userName, testRange: targetRange, mode, score: finalAnswers.filter(a => a.ok).length, total: finalAnswers.length, percentage: Math.round((finalAnswers.filter(a => a.ok).length / finalAnswers.length) * 100) + "%", history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ') };
    try { await axios.post(LOG_GAS_URL, JSON.stringify(resultData), { headers: { 'Content-Type': 'text/plain' } }); } catch (e) { console.error(e); }
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
            <button className="nav-btn" onClick={() => { setIsKobunMode(false); setStep('test-setup'); }}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { setIsFukisokuMode(false); setIsKobunMode(false); setStep('quiz-setup'); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => { setIsFukisokuMode(true); setIsKobunMode(false); setStep('fukisoku-setup'); }}>🔄 英単語（不規則変化）</button>
            <button className="nav-btn" style={{ backgroundColor: '#6f42c1', color: 'white' }} onClick={() => {
              if (kobunData.length === 0) return alert("データなし");
              setIsKobunMode(true); setIsFukisokuMode(false); setMode('en-ja');
              setQuizItems([...kobunData].sort(() => 0.5 - Math.random()).slice(0, 20));
              setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setStep('quiz-main');
            }}>📚 古文単語（自習）</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* 紙テスト作成設定（レイアウトと順番、プレビュー形式を復元） */}
      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            
            <div className="config-group">
              {/* 1. 学校名 */}
              <label>学校名:</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option><option value="玉藻中">玉藻中</option><option value="桜町中">桜町中</option><option value="附属中">附属中</option><option value="custom">-- 直接入力 --</option>
              </select>
              {school === 'custom' && <input type="text" value={customSchool} onChange={(e) => setCustomSchool(e.target.value)} placeholder="学校名を入力" style={{marginTop:'5px'}} />}

              {/* 2. 学年（ボタン選択式） */}
              <label style={{marginTop:'10px'}}>学年:</label>
              <div className="grade-selector" style={{display:'flex', gap:'5px'}}>
                {gradeList.map(g => (
                  <button key={g} className={selectedGrade === g ? "grade-btn active" : "grade-btn"} onClick={() => setSelectedGrade(g)} style={{flex:1, padding:'5px'}}>{g}</button>
                ))}
              </div>

              {/* 3. 出題モード */}
              <label style={{marginTop:'10px'}}>出題モード:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="en-ja">英語 → 日本語</option><option value="ja-en">日本語 → 英語</option>
              </select>
            </div>

            {/* 4. 開始範囲と終了範囲 */}
            <div className="config-group" style={{marginTop:'15px'}}>
              <label>▼ 開始範囲 ({selectedGrade})</label>
              <div style={{display:'flex', gap:'5px'}}>
                <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
                  {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
                  {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <label style={{marginTop:'10px'}}>▼ 終了範囲 ({selectedGrade})</label>
              <div style={{display:'flex', gap:'5px'}}>
                <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
                  {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
                  {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="action-buttons" style={{marginTop:'20px', display:'flex', flexDirection:'column', gap:'10px'}}>
              <button className="btn-main" onClick={generatePaperTest} style={{width:'100%'}}>🔄 問題を生成</button>
              <button className="btn-sub" onClick={() => setShowAnswer(!showAnswer)} style={{width:'100%'}}>👁 解答表示：{showAnswer ? 'OFF' : 'ON'}</button>
              <button className="btn-print" onClick={() => window.print()} style={{width:'100%', backgroundColor:'#28a745', color:'white'}}>🖨 印刷 / PDF保存</button>
              <button className="btn-back" onClick={() => setStep('menu')} style={{width:'100%', backgroundColor:'#6c757d', color:'white'}}>戻る</button>
            </div>
          </div>

          <div className="preview-panel">
            <div className="test-paper" id="paper">
              {/* プレビューヘッダーを復元 */}
              <div className="header-area" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <div style={{ fontSize: '14px' }}>氏名 ____________________</div>
                <h1 style={{ fontSize: '22px', margin: 0, color: '#007bff' }}>英単語テスト</h1>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{school === 'custom' ? customSchool : school}</div>
              </div>
              <p className="range-text" style={{fontSize: '12px', color: '#666', margin:'0 0 10px 0', textAlign:'center'}}>{rangeText}</p>
              
              <table>
                <thead>
                  {/* テーブルヘッダーの項目名を復元 */}
                  <tr><th>No.</th><th>問題</th><th>解答欄</th></tr>
                </thead>
                <tbody>
                  {testWords.map((d, i) => (
                    <tr key={i}>
                      <td style={{textAlign:'center', width:'40px'}}>{i + 1}</td>
                      {/* 音声ボタンを左端に復元 */}
                      <td style={{position:'relative', paddingLeft:'40px'}}>
                        {!isKobunMode && (
                          <button className="no-print" onClick={() => speakEn(d.en)} style={{position:'absolute', left:'5px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', padding:0}}>🔊</button>
                        )}
                        {mode === 'en-ja' ? d.en : d.ja}
                      </td>
                      <td>{showAnswer ? (mode === 'en-ja' ? d.ja : d.en) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 自習クイズ設定（範囲指定を復元） */}
      {step === 'quiz-setup' && (
        <div className="login-box">
          <h2>🚀 自習クイズ設定</h2>
          <div className="config-group">
            <label>学年:</label>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
              {gradeList.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <label>出題範囲:</label>
            <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
              <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
                {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
              <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
                {filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <label>出題モード:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ja-en">日本語 → 英語</option><option value="en-ja">英語 → 日本語</option>
            </select>
          </div>
          <button className="primary-btn" onClick={startQuiz}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {/* クイズ実行画面 */}
      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus />
          {!quizReview.visible && <button className="ans-btn" onClick={submitQuizAnswer}>答え合わせ</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>{quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}</p>
              {!quizReview.record.ok && !isKobunMode && (
                <button onClick={() => speakEn(quizReview.record.en)} style={{ marginBottom: '10px' }}>🔊 聴く</button>
              )}
              {quizReview.record.ok ? (
                <button className="next-btn" onClick={() => { setQuizReview({ visible: false }); setCurrentInput(""); if (qIndex + 1 < quizItems.length) setQIndex(qIndex + 1); else setStep('quiz-result'); }}>次へ</button>
              ) : (
                <div className="practice-area">
                  <input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} autoFocus />
                  <button className="next-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 不規則変化 */}
      {step === 'fukisoku-setup' && (
        <div className="login-box">
          <h2>🔄 不規則変化（自習）</h2>
          <p>全範囲から20問ランダムに出題されます</p>
          <button className="primary-btn" onClick={() => {
            const sel = [...fukisokuData].sort(() => 0.5 - Math.random()).slice(0, 20);
            setQuizItems(sel); setQIndex(0); setQuizAnswers([]); setMode('ja-en'); setIsFukisokuMode(true); setIsKobunMode(false); setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {/* 結果表示 */}
      {step === 'quiz-result' && (
        <div className="login-box" style={{maxWidth:'600px'}}>
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px', marginBottom:'20px' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          <div className="result-list" style={{maxHeight:'300px', overflowY:'auto', textAlign:'left', fontSize:'14px'}}>
            {quizAnswers.map((a, i) => (
              <div key={i} style={{color: a.ok ? '#28a745' : '#dc3545', borderBottom:'1px solid #eee', padding:'5px'}}>
                {a.ok ? '○' : '×'} Q.{a.q} → 正解: {a.correct}
              </div>
            ))}
          </div>
          <div className="button-grid" style={{marginTop:'20px'}}>
            {quizAnswers.some(a => !a.ok) && <button className="primary-btn" onClick={retryWrongQuestions}>❌ 間違い直し</button>}
            <button className="secondary" onClick={() => setStep('menu')}>メニューへ戻る</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;