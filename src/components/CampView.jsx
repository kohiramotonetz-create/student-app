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
  questionCount,
  fetchAndFilterWrongWords,
  showWrongList,
  setShowWrongList,
  wrongWordsList,
  canStartContent
}) {
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
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

  const toggleSelection = (value, selected, setSelected) => {
    setSelected(selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]);
  };

  if (step !== 'camp-menu' && step !== 'camp-qa-setup') return null;

  if (step === 'camp-menu') {
    return (
      <div className="menu-box">
        <h1>🏕️ 合宿</h1>
        <div className="button-grid">
          {CAMP_CONTENTS.filter(({ contentId }) => isContentAllowed(contentId)).map((content) => (
            <button key={content.contentId} className="nav-btn" onClick={() => {
              setSelectedGenre('');
              setSelectedGenres([]);
              setSelectedFields([]);
              setShowWrongList(false);
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
    ? data.filter((item) => item.subject === selectedGenre && selectedFields.includes(item.genre))
    : data.filter((item) => selectedGenres.includes(item.genre));
  const content = CAMP_CONTENTS.find(({ contentId }) => contentId === activeContentId);

  const startQuiz = (items, limit = questionCount) => {
    if (!canStartContent(activeContentId)) return;
    resetQuizState();
    setMode('en-ja');
    setSelectedBook({ name: content?.displayName || '', data: items, contentId: activeContentId });
    const shuffledItems = [...items].sort(() => 0.5 - Math.random());
    setQuizItems(limit === null ? shuffledItems : shuffledItems.slice(0, limit));
    setShowWrongList(false);
    setStep('quiz-main');
  };

  return (
    <div className="quiz-container">
      <h2>{content?.icon} {content?.displayName}</h2>
      <div className="config-group">
        {isSocial && (
          <>
            <label>歴史／地理:</label>
            <select value={selectedGenre} onChange={(event) => {
              setSelectedGenre(event.target.value);
              setSelectedFields([]);
            }}>
              <option value="">-- 選択してください --</option>
              {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </>
        )}
        {(!isSocial || selectedGenre) && (
          <>
            <label>{isSocial ? '分野:' : '問題ジャンル:'}</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button className="secondary" type="button" onClick={() => {
                if (isSocial) setSelectedFields(fields);
                else setSelectedGenres(genres);
              }}>全選択</button>
              <button className="secondary" type="button" onClick={() => {
                if (isSocial) setSelectedFields([]);
                else setSelectedGenres([]);
              }}>全解除</button>
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', padding: '6px', textAlign: 'left' }}>
              {(isSocial ? fields : genres).map((field) => {
                const selected = isSocial ? selectedFields : selectedGenres;
                const setSelected = isSocial ? setSelectedFields : setSelectedGenres;
                return (
                  <label key={field} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '9px 6px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(field)}
                      onChange={() => toggleSelection(field, selected, setSelected)}
                    />
                    <span>{field}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
        {target.length > 0 && <p>{target.length}問から最大{questionCount}問を出題します。</p>}
      </div>
      <button className="nav-btn" onClick={() => {
        if (target.length === 0) return alert('最低1件選択してください。');
        startQuiz(target);
      }}>スタート！</button>
      <button
        className="nav-btn"
        style={{ backgroundColor: '#dc3545' }}
        onClick={() => fetchAndFilterWrongWords(content?.logSheetName, data, {
          keepWrongHistory: true,
          contentId: activeContentId,
          emptyMessage: '現在、間違えた問題はありません。'
        })}
      >🔍 過去の間違えたものリストを表示</button>
      {showWrongList && wrongWordsList.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '2px solid #dc3545', paddingTop: '20px', textAlign: 'left' }}>
          <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>⚠️ 要復習リスト（{wrongWordsList.length}問）</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', background: '#fff', borderRadius: '6px', marginBottom: '15px' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr><th style={{ padding: '8px' }}>分野</th><th style={{ padding: '8px' }}>問題</th><th style={{ padding: '8px' }}>答え</th></tr>
              </thead>
              <tbody>
                {wrongWordsList.map((item, index) => (
                  <tr key={`${item.q}-${index}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px', color: '#666' }}>{item.rawItem.genre}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.q}</td>
                    <td style={{ padding: '8px' }}>{item.a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="nav-btn" style={{ backgroundColor: '#28a745', width: '100%' }} onClick={() => {
            startQuiz(wrongWordsList.map(({ rawItem }) => rawItem), null);
          }}>🔥 間違えた問題のみトライ！</button>
        </div>
      )}
      <button className="secondary" onClick={() => setStep('camp-menu')}>戻る</button>
    </div>
  );
}

export default CampView;
