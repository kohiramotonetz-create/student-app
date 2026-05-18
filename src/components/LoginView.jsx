import React from 'react';

function LoginView({ 
  step, 
  userId, 
  setUserId, 
  password, 
  setPassword, 
  newPassword, 
  setNewPassword, 
  handleLogin, 
  handleChangePassword 
}) {
  // step が login でも change-password でもない場合は何も表示しない
  if (step !== 'login' && step !== 'change-password') return null;

  return (
    <>
      {step === 'login' && (
        <div className="login-box">
          <h1>スキマくん</h1>
          <input 
            type="text" 
            placeholder="生徒番号" 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="パスワード(初期:1234)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button onClick={handleLogin}>ログイン</button>
        </div>
      )}

      {step === 'change-password' && (
        <div className="login-box">
          <h2>パスワード変更</h2>
          <p>初期パスワードから変更してください</p>
          <input 
            type="password" 
            placeholder="新しいパスワード" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
          <button onClick={handleChangePassword}>変更して開始</button>
        </div>
      )}
    </>
  );
}

export default LoginView;