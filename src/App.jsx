import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
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
  const [kakushinData, setKakushinData] = useState([]);
  const [kobun315Data, setKobun315Data] = useState([]);
  const [kikutanData, setKikutanData] = useState([]);
  const [irohaData, setIrohaData] = useState([]);
  const [kobun325Data, setKobun325Data] = useState([]);
  const [formulaData, setFormulaData] = useState([]);

  // ✅ 書き単用のステート追加
  const [kakitanData, setKakitanData] = useState([]);
  const [startDay, setStartDay] = useState('DAY1');
  const [endDay, setEndDay] = useState('DAY1');

  const [selectedGrade, setSelectedGrade] = useState('中1'); 
  const [startUnit, setStartUnit] = useState('');
  const [startPart, setStartPart] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [endPart, setEndPart] = useState('');
  const [school, setSchool] = useState('木太中');
  const [customSchool, setCustomSchool] = useState(''); 
  const [mode, setMode] = useState('en-ja'); 
  const [testWords, setTestWords] = useState([]);
  const [isFukisokuMode, setIsFukisokuMode] = useState(false);
  const [isKobunMode, setIsKobunMode] = useState(false); 
  const [selectedBook, setSelectedBook] = useState({ name: '', data: [] });
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(100);
  const [selectedParts, setSelectedParts] = useState([]); 
  const [showPaperAnswers, setShowPaperAnswers] = useState(false);

  // --- 漢字テスト用のステート（App関数の内側へ移動） ---
  const [kanjiList, setKanjiList] = useState([]);
  const [selectedKanjiIds, setSelectedKanjiIds] = useState([]);
  const [kanjiMode, setKanjiMode] = useState('page'); 
  const [selectedText, setSelectedText] = useState(''); 
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]); 

  const loadCsv = async () => {
    setLoading(true);
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
      
      const dataKakitan = await fetchAndParse('/kakitan1000.csv');
      setKakitanData(dataKakitan.map(d => ({
        en: d["英単語"],
        pron: d["発音"],
        part: d["品詞"],
        ja: d["日本語訳"],
        detailPron: d["細かい発音"],
        unit: d["単元"]
      })).filter(d => d.en));

      // ✅ 漢字リストCSV読み込み（新しいヘッダー対応）
      const dataKanji = await fetchAndParse('/kanjilist.csv');
      setKanjiList(dataKanji.map(d => ({
        textName: d["テキスト"], 
        page: d["ページ"],
        question: d["問題"],
        answer: d["答え"]
      })).filter(d => d.answer));

      const hsFiles = [
        { n: 'target1900.csv', s: setTargetData }, { n: 'target1200.csv', s: setTargetminiData },
        { n: 'sokudoku.csv', s: setSokudokuData }, { n: 'dragon.csv', s: setDragonData }, { n: 'yumetann.csv', s: setYumetannData },
        { n: 'kakushin351.csv', s: setKakushinData }, { n: 'kobunn315.csv', s: setKobun315Data },
        { n: 'kikutan_j2.csv', s: setKikutanData },   { n: 'iroha.csv', s: setIrohaData },
        { n: 'kobun325.csv', s: setKobun325Data },    { n: 'formula600.csv', s: setFormulaData },
      ];
      for (const f of hsFiles) {
        const d = await fetchAndParse('/' + f.n);
        f.s(d.map((x, index) => ({
          no: parseInt(x["No"] || x["問題番号"] || (index + 1)),
          en: x["古文"] || x["英語"] || x["単語"] || x["en"],
          ja: x["現代語訳"] || x["日本語訳"] || x["日本語"] || x["ja"],
          part: x["品詞"] || "", unit: x["単元"] || ""
        })).filter(x => x.en));
      }
      setStep('menu');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('uid');
      const tk = params.get('tk');

      if (uid && tk) {
        setLoading(true);
        try {
          const payload = {
            apiKey: API_KEY,
            action: "validateToken",
            userId: uid,
            token: tk
          };
          const response = await axios.post(GAS_URL, JSON.stringify(payload), {
            headers: { 'Content-Type': 'text/plain' }
          });
          if (response.data.result === "success") {
            setUserId(uid);
            setUserName(response.data.name);
            if (response.data.school) setSchool(response.data.school);
            window.history.replaceState({}, '', window.location.pathname);
            await loadCsv(); 
          }
        } catch (e) { console.error("SSO通信エラー:", e);
        } finally { setLoading(false); }
      }
    };
    initAuth();
  }, []);

  const [quizItems, setQuizItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [quizReview, setQuizReview] = useState({ visible: false, record: null });
  const [practice, setPractice] = useState("");

  const resetQuizState = () => {
    setQIndex(0); setQuizAnswers([]); setCurrentInput(""); setPractice(""); setQuizReview({ visible: false, record: null });
  };

  const availableParts = useMemo(() => {
    if (selectedBook.name !== '古文単語315') return [];
    return [...new Set(selectedBook.data.map(d => d.part))].filter(p => p).sort();
  }, [selectedBook]);

  useEffect(() => {
    if (allData.length === 0 || !selectedGrade) return;
    const filtered = [...new Set(allData.filter(d => d.unitGroup.startsWith(selectedGrade)).map(d => d.unitGroup))];
    if (filtered.length > 0) {
      setStartUnit(filtered[0]);
      setEndUnit(filtered[0]);
    }
  }, [selectedGrade, allData]);

  useEffect(() => {
    if (allData.length === 0) return;
    if (startUnit) {
      const sParts = [...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))];
      if (sParts.length > 0) setStartPart(sParts[0]);
    }
    if (endUnit) {
      const eParts = [...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))];
      if (eParts.length > 0) setEndPart(eParts[0]);
    }
  }, [startUnit, endUnit, allData]);

  // ✅ 修正版：第3引数 (customRange) を受け取れるように変更
  const sendResultToGAS = (finalAnswers, sheetName, customRange = null) => {
    if (!sheetName || !LOG_GAS_URL) return;

    // ✅ customRange があればそれを使い、なければ従来の計算を行う
    const rangeLabel = customRange || ((selectedBook && selectedBook.name) 
      ? `No.${startNo}～${endNo}${selectedParts.length > 0 ? `(${selectedParts.join('/')})` : ''}` 
      : (isKobunMode ? "古文" : (isFukisokuMode ? "不規則" : `${startUnit}${startPart}～${endUnit}${endPart}`)));

    const payload = {
      action: "saveLog", 
      sheetName, 
      userName, 
      testRange: rangeLabel, 
      mode,
      score: finalAnswers.filter(a => a.ok).length, 
      total: finalAnswers.length,
      percentage: Math.round((finalAnswers.filter(a => a.ok).length / finalAnswers.length) * 100) + "%",
      history: finalAnswers.map((a, i) => `[${i + 1}]${a.q}(${a.ok ? '○' : '×'})`).join(', ')
    };

    fetch(LOG_GAS_URL, { 
      method: "POST", 
      mode: "no-cors", 
      headers: { "Content-Type": "text/plain" }, 
      body: JSON.stringify(payload), 
      keepalive: true 
    }).catch(e => console.error(e));
  };

  const proceedToNext = () => {
    const finalAnswers = [...quizAnswers]; 
    if (qIndex + 1 < quizItems.length) {
      setQIndex(qIndex + 1); setQuizReview({ visible: false, record: null }); setCurrentInput(""); setPractice("");
    } else {
      let dSheet = selectedBook.name || (isFukisokuMode ? "英単語（不規則変化）" : (isKobunMode ? "古文単語（自習）" : "1問ずつテスト(自習)"));
      setStep('quiz-result'); sendResultToGAS(finalAnswers, dSheet);
    }
  };

  const submitQuizAnswer = () => {
    const item = quizItems[qIndex];
    const prefix = (selectedBook.name === '書き単') ? `[${item.part}] ` : "";
    const qText = prefix + ((mode === 'ja-en') ? item.ja : item.en);
    const rawC = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (s) => s ? s.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const removeParentheses = (s) => s ? s.replace(/\（.*?\）|\(.*?\)/g, "") : "";
    const userInput = clean(currentInput);

    const isCorrect = rawC.split(/[/／]/).some(ans => {
      const correctAns = clean(ans); 
      const correctAnsNoParen = clean(removeParentheses(ans)); 
      return userInput === correctAns || (correctAnsNoParen !== "" && userInput === correctAnsNoParen);
    });

    const record = { q: qText, a: currentInput, correct: rawC, en: item.en || "", ok: isCorrect, rawItem: item };
    setQuizAnswers(prev => [...prev, record]); 
    setQuizReview({ visible: true, record });
  };

  const finishPractice = () => {
    const clean = (s) => s ? s.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const removeParentheses = (s) => s ? s.replace(/\（.*?\）|\(.*?\)/g, "") : "";
    const isCorrectPractice = quizReview.record.correct.split(/[/／]/).some(ans => {
      const pInput = clean(practice);
      const correctAns = clean(ans); 
      const correctAnsNoParen = clean(removeParentheses(ans)); 
      return pInput === correctAns || (correctAnsNoParen !== "" && pInput === correctAnsNoParen);
    });
    if (isCorrectPractice) proceedToNext(); else alert("正解を入力してください");
  };

  const speakEn = (text) => {
    if (isKobunMode || !text) return; 
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en')) || voices.find(v => v.lang.includes('en'));
    if (enVoice) uttr.voice = enVoice;
    uttr.lang = 'en-US'; 
    uttr.rate = 0.9;
    window.speechSynthesis.speak(uttr);
  };

  const handleLogin = async () => {
    if (!userId || !password) return alert("入力してください");
    setLoading(true);
    try {
      const payload = { apiKey: API_KEY, action: "login", userId, password };
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain' }});
      if (response.data.result === "success") { 
        setUserName(response.data.name); 
        if (response.data.isInitial) setStep('change-password'); else await loadCsv(); 
      } else alert("認証失敗");
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert("入力してください");
    setLoading(true);
    try {
      const payload = { apiKey: API_KEY, action: "changePassword", userId, newPassword };
      const response = await axios.post(GAS_URL, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain' }});
      if (response.data.result === "success") { alert("更新完了"); setStep('menu'); await loadCsv(); }
      else alert("更新失敗");
    } catch (e) { alert("通信エラー"); } finally { setLoading(false); }
  };

  const gradeList = useMemo(() => [...new Set(allData.map(d => d.unitGroup.substring(0, 2)))].sort(), [allData]);
  const filteredUnits = useMemo(() => [...new Set(allData.filter(d => d.unitGroup.startsWith(selectedGrade)).map(d => d.unitGroup))], [allData, selectedGrade]);

  // --- 漢字テスト用ロジック ---
  // --- 漢字テスト用ロジック（完全版） ---

  const toggleKanji = (idx) => {
    setSelectedKanjiIds(prev => prev.includes(idx) ? prev.filter(id => id !== idx) : [...prev, idx]);
  };

  const startKanjiTest = () => {
    let targetItems = [];
    const toNum = (val) => parseInt(String(val).replace(/[^0-9]/g, "")) || 0;
    const cleanText = (s) => s ? String(s).trim() : "";

    if (kanjiMode === 'page') {
      const sNum = toNum(startPage);
      const eNum = toNum(endPage);
      const selectedT = cleanText(selectedText);

      targetItems = kanjiList.filter(k => {
        const pNum = toNum(k.page);
        const csvText = cleanText(k.textName);
        return csvText === selectedT && pNum >= sNum && pNum <= eNum;
      });
    } else {
      targetItems = selectedKanjiIds.map(id => kanjiList[id]);
    }

    if (targetItems.length === 0) return alert("問題が選択されていません");
    
    resetQuizState();
    setQuizItems(targetItems.map(k => ({ 
      ja: k.question, 
      en: k.answer, 
      page: k.page, 
      textName: k.textName 
    })).sort(() => 0.5 - Math.random()));
    setStep('kanji-main');
  };

  const getCtx = () => canvasRef.current?.getContext('2d');

  const clearKanjiCanvas = () => {
    const ctx = getCtx();
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setStrokes([]);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const ctx = getCtx();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setStrokes(prev => [...prev, [{ x, y }]]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const ctx = getCtx();
    ctx.lineWidth = 5; // 縦長で見やすいよう少し太めに設定
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#333';
    ctx.lineTo(x, y);
    ctx.stroke();
    setStrokes(prev => {
      const newStrokes = [...prev];
      newStrokes[newStrokes.length - 1].push({ x, y });
      return newStrokes;
    });
  };

  const judgeKanji = async () => {
    if (strokes.length === 0) return alert("文字を書いてください");
    setLoading(true);
    // Google API形式に変換
    const formattedStrokes = strokes.map(s => [
      s.map(p => Math.round(p.x)),
      s.map(p => Math.round(p.y)),
      []
    ]);

    try {
      const response = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_version: 0.4,
          requests: [{ 
            writing_guide: { 
              writing_area_width: 270,  // ✅ 新しい幅
              writing_area_height: 480  // ✅ 新しい高さ
            }, 
            ink: formattedStrokes, 
            language: "ja" 
          }]
        })
      });

      const data = await response.json();
      if (data[0] === "SUCCESS") {
        const candidates = data[1][0][1];
        const answer = quizItems[qIndex].en; // CSVの「答え」
        const isOk = candidates.includes(answer);
        
        const record = { 
          q: quizItems[qIndex].ja, 
          a: candidates[0], 
          correct: answer, 
          ok: isOk, 
          rawItem: quizItems[qIndex] 
        };

        setQuizAnswers(prev => [...prev, record]);
        alert(isOk ? "⭕ 正解！" : `❌ 残念！ (あなたの書いた文字: ${candidates[0]})`);

        if (qIndex + 1 < quizItems.length) {
          setQIndex(qIndex + 1);
          clearKanjiCanvas();
        } else {
          setStep('quiz-result');

          // ✅ 重要：テスト終了時に筆跡データを完全に空にする
          setStrokes([]);
          
          // 1. 範囲ラベルを作成
          const rangeLabel = `${selectedText} (${startPage}〜${endPage})`;
          
          // 2. GASに送信
          // 第2引数に固定のシート名 "漢字テスト" を、第3引数に詳細な "範囲" を渡す
          sendResultToGAS([...quizAnswers, record], "漢字テスト", rangeLabel); 
        }
      }
    } catch (e) {
      console.error(e);
      alert("判定エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}
      
      {step === 'login' && (
        <div className="login-box">
          <h1>スキマくん</h1>
          <input type="text" placeholder="生徒番号" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="パスワード(初期:1234)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {step === 'change-password' && (
        <div className="login-box">
          <h2>パスワード変更</h2>
          <p>初期パスワードから変更してください</p>
          <input type="password" placeholder="新しいパスワード" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword}>変更して開始</button>
        </div>
      )}

      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} さん</p>
          <div className="button-grid">
            <button className="nav-btn" onClick={() => { setIsKobunMode(false); setIsFukisokuMode(false); setSelectedBook({ name: '', data: [] }); setStep('test-setup'); }}>📝 英単語テスト作成(紙)</button>
            <button className="nav-btn" onClick={() => { setIsKobunMode(false); setIsFukisokuMode(false); setSelectedBook({ name: '', data: [] }); setStep('quiz-setup'); }}>🚀 1問ずつテスト(自習)</button>
            <button className="nav-btn" style={{backgroundColor: '#e67e22'}} onClick={() => { setIsKobunMode(false); setIsFukisokuMode(false); setSelectedBook({ name: '書き単', data: kakitanData }); setStep('kakitan-setup'); }}>✍️ 書き単</button>
            <button className="nav-btn" onClick={() => { setIsKobunMode(false); setIsFukisokuMode(true); setSelectedBook({ name: '', data: [] }); setStep('fukisoku-setup'); }}>🔄 英単語（不規則変化）</button>
            <button className="nav-btn" onClick={() => { setIsKobunMode(true); setIsFukisokuMode(false); setSelectedBook({ name: '', data: [] }); setStep('kobun-setup'); }}>📚 古文単語（自習）</button>
            <button className="nav-btn" onClick={() => setStep('highschool-menu')}> 🎓 高校生モード</button>
            <button className="nav-btn" onClick={() => { setStep('kanji-setup'); }}>🖋 漢字書き取りテスト</button></div>
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
              <label>学校名:</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}><option value="木太中">木太中</option><option value="玉藻中">玉藻中</option><option value="桜町中">桜町中</option><option value="附属中">附属中</option><option value="custom">-- 直接入力 --</option></select>
              {school === 'custom' && <input type="text" value={customSchool} onChange={(e) => setCustomSchool(e.target.value)} placeholder="学校名を入力" />}
              <label>範囲:</label>
              <div style={{display:'flex', gap:'5px'}}><select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div style={{display:'flex', gap:'5px'}}><select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>{filteredUnits.map(u => <option key={u} value={u}>{u}</option>)}</select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>{[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            </div>
            <button className="nav-btn" onClick={() => {
              const sKey = startUnit + startPart; const eKey = endUnit + endPart;
              const sIdx = allData.findIndex(d => d.key === sKey); const eIdx = allData.findLastIndex(d => d.key === eKey);
              if (sIdx === -1 || eIdx === -1) return alert("選択した範囲のデータが見つかりません");
              const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
              setTestWords([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
            }}>🔄 問題作成</button>
            <button className="nav-btn" style={{backgroundColor: '#17a2b8'}} onClick={() => setShowPaperAnswers(!showPaperAnswers)}>👁 {showPaperAnswers ? "解答隠す" : "解答表示"}</button>
            <button className="nav-btn" style={{backgroundColor: '#28a745'}} onClick={() => window.print()}>🖨 印刷</button>
            <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
          </div>
          <div className="preview-panel">
            <div className="test-paper">
              <div className="header-area"><div className="header-left">氏名 ____________________</div><h1>英単語テスト</h1><div className="header-right">{school === 'custom' ? customSchool : school}</div></div>
              <table className="paper-table">
                <tbody>{testWords.map((d, i) => (
                  <tr key={i}>
                    <td className="col-no">{i + 1}</td>
                    <td className="q-cell-grid">
                      <div className="audio-wrapper no-print">
                        <button className="audio-btn-fixed" onClick={() => speakEn(d.en)}>🔊</button>
                      </div>
                      <div className="text-wrapper">
                        <span>{mode === 'en-ja' ? d.en : d.ja}</span>
                      </div>
                    </td>
                    <td className="a-cell">
                      {showPaperAnswers ? (mode === 'en-ja' ? d.ja : d.en) : ""}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'kakitan-setup' && (
        <div className="quiz-container">
          <h2>✍️ 書き単 設定</h2>
          <div className="config-group">
            <label>形式:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="en-ja">英語 → 日本語</option>
              <option value="ja-en">日本語 → 英語</option>
            </select>
            <label>範囲 (単元):</label>
            <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
              <select value={startDay} onChange={(e) => setStartDay(e.target.value)}>
                {[...new Set(kakitanData.map(d => d.unit))].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              〜
              <select value={endDay} onChange={(e) => setEndDay(e.target.value)}>
                {[...new Set(kakitanData.map(d => d.unit))].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <button className="nav-btn" onClick={() => {
            const units = [...new Set(kakitanData.map(d => d.unit))];
            const sIdx = units.indexOf(startDay);
            const eIdx = units.indexOf(endDay);
            const targetUnits = units.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
            const range = kakitanData.filter(d => targetUnits.includes(d.unit));
            if (range.length === 0) return alert("該当データがありません");
            resetQuizState();
            setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT));
            setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'quiz-setup' && (
        <div className="quiz-container">
          <h2>🚀 クイズ設定</h2>
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
              if (sIdx === -1 || eIdx === -1) return alert("選択した範囲のデータが見つかりません");
              const range = allData.slice(Math.min(sIdx, eIdx), Math.max(sIdx, eIdx) + 1);
              resetQuizState(); setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {(step === 'fukisoku-setup' || step === 'kobun-setup') && (
        <div className="quiz-container">
          <h2>🚀 {isFukisokuMode ? "不規則変化" : "古文単語"} 設定</h2>
          <div className="config-group">
            <label>形式:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="en-ja">{isKobunMode ? "古文→現代語訳" : "英語→日本語"}</option>
              <option value="ja-en">{isKobunMode ? "現代語訳→古文" : "日本語→英語"}</option>
            </select>
          </div>
          <button className="nav-btn" onClick={() => {
              const baseData = isFukisokuMode ? fukisokuData : kobunData;
              resetQuizState(); setQuizItems([...baseData].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'highschool-menu' && (
        <div className="menu-box">
          <h1>🎓 高校生モード</h1>
          <div style={{marginBottom:'20px'}}>
            <h3 style={{color:'#333', marginBottom:'10px'}}>🎓 高校生英単語</h3>
            <div className="button-grid">
              {[{ n: 'ターゲット1900', d: targetData }, { n: 'ターゲット1200', d: targetminiData }, { n: '速読英単語', d: sokudokuData }, { n: 'ドラゴンイングリッシュ', d: dragonData }, { n: 'ユメタン', d: yumetannData },{ n: 'キクタン準2級', d: kikutanData },].map((b) => (
                <button key={b.n} className="nav-btn" onClick={() => { setIsKobunMode(false); setSelectedBook({name:b.n, data:b.d}); setStartNo(1); setEndNo(Math.min(b.d.length, 100)); setStep('highschool-setup'); }}>{b.n}</button>
              ))}
            </div>
          </div>
          <div style={{marginTop:'20px', borderTop:'2px dashed #eee', paddingTop:'10px'}}>
            <h3 style={{color:'#333', marginBottom:'10px'}}>📚 高校生古文単語</h3>
            <div className="button-grid">
              {[{ n: '核心古文単語351', d: kakushinData }, { n: '古文単語315', d: kobun315Data }, { n: 'いろはにほへと', d: irohaData },{ n: '古文325', d: kobun325Data },{ n: 'FORMULA600', d: formulaData }].map((b) => (
                <button key={b.n} className="nav-btn" style={{ backgroundColor: '#6f42c1', color: 'white' }} onClick={() => { setIsKobunMode(true); setSelectedBook({name:b.n, data:b.d}); setStartNo(1); setEndNo(Math.min(b.d.length, 100)); setStep('highschool-setup'); }}>{b.n}</button>
              ))}
            </div>
          </div>
          <button className="secondary" style={{marginTop:'20px'}} onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}

      {step === 'highschool-setup' && (
        <div className="quiz-container">
          <h2>🚀 {selectedBook.name}</h2>
          <div className="config-group">
            <label>形式:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="en-ja">{isKobunMode ? "古文→現代語訳" : "英語→日本語"}</option>
              <option value="ja-en">{isKobunMode ? "現代語訳→古文" : "日本語→英語"}</option>
            </select>
            <label>範囲(No.):</label>
            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
              <input type="number" value={startNo} onChange={(e) => setStartNo(Number(e.target.value))} style={{width:'80px'}} />〜<input type="number" value={endNo} onChange={(e) => setEndNo(Number(e.target.value))} style={{width:'80px'}} />
            </div>

            {selectedBook.name === '古文単語315' && availableParts.length > 0 && (
              <div style={{marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                <label>品詞絞り込み (複数可):</label>
                <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>
                  {availableParts.map(part => (
                    <button key={part} onClick={() => setSelectedParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part])}
                      style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #6f42c1', cursor: 'pointer',
                        backgroundColor: selectedParts.includes(part) ? '#6f42c1' : 'white', color: selectedParts.includes(part) ? 'white' : '#6f42c1' }}>{part}</button>
                  ))}
                </div>
                {selectedParts.length > 0 && <button onClick={() => setSelectedParts([])} style={{fontSize:'11px', color:'gray', background:'none', border:'none', marginTop:'5px', cursor:'pointer'}}>全解除</button>}
              </div>
            )}
          </div>
          <button className="nav-btn" onClick={() => {
            let range = selectedBook.data.filter(d => d.no >= startNo && d.no <= endNo);
            if (selectedBook.name === '古文単語315' && selectedParts.length > 0) range = range.filter(d => selectedParts.includes(d.part));
            if(range.length === 0) return alert("該当なし");
            resetQuizState(); setQuizItems([...range].sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT)); setStep('quiz-main');
          }}>スタート！</button>
          <button className="secondary" onClick={() => { setStep('highschool-menu'); setSelectedParts([]); }}>戻る</button>
        </div>
      )}

      {step === 'quiz-main' && quizItems[qIndex] && (
        <div className="quiz-container">
          <div className="q-header">Q {qIndex + 1} / {quizItems.length}</div>
          <div className="q-display-box" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: 'white', border: 'none', height: '100px', marginBottom: '20px' }}>
            {mode === 'en-ja' && !isKobunMode && (
              <div className="q-audio-area" style={{ flex: '0 0 70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button className="audio-btn" onClick={() => speakEn(quizItems[qIndex].en)} style={{ fontSize: '18px', background: 'none', border: 'none', opacity: '0.6' }}>🔊</button>
              </div>
            )}
            <div className="q-word-area" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {(mode === 'en-ja' && !isKobunMode) && <div style={{position:'absolute', left:0, top:'15px', bottom:'15px', width:'1px', background:'#eee'}}></div>}
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#444' }}>{mode === 'ja-en' ? quizItems[qIndex].ja : quizItems[qIndex].en}</div>
            </div>
          </div>
          <input className="q-input" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !quizReview.visible && submitQuizAnswer()} autoFocus placeholder="答えを入力..." />
          {!quizReview.visible && <button className="nav-btn" onClick={submitQuizAnswer}>回答する</button>}
          {quizReview.visible && (
            <div className="review-box" style={{textAlign: 'left'}}>
              <p className={quizReview.record.ok ? "txt-ok" : "txt-ng"} style={{textAlign: 'center'}}>
                {quizReview.record.ok ? "✅ 正解！" : "❌ 不正解"}
              </p>
              {!quizReview.record.ok && selectedBook.name === '書き単' ? (
                <div style={{background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '15px', marginBottom: '15px'}}>
                  <div>正解：<span style={{color: '#666'}}>[{quizReview.record.rawItem.part}]</span> <strong>{quizReview.record.correct}</strong> 　{quizReview.record.rawItem.pron}</div>
                  <div style={{marginLeft: '45px', fontSize: '13px', color: '#888'}}>{quizReview.record.rawItem.detailPron}</div>
                </div>
              ) : (
                !quizReview.record.ok && <p className="txt-ng" style={{textAlign: 'center', marginBottom: '15px'}}>正解: {quizReview.record.correct}</p>
              )}
              {quizReview.record.ok ? (
                <button className="nav-btn" onClick={proceedToNext}>次へ進む</button>
              ) : (
                <div className="practice-area">
                  <input className="p-input" value={practice} onChange={(e) => setPractice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && finishPractice()} autoFocus />
                  <button className="nav-btn" onClick={finishPractice}>確認</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'quiz-result' && (
        <div className="quiz-container">
          <h2>結果発表</h2>
          <div style={{ fontSize: '32px', margin: '10px 0' }}>{quizAnswers.filter(a => a.ok).length} / {quizAnswers.length}</div>
          <div style={{maxHeight: '350px', overflowY: 'auto', width: '100%', border: '1px solid #eee'}}>
            <table style={{width: '100%', fontSize: '12px', borderCollapse: 'collapse'}}>
              <thead style={{background: '#f8f9fa', position:'sticky', top:0}}>
                <tr>
                  <th>No</th><th>問題</th>{selectedBook.name === '書き単' && <th>品詞</th>}<th>解答</th>{selectedBook.name === '書き単' && <th>発音</th>}<th>正誤</th>
                </tr>
              </thead>
              <tbody>
                {quizAnswers.map((a, i) => (
                  <tr key={i} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{textAlign:'center', padding:'5px'}}>{i + 1}</td>
                    <td style={{padding:'5px'}}>{a.q}</td>
                    {selectedBook.name === '書き単' && <td style={{padding:'5px'}}>{a.rawItem.part}</td>}
                    <td style={{padding:'5px'}}>{a.correct}</td>
                    {selectedBook.name === '書き単' && <td style={{padding:'5px'}}>{a.rawItem.pron}</td>}
                    <td style={{color: a.ok ? 'green' : 'red', fontWeight:'bold', textAlign:'center', padding:'5px'}}>{a.ok ? '○' : '×'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="secondary" onClick={() => { resetQuizState(); setSelectedBook({ name: '', data: [] }); setStep('menu'); }}>メニューへ戻る</button>
        </div>
      )}

      {step === 'kanji-setup' && (
        <div className="quiz-container">
          <h2>🖋 漢字テスト 設定</h2>
          <div className="config-group">
            <label>出題方法:</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button className="nav-btn" onClick={() => setKanjiMode('page')}>① ページで選択</button>
              <button className="nav-btn" onClick={() => setKanjiMode('individual')}>② 1つずつ選ぶ</button>
            </div>
            {kanjiMode === 'page' ? (
              <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'left' }}>
                <label>1. テキストを選択:</label>
                <select value={selectedText} onChange={(e) => {
                    const text = e.target.value; setSelectedText(text);
                    const pages = [...new Set(kanjiList.filter(k => k.textName === text).map(k => k.page))].sort((a,b)=>a-b);
                    if(pages.length > 0) { setStartPage(pages[0]); setEndPage(pages[0]); }
                  }} style={{ width: '100%', padding: '10px', marginBottom: '15px' }}>
                  <option value="">-- テキストを選択 --</option>
                  {[...new Set(kanjiList.map(k => k.textName))].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {selectedText && (
                  <>
                    <label>2. ページ範囲を指定:</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <select value={startPage} onChange={(e) => setStartPage(e.target.value)} style={{flex:1, padding:'8px'}}>
                        {[...new Set(kanjiList.filter(k => k.textName === selectedText).map(k => k.page))].sort((a,b)=>a-b).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <span>〜</span>
                      <select value={endPage} onChange={(e) => setEndPage(e.target.value)} style={{flex:1, padding:'8px'}}>
                        {[...new Set(kanjiList.filter(k => k.textName === selectedText).map(k => k.page))].sort((a,b)=>a-b).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            ) : (
        /* ✅ 個別選択モードの改良版 */
        <div style={{ textAlign: 'left' }}>
          <label>1. テキストを選択して絞り込み:</label>
          <select 
            value={selectedText} 
            onChange={(e) => setSelectedText(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ccc' }}
          >
            <option value="">-- すべて表示 --</option>
            {[...new Set(kanjiList.map(k => k.textName))].map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
            2. 出題する漢字にチェック（{selectedKanjiIds.length}問選択中）
          </p>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '5px', background: 'white', borderRadius: '8px' }}>
            {kanjiList
              .map((k, idx) => ({ ...k, originalIdx: idx })) 
              .filter(k => !selectedText || k.textName === selectedText) 
              .map((k) => (
                <label key={k.originalIdx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '10px 5px', 
                  borderBottom: '1px solid #eee', 
                  cursor: 'pointer',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}>
                  {/* チェックボックスを左端に固定 */}
                  <div style={{ flex: '0 0 30px', display: 'flex', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedKanjiIds.includes(k.originalIdx)} 
                      onChange={() => toggleKanji(k.originalIdx)} 
                      style={{ transform: 'scale(1.2)' }}
                    />
                  </div>
                  {/* 問題文スペースを広げて右側に配置 */}
                  <div style={{ flex: 1, marginLeft: '10px', fontSize: '14px', lineHeight: '1.4' }}>
                    <div style={{ color: '#888', fontSize: '11px' }}>{k.page}</div>
                    <div><strong>{k.answer}</strong> <span style={{ color: '#666' }}>({k.question})</span></div>
                  </div>
                </label>
              ))}
              </div>
              </div>
            )}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="nav-btn" onClick={startKanjiTest} disabled={kanjiMode === 'page' && !selectedText} style={{ width: '100%' }}>🚀 テスト開始！</button>
            <button className="secondary" onClick={() => setStep('menu')} style={{ width: '100%' }}>戻る</button>
            </div>
        </div>
      )}

      {/* ✅ 漢字テスト実行画面（手書き画面）修正版 */}
      {step === 'kanji-main' && quizItems[qIndex] && (
        <div className="quiz-container" style={{
          WebkitUserSelect: 'none',   /* iPadコピー禁止 */
          WebkitTouchCallout: 'none', /* iPad長押しメニュー禁止 */
          userSelect: 'none'          /* 全般的な選択禁止 */
          }}>
          <div className="q-header">漢字 Q {qIndex + 1} / {quizItems.length}</div>
          
          <div style={{ fontSize: '22px', marginBottom: '15px', fontWeight: 'bold' }}>
            問題： 「{quizItems[qIndex].ja}」
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px', fontWeight: 'normal' }}>
              当てはまる漢字を枠内に書いてください
            </div>
          </div>

          {/* ✅ 外枠：height を削除して、中の canvas に合わせるように変更 */}
          {/* ✅ iPadでのコピー・選択禁止用スタイルを追加 */}
          <div style={{ 
            background: 'white', 
            border: '3px solid #4A90E2', 
            borderRadius: '10px', 
            overflow: 'hidden', 
            width: '270px', 
            margin: '0 auto 15px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            WebkitUserSelect: 'none',   /* iPadコピー禁止 */
            WebkitTouchCallout: 'none', /* iPad長押しメニュー禁止 */
            userSelect: 'none'          /* 選択禁止 */
          }}>
            <canvas 
              ref={canvasRef}
              width="270" 
              height="480" 
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={() => setIsDrawing(false)}
              style={{ touchAction: 'none', cursor: 'crosshair', display: 'block' }}
            ></canvas>
          </div>

          {/* ✅ ボタンエリア：枠の外に出るようになります */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px', width: '270px', margin: '0 auto 15px' }}>
            <button className="secondary" onClick={clearKanjiCanvas} style={{ flex: 1 }}>消去</button>
            <button className="nav-btn" onClick={judgeKanji} style={{ flex: 2 }}>判定する</button>
          </div>
          
          <button 
            className="secondary" 
            style={{ width: '100%' }} 
            onClick={() => { 
              if(window.confirm("中断しますか？")) {
                // ✅ 中断時に筆跡データと解答履歴をリセットする
                setStrokes([]); 
                clearKanjiCanvas();
                setQuizAnswers([]); 
                setStep('menu');
              }
            }}
            > 中断してメニューに戻る
            </button>
        </div>
      )}
    </div>
  );
}

export default App;
