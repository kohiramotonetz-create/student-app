import { useState } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import './App.css'

// 環境変数からGASのURLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  // --- ステート管理 ---
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState([]); // CSVデータ格納用

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
        // 管理者はメニューへ、一般ユーザー初回はパスワード変更へ
        if (userId === 'admin' || response.data.isInitial === false) {
          setStep('menu');
        } else {
          setStep('change-password');
        }
      } else {
        alert("IDまたはパスワードが違います");
      }
    } catch (error) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. プロジェクト内のCSV (public/wordlist.csv) を自動読み込み ---
  const loadDefaultCsv = async () => {
    setLoading(true);
    try {
      // publicフォルダのファイルは "/" からのパスで取得できます
      const response = await fetch('/wordlist.csv');
      if (!response.ok) throw new Error("ファイルが見つかりません");
      
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setWords(results.data);
          alert(`wordlist.csv から ${results.data.length} 件の単語を読み込みました！`);
        },
      });
    } catch (error) {
      console.error(error);
      alert("CSVの読み込みに失敗しました。publicフォルダに wordlist.csv があるか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. PDF生成処理 (日本語列名に対応) ---
  const generatePDF = () => {
    if (words.length === 0) return alert("先に単語リストを読み込んでください");

    const doc = new jsPDF();
    
    // 【重要】日本語フォントを使う場合は、以前 junior で行ったように
    // ここで doc.addFileToVFS と doc.addFont を設定する必要があります。
    

    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 20); // 20問抽出

    doc.setFontSize(18);
    doc.text("Vocabulary Test", 20, 20);
    doc.setFontSize(12);

    selected.forEach((item, index) => {
      const y = 40 + (index * 10);
      // 画像の見出しに合わせて「英語」列を参照
      const englishWord = item["英語"] || "---";
      doc.text(`${index + 1}. ${englishWord}`, 20, y);
      doc.text("(                        )", 110, y); 
    });

    doc.save("test.pdf");
  };

  // --- 画面表示 ---
  return (
    <div className="container">
      {loading && <div className="loading-overlay">処理中...</div>}

      {/* ログイン画面 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* メニュー画面 */}
      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button onClick={() => setStep('test')}>📝 英単語テスト作成</button>
            <button disabled className="disabled-btn">🚀 その他（準備中）</button>
          </div>
          <br />
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* テスト作成画面 */}
      {step === 'test' && (
        <div className="test-box">
          <h2>英単語テスト作成</h2>
          <div className="test-ui-container">
            <p className="description">システム内の単語データを読み込みます</p>
            <button className="load-btn" onClick={loadDefaultCsv}>📊 単語リストを読み込む</button>
            
            {words.length > 0 && (
              <div className="status-area fade-in">
                <hr />
                <p>✅ {words.length} 個のデータを取得済み</p>
                <button className="generate-btn" onClick={generatePDF}>PDFテストを作成する</button>
              </div>
            )}
          </div>
          <br />
          <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
    </div>
  )
}

export default App