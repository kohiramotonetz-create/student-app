import React from 'react';
import { CAMP_CONTENTS, CONTENT_IDS, HIGH_SCHOOL_CONTENTS, MAIN_MENU_CONTENTS } from '../constants/sukimakunContents';
import { APP_VERSION } from '../constants/version';

function MenuView({
  step,
  userName,
  openContent,
  isContentAllowed,
  setIsKobunMode,
  setIsFukisokuMode,
  setSelectedBook,
  kakitanData,
  handleLogout,
  permissionsInitialized
}) {
  if (step !== 'menu') return null;

  const visibleMainContents = MAIN_MENU_CONTENTS.filter(({ contentId }) => isContentAllowed(contentId));
  const hasHighSchoolContent = HIGH_SCHOOL_CONTENTS.some(({ contentId }) => isContentAllowed(contentId));
  const hasCampContent = CAMP_CONTENTS.some(({ contentId }) => isContentAllowed(contentId));
  const hasAnyContent = visibleMainContents.length > 0 || hasHighSchoolContent || hasCampContent;

  const handleMainContent = (content) => {
    if (!openContent(content.contentId, content.step)) return;

    setIsKobunMode(content.contentId === CONTENT_IDS.junior_kobun);
    setIsFukisokuMode(content.contentId === CONTENT_IDS.irregular_verbs);
    setSelectedBook(content.contentId === CONTENT_IDS.kakitan
      ? { name: '書き単', data: kakitanData, contentId: content.contentId }
      : { name: '', data: [], contentId: content.contentId });
  };

  return (
    <div className="menu-box" data-permissions-initialized={permissionsInitialized}>
      <h1>メニュー</h1>
      <p>ようこそ {userName} さん</p>

      {!hasAnyContent && (
        <div role="status" style={{ padding: '16px', margin: '16px 0', borderRadius: '8px', background: '#f8f9fa', color: '#555' }}>
          利用可能なコンテンツがありません。
        </div>
      )}

      <div className="button-grid">
        {visibleMainContents
          .filter(({ contentId }) => contentId !== CONTENT_IDS.kanji_test && contentId !== CONTENT_IDS.chemistry_formulas)
          .map((content) => (
            <button
              key={content.contentId}
              className="nav-btn"
              style={content.contentId === CONTENT_IDS.kakitan ? { backgroundColor: '#e67e22' } : undefined}
              onClick={() => handleMainContent(content)}
            >
              {content.icon} {content.displayName}
            </button>
          ))}

        {hasHighSchoolContent && (
          <button className="nav-btn" onClick={() => {
            setIsKobunMode(false);
            setIsFukisokuMode(false);
            setSelectedBook({ name: '', data: [], contentId: null });
            const firstAllowed = HIGH_SCHOOL_CONTENTS.find(({ contentId }) => isContentAllowed(contentId));
            if (firstAllowed) openContent(firstAllowed.contentId, 'highschool-menu');
          }}> 🎓 高校生モード</button>
        )}

        {hasCampContent && (
          <button className="nav-btn" style={{ backgroundColor: '#0f766e', color: '#fff' }} onClick={() => {
            setIsKobunMode(true);
            setIsFukisokuMode(false);
            setSelectedBook({ name: '', data: [], contentId: null });
            const firstAllowed = CAMP_CONTENTS.find(({ contentId }) => isContentAllowed(contentId));
            if (firstAllowed) openContent(firstAllowed.contentId, 'camp-menu');
          }}>🏕️ 合宿</button>
        )}

        {visibleMainContents
          .filter(({ contentId }) => contentId === CONTENT_IDS.kanji_test)
          .map((content) => (
            <button key={content.contentId} className="nav-btn" onClick={() => handleMainContent(content)}>
              {content.icon} {content.displayName}
            </button>
          ))}

        {visibleMainContents
          .filter(({ contentId }) => contentId === CONTENT_IDS.chemistry_formulas)
          .map((content) => (
            <button
              key={content.contentId}
              className="nav-btn"
              style={{ backgroundColor: '#4f46e5', color: '#fff' }}
              onClick={() => handleMainContent(content)}
            >
              {content.icon} {content.displayName}
            </button>
          ))}
      </div>
      <button className="secondary" onClick={handleLogout}>ログアウト</button>
      <span className="app-version">Version {APP_VERSION}</span>
    </div>
  );
}

export default MenuView;
