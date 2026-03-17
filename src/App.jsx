import { useState } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import './App.css'

const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState([]);

  // --- 1. ログイン処理 ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "login", userId, password
      }), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.result === "success") {
        setUserName(response.data.name);
        // 管理者ならメニュー、一般なら初回判定（今回はシンプルにメニューへ飛ばす設定）
        setStep('menu');
      } else {
        alert("IDまたはパスワードが違います");
      }
    } catch (error) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. ボタン一発でCSVを読み込む（ファイル選択なし！） ---
  const loadDefaultCsv = async () => {
    setLoading(true);
    try {
      // public/wordlist.csv を直接読みに行く
      const response = await fetch('/wordlist.csv');
      if (!response.ok) throw new Error("wordlist.csvが見つかりません");
      
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setWords(results.data);
          alert(`データを読み込みました！（合計: ${results.data.length}件）`);
        },
      });
    } catch (error) {
      alert("publicフォルダの中に wordlist.csv が見つかりませんでした。");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. PDF作成 ---
  const generatePDF = () => {
    if (words.length === 0) return alert("先にデータを読み込んでください");
    const doc = new jsPDF();
    
    // 単語をランダムに20個選ぶ
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 20);

    doc.setFontSize(18);
    doc.text("Vocabulary Test", 20, 20);

    selected.forEach((item, index) => {
      const y = 40 + (index * 10);
      // CSVの列名「英語」を取得
      const word = item["英語"] || "---";
      doc.text(`${index + 1}. ${word}`, 20, y);
      doc.text("(                        )", 110, y); 
    });

    doc.save("test.pdf");
  };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">処理中...</div>}

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
          <button onClick={() => setStep('test')}>📝 英単語テスト作成</button>
          <br /><br />
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {step === 'test' && (
        <div className="test-box">
          <h2>英単語テスト作成</h2>
          {/* ↓ ここからファイル選択（input type="file"）を消しました！ */}
          <div className="test-ui">
            <button className="load-btn" onClick={loadDefaultCsv}>
              📊 内部データを読み込む
            </button>
            
            {words.length > 0 && (
              <div className="ready-area">
                <p>✅ {words.length}件の準備完了</p>
                <button className="generate-btn" onClick={generatePDF}>
                  🖨️ PDFを作成する
                </button>
              </div>
            )}
          </div>
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
    </div>
  )
}

export default App