import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Crown,
  FlaskConical,
  GraduationCap,
  History,
  Home,
  Languages,
  LockKeyhole,
  LogOut,
  NotebookText,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound
} from 'lucide-react';
import {
  CAMP_CONTENTS,
  CONTENT_IDS,
  HIGH_SCHOOL_CONTENTS,
  getJuniorHomeContentsBySubject
} from '../constants/sukimakunContents';
import { APP_VERSION } from '../constants/version';
import { getHomeDailyMissionModels } from '../constants/dailyMissions';

const SUBJECTS = [
  { key: 'english', label: '英語', description: '英単語・文法', icon: Languages, tone: 'blue' },
  { key: 'japanese', label: '国語', description: '古文・漢字', icon: BookOpen, tone: 'rose' },
  { key: 'science', label: '理科', description: '化学式・一問一答', icon: FlaskConical, tone: 'mint' },
  { key: 'social', label: '社会', description: '一問一答', icon: NotebookText, tone: 'orange' }
];

const NAV_ITEMS = [
  { label: 'ホーム', icon: Home, active: true },
  { label: '記録', icon: History },
  { label: 'ランキング', icon: Crown },
  { label: '設定', icon: Settings }
];

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
  const [selectedSubject, setSelectedSubject] = useState(null);
  if (step !== 'menu') return null;

  const contentsBySubject = getJuniorHomeContentsBySubject(isContentAllowed);
  const hasHighSchoolContent = HIGH_SCHOOL_CONTENTS.some(({ contentId }) => isContentAllowed(contentId));
  const hasCampContent = CAMP_CONTENTS.some(({ contentId }) => isContentAllowed(contentId));
  const visibleSubjects = SUBJECTS.filter(({ key }) => contentsBySubject[key].length > 0);
  const dailyMissions = getHomeDailyMissionModels({
    permissionsInitialized,
    isContentAllowed
  });
  const hasAnyContent = visibleSubjects.length > 0 || hasHighSchoolContent || hasCampContent;

  const handleMainContent = (content) => {
    if (!openContent(content.contentId, content.step)) return;

    setSelectedSubject(null);
    setIsKobunMode(content.contentId === CONTENT_IDS.junior_kobun);
    setIsFukisokuMode(content.contentId === CONTENT_IDS.irregular_verbs);
    setSelectedBook(content.contentId === CONTENT_IDS.kakitan
      ? { name: '書き単', data: kakitanData, contentId: content.contentId }
      : { name: '', data: [], contentId: content.contentId });
  };

  const openCampMenu = () => {
    const firstAllowed = CAMP_CONTENTS.find(({ contentId }) => isContentAllowed(contentId));
    if (!firstAllowed) return;
    setIsKobunMode(true);
    setIsFukisokuMode(false);
    setSelectedBook({ name: '', data: [], contentId: null });
    openContent(firstAllowed.contentId, 'camp-menu');
  };

  const openHighSchoolMenu = () => {
    const firstAllowed = HIGH_SCHOOL_CONTENTS.find(({ contentId }) => isContentAllowed(contentId));
    if (!firstAllowed) return;
    setIsKobunMode(false);
    setIsFukisokuMode(false);
    setSelectedBook({ name: '', data: [], contentId: null });
    openContent(firstAllowed.contentId, 'highschool-menu');
  };

  const selectedSubjectDefinition = SUBJECTS.find(({ key }) => key === selectedSubject);
  const selectedContents = selectedSubject ? contentsBySubject[selectedSubject] : [];
  return (
    <div className="student-home" data-permissions-initialized={permissionsInitialized}>
      <header className="student-home__header">
        <div className="student-home__welcome">
          <span className="student-home__mascot" aria-hidden="true"><GraduationCap /></span>
          <div>
            <p className="student-home__eyebrow">スキマ時間を、学びの時間に</p>
            <h1>こんにちは、{userName}さん！</h1>
            <p>今日も自分のペースで、一歩ずつ進めよう。</p>
          </div>
        </div>
        <div className="student-home__status" aria-label="学習ステータス">
          <button className="student-home__logout" type="button" onClick={handleLogout}><LogOut /><span>ログアウト</span></button>
        </div>
      </header>

      {selectedSubjectDefinition ? (
        <main className="student-home__subject-view">
          <button className="student-home__back" type="button" onClick={() => setSelectedSubject(null)}><ArrowLeft />ホームへ戻る</button>
          <section className="student-home__panel student-home__content-panel">
            <div className="student-home__section-heading">
              <span className={`student-home__section-number is-${selectedSubjectDefinition.tone}`}>{React.createElement(selectedSubjectDefinition.icon)}</span>
              <div><h2>{selectedSubjectDefinition.label}の教材</h2><p>利用できる教材から選んでください。</p></div>
            </div>
            <div className="student-home__content-list">
              {selectedContents.map((content) => (
                <button key={content.contentId} type="button" className="student-home__content-button" onClick={() => handleMainContent(content)}>
                  <span aria-hidden="true">{content.icon || '📘'}</span>
                  <span>{content.displayName}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="student-home__main">
          <section className="student-home__panel student-home__mission">
            <div className="student-home__section-heading">
              <span className="student-home__section-number">1</span>
              <div><h2>今日のミッション</h2><p>毎日の目標をクリアしよう！</p></div>
              <span className="student-home__ready"><LockKeyhole /> 進捗連携準備中</span>
            </div>
            {dailyMissions.length > 0 ? (
              <div className="student-home__mission-list">
                {dailyMissions.map((mission) => (
                  <article className="student-home__mission-card" key={mission.id}>
                    <span className="student-home__mission-icon" aria-hidden="true"><BookOpen /></span>
                    <div className="student-home__mission-copy">
                      <strong>{mission.label}を{mission.requiredCount}回行う</strong>
                      <p><span>対象:</span> {mission.targetLabels.join('・')}</p>
                    </div>
                    <div className="student-home__mission-progress" aria-label={`${mission.label}の進捗は準備中`}>
                      <small>進捗</small>
                      <b>-- / {mission.requiredCount}</b>
                      <span>準備中</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="student-home__empty-state" role="status"><ShieldCheck /><div><strong>現在利用できるミッションはありません</strong><p>利用できる教材が追加されると、ここに毎日の目標が表示されます。</p></div></div>
            )}
          </section>

          <section className="student-home__panel student-home__learning">
            <div className="student-home__section-heading">
              <span className="student-home__section-number">2</span>
              <div><h2>学習をはじめる</h2><p>科目を選んで、学習をスタートしよう！</p></div>
            </div>
            {!hasAnyContent && <div className="student-home__empty-state" role="status">利用可能なコンテンツがありません。</div>}
            <div className="student-home__subjects">
              {visibleSubjects.map(({ key, label, description, icon: Icon, tone }) => (
                <button key={key} type="button" className={`student-home__subject is-${tone}`} onClick={() => setSelectedSubject(key)}>
                  {React.createElement(Icon, { 'aria-hidden': true })}<strong>{label}</strong><span>{contentsBySubject[key].length}件のコンテンツ</span><small>{description}</small>
                </button>
              ))}
              {hasCampContent && <button type="button" className="student-home__subject is-special" onClick={openCampMenu}><Trophy aria-hidden="true" /><strong>特別モード</strong><span>合宿モードなど</span><small>特別な学習に挑戦</small></button>}
            </div>
            {hasHighSchoolContent && <button type="button" className="student-home__highschool" onClick={openHighSchoolMenu}><GraduationCap />高校生モードへ<ChevronRight /></button>}
          </section>

          <div className="student-home__lower-grid">
            <section className="student-home__panel student-home__future-card">
              <div className="student-home__section-heading"><span className="student-home__section-number">3</span><div><h2>キャラクター育成</h2><p>学習を続ける楽しみを増やします。</p></div></div>
              <div className="student-home__future-body student-home__character-preparing"><UserRound aria-hidden="true" /><div><strong>作成中・・・</strong><p>キャラクター育成機能を準備しています。<br />学習機能はこれまでどおり利用できます。</p></div></div>
            </section>
            <section className="student-home__panel student-home__future-card">
              <div className="student-home__section-heading"><span className="student-home__section-number">4</span><div><h2>最近の学習・復習</h2><p>学習記録を振り返るためのエリアです。</p></div></div>
              <div className="student-home__future-body"><History /><div><strong>横断集計機能は準備中</strong><p>教材ごとの復習機能は、これまでどおり各教材内で利用できます。</p></div></div>
            </section>
          </div>
        </main>
      )}

      {!selectedSubject && <nav className="student-home__glass-nav" aria-label="ホームナビゲーション">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <button key={label} type="button" className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} disabled={!active} aria-label={active ? label : `${label}（準備中）`}>{React.createElement(Icon)}<span>{label}</span></button>
        ))}
      </nav>}
      <span className="student-home__version">Version {APP_VERSION}</span>
    </div>
  );
}

export default MenuView;
