import { useState } from 'react'
import axios from 'axios'
import Papa from 'papaparse' // CSVを読み込むためのライブラリ
import { jsPDF } from 'jspdf' // PDFを作成するためのライブラリ
import './App.css'

// 環境変数（Vercelや.env.local）からGoogleのURLを取得
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  // --- アプリの状態を管理する変数（ステート） ---
  const [step, setStep] = useState('login');        // 画面切り替え（login, menu, test など）
  const [userId, setUserId] = useState('');         // 入力されたユーザーID
  const [password, setPassword] = useState('');     // 入力されたパスワード
  const [newPassword, setNewPassword] = useState(''); // 新しいパスワード
  const [userName, setUserName] = useState('');      // ログイン後のユーザー名
  const [loading, setLoading] = useState(false);    // 通信中かどうかのフラグ
  const [words, setWords] = useState([]);           // CSVから読み込んだ単語リスト

  // --- 1. ログイン処理 ---
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    if (!GAS_URL) return alert("GASのURLが設定されていません");
    
    setLoading(true); // 通信開始（画面を暗くする）
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "login",
        userId: userId,
        password: password
      }), {
        headers: { 'Content-Type': 'text/plain' } // GASとの通信の決まり文句
      });

      if (response.data.result === "success") {
        setUserName(response.data.name);

        // 管理者(admin)はパスワード変更をスキップ、一般ユーザーは初回のみ変更画面へ
        if (userId === 'admin') {
          setStep('menu');
        } else if (response.data.isInitial === true) {
          setStep('change-password');
        } else {
          setStep('menu');
        }
      } else {
        alert("IDまたはパスワードが違います");
      }
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました。");
    } finally {
      setLoading(false); // 通信終了
    }
  };

  // --- 2. パスワード変更処理 ---
  const handleChangePassword = async () => {
    if (!newPassword) return alert("新しいパスワードを入力してください");
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "changePassword",
        userId: userId,
        newPassword: newPassword
      }), {
        headers: { 'Content-Type': 'text/plain' }
      });

      if (response.data.result === "success") {
        alert("パスワードを更新しました。もう一度ログインしてください。");
        setStep('login');
        setPassword('');
      }
    } catch (error) {
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. CSVファイルの読み込み処理（juniorからの移植） ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,         // CSVの1行目を見出しとして扱う
      skipEmptyLines: true, // 空白行は飛ばす
      complete: (results) => {
        setWords(results.data); // 読み込んだデータを保存
        alert(`${results.data.length} 件の単語を読み込みました！`);
      },
    });
  };

  // --- 4. PDF生成処理（juniorからの移植） ---
  const generatePDF = () => {
    if (words.length === 0) return alert("まずはCSVファイルを読み込んでください");

    const doc = new jsPDF();
    
    // 単語リストをランダムに並び替えて20問選ぶ
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 20);

    doc.setFontSize(18);
    doc.text("English Vocabulary Test", 20, 20);
    doc.setFontSize(12);

    // 選ばれた単語をPDFに書き込む
    selected.forEach((item, index) => {
      const y = 40 + (index * 10);
      // CSVの列名に合わせて item.english または item.単語 などを調整してください
      const displayWord = item.english || item.単語 || "No Word";
      doc.text(`${index + 1}. ${displayWord}`, 20, y);
      doc.text("(                        )", 100, y); // 解答欄
    });

    doc.save("test.pdf"); // PDFをダウンロード
  };

  // --- 5. 画面の見た目（HTML） ---
  return (
    <div className="container">
      {/* 画面が読み込み中の時のぐるぐる */}
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* 【ログイン画面】 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* 【パスワード変更画面】 */}
      {step === 'change-password' && (
        <div className="login-box">
          <h2>パスワードの変更</h2>
          <p>初回ログインです。新しいパスワードを設定してください。</p>
          <input type="password" placeholder="新しいパスワード" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword}>更新してログインへ</button>
        </div>
      )}

      {/* 【メニュー画面】 */}
      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button onClick={() => setStep('test')}>📝 英単語テスト作成</button>
            <button disabled className="disabled-btn">🚀 その他（準備中）</button>
          </div>
          <br />
          <button className="secondary" onClick={() => {setStep('login'); setPassword('');}}>ログアウト</button>
        </div>
      )}

      {/* 【英単語テスト作成画面】 */}
      {step === 'test' && (
        <div className="test-box">
          <h2>英単語テスト作成</h2>
          <div className="test-ui-container">
            <p>1. CSVファイルをアップロードしてください</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
            
            {words.length > 0 && (
              <div className="status-area">
                <hr />
                <p>現在 {words.length} 個の単語が読み込まれています。</p>
                <button className="generate-btn" onClick={generatePDF}>PDFテストを作成する</button>
              </div>
            )}
          </div>
          <br />
          <button className="secondary" onClick={() => setStep('menu')}>メニューに戻る</button>
        </div>
      )}
    </div>
  )
}

export default App