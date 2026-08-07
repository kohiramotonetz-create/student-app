import React, { useMemo, useState } from 'react';
import { CAMP_CONTENTS, CONTENT_IDS } from '../constants/sukimakunContents';

function CampView({
  step,
  setStep,
  activeContentId,
  openContent,
  isContentAllowed,
  campScienceData,
  campSocialData,
  resetQuizState,
  setQuizItems,
  setSelectedBook,
  setMode,
  questionCount
}) {
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const data = activeContentId === CONTENT_IDS.camp_science_qa ? campScienceData : campSocialData;
  const isSocial = activeContentId === CONTENT_IDS.camp_social_qa;
  const genres = useMemo(
    () => [...new Set(data.map((item) => isSocial ? item.subject : item.genre))].filter(Boolean),
    [data, isSocial]
  );
  const fields = useMemo(
    () => isSocial && selectedGenre
      ? [...new Set(data.filter((item) => item.subject === selectedGenre).map((item) => item.genre))].filter(Boolean)
      : [],
    [data, isSocial, selectedGenre]
  );

  if (step !== 'camp-menu' && step !== 'camp-qa-setup') return null;

  if (step === 'camp-menu') {
    return (
      <div className="menu-box">
        <h1>🏕️ 合宿</h1>
        <div className="button-grid">
          {CAMP_CONTENTS.filter(({ contentId }) => isContentAllowed(contentId)).map((content) => (
            <button key={content.contentId} className="nav-btn" onClick={() => {
              setSelectedGenre('');
              setSelectedField('');
              openContent(content.contentId, content.step);
            }}>
              {content.icon} {content.displayName}
            </button>
          ))}
        </div>
        <button className="secondary" onClick={() => setStep('menu')}>戻る</button>
      </div>
    );
  }

  const target = isSocial
    ? data.filter((item) => item.subject === selectedGenre && item.genre === selectedField)
    : data.filter((item) => item.genre === selectedGenre);
  const content = CAMP_CONTENTS.find(({ contentId }) => contentId === activeContentId);

  return (
    <div className="quiz-container">
      <h2>{content?.icon} {content?.displayName}</h2>
      <div className="config-group">
        <label>{isSocial ? '歴史／地理:' : '問題ジャンル:'}</label>
        <select value={selectedGenre} onChange={(event) => {
          setSelectedGenre(event.target.value);
          setSelectedField('');
        }}>
          <option value="">-- 選択してください --</option>
          {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
        </select>
        {isSocial && selectedGenre && (
          <>
            <label>分野:</label>
            <select value={selectedField} onChange={(event) => setSelectedField(event.target.value)}>
              <option value="">-- 選択してください --</option>
              {fields.map((field) => <option key={field} value={field}>{field}</option>)}
            </select>
          </>
        )}
        {target.length > 0 && <p>{target.length}問から最大{questionCount}問を出題します。</p>}
      </div>
      <button className="nav-btn" disabled={target.length === 0} onClick={() => {
        resetQuizState();
        setMode('en-ja');
        setSelectedBook({ name: content?.displayName || '', data: target, contentId: activeContentId });
        setQuizItems([...target].sort(() => 0.5 - Math.random()).slice(0, questionCount));
        setStep('quiz-main');
      }}>スタート！</button>
      <button className="secondary" onClick={() => setStep('camp-menu')}>戻る</button>
    </div>
  );
}

export default CampView;
