import React from 'react';

function MenuView({
  step,
  userName,
  setStep,
  setIsKobunMode,
  setIsFukisokuMode,
  setSelectedBook,
  kakitanData
}) {
  if (step !== 'menu') return null;

  return (
    <div className="menu-box">
      <h1>メニュー</h1>
      <p>ようこそ {userName} さん</p>
      <div className="button-grid">
        <button className="nav-btn" onClick={() => { 
          setIsKobunMode(false); 
          setIsFukisokuMode(false); 
          setSelectedBook({ name: '', data: [] }); 
          setStep('test-setup'); 
        }}>📝 英単語テスト作成(紙)</button>

        <button className="nav-btn" onClick={() => { 
          setIsKobunMode(false); 
          setIsFukisokuMode(false); 
          setSelectedBook({ name: '', data: [] }); 
          setStep('quiz-setup'); 
        }}>🚀 1問ずつテスト(自習)</button>

        <button className="nav-btn" style={{ backgroundColor: '#e67e22' }} onClick={() => { 
          setIsKobunMode(false); 
          setIsFukisokuMode(false); 
          setSelectedBook({ name: '書き単', data: kakitanData }); 
          setStep('kakitan-setup'); 
        }}>✍️ 書き単</button>

        <button className="nav-btn" onClick={() => { 
          setIsKobunMode(false); 
          setIsFukisokuMode(true); 
          setSelectedBook({ name: '', data: [] }); 
          setStep('fukisoku-setup'); 
        }}>🔄 英単語（不規則変化）</button>

        <button className="nav-btn" onClick={() => { 
          setIsKobunMode(true); 
          setIsFukisokuMode(false); 
          setSelectedBook({ name: '', data: [] }); 
          setStep('kobun-setup'); 
        }}>📚 古文単語（自習）</button>

        <button className="nav-btn" onClick={() => setStep('highschool-menu')}> 🎓 高校生モード</button>
        <button className="nav-btn" onClick={() => setStep('kanji-setup')}>🖋 定期テスト 漢字対策！　←NEW!!</button>
      </div>
      <button className="secondary" onClick={() => setStep('login')}>ログアウト</button>
    </div>
  );
}

export default MenuView;