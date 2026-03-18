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
  

  // --- 2：紙テスト用ステート ---
  const [startUnit, setStartUnit] = useState('');
  const [startPart, setStartPart] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [endPart, setEndPart] = useState('');
  const [school, setSchool] = useState('木太中');
  const [customSchool, setCustomSchool] = useState(''); // 追加：自由入力用
  const [mode, setMode] = useState(''); // 出題モード共通
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

  // --- 1：共通ステート付近に追加 ---
　const [fukisokuData, setFukisokuData] = useState([]);
  const [isFukisokuMode, setIsFukisokuMode] = useState(false);

  // --- 自動範囲補正ロジック ---
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

  useEffect(() => {
    if (allData.length === 0) return;
    const sParts = [...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))];
    if (sParts.length > 0 && (!startPart || !sParts.includes(startPart))) {
      setStartPart(sParts[0]);
    }
    const eParts = [...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))];
    if (eParts.length > 0 && (!endPart || !eParts.includes(endPart))) {
      setEndPart(eParts[0]);
    }
  }, [startUnit, endUnit, allData]);

  // --- 共通ロジック：CSV読込 ---
  const loadCsv = async () => {
    try {
      // --- 既存の wordlist.csv 読み込み ---
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

      // --- ★追加：不規則変化 wordlist-fukisoku.csv 読み込み ---
      const resF = await fetch('/wordlist-fukisoku.csv?v=' + new Date().getTime());
      const textF = await resF.text();
      Papa.parse(textF, {
        header: true, // ヘッダーありに設定
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data.map(d => ({
            // CSVのヘッダー名（1行目）が「日本語」「英語」の場合
            ja: d["日本語"], 
            en: d["英語"]
          })).filter(d => d.en);
          setFukisokuData(data);
        }
      });

    } catch (e) { 
      console.error("CSV load error:", e); 
    }
  };

  const gradeList = useMemo(() => {
    const grades = allData.map(d => d.unitGroup.substring(0, 2));
    return [...new Set(grades)].sort();
  }, [allData]);

  const filteredUnits = useMemo(() => {
    return [...new Set(allData
      .filter(d => d.unitGroup.startsWith(selectedGrade))
      .map(d => d.unitGroup)
    )];
  }, [allData, selectedGrade]);

  // --- 認証系ロジック ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "login", 
        userId, 
        password 
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setUserName(response.data.name);
        if (response.data.isInitial) {
          setStep('change-password');
        } else {
          setStep('menu');
          loadCsv();
        }
      } else { 
        alert("認証失敗"); 
      }
    } catch (e) { 
      alert("通信エラー"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert("新しいパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({ 
        action: "changePassword", 
        userId, 
        newPassword 
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        alert("パスワードを更新しました。メニューに進みます。");
        setStep('menu');
        loadCsv();
      } else {
        alert("更新に失敗しました");
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

　// 英語の読み上げ関数
  const speakEn = (text) => {
    // 実行中の音声をキャンセル（重なり防止）
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US'; // アメリカ英語
    uttr.rate = 0.9;     // 0.9倍速（少し聞き取りやすく）
    window.speechSynthesis.speak(uttr);
  };


  // --- テスト生成・クイズロジック ---
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
    
    // ★重要：不規則モードではないことを明示
    setIsFukisokuMode(false); 
    
    setStep('quiz-main');
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    
    // 1. 出題と「生の正解」を取得
    const questionText = (mode === 'ja-en') ? item.ja : item.en;
    const rawCorrect = (mode === 'ja-en') ? item.en : item.ja;

    // 2. 比較用のクリーンアップ関数
    // 全角・半角の記号を除去し、空白を詰め、小文字にする
    const clean = (str) => {
      if (!str) return "";
      return str
        .replace(/[…\.\.\.～~？?！!。、,]/g, "") // 記号類を徹底除去
        .replace(/\s+/g, "")                    // 空白をすべて除去
        .toLowerCase();
    };

    const userCleaned = clean(currentInput);
    
    // 3. 判定ロジック
    // 「/」で分割し、その中のどれか一つでもユーザー入力と一致すれば正解
    const possibleAnswers = rawCorrect.split('/');
    const isCorrect = possibleAnswers.some(ans => {
      return userCleaned === clean(ans);
    });

    const record = { 
      q: questionText, 
      a: currentInput, 
      correct: rawCorrect,
      en: item.en, // ★ここを追加！常に英単語のスペルを保存
      ok: isCorrect 
    };

    setQuizAnswers(prev => [...prev, record]);
    setQuizReview({ visible: true, record });
  };

  const startFukisokuQuiz = () => {
    if (fukisokuData.length === 0) return alert("データが読み込めていません");
    
    const selected = [...fukisokuData].sort(() => 0.5 - Math.random()).slice(0, 20);
    
    setQuizItems(selected);
    setQIndex(0);
    setQuizAnswers([]);
    setMode('ja-en');
    
    // ★重要：不規則モードであることを明示
    setIsFukisokuMode(true); 
    
    setStep('quiz-main');
  };

  const finishPractice = () => {
    const rawCorrect = quizReview.record.correct;

    // 判定用のクリーンアップ関数（submitQuizAnswerと同じもの）
    const clean = (str) => {
      if (!str) return "";
      return str
        .replace(/[…\.\.\.～~？?！!。、,]/g, "") 
        .replace(/\s+/g, "")                    
        .toLowerCase();
    };

    const userCleaned = clean(practice);
    
    // 「/」で分割してどれか一つに一致すればOK
    const possibleAnswers = rawCorrect.split('/');
    const isOk = possibleAnswers.some(ans => clean(ans) === userCleaned);

    if (isOk) {
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
    } else { 
      alert("正解を正しく入力してください（複数の意味がある場合はどれか一つでOK）"); 
    }
  };

  // --- 1. 間違えた問題のみ再トライするロジック ---
  const retryWrongQuestions = () => {
    // ★追加：不規則モードなら不規則データを、通常ならallDataを参照先に指定
    const currentSource = isFukisokuMode ? fukisokuData : allData;

    const wrongItems = quizAnswers
      .filter(a => !a.ok)
      .map(ans => {
        // 参照先（currentSource）から問題文(ans.q)が一致するものを探す
        return currentSource.find(d => (mode === 'ja-en' ? d.ja : d.en) === ans.q);
      })
      .filter(Boolean);

    if (wrongItems.length === 0) return alert("間違えた問題はありません！");

    const shuffled = [...wrongItems].sort(() => 0.5 - Math.random());
    
    setQuizItems(shuffled);
    setQIndex(0);
    setQuizAnswers([]);
    setCurrentInput("");
    setStep('quiz-main');
  };

  // --- 2. Googleスプレッドシートへ履歴を送信するロジック ---
  const sendQuizResultToGAS = async (finalAnswers) => {
    const correctCount = finalAnswers.filter(a => a.ok).length;
    const totalCount = finalAnswers.length;
    
    // 変数に格納して、確実に振り分ける
    const targetSheet = isFukisokuMode ? "英単語（不規則変化）" : "定期テスト英単語";
    const targetRange = isFukisokuMode ? "全範囲" : `${startUnit} ${startPart} ～ ${endUnit} ${endPart}`;

    const resultData = {
      action: "saveLog",
      sheetName: targetSheet,
      userName: userName,
      testRange: targetRange,
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
      console.log(`${targetSheet} シートへ保存完了しました`);
    } catch (e) {
      console.error("ログ送信エラー:", e);
    }
  };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* ログイン画面 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="Pass" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* パスワード変更画面 */}
      {step === 'change-password' && (
        <div className="login-box">
          <h2>🔐 パスワード変更</h2>
          <p>初回ログインのため、新しいパスワードを設定してください。</p>
          <input 
            type="password" 
            placeholder="新しいパスワード" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
          <button onClick={handleChangePassword}>変更して開始</button>
        </div>
      )}

      {/* メニュー画面 */}
      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button className="nav-btn" onClick={() => setStep('test-setup')}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => setStep('quiz-setup')}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" onClick={() => setStep('fukisoku-setup')}>🔄 英単語（不規則変化）</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* 紙テスト作成画面 */}
      {step === 'test-setup' && (
        <div className="test-builder-layout">
          <div className="settings-panel no-print">
            <h3>📝 テスト作成設定</h3>
            <div className="config-group">
              <label>基本設定</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option><option value="玉藻中">玉藻中</option><option value="桜町中">桜町中</option><option value="附属中">附属中</option><option value="custom">-- 直接入力 --</option>
              </select>
              {school === 'custom' && (
                <input
                　type="text"
                　placeholder="学校名を入力"
                　value={customSchool}
                　onChange={(e) => setCustomSchool(e.target.value)}
                　style={{ marginTop: '5px', width: '100%' }}
                />
              )}

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
            <button className="btn-sub" onClick={() => setShowAnswer(!showAnswer)}>👁 解答表示：{showAnswer ? 'OFF' : 'ON'}</button>
            <button className="btn-print" onClick={() => window.print()}>🖨 印刷 / PDF保存</button>
            <button className="btn-back" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper" id="paper">
              <div className="header-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* 名前（左側） */}
              <div style={{ fontSize: '14px', width: '200px', textAlign: 'left' }}>名前 ____________________    
            </div>
            
            {/* タイトル（中央固定） */}
          <h1 style={{ fontSize: '24px', flex: 1, textAlign: 'center', margin: 0 }}>
            英単語テスト
          </h1>
          
          {/* 学校名（右側） */}
        <div style={{ fontSize: '14px', fontWeight: 'bold', width: '200px', textAlign: 'right' }}>
          {school === 'custom' ? customSchool : school}
        </div>
      </div>
              <p style={{fontSize: '12px', margin: '5px 0', color: '#444'}}>{rangeText}</p>
              <table>
                <thead>
                  <tr><th style={{width: '40px'}}>No.</th><th>{mode==='en-ja'?'英単語':'日本語訳'}</th><th>{mode==='en-ja'?'日本語訳':'英単語'}</th></tr>
                </thead>
                <tbody>
                  {testWords.length > 0 ? testWords.map((d, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>

                      {/* 1列目：モードによって英単語か日本語か切り替わる */}　
                      <td style={{ position: 'relative', paddingLeft: '40px' }}>　
                      {/* モードに関わらず、英単語(d.en)を読み上げるボタンを設置 */}　
                      <button 
                      　className="no-print"
                      　onClick={() => speakEn(d.en)}
                      　style={{
                        position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)',
                        width: '28px', height: '28px', padding: '0', fontSize: '16px',
                        background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer'
                      }}
        >
          🔊
          </button>
          {mode === 'en-ja' ? d.en : d.ja}
        </td>      
        　{/* 2列目：解答（英単語が表示されている場合はここでも聴けるようにすると便利です） */}　
        <td>
          {showAnswer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'ja-en' && (
              <button className="no-print" onClick={() => speakEn(d.en)} style={{ cursor: 'pointer' }}>🔊</button>
            )}
            {mode === 'en-ja' ? d.ja : d.en}
          </div>
        ) : ''}
      </td>
    </tr>
  )) : (
    [...Array(20)].map((_, i) => <tr key={i}><td>{i + 1}</td><td></td><td></td></tr>)
  )}
</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 自習クイズ設定画面 */}
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
              <label>出題モード</label>
              <div className="mode-selector" style={{ display: 'flex', gap: '5px' }}>
                <button
                 className={mode === 'ja-en' ? "grade-btn active" : "grade-btn"} 
                 onClick={() => setMode('ja-en')}
                 style={{ flex: 1, padding: '8px', fontSize: '14px' }}
                >
                  日 → 英
                </button>
                <button
                　className={mode === 'en-ja' ? "grade-btn active" : "grade-btn"}
                　onClick={() => setMode('en-ja')}
                　style={{ flex: 1, padding: '8px', fontSize: '14px' }}
                >
                        英 → 日
                </button>
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

      {/* クイズ実行画面 */}
      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box">
            {mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}
          </div>
          <input 
            className="q-input" 
            value={currentInput} 
            onChange={(e) => setCurrentInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} 
            placeholder={mode === 'ja-en' ? "英語で入力" : "日本語で入力"}
            autoFocus 
          />
          {!quizReview.visible && <button className="ans-btn" onClick={submitQuizAnswer}>答え合わせ</button>}
          {quizReview.visible && (
            <div className="review-box">
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"}>
                {quizReview.record.ok ? "✅ 正解！" : `❌ 正解: ${quizReview.record.correct}`}
              </p>

              {/* ★不正解の時だけスピーカーボタンを表示 */}
              {!quizReview.record.ok && (
                <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                  <button
                    onClick={() => speakEn(quizReview.record.en)}
                    style={{
                      padding: '8px 15px',
                      fontSize: '14px',
                      cursor: 'pointer', // ←ここにカンマが必要でした
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    🔊 発音を聴く
                  </button>
                </div>
              )}

              {quizReview.record.ok ? (
                /* 正解した時のボタン */
                <button className="next-btn" onClick={() => {
                  setQuizReview({ visible: false });
                  setCurrentInput("");
                  if (qIndex + 1 < quizItems.length) {
                    setQIndex(qIndex + 1);
                  } else {
                    const finalAnswers = [...quizAnswers];
                    setStep('quiz-result');
                    sendQuizResultToGAS(finalAnswers);
                  }
                }}>次へ</button>
              ) : (
                /* 不正解の時の練習エリア */
                <div className="practice-area">
                  <p style={{ fontSize: '12px', marginBottom: '5px' }}>正解をタイプして次へ：</p>
                  <input
                    className="p-input"
                    value={practice}
                    onChange={(e) => setPractice(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && finishPractice()}
                    autoFocus
                  />
                  <button className="next-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 不規則変化専用：スタート画面 */}
      {step === 'fukisoku-setup' && (
        <div className="login-box">
          <h2>🔄 英単語（不規則変化）</h2>
          <div style={{ 
            textAlign: 'left', 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '24px', 
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#555',
            border: '1px solid #eef0f2'
          }}>
            <p style={{ fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>【今回の出題設定】</p>
            <p>・範囲：不規則変化リスト 全体</p>
            <p>・問題：ランダムに 20 問抽出</p>
            <p>・形式：日本語 → 英語</p>
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#1a73e8' }}>※結果は「英単語（不規則変化）」シートに保存されます</p>
          </div>
          
          <button className="primary-btn" onClick={startFukisokuQuiz}>
            スタート！
          </button>
          
          <button className="secondary" onClick={() => setStep('menu')}>
            戻る
          </button>
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="login-box" style={{ maxWidth: '800px' }}>
        　<h2>結果発表</h2>
        　<div style={{ fontSize: '32px', margin: '10px 0' }}>
          　{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length} 点
          　({Math.round((quizAnswers.filter(a => a.ok).length / quizAnswers.length) * 100)}%)
          </div>
      　　{/* 回答一覧表 */}
      　　<div className="result-table-container" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
        　<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          　<thead>
          　　<tr style={{ borderBottom: '2px solid #ccc' }}>
            　　<th>判定</th><th>問題</th><th>正解</th><th>あなたの回答</th>
          　　</tr>
          </thead>
          <tbody>
            {quizAnswers.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ color: a.ok ? 'green' : 'red', fontWeight: 'bold' }}>{a.ok ? '○' : '×'}</td>
              <td>{a.q}</td>
              <td>{a.correct}</td>
              <td style={{ color: a.ok ? 'inherit' : 'red' }}>{a.a}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="button-grid">
      {/* 間違えた問題のみ再挑戦ボタン（×がある場合のみ表示） */}
      {quizAnswers.some(a => !a.ok) && (
        <button className="primary-btn" onClick={retryWrongQuestions}>
          ❌ 間違えた問題のみ再トライ
        </button>
      )}
      <button className="secondary" onClick={() => setStep('menu')}>メニューへ戻る</button>
    </div>
  </div>
)}
    </div>
  )
}

export default App
