import { useState, useEffect } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  const [step, setStep] = useState('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // --- テスト作成用のステート ---
  const [allData, setAllData] = useState([]);      // 全単語データ
  const [units, setUnits] = useState([]);          // ユニット一覧（セレクトボックス用）
  const [startUnit, setStartUnit] = useState('');
  const [startPart, setStartPart] = useState('');
  const [endUnit, setEndUnit] = useState('');
  const [endPart, setEndPart] = useState('');
  const [mode, setMode] = useState('en-ja');       // 出題モード
  const [school, setSchool] = useState('木太中');   // 学校名
  const [testWords, setTestWords] = useState([]);  // 抽出された20問
  const [showAnswer, setShowAnswer] = useState(false);
  const [rangeText, setRangeText] = useState('');

  // 1. ログイン処理
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
      } else {
        alert("IDまたはパスワードが違います");
      }
    } catch (error) { alert("通信エラー"); }
    finally { setLoading(false); }
  };

  // 2. CSVデータの自動読み込み（テスト画面へ切り替わった時に実行）
  useEffect(() => {
    if (step === 'test') {
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
              if (uniqueUnits.length > 0) {
                setStartUnit(uniqueUnits[0]);
                setEndUnit(uniqueUnits[0]);
              }
            }
          });
        } catch (e) { alert("CSV読み込み失敗"); }
      };
      loadCsv();
    }
  }, [step]);

  // 3. 問題生成ロジック
  const generateTest = () => {
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

  return (
    <div className="container">
      {loading && <div className="loading-overlay">処理中...</div>}

      {/* --- ログイン画面 --- */}
      {step === 'login' && (
        <div className="login-box no-print">
          <h1>Student App</h1>
          <input type="text" placeholder="ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="Pass" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* --- メニュー画面 --- */}
      {step === 'menu' && (
        <div className="menu-box no-print">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <button onClick={() => setStep('test')}>📝 英単語テスト作成</button>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* --- テスト作成画面（Excel風UI） --- */}
      {step === 'test' && (
        <div className="test-builder-layout">
          {/* 左側：設定パネル */}
          <div className="settings-panel no-print">
            <h3>📝 テスト設定</h3>
            <div className="config-group">
              <label>学校名</label>
              <select value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="木太中">木太中</option>
                <option value="玉藻中">玉藻中</option>
                <option value="桜町中">桜町中</option>
                <option value="附属中">附属中</option>
              </select>
              
              <label>出題モード</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="en-ja">英語 → 日本語</option>
                <option value="ja-en">日本語 → 英語</option>
              </select>
            </div>

            <div className="config-group">
              <label>開始範囲</label>
              <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={startPart} onChange={(e) => setStartPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === startUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="config-group">
              <label>終了範囲</label>
              <select value={endUnit} onChange={(e) => setEndUnit(e.target.value)}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={endPart} onChange={(e) => setEndPart(e.target.value)}>
                {[...new Set(allData.filter(d => d.unitGroup === endUnit).map(d => d.part))].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <button className="btn-main" onClick={generateTest}>🔄 問題を生成</button>
            <button className="btn-sub" onClick={() => setShowAnswer(!showAnswer)}>
              {showAnswer ? '👁 解答隠す' : '👁 解答表示'}
            </button>
            <button className="btn-print" onClick={() => window.print()}>🖨 印刷 / PDF保存</button>
            <button className="btn-back" onClick={() => setStep('menu')}>戻る</button>
          </div>

          {/* 右側：プレビューパネル */}
          <div className="preview-panel">
            <div className="test-paper" id="paper">
              <div className="header-area">
                <div className="name-box">名前 ____________________</div>
                <h1>英単語テスト</h1>
                <div className="school-tag">{school}</div>
              </div>
              <p className="range-text">{rangeText}</p>
              <table>
                <thead>
                  <tr>
                    <th className="col-no">No.</th>
                    <th>{mode === 'en-ja' ? '英単語' : '日本語訳'}</th>
                    <th>{mode === 'en-ja' ? '日本語訳' : '英単語'}</th>
                  </tr>
                </thead>
                <tbody>
                  {testWords.map((d, i) => (
                    <tr key={i}>
                      <td className="col-no">{i + 1}</td>
                      <td>{mode === 'en-ja' ? d.en : d.ja}</td>
                      <td>{showAnswer ? (mode === 'en-ja' ? d.ja : d.en) : ''}</td>
                    </tr>
                  ))}
                  {/* 20問に満たない場合の空行埋め */}
                  {[...Array(Math.max(0, 20 - testWords.length))].map((_, i) => (
                    <tr key={`empty-${i}`}><td className="col-no">{testWords.length + i + 1}</td><td></td><td></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App