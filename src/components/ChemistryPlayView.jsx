import { useState, useEffect } from 'react';

// ASCII形式から表示用Unicodeへの変換ユーティリティ
export const convertToDisplayFormat = (rawStr) => {
  if (!rawStr) return '';
  
  const subMap = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  const superMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };

  let result = '';
  let isSuper = false;

  for (let i = 0; i < rawStr.length; i++) {
    const char = rawStr[i];

    if (char === '^') {
      isSuper = true;
      continue;
    }

    if (isSuper) {
      if (superMap[char]) {
        result += superMap[char];
      } else {
        isSuper = false;
        // 上付きモード中に通常文字が来たら、数字なら下付き、それ以外はそのまま
        result += subMap[char] || char;
      }
    } else {
      // 通常時：数字であれば下付き文字に変換、それ以外（アルファベットなど）はそのまま
      if (subMap[char]) {
        result += subMap[char];
      } else {
        result += char;
      }
    }
  }
  return result;
};

function ChemistryPlayView({ step, setStep, quizItems, qIndex, currentInput, setCurrentInput, quizReview, submitQuizAnswer, proceedToNext, quizAnswers, sendResultToGAS }) {
  const [isShift, setIsShift] = useState(true); // 元素記号の最初は基本大文字のためデフォルトtrue
  const [inputMode, setInputMode] = useState('normal'); // 'normal' | 'super'

  if (step !== 'chemistry-play') return null;

  const currentItem = quizItems[qIndex];
  if (!currentItem) return null;

  // ユーザーが打ち込んだ内部テキスト(ASCII)を表示用に随時コンバート
  const displayInput = convertToDisplayFormat(currentInput);

  const handleKeyPress = (value) => {
    // 1. バックスペース処理
    if (value === 'BACKSPACE') {
      setCurrentInput(prev => {
        if (prev.endsWith('^')) return prev.slice(0, -1);
        const next = prev.slice(0, -1);
        // 文字を消した結果、末尾が「^」単体で残る状態になったら「^」も一緒に消去
        if (next.endsWith('^')) return next.slice(0, -1);
        return next;
      });
      return;
    }

    // 2. モード切り替え処理
    if (value === 'SUB_MODE' || value === 'NORMAL_MODE') {
      setInputMode('normal');
      return;
    }
    if (value === 'SUPER_MODE') {
      setInputMode('super');
      return;
    }

    // 3. 文字入力処理
    let charToAdd = value;
    
    // アルファベットの大文字小文字切り替え
    if (/[a-z]/i.test(charToAdd)) {
      charToAdd = isShift ? charToAdd.toUpperCase() : charToAdd.toLowerCase();
    }

    // 上付きモードのときは、入力された数字や記号の「直前」に自動で一度だけ ^ を差し込む
    if (inputMode === 'super') {
      setCurrentInput(prev => {
        if (prev.includes('^')) {
          // すでにテキスト内に上付きトリガー ^ が存在していれば、そのまま後ろに結合
          return prev + charToAdd;
        }
        // まだテキスト内に ^ がなければ、^ を自動で挟み込んでから結合
        return prev + '^' + charToAdd;
      });
    } else {
      // 通常モードのときは、アルファベットも数字も一切細工をせずそのまま末尾に結合
      setCurrentInput(prev => prev + charToAdd);
    }
  };

  // 確定（Enter）処理
  const handleEnter = () => {
    if (!currentInput.trim()) return;
    
    // カスタム正誤判定ロジック
    const isCorrect = currentInput.trim() === currentItem.answer_raw.trim();
    
    const record = {
      q: currentItem.question,
      a: currentInput,
      correct: currentItem.answer_raw,
      ok: isCorrect,
      rawItem: currentItem
    };

    submitQuizAnswer(record); 
  };

  // 【新設】わからない（パス）ボタンの処理
  const handleUnknown = () => {
    const confirmSkip = window.confirm("飛ばしていいですか？");
    if (confirmSkip) {
      // 空欄（未入力）として不正解レコードを生成
      const record = {
        q: currentItem.question,
        a: "未入力",
        correct: currentItem.answer_raw,
        ok: false, // わからないボタンは自動的に不正解扱い
        rawItem: currentItem
      };

      submitQuizAnswer(record);
    }
  };

  const handleNext = () => {
    if (qIndex + 1 < quizItems.length) {
      setInputMode('normal');
      setIsShift(true);
      proceedToNext();
    } else {
      // 全問終了時：GASへログ保存
      const finalAnswers = [...quizAnswers];
      setStep('quiz-result');
      if (sendResultToGAS) {
        sendResultToGAS(finalAnswers, "化学式・イオン式テスト");
      }
    }
  };

  // キーボードレイアウト
  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="quiz-play-container text-center">
      <div className="quiz-progress">問題 {qIndex + 1} / {quizItems.length}</div>
      <div className="quiz-question-text">{currentItem.question}</div>

      {/* 解答表示エリア */}
      <div className="chem-input-display">
        {displayInput || <span className="placeholder">ここに化学式が表示されます</span>}
      </div>

      {/* 判定レビューエリア */}
      {quizReview.visible && (
        <div className={`review-box ${quizReview.record.ok ? 'correct' : 'wrong'}`}>
          <div className="result-mark">{quizReview.record.ok ? '⭕ 正解！' : '❌ 不正解'}</div>
          
          <div className="your-answer" style={{ fontSize: '1.5rem', margin: '15px 0 10px 0' }}>
            あなたの解答: <span className="chem-text" style={{ fontWeight: 'bold', color: quizReview.record.ok ? '#10b981' : '#ef4444' }}>{convertToDisplayFormat(quizReview.record.a)}</span>
          </div>

          <div className="correct-answer" style={{ fontSize: '1.3rem', color: '#64748b', marginBottom: '15px' }}>
            正解: <span className="chem-text" style={{ fontWeight: 'bold', color: '#10b981' }}>{convertToDisplayFormat(currentItem.answer_raw)}</span>
          </div>

          <button className="btn-next" onClick={handleNext} style={{ marginTop: '10px' }}>
            {qIndex + 1 < quizItems.length ? '次の問題へ' : '結果を見る'}
          </button>
        </div>
      )}

      {/* 専用化学カスタムキーボード */}
      {!quizReview.visible && (
        <div className="chem-keyboard-container">
          <div className="chem-keyboard">
            {/* 1段目: モード切り替え・特殊機能 */}
            <div className="keyboard-row mode-selector">
              <button className={`key btn-mode ${inputMode === 'normal' ? 'active' : ''}`} onClick={() => handleKeyPress('NORMAL_MODE')}>通常</button>
              <button className={`key btn-mode ${inputMode === 'super' ? 'active' : ''}`} onClick={() => handleKeyPress('SUPER_MODE')}>上付き</button>
              <button className="key btn-util" onClick={() => handleKeyPress('+')}>＋</button>
              <button className="key btn-util" onClick={() => handleKeyPress('-')}>－</button>
            </div>

            {/* 2段目: 数字列 */}
            <div className="keyboard-row">
              {numbers.map(num => (
                <button key={num} className="key key-num" onClick={() => handleKeyPress(num)}>{num}</button>
              ))}
            </div>

            {/* 3段目: QWERTY 1行目 */}
            <div className="keyboard-row">
              {row1.map(letter => <button key={letter} className="key" onClick={() => handleKeyPress(letter)}>{isShift ? letter : letter.toLowerCase()}</button>)}
            </div>

            {/* 4段目: QWERTY 2行目 */}
            <div className="keyboard-row">
              {row2.map(letter => <button key={letter} className="key" onClick={() => handleKeyPress(letter)}>{isShift ? letter : letter.toLowerCase()}</button>)}
            </div>

            {/* 5段目: シフト + 3行目 + バックスペース */}
            <div className="keyboard-row">
              <button className={`key key-shift ${isShift ? 'active' : ''}`} onClick={() => setIsShift(!isShift)}>Shift⇧</button>
              {row3.map(letter => <button key={letter} className="key" onClick={() => handleKeyPress(letter)}>{isShift ? letter : letter.toLowerCase()}</button>)}
              <button className="key key-backspace" onClick={() => handleKeyPress('BACKSPACE')}>⌫</button>
            </div>

            {/* 6段目: 確定キー & わからないキーを 50% ずつ並列配置 */}
            <div className="keyboard-row">
              <button className="key key-unknown" onClick={handleUnknown} style={{ backgroundColor: '#ef4444', color: '#ffffff', boxShadow: '0 2px 0 #b91c1c' }}>わからない</button>
              <button className="key key-enter" onClick={handleEnter}>確定 (Enter)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChemistryPlayView;