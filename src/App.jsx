import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'
import LoginView from './components/LoginView'; // 【追加】ログイン部品の読み込み
import MenuView from './components/MenuView'; // 【追加】メニュー部品の読み込み
import TestSetupView from './components/TestSetupView'; // 【追加】テスト作成(紙)部品の読み込み
import QuizSetupView from './components/QuizSetupView'; // 【追加】クイズ設定画面の読み込み
import OtherSetupsView from './components/OtherSetupsView'; // 【追加】その他の設定画面の読み込み
import HighSchoolView from './components/HighSchoolView'; // 【追加】高校生モード部品の読み込み
import QuizPlayView from './components/QuizPlayView'; // 【追加】クイズ実行・結果画面の読み込み
import KanjiTestView from './components/KanjiTestView'; // 【追加】漢字テスト部品の読み込み
import ChemistrySetupView from './components/ChemistrySetupView';
import ChemistryPlayView from './components/ChemistryPlayView';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LOG_GAS_URL = import.meta.env.VITE_LOG_GAS_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // ★これを通行証として追加
const QUESTION_COUNT = 20;

function App() {
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  // 【修正箇所】ログインした生徒の「校舎名」を覚えるためのステートを新設
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
  const [chemistryData, setChemistryData] = useState([]); // 化学用データ保持

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

      // 【追加】化学式・イオン式リストCSV読み込み
      const dataChem = await fetchAndParse('/chemistry.csv');
      setChemistryData(dataChem.map(d => ({
        id: d["id"],
        question: d["question"],
        answer_raw: d["answer_raw"],
        type: d["type"],
        grade: d["grade"],
        category: d["category"]
      })).filter(d => d.answer_raw));

      const hsFiles = [
        { n: 'target1900.csv', s: setTargetData }, { n: 'target1200.csv', s: setTargetminiData },
        { n: 'sokudoku.csv', s: setSokudokuData }, { n: 'dragon.csv', s: setDragonData }, { n: 'yumetann.csv', s: setYumetannData },
        { n: 'kakushin351.csv', s: setKakushinData }, { n: 'kobunn315.csv', s: setKobun315Data },
        { n: 'kikutan_j2.csv', s: setKikutanData },   { n: 'iroha.csv', s: setIrohaData },
        { n: 'kobun325.csv', s: setKobun325Data },    { n: 'formula600.csv', s: setFormulaData },
        { n: 'kougei.csv', s: setKougeiData },
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

  // ✅ 定期対策_工芸用の単元リストを自動抽出
  const availableKougeiUnits = useMemo(() => {
    if (selectedBook.name !== '定期対策_工芸') return [];
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

  // 【新設】過去の間違えた問題リストを格納するステート
  const [wrongWordsList, setWrongWordsList] = useState([]);
  const [showWrongList, setShowWrongList] = useState(false);

  // 【新設】過去のログを取得し、2回連続正解を除外して「要復習リスト」を作る関数
  const fetchAndFilterWrongWords = async (sheetName, currentRangeWords) => {
    if (!LOG_GAS_URL || !userId) return;
    setLoading(true);
    try {
      // 1. GASからこのシート（アプリ）、この生徒の過去ログをすべて取得（最新順）
      const response = await axios.post(LOG_GAS_URL, JSON.stringify({
        action: "getLogs",
        sheetName: sheetName,
        studentId: userId
      }), { headers: { 'Content-Type': 'text/plain' } });

      const pastLogs = response.data; // 最新順のログ配列
      
      // 【完全隔離】漢字テストかどうかをシート名で厳密に判定
      const isKanji = sheetName === "漢字テスト" || sheetName === "漢字対策";
      
      // 今画面で選ばれている範囲の「突合用キー（英語なら w.en、漢字なら元のデータの question）」のリストを作成
      const currentWordSet = new Set(currentRangeWords.map(w => isKanji ? (w.question || w.ja) : w.en));
      
      // 問題ごとの正誤履歴を追跡するためのマップ（キー: 問題の文字列, 値: ○×の配列）
      const wordHistoryMap = {};

      // 2. 過去ログを解析して、各問題の最新からの正誤履歴を詰め込む
      pastLogs.forEach(log => {
        if (!log.history) return;
        const items = log.history.split(', ');
        items.forEach(item => {
          const match = item.match(/\](.+?)\((○|×)\)/);
          if (match) {
            const word = match[1].trim(); // 前後の空白を排除
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

      // 3. 2回連続正解ルールを適用して、間違えた問題をあぶり出す
      const wrongList = [];
      
      currentRangeWords.forEach(item => {
        // 【完全隔離】漢字のときは「よみ（question または ja）」、それ以外の英単語・古文は「item.en」をキーにする
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

        // 要復習判定になった問題のみリストに追加
        if (isWrong) {
          wrongList.push({
            // 漢字の時は「テキスト名 (ページ)」、英語の時は従来の単元名にする
            unit: isKanji ? `${item.textName} (${item.page})` : (item.unit || item.part || item.unitGroup || "選択範囲"),
            q: isKanji ? item.question : item.en, // 画面表示用の問題
            a: isKanji ? item.answer : item.ja,   // 画面表示用の答え
            rawItem: item // 再テスト時にそのまま使えるように元データも保持
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
      setLoading(false); // シンプルにこれだけにします
    }
  };

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
      // 【修正箇所】GASのパターンA（名前の前）に合わせて、 school と studentId を追加
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
      // 🕵️ これで「何が返ってきて失敗しているのか」が100%わかります
      console.log("🤖 Geminiからの生の回答:", res);

      // 文字列の中に true が含まれていれば正解とみなす
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

    // 1. まずは従来の文字一致チェック
    let isCorrect = rawC.split(/[/／]/).some(ans => {
      const correctAns = clean(ans); 
      const correctAnsNoParen = clean(removeParentheses(ans)); 
      return userInput === correctAns || (correctAnsNoParen !== "" && userInput === correctAnsNoParen);
    });

    // --- 🔍 判定プロセスをコンソールに表示 ---
    console.log("--- 判定プロセス開始 ---");
    console.log("問題:", item.en, " / 正解:", rawC, " / 入力:", currentInput);
    console.log("① 文字一致判定の結果:", isCorrect);

    // 2. 文字が違った場合のみ、AIに判定を依頼する
    if (!isCorrect && currentInput.trim() !== "" && mode === 'en-ja') {
      console.log("🚀 文字不一致のため、Gemini APIに問い合わせます..."); 
      setLoading(true); 
      try {
        const aiResult = await callAiJudge(item.en, rawC, currentInput);
        console.log("🤖 AI判定の結果:", aiResult); // true か false が返る
        isCorrect = aiResult;
      } catch (err) {
        console.error("❌ AI呼び出し中にエラー:", err);
      }
      setLoading(false);
    } else {
      console.log("⏭️ AIは呼び出しませんでした (理由: 文字一致、空欄、またはja-enモード)");
    }

    // 3. 最終的な結果で記録を作成
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
        // 【修正箇所】手動ログイン時も、返ってきた校舎名を school ステートに自動セットする
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
      
      {/* 【修正箇所】巨大だったログインUIを1行に凝縮 */}
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

      {/* 【修正箇所】メニューUIを部品化してスッキリさせる */}
      <MenuView 
        step={step}
        userName={userName}
        setStep={setStep}
        setIsKobunMode={setIsKobunMode}
        setIsFukisokuMode={setIsFukisokuMode}
        setSelectedBook={setSelectedBook}
        kakitanData={kakitanData}
      />

      {/* 【修正箇所】紙のテスト作成UIをコンポーネント化 */}
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

      {/* 【修正】親から子へ、必要な関数や状態をすべて仕送りする */}
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

      {/* 【修正箇所】高校生モードのメニュー＆設定UIをコンポーネント化 */}
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
        // 【追加箇所】親から子へ必要な関数や状態を仕送りする
        fetchAndFilterWrongWords={fetchAndFilterWrongWords}
        showWrongList={showWrongList}
        setShowWrongList={setShowWrongList}
        wrongWordsList={wrongWordsList}
      />
      {/* 【修正箇所】テストを解く画面 ＆ 結果画面をコンポーネント化 */}
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
      {/* 【修正箇所】最後の1ピース：漢字テストUIをコンポーネント化 */}
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
        // 【追加箇所】親から子へ必要な関数や状態を仕送りする
        fetchAndFilterWrongWords={fetchAndFilterWrongWords}
        showWrongList={showWrongList}
        setShowWrongList={setShowWrongList}
        wrongWordsList={wrongWordsList}
      />

      {/* 【追加】化学式・イオン式テスト用のコンポーネントを配置 */}
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
          // 親コンポーネントのクイズ結果配列にスタックし、レビューを表示
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
