import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bed,
  BookOpen,
  ChevronRight,
  Crown,
  FlaskConical,
  Gift,
  GraduationCap,
  History,
  HeartPulse,
  Home,
  Languages,
  LockKeyhole,
  LogOut,
  Medal,
  NotebookText,
  Settings,
  ShieldCheck,
  Sparkles,
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
import {
  CHARACTER_MASTER,
  getCharacterDefinition,
  getCharacterStageDefinition
} from '../constants/characterMaster';
import { createLocalSelectionRequestId } from '../utils/localXpVerification';

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
  { label: 'キャラクター', icon: UserRound },
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
  permissionsInitialized,
  dailyMissionProgress,
  localPlayerProgress,
  localShopItems,
  isLocalCharacterVerification,
  onSelectLocalCharacter,
  onSetLocalCharacterXp,
  onAdvanceLocalStreak,
  onCompleteLocalCareLearning,
  onPurchaseLocalItem,
  onAddLocalShopPoints,
  onEquipLocalItem,
  onUnequipLocalSlot,
  onSelectLocalVisualBranch
}) {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [pendingCharacterSelection, setPendingCharacterSelection] = useState(null);
  const [showShop, setShowShop] = useState(false);

  if (step !== 'menu') return null;

  const contentsBySubject = getJuniorHomeContentsBySubject(isContentAllowed);
  const hasHighSchoolContent = HIGH_SCHOOL_CONTENTS.some(({ contentId }) => isContentAllowed(contentId));
  const hasCampContent = CAMP_CONTENTS.some(({ contentId }) => isContentAllowed(contentId));
  const visibleSubjects = SUBJECTS.filter(({ key }) => contentsBySubject[key].length > 0);
  const dailyMissions = getHomeDailyMissionModels({
    permissionsInitialized,
    isContentAllowed,
    progressByMissionId: dailyMissionProgress
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
  const activeCharacter = localPlayerProgress?.activeCharacter || null;
  const activeCharacterDefinition = getCharacterDefinition(activeCharacter?.characterType);
  const activeStageDefinition = getCharacterStageDefinition(activeCharacter?.characterType, activeCharacter?.stage);
  const nextEvolution = activeCharacterDefinition?.stages.find(({ minLevel }) => minLevel > activeCharacter.level) || null;
  const conditionLabels = {
    healthy: activeCharacter?.inactiveDays === 1 ? '未学習1日・変化なし' : '元気',
    faded: '色が少し薄くなっています',
    weak: '元気がありません',
    hospitalized: '入院中・ベッドで休んでいます',
    critical: '治療中・かなり弱っています',
    game_over: 'ゲームオーバー'
  };

  const chooseCharacter = (characterType) => {
    const requestId = createLocalSelectionRequestId();
    setPendingCharacterSelection({ characterType, requestId });
  };

  const confirmCharacter = () => {
    if (!pendingCharacterSelection || !onSelectLocalCharacter) return;
    const result = onSelectLocalCharacter(
      pendingCharacterSelection.characterType,
      pendingCharacterSelection.requestId
    );
    if (result?.created || result?.duplicate) {
      setPendingCharacterSelection(null);
      setShowCharacterSelection(false);
    }
  };

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
          {isLocalCharacterVerification ? <>
            <div className="student-home__status-card" data-local-streak="true"><Sparkles aria-hidden="true" /><span><small>連続学習</small>{localPlayerProgress?.currentStreak || 0}日</span></div>
            <div className="student-home__status-card" data-local-point-balance="true"><Medal aria-hidden="true" /><span><small>所持ポイント</small>{localPlayerProgress?.pointBalance || 0}pt</span></div>
          </> : <>
            <div className="student-home__status-card is-pending"><Sparkles aria-hidden="true" /><span><small>連続学習</small>集計準備中</span></div>
            <div className="student-home__status-card is-pending"><Medal aria-hidden="true" /><span><small>所持ポイント</small>機能準備中</span></div>
          </>}
          <button className="student-home__icon-button" type="button" disabled aria-label="通知（準備中）"><Bell /></button>
          <button className="student-home__logout" type="button" onClick={handleLogout}><LogOut /><span>ログアウト</span></button>
        </div>
      </header>

      {showShop && isLocalCharacterVerification ? (
        <main className="student-home__subject-view student-home__shop-view" data-local-shop="true">
          <button className="student-home__back" type="button" onClick={() => setShowShop(false)}><ArrowLeft />ホームへ戻る</button>
          <section className="student-home__panel student-home__content-panel">
            <div className="student-home__section-heading"><span className="student-home__section-number"><Gift /></span><div><h2>アイテムショップ</h2><p>所持ポイント: {localPlayerProgress?.pointBalance || 0}pt</p></div></div>
            <div className="student-home__shop-tools"><button type="button" onClick={() => onAddLocalShopPoints?.()}>確認用 +500pt</button></div>
            <div className="student-home__shop-grid">
              {(localShopItems || []).map((item) => (
                <article className="student-home__shop-item" key={item.itemId} data-shop-item={item.itemId}>
                  <small>{item.category} / {item.itemType === 'common' ? '共通' : item.itemType === 'evolution_limited' ? '進化限定' : 'キャラ専用'}</small>
                  <strong>{item.label}</strong>
                  <span>{item.price.toLocaleString()}pt</span>
                  {item.owned ? <><b>所有済み</b>{localPlayerProgress?.activeCharacter?.status === 'active' && <button type="button" onClick={() => onEquipLocalItem?.(item.itemId)}>装備する</button>}</> : <button type="button" disabled={!item.purchasable} onClick={() => onPurchaseLocalItem?.(item.itemId)}>
                    {item.reason === 'insufficient_points' ? 'ポイント不足' : item.reason === 'character_required' ? '育成中の対象キャラが必要' : item.reason === 'level_locked' ? `Lv${item.requiredLevel}で解放` : item.reason === 'evolution_expired' ? 'このキャラでは購入期間終了' : '購入する'}
                  </button>}
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : showCharacterSelection && isLocalCharacterVerification ? (
        <main className="student-home__subject-view student-home__character-view" data-local-character-selection="true">
          <button className="student-home__back" type="button" onClick={() => { setPendingCharacterSelection(null); setShowCharacterSelection(false); }}><ArrowLeft />ホームへ戻る</button>
          <section className="student-home__panel student-home__content-panel">
            <div className="student-home__section-heading">
              <span className="student-home__section-number"><Sparkles aria-hidden="true" /></span>
              <div><h2>育てるキャラクターを選ぼう</h2><p>性能はすべて同じです。好きな見た目を選んでください。</p></div>
            </div>
            <div className="student-home__character-grid">
              {CHARACTER_MASTER.map((character) => (
                <article className="student-home__character-option" key={character.characterType}>
                  <span className="student-home__character-placeholder" aria-hidden="true">{character.placeholder}</span>
                  <small>{character.themeLabel}</small>
                  <h3>{character.label}</h3>
                  <p>{character.description}</p>
                  <button type="button" onClick={() => chooseCharacter(character.characterType)}>このキャラを育てる</button>
                </article>
              ))}
            </div>
            {pendingCharacterSelection && (() => {
              const character = getCharacterDefinition(pendingCharacterSelection.characterType);
              return <div className="student-home__character-confirm" role="dialog" aria-modal="true" aria-label="キャラクター選択の確認">
                <strong>{character?.label}を育てますか？</strong>
                <p>育成開始後は、育成完了またはゲームオーバーまで変更できません。</p>
                <div><button type="button" className="secondary" onClick={() => setPendingCharacterSelection(null)}>戻る</button><button type="button" onClick={confirmCharacter}>{character?.label}を育てる</button></div>
              </div>;
            })()}
          </section>
        </main>
      ) : selectedSubjectDefinition ? (
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
              <span className="student-home__ready"><LockKeyhole /> {dailyMissions.some(({ progress }) => progress.status === 'ready') ? '本日の進捗' : '進捗連携準備中'}</span>
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
                    <div className="student-home__mission-progress" aria-label={mission.progress.status === 'ready' ? `${mission.label}の進捗は${mission.progress.completedCount}/${mission.requiredCount}` : `${mission.label}の進捗は準備中`}>
                      <small>進捗</small>
                      <b>{mission.progress.status === 'ready' ? mission.progress.completedCount : '--'} / {mission.requiredCount}</b>
                      <span>{mission.progress.status === 'ready' ? (mission.progress.achieved ? '達成！' : '学習中') : '準備中'}</span>
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
              <div className="student-home__section-heading"><span className="student-home__section-number">3</span><div><h2>育成・ごほうび</h2><p>学習を続ける楽しみを増やします。</p></div></div>
              {activeCharacter && activeCharacterDefinition ? (
                <div className={`student-home__character-summary is-${activeCharacter.condition || 'healthy'}`} data-local-xp-verification="true" data-character-condition={activeCharacter.condition || 'healthy'}>
                  <span className="student-home__character-placeholder" aria-hidden="true" data-background-item={activeCharacter.equipment?.background || ''}>
                    {activeCharacter.condition === 'hospitalized' ? <Bed /> : activeCharacter.condition === 'critical' ? <HeartPulse /> : activeCharacterDefinition.placeholder}
                    {Object.entries(activeCharacter.equipment || {}).filter(([, itemId]) => itemId).map(([slot, itemId]) => <i key={slot} className={`equipment-${slot}`} title={itemId}>{localShopItems?.find((item) => item.itemId === itemId)?.placeholder}</i>)}
                  </span>
                  <div className="student-home__character-copy">
                    <strong>{activeCharacterDefinition.label} Lv.{activeCharacter.level}</strong>
                    <span>{activeStageDefinition?.label} / Stage {activeCharacter.stage}</span>
                    {activeCharacter.visualBranch && <span>見た目分岐: {activeCharacter.visualBranch}</span>}
                    <span className="student-home__care-status">{conditionLabels[activeCharacter.condition] || '元気'}{activeCharacter.inactiveDays > 0 ? `（未学習${activeCharacter.inactiveDays}日）` : ''}</span>
                    <div className="student-home__xp-track" role="progressbar" aria-label="現在レベルのXP進捗" aria-valuemin="0" aria-valuemax="100" aria-valuenow={activeCharacter.progressPercent}><span style={{ width: `${activeCharacter.progressPercent}%` }} /></div>
                    <small>累計 {activeCharacter.totalXp} XP ・ 次のLvまで {activeCharacter.xpToNext} XP</small>
                    <small>{nextEvolution ? `次の進化まであと${nextEvolution.minLevel - activeCharacter.level}Lv` : 'Stage 6・最終進化'}</small>
                  </div>
                  {activeCharacter.status === 'game_over' && <div className="student-home__game-over" role="status"><strong>育成終了</strong><span>このキャラクターの育成は終了しました。</span><button type="button" disabled>次のキャラクター機能は準備中</button></div>}
                  {isLocalCharacterVerification && <div className="student-home__xp-tools" aria-label="ローカルXP・未学習状態確認操作">
                    <button type="button" onClick={() => setShowShop(true)}>ショップを見る</button>
                    {[1139, 1140, 3119, 3120, 5899, 5900, 9479, 9480, 13859, 13860].map((xp) => <button type="button" key={xp} onClick={() => onSetLocalCharacterXp?.(xp)}>{xp.toLocaleString()}XP</button>)}
                    <button type="button" onClick={() => onAdvanceLocalStreak?.(1, true)}>翌日を学習</button>
                    <button type="button" onClick={() => onAdvanceLocalStreak?.(1, false)}>1日休む</button>
                    <button type="button" onClick={() => onCompleteLocalCareLearning?.()}>今日1問学習</button>
                    <button type="button" onClick={() => { for (let i = 0; i < 30; i += 1) onAdvanceLocalStreak?.(1, true); }}>30日学習</button>
                  </div>}
                  {isLocalCharacterVerification && <div className="student-home__equipment-list"><strong>現在装備中</strong>{Object.entries(activeCharacter.equipment || {}).map(([slot, itemId]) => <span key={slot}>{slot}: {itemId || 'なし'} {itemId && <button type="button" onClick={() => onUnequipLocalSlot?.(slot)}>外す</button>}</span>)}</div>}
                  {isLocalCharacterVerification && activeCharacter.level >= 60 && !activeCharacter.visualBranch && localShopItems?.some((item) => item.itemId === `${activeCharacter.characterType}_evolution_60` && item.owned) && <div className="student-home__branch-tools"><strong>進化分岐</strong>{activeCharacterDefinition.visualBranches.map((branch) => <button type="button" key={branch} onClick={() => onSelectLocalVisualBranch?.(branch)}>{branch}</button>)}</div>}
                </div>
              ) : isLocalCharacterVerification ? (
                <div className="student-home__future-body" data-local-character-empty="true"><Gift /><div>
                  <strong>まだキャラクターがいません</strong>
                  <p>貯まっているXP: {localPlayerProgress?.pendingXp || 0} XP</p>
                  <button type="button" onClick={() => setShowCharacterSelection(true)}>キャラクターを選ぶ</button>
                  <button type="button" onClick={() => setShowShop(true)}>ショップを見る</button>
                </div></div>
              ) : (
                <div className="student-home__future-body"><Gift /><div><strong>キャラクター・ごほうび機能は準備中</strong><p>ポイントやレベルなどの実データはまだ表示していません。</p></div></div>
              )}
            </section>
            <section className="student-home__panel student-home__future-card">
              <div className="student-home__section-heading"><span className="student-home__section-number">4</span><div><h2>最近の学習・復習</h2><p>学習記録を振り返るためのエリアです。</p></div></div>
              <div className="student-home__future-body"><History /><div><strong>横断集計機能は準備中</strong><p>教材ごとの復習機能は、これまでどおり各教材内で利用できます。</p></div></div>
            </section>
          </div>
        </main>
      )}

      {!selectedSubject && !showCharacterSelection && <nav className="student-home__glass-nav" aria-label="ホームナビゲーション">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => <button key={label} type="button" className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} disabled={!active} aria-label={active ? label : `${label}（準備中）`}>{React.createElement(Icon)}<span>{label}</span></button>)}
      </nav>}
      <span className="student-home__version">Version {APP_VERSION}</span>
    </div>
  );
}

export default MenuView;
