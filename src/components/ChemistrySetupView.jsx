import { useState, useMemo } from 'react';

function ChemistrySetupView({ step, setStep, chemistryData, resetQuizState, setQuizItems, QUESTION_COUNT }) {
  // 1. Hooks（useState, useMemo）は必ず最初の一等地にまとめて定義する（途中でreturnさせない）
  const [selectedGrade, setSelectedGrade] = useState('すべて');
  const [selectedType, setSelectedType] = useState('すべて');

  // 選択肢の動的抽出
  const grades = useMemo(() => {
    if (!chemistryData) return ['すべて'];
    return ['すべて', ...new Set(chemistryData.map(d => d.grade).filter(Boolean))];
  }, [chemistryData]);

  const types = useMemo(() => {
    if (!chemistryData) return ['すべて'];
    return ['すべて', ...new Set(chemistryData.map(d => d.type).filter(Boolean))];
  }, [chemistryData]);


  // 2. すべてのHooksが定義し終わった「ここ」でステップ判定をして遮断する
  if (step !== 'chemistry-setup') return null;


  // フィルター処理とクイズ開始ハンドラ
  const handleStartQuiz = () => {
    let filtered = [...chemistryData];

    if (selectedGrade !== 'すべて') {
      filtered = filtered.filter(d => d.grade === selectedGrade);
    }
    if (selectedType !== 'すべて') {
      filtered = filtered.filter(d => d.type === selectedType);
    }

    if (filtered.length === 0) {
      alert('該当する問題がありません。');
      return;
    }

    // ランダムシャッフルして制限数切り出し
    const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, QUESTION_COUNT);
    
    resetQuizState();
    setQuizItems(shuffled);
    setStep('chemistry-play');
  };

  return (
    <div className="setup-box">
      <h2>化学式・イオン式 テスト設定</h2>
      
      <div className="form-group">
        <label>学年指定:</label>
        <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
          {grades.map(g => <option key={g} value={g}>{g === 'すべて' ? 'すべての学年' : `中${g}`}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>出題範囲:</label>
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          {types.map(t => (
            <option key={t} value={t}>
              {t === 'すべて' ? 'すべて' : t === 'formula' ? '化学式' : t === 'ion' ? 'イオン式' : '元素記号'}
            </option>
          ))}
        </select>
      </div>

      <button className="btn-start" onClick={handleStartQuiz}>
        クイズ開始 ({QUESTION_COUNT}問)
      </button>
      <button className="btn-back" onClick={() => setStep('menu')}>メニューに戻る</button>
    </div>
  );
}

export default ChemistrySetupView;