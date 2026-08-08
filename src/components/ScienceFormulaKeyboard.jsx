import { useState } from 'react';
import { convertToDisplayFormat } from './ChemistryPlayView';

function ScienceFormulaKeyboard({ value, onChange, onSubmit, disabled = false }) {
  const [isShift, setIsShift] = useState(true);
  const [inputMode, setInputMode] = useState('normal');
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const press = (key) => {
    if (disabled) return;
    if (key === 'BACKSPACE') {
      onChange(value.endsWith('^') ? value.slice(0, -1) : value.slice(0, -1).replace(/\^$/, ''));
      return;
    }
    if (key === 'NORMAL_MODE') {
      setInputMode('normal');
      return;
    }
    if (key === 'SUPER_MODE') {
      setInputMode('super');
      return;
    }

    let next = key;
    if (/[a-z]/i.test(next)) {
      next = isShift ? next.toUpperCase() : next.toLowerCase();
      setInputMode('normal');
    }
    onChange(value + (inputMode === 'super' ? '^' : '') + next);
  };

  return (
    <fieldset className="chem-keyboard-container" disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="chem-input-display">
        {convertToDisplayFormat(value) || <span className="placeholder">ここに化学式が表示されます</span>}
      </div>
      <div className="chem-keyboard">
        <div className="keyboard-row mode-selector">
          <button type="button" className={`key btn-mode ${inputMode === 'normal' ? 'active' : ''}`} onClick={() => press('NORMAL_MODE')}>通常</button>
          <button type="button" className={`key btn-mode ${inputMode === 'super' ? 'active' : ''}`} onClick={() => press('SUPER_MODE')}>上付き</button>
          {['+', '-', '→', '(', ')'].map((key) => (
            <button type="button" key={key} className="key btn-util" onClick={() => press(key)}>{key}</button>
          ))}
        </div>
        <div className="keyboard-row">
          {numbers.map((key) => <button type="button" key={key} className="key key-num" onClick={() => press(key)}>{key}</button>)}
        </div>
        {rows.slice(0, 2).map((row, index) => (
          <div className="keyboard-row" key={index}>
            {row.map((key) => <button type="button" key={key} className="key" onClick={() => press(key)}>{isShift ? key : key.toLowerCase()}</button>)}
          </div>
        ))}
        <div className="keyboard-row">
          <button type="button" className={`key key-shift ${isShift ? 'active' : ''}`} onClick={() => setIsShift((current) => !current)}>Shift⇧</button>
          {rows[2].map((key) => <button type="button" key={key} className="key" onClick={() => press(key)}>{isShift ? key : key.toLowerCase()}</button>)}
          <button type="button" className="key key-backspace" onClick={() => press('BACKSPACE')}>⌫</button>
        </div>
        <div className="keyboard-row">
          <button type="button" className="key key-enter" onClick={onSubmit}>確定 (Enter)</button>
        </div>
      </div>
    </fieldset>
  );
}

export default ScienceFormulaKeyboard;
