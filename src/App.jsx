import { useState } from 'react'
import axios from 'axios'
import './App.css'

// 環境変数からGASのURLを読み込む（Vercelまたは.env.local）
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  const [step, setStep] = useState('login'); 
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. ログイン処理
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    if (!GAS_URL) return alert("GASのURLが設定されていません。環境変数を確認してください。");
    
    setLoading(true);
    try {
      // GASへデータを送信
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "login",
        userId: userId,
        password: password
      }), {
        headers: { 'Content-Type': 'text/plain' }
      });

      if (response.data.result === "success") {
        setUserName(response.data.name);

        // 管理者(admin)の場合はパスワード変更画面をスキップしてメニューへ
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
      alert("通信エラーが発生しました。ブラウザの再読み込みを試してください。");
    } finally {
      setLoading(false);
    }
  };

  // 2. パスワード変更処理
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
        setNewPassword('');
      }
    } catch (error) {
      console.error(error);
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* 通信中のオーバーレイ表示 */}
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* ログイン画面 */}
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* 初回パスワード変更画面 */}
      {step === 'change-password' && (
        <div className="login-box">
          <h2>パスワードの変更</h2>
          <p>初回ログインです。新しいパスワードを設定してください。</p>
          <input type="password" placeholder="新しいパスワード" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword}>パスワードを更新する</button>
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
          <button className="secondary" onClick={() => {setStep('login'); setPassword('');}}>ログアウト</button>
        </div>
      )}

      {/* 英単語テスト作成画面（ここに以前の機能を移植） */}
      {step === 'test' && (
        <div className="test-box">
          <h2>英単語テスト作成</h2>
          <div className="test-ui-placeholder">
            <p>ここに junior プロジェクトの CSV読み込み機能を移植します</p>
            {/* ここに今後 junior の input(file) などを追加していきます */}
          </div>
          <button onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
    </div>
  )
}

export default App