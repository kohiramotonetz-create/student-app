import { useState, useEffect } from 'react';

// ASCII形式から表示用Unicodeへの変換ユーティリティ（完全にバグを解消した修正版）
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
      continue; // トリガー文字自体は表示しない
    }

    if (isSuper) {
      if (superMap[char]) {
        result += superMap[char];
      } else {
        // 上付き非対応の文字が来たら通常に戻す
        if (subMap[char]) {
          result += subMap[char];
        } else {
          result += char;
        }
      }
      // ★【重要】1文字処理したら上付きモードを一度リセットする。
      // これにより、内部データ側で直前に「^」がある文字だけが確実に上付きになります。
      isSuper = false;
    } else {
      // 通常時：数字であれば下付き文字に変換、それ以外はそのまま
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
  const [isShift, setIsShift] = useState(true); 
  const [inputMode, setInputMode] = useState('normal'); 

  if (step !== 'chemistry-play') return null;

  const currentItem = quizItems[qIndex];
  if (!currentItem) return null;

  const displayInput = convertToDisplayFormat(currentInput);

  const handleKeyPress = (value) => {
    // 1. バックスペース処理
    if (value === 'BACKSPACE') {
      setCurrentInput(prev => {
        if (prev.endsWith('^')) return prev.slice(0, -1);
        const next = prev.slice(0, -1);
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
    
    if (/[a-z]/i.test(charToAdd)) {
      charToAdd = isShift ? charToAdd.toUpperCase() : charToAdd.toLowerCase();
      setInputMode('normal'); // アルファベット入力時は通常モードへ自動復帰
    }

    // 上付きモードのロジック修正
    if (inputMode === 'super') {
      setCurrentInput(prev => {
        // 上付きモード中は、入力される全ての文字の直前に必ず「^」を1つずつ付与する
        return prev + '^' + charToAdd;
      });
    } else {
      // 通常モード
      setCurrentInput(prev => prev + charToAdd);
    }
  };

  const handleEnter = () => {
    if (!currentInput.trim()) return;
    
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

  const handleUnknown = () => {
    const confirmSkip = window.confirm("飛ばしていいですか？");
    if (confirmSkip) {
      const record = {
        q: currentItem.question,
        a: "未入力",
        correct: currentItem.answer_raw,
        ok: false,
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
      const finalAnswers = [...quizAnswers];
      setStep('quiz-result');
      if (sendResultToGAS) {
        sendResultToGAS(finalAnswers, "化学式・イオン式テスト");
      }
    }
  };

  const row1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const row2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const row3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="quiz-play-container text-center">
      <div className="quiz-progress">問題 {qIndex + 1} / {quizItems.length}</div>
      <div className="quiz-question-text">{currentItem.question}</div>

      <div className="chem-input-display">
        {displayInput || <span className="placeholder">ここに化学式が表示されます</span>}
      </div>

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

      {!quizReview.visible && (
        <div className="chem-keyboard-container">
          <div className="chem-keyboard">
            <div className="keyboard-row mode-selector">
              <button className={`key btn-mode ${inputMode === 'normal' ? 'active' : ''}`} onClick={() => handleKeyPress('NORMAL_MODE')}>通常</button>
              <button className={`key btn-mode ${inputMode === 'super' ? 'active' : ''}`} onClick={() => handleKeyPress('SUPER_MODE')}>上付き</button>
              <button className="key btn-util" onClick={() => handleKeyPress('+')}>＋</button>
              <button className="key btn-util" onClick={() => handleKeyPress('-')}>－</button>
              <button className="key btn-util bracket-key" onClick={() => handleKeyPress('(')}>(</button>
              <button className="key btn-util bracket-key" onClick={() => handleKeyPress(')')}>)</button>
            </div>

            <div className="keyboard-row">
              {numbers.map(num => (
                <button key={num} className="key key-num" onClick={() => handleKeyPress(num)}>{num}</button>
              ))}
            </div>

            <div className="keyboard-row">
              {row1.map(letter => <button key={letter} className="key" onClick={() => handleKeyPress(letter)}>{isShift ? letter : letter.toLowerCase()}</button>)}
            </div>

            <div className="keyboard-row">
              {row2.map(letter => <button key={letter} className="key" onClick={() => handleKeyPress(letter)}>{isShift ? letter : letter.toLowerCase()}</button>)}
            </div>

            <div className="keyboard-row">
              <button className={`key key-shift ${isShift ? 'active' : ''}`} onClick={() => setIsShift(!isShift)}>Shift⇧</button>
              {row3.map(letter => <button key={letter} className="key" onClick={() => handleKeyPress(letter)}>{isShift ? letter : letter.toLowerCase()}</button>)}
              <button className="key key-backspace" onClick={() => handleKeyPress('BACKSPACE')}>⌫</button>
            </div>

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