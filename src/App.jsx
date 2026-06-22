import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'
import LoginView from './components/LoginView'; 
import MenuView from './components/MenuView'; 
import TestSetupView from './components/TestSetupView'; 
import QuizSetupView from './components/QuizSetupView'; 
import OtherSetupsView from './components/OtherSetupsView'; 
import HighSchoolView from './components/HighSchoolView'; 
import QuizPlayView from './components/QuizPlayView'; 
import KanjiTestView from './components/KanjiTestView'; 
import ChemistrySetupView from './components/ChemistrySetupView';
import ChemistryPlayView from './components/ChemistryPlayView';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const QUESTION_COUNT = 20;

function App() {
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userBranch, setUserBranch] = useState('未設定校');
  
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
  const [kougeiData, setKougeiData] = useState([]);
  // 【改善：新規追加】三木高校文理コース用のデータステート
  const [mikiData, setMikiData] = useState([]);

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
  const [chemistryData, setChemistryData] = useState([]); 

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

      const dataKanji = await fetchAndParse('/kanjilist.csv');
      setKanjiList(dataKanji.map(d => ({
        textName: d["テキスト"], 
        page: d["ページ"],
        question: d["問題"],
        answer: d["答え"]
      })).filter(d => d.answer));

      const dataChem = await fetchAndParse('/chemistry.csv');
      setChemistryData(dataChem.map(d => ({
        id: d["id"],
        question: d["question"],
        answer_raw: d["answer_raw"],
        type: d["type"],
        grade: d["grade"],
        category: d["category"]
      })).filter(d => d.answer_raw));

      // 【改善：修正と追加】hsFilesマッピングへmiki_high_school.csvを追加
      const hsFiles = [
        { n: 'target1900.csv', s: setTargetData }, { n: 'target1200.csv', s: setTargetminiData },
        { n: 'sokudoku.csv', s: setSokudokuData }, { n: 'dragon.csv', s: setDragonData }, { n: 'yumetann.csv', s: setYumetannData },
        { n: 'kakushin351.csv', s: setKakushinData }, { n: 'kobunn315.csv', s: setKobun315Data },
        { n: 'kikutan_j2.csv', s: setKikutanData },   { n: 'iroha.csv', s: setIrohaData },
        { n: 'kobun325.csv', s: setKobun325Data },    { n: 'formula600.csv', s: setFormulaData },
        { n: 'kougei.csv', s: setKougeiData },
        { n: 'miki_high_school.csv', s: setMikiData }, // public 直下としてロード
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

  // 【修正】高松東高校など、定期テスト系のデータを持つ本であれば自動的に単元リストを抽出する
  const availableKougeiUnits = useMemo(() => {
    if (!selectedBook?.data) return [];
    return [...new Set(selectedBook.data.map(d => d.unit))].filter(u => u).sort();
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

  const [wrongWordsList, setWrongWordsList] = useState([]);
  const [showWrongList, setShowWrongList] = useState(false);

  const fetchAndFilterWrongWords = async (sheetName, currentRangeWords) => {
    if (!LOG_GAS_URL || !userId) return;
    setLoading(true);
    try {
      const response = await axios.post(LOG_GAS_URL, JSON.stringify({
        action: "getLogs",
        sheetName: sheetName,
        studentId: userId
      }), { headers: { 'Content-Type': 'text/plain' } });

      const pastLogs = response.data; 
      
      const isKanji = sheetName === "漢字テスト" || sheetName === "漢字対策";
      
      const currentWordSet = new Set(currentRangeWords.map(w => isKanji ? (w.question || w.ja) : w.en));
      
      const wordHistoryMap = {};

      pastLogs.forEach(log => {
        if (!log.history) return;
        const items = log.history.split(', ');
        items.forEach(item => {
          const match = item.match(/\](.+?)\((○|×)\)/);
          if (match) {
            const word = match[1].trim(); 
            const result = match[2];
            
            if (currentWordSet.has(word)) {
              if (!wordHistoryMap[word]) {
                wordHistoryMap[word] = [];
              }
              wordHistoryMap[word].push(result);
            }
          }
        });
      });

      const wrongList = [];
      
      currentRangeWords.forEach(item => {
        const searchKey = isKanji ? (item.question || item.ja) : item.en;
        const history = wordHistoryMap[searchKey];
        
        let isWrong = false;

        if (!history || history.length === 0) {
          isWrong = false;
        } else if (history[0] === '×') {
          isWrong = true;
        } else if (history[0] === '○') {
          if (history.length === 1) {
            isWrong = false;
          } else if (history[1] === '×') {
            isWrong = true;
          } else if (history[1] === '○') {
            isWrong = false;
          }
        }

        if (isWrong) {
          wrongList.push({
            unit: isKanji ? `${item.textName} (${item.page})` : (item.unit || item.part || item.unitGroup || "選択範囲"),
            q: isKanji ? item.question : item.en, 
            a: isKanji ? item.answer : item.ja,   
            rawItem: item 
          });
        }
      });

      setWrongWordsList(wrongList);
      setShowWrongList(true);

      if (wrongList.length === 0) {
        alert("この範囲内に、過去に間違えてまだ合格していない問題はありません！");
      }

    } catch (e) {
      console.error("ログ取得エラー:", e);
      alert("過去ログの取得に失敗しました");
    } finally {
      setLoading(false); 
    }
  };

  const sendResultToGAS = (finalAnswers, sheetName, customRange = null) => {
    if (!sheetName || !LOG_GAS_URL) return;

    const rangeLabel = customRange || ((selectedBook && selectedBook.name) 
      ? `No.${startNo}～${endNo}${selectedParts.length > 0 ? `(${selectedParts.join('/')})` : ''}` 
      : (isKobunMode ? "古文" : (isFukisokuMode ? "不規則" : `${startUnit}${startPart}～${endUnit}${endPart}`)));

    const payload = {
      action: "saveLog", 
      sheetName, 
      school,
      studentId: userId, 
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

  const callAiJudge = async (word, correct, userAns) => {
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "checkWithGemini", 
        apiKey: GEMINI_API_KEY, 
        word, correct, userAns
      }), { headers: { 'Content-Type': 'text/plain' } });

      const res = response.data.result;
      console.log("🤖 Geminiからの生の回答:", res);
      return String(res).toLowerCase().includes("true");
    } catch (e) {
      console.error("AI判定通信エラー:", e);
      return false; 
    }
  };

  const submitQuizAnswer = async () => {
    const item = quizItems[qIndex];
    const prefix = (selectedBook.name === '書き単') ? `[${item.part}] ` : "";
    const qText = prefix + ((mode === 'ja-en') ? item.ja : item.en);
    const rawC = (mode === 'ja-en') ? item.en : item.ja;
    const clean = (s) => s ? s.replace(/[…\.\.\.～~？?！!。、,]/g, "").replace(/\s+/g, "").toLowerCase() : "";
    const removeParentheses = (s) => s ? s.replace(/\（.*?\）|\(.*?\)/g, "") : "";
    const userInput = clean(currentInput);

    let isCorrect = rawC.split(/[/／]/).some(ans => {
      const correctAns = clean(ans); 
      const correctAnsNoParen = clean(removeParentheses(ans)); 
      return userInput === correctAns || (correctAnsNoParen !== "" && userInput === correctAnsNoParen);
    });

    console.log("--- 判定プロセス開始 ---");
    console.log("問題:", item.en, " / 正解:", rawC, " / 入力:", currentInput);
    console.log("① 文字一致判定の結果:", isCorrect);

    if (!isCorrect && currentInput.trim() !== "" && mode === 'en-ja') {
      console.log("🚀 文字不一致のため、Gemini APIに問い合わせます..."); 
      setLoading(true); 
      try {
        const aiResult = await callAiJudge(item.en, rawC, currentInput);
        console.log("🤖 AI判定の結果:", aiResult); 
        isCorrect = aiResult;
      } catch (err) {
        console.error("❌ AI呼び出し中にエラー:", err);
      }
      setLoading(false);
    } else {
      console.log("⏭️ AIは呼び出しませんでした (理由: 文字一致、空欄、またはja-enモード)");
    }

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
        if (response.data.school) setSchool(response.data.school); 
        
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
    ctx.lineWidth = 5; 
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
              writing_area_width: 270,  
              writing_area_height: 480  
            }, 
            ink: formattedStrokes, 
            language: "ja" 
          }]
        })
      });

      const data = await response.json();
      if (data[0] === "SUCCESS") {
        const candidates = data[1][0][1];
        const answer = quizItems[qIndex].en; 
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
          setStrokes([]);
          const rangeLabel = `${selectedText} (${startPage}〜${endPage})`;
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
      
      <LoginView 
        step={step}
        userId={userId}
        setUserId={setUserId}
        password={password}
        setPassword={setPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        handleLogin={handleLogin}
        handleChangePassword={handleChangePassword}
      />

      <MenuView 
        step={step}
        userName={userName}
        setStep={setStep}
        setIsKobunMode={setIsKobunMode}
        setIsFukisokuMode={setIsFukisokuMode}
        setSelectedBook={setSelectedBook}
        kakitanData={kakitanData}
      />

      <TestSetupView 
        step={step}
        setStep={setStep}
        gradeList={gradeList}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        mode={mode}
        setMode={setMode}
        school={school}
        setSchool={setSchool}
        customSchool={customSchool}
        setCustomSchool={setCustomSchool}
        startUnit={startUnit}
        setStartUnit={setStartUnit}
        filteredUnits={filteredUnits}
        startPart={startPart}
        setStartPart={setStartPart}
        endUnit={endUnit}
        setEndUnit={setEndUnit}
        endPart={endPart}
        setEndPart={setEndPart}
        allData={allData}
        testWords={testWords}
        setTestWords={setTestWords}
        showPaperAnswers={showPaperAnswers}
        setShowPaperAnswers={setShowPaperAnswers}
        speakEn={speakEn}
        QUESTION_COUNT={QUESTION_COUNT}
      />

      <QuizSetupView 
        step={step}
        setStep={setStep}
        gradeList={gradeList}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        mode={mode}
        setMode={setMode}
        startUnit={startUnit}
        setStartUnit={setStartUnit}
        filteredUnits={filteredUnits}
        startPart={startPart}
        setStartPart={setStartPart}
        endUnit={endUnit}
        setEndUnit={setEndUnit}
        endPart={endPart}
        setEndPart={setEndPart}
        allData={allData}
        resetQuizState={resetQuizState}
        setQuizItems={setQuizItems}
        QUESTION_COUNT={QUESTION_COUNT}
        fetchAndFilterWrongWords={fetchAndFilterWrongWords}
        showWrongList={showWrongList}
        setShowWrongList={setShowWrongList}
        wrongWordsList={wrongWordsList}
      />

      <OtherSetupsView 
        step={step}
        setStep={setStep}
        mode={mode}
        setMode={setMode}
        startDay={startDay}
        setStartDay={setStartDay}
        endDay={endDay}
        setEndDay={setEndDay}
        kakitanData={kakitanData}
        fukisokuData={fukisokuData}
        kobunData={kobunData}
        resetQuizState={resetQuizState}
        setQuizItems={setQuizItems}
        QUESTION_COUNT={QUESTION_COUNT}
        isFukisokuMode={isFukisokuMode}
        isKobunMode={isKobunMode}
        fetchAndFilterWrongWords={fetchAndFilterWrongWords}
        showWrongList={showWrongList}
        setShowWrongList={setShowWrongList}
        wrongWordsList={wrongWordsList}
      />

      {/* 【改善：修正】仕送りPropsにmikiDataを追加 */}
      <HighSchoolView 
        step={step}
        setStep={setStep}
        mode={mode}
        setMode={setMode}
        targetData={targetData}
        targetminiData={targetminiData}
        sokudokuData={sokudokuData}
        dragonData={dragonData}
        yumetannData={yumetannData}
        kikutanData={kikutanData}
        kakushinData={kakushinData}
        kobun315Data={kobun315Data}
        irohaData={irohaData}
        kobun325Data={kobun325Data}
        formulaData={formulaData}
        kougeiData={kougeiData}
        mikiData={mikiData} // 【追加】
        selectedBook={selectedBook}
        setSelectedBook={setSelectedBook}
        setIsKobunMode={setIsKobunMode}
        startNo={startNo}
        setStartNo={setStartNo}
        endNo={endNo}
        setEndNo={setEndNo}
        availableParts={availableParts}
        selectedParts={selectedParts}
        setSelectedParts={setSelectedParts}
        availableKougeiUnits={availableKougeiUnits}
        startDay={startDay}
        setStartDay={setStartDay}
        resetQuizState={resetQuizState}
        setQuizItems={setQuizItems}
        QUESTION_COUNT={QUESTION_COUNT}
        isKobunMode={isKobunMode}
        fetchAndFilterWrongWords={fetchAndFilterWrongWords}
        showWrongList={showWrongList}
        setShowWrongList={setShowWrongList}
        wrongWordsList={wrongWordsList}
      />

      <QuizPlayView 
        step={step}
        setStep={setStep}
        quizItems={quizItems}
        qIndex={qIndex}
        currentInput={currentInput}
        setCurrentInput={setCurrentInput}
        quizReview={quizReview}
        practice={practice}
        setPractice={setPractice}
        selectedBook={selectedBook}
        mode={mode}
        isKobunMode={isKobunMode}
        speakEn={speakEn}
        submitQuizAnswer={submitQuizAnswer}
        proceedToNext={proceedToNext}
        finishPractice={finishPractice}
        quizAnswers={quizAnswers}
        resetQuizState={resetQuizState}
        setSelectedBook={setSelectedBook}
      />

      <KanjiTestView 
        step={step}
        setStep={setStep}
        kanjiMode={kanjiMode}
        setKanjiMode={setKanjiMode}
        selectedText={selectedText}
        setSelectedText={setSelectedText}
        startPage={startPage}
        setStartPage={setStartPage}
        endPage={endPage}
        setEndPage={setEndPage}
        kanjiList={kanjiList}
        selectedKanjiIds={selectedKanjiIds}
        toggleKanji={toggleKanji}
        startKanjiTest={startKanjiTest}
        quizItems={quizItems}
        qIndex={qIndex}
        canvasRef={canvasRef}
        startDrawing={startDrawing}
        draw={draw}
        setIsDrawing={setIsDrawing}
        clearKanjiCanvas={clearKanjiCanvas}
        judgeKanji={judgeKanji}
        setStrokes={setStrokes}
        setQuizAnswers={setQuizAnswers}
        fetchAndFilterWrongWords={fetchAndFilterWrongWords}
        showWrongList={showWrongList}
        setShowWrongList={setShowWrongList}
        wrongWordsList={wrongWordsList}
      />

      <ChemistrySetupView 
        step={step}
        setStep={setStep}
        chemistryData={chemistryData}
        resetQuizState={resetQuizState}
        setQuizItems={setQuizItems}
        QUESTION_COUNT={QUESTION_COUNT}
      />

      <ChemistryPlayView 
        step={step}
        setStep={setStep}
        quizItems={quizItems}
        qIndex={qIndex}
        currentInput={currentInput}
        setCurrentInput={setCurrentInput}
        quizReview={quizReview}
        submitQuizAnswer={(record) => {
          setQuizAnswers(prev => [...prev, record]);
          setQuizReview({ visible: true, record });
        }}
        proceedToNext={proceedToNext}
        quizAnswers={quizAnswers}
        sendResultToGAS={sendResultToGAS}
      />
    </div>
  );
}

export default App;