import { useState } from 'react'
import axios from 'axios'
import './App.css'

// ★ここを書き換え！直接URLを書かずに、環境変数を読み込むようにします
const GAS_URL = import.meta.env.VITE_GAS_URL;

function App() {
  const [step, setStep] = useState('login'); // login, change-password, menu, test
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

　　　
  // 1. ログイン処理
  const handleLogin = async () => {
    if (!userId || !password) return alert("IDとパスワードを入力してください");
    if (!GAS_URL) return alert("GASのURLが設定されていません");
    
    setLoading(true);
    try {
      const response = await axios.post(GAS_URL, JSON.stringify({
        action: "login",
        userId: userId,
        password: password
      }), {
        headers: { 'Content-Type': 'text/plain' }
      });

      if (response.data.result === "success") {
        setUserName(response.data.name);

        // ★修正ポイント：adminの場合は強制的にメニューへ
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
      setLoading(false);
    }
  };

      // no-cors モードの場合、中身を読み取れない制限があるため、
      // 一旦「送信に成功した＝ID/Passが正しい」とみなして進むか、
      // 安全策として以下の「通信リトライ版」を使います。
      
      // --- もし上の fetch でダメなら、こちらを試してください ---
      const res = await axios.post(GAS_URL, {
        action: "login",
        userId: userId,
        password: password
      }, {
        headers: { 'Content-Type': 'text/plain' }
      });

      if (res.data.result === "success") {
        setUserName(res.data.name);
        if (res.data.isInitial === true) {
          setStep('change-password');
        } else {
          setStep('menu');
        }
      } else {
        alert("IDまたはパスワードが違います");
      }

    } catch (error) {
      console.error(error);
      alert("通信に失敗しました。GASのURLを再度確認してください。");
    } finally {
      setLoading(false);
    }
  };

  // 2. パスワード変更処理
  const handleChangePassword = async () => {
    if (!newPassword) return alert("新しいパスワードを入力してください");
    setLoading(true);
    try {
      await axios.post(GAS_URL, {
        action: "changePassword",
        userId: userId,
        newPassword: newPassword
      });
      alert("パスワードを変更しました。再度ログインしてください。");
      setStep('login');
      setPassword('');
      setNewPassword('');
    } catch (error) {
      alert("変更に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {loading && <div className="loading-overlay">通信中...</div>}

      {/* --- ログイン画面 --- */}
      {step === 'login' && (
        <div className="login-box">
          <h1>Student App</h1>
          <input type="text" placeholder="ユーザーID" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {/* --- 初回パスワード変更画面 --- */}
      {step === 'change-password' && (
        <div className="login-box">
          <h2>パスワードの変更</h2>
          <p>初回ログインです。新しいパスワードを設定してください。</p>
          <input type="password" placeholder="新しいパスワード" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword}>パスワードを更新してログイン</button>
        </div>
      )}

      {/* --- メニュー画面 --- */}
      {step === 'menu' && (
        <div className="menu-box">
          <h1>メニュー</h1>
          <p>ようこそ {userName} 先生</p>
          <div className="button-grid">
            <button onClick={() => setStep('test')}>📝 英単語テスト作成</button>
            <button disabled>🚀 その他（準備中）</button>
          </div>
          <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
        </div>
      )}

      {/* --- テスト作成画面 --- */}
      {step === 'test' && (
        <div className="test-box">
          <h2>英単語テスト作成</h2>
          <p>ここに junior の単語テスト機能を移植します</p>
          <button onClick={() => setStep('menu')}>戻る</button>
        </div>
      )}
    </div>
  )
}

export default App