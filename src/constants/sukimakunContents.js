export const SUKIMAKUN_CONTENTS = [
  { contentId: 'paper_english_test', displayName: '英単語テスト作成(紙)', step: 'test-setup', dataKey: 'allData', dataFile: 'wordlist.csv', logSheetName: null, type: 'paper-test', menuGroup: 'main', icon: '📝' },
  { contentId: 'junior_english_quiz', displayName: '1問ずつテスト(自習)', step: 'quiz-setup', dataKey: 'allData', dataFile: 'wordlist.csv', logSheetName: '1問ずつテスト(自習)', type: 'quiz', menuGroup: 'main', icon: '🚀' },
  { contentId: 'kakitan', displayName: '書き単', step: 'kakitan-setup', dataKey: 'kakitanData', dataFile: 'kakitan1000.csv', logSheetName: '書き単', type: 'quiz', menuGroup: 'main', icon: '✍️' },
  { contentId: 'irregular_verbs', displayName: '英単語（不規則変化）', step: 'fukisoku-setup', dataKey: 'fukisokuData', dataFile: 'wordlist-fukisoku.csv', logSheetName: '英単語(不規則変化)', type: 'quiz', menuGroup: 'main', icon: '🔄' },
  { contentId: 'junior_kobun', displayName: '古文単語（自習）', step: 'kobun-setup', dataKey: 'kobunData', dataFile: 'wordlist-junior_high_school-kobun.csv', logSheetName: '古文単語(自習)', type: 'quiz', menuGroup: 'main', icon: '📚' },
  { contentId: 'target_1900', displayName: 'ターゲット1900', step: 'highschool-setup', dataKey: 'targetData', dataFile: 'target1900.csv', logSheetName: 'ターゲット1900', type: 'quiz', menuGroup: 'highschool-english' },
  { contentId: 'target_1200', displayName: 'ターゲット1200', step: 'highschool-setup', dataKey: 'targetminiData', dataFile: 'target1200.csv', logSheetName: 'ターゲット1200', type: 'quiz', menuGroup: 'highschool-english' },
  { contentId: 'sokudoku_english', displayName: '速読英単語', step: 'highschool-setup', dataKey: 'sokudokuData', dataFile: 'sokudoku.csv', logSheetName: '速読英単語', type: 'quiz', menuGroup: 'highschool-english' },
  { contentId: 'dragon_english', displayName: 'ドラゴンイングリッシュ', step: 'highschool-setup', dataKey: 'dragonData', dataFile: 'dragon.csv', logSheetName: 'ドラゴンイングリッシュ', type: 'quiz', menuGroup: 'highschool-english' },
  { contentId: 'yumetan', displayName: 'ユメタン', step: 'highschool-setup', dataKey: 'yumetannData', dataFile: 'yumetann.csv', logSheetName: 'ユメタン', type: 'quiz', menuGroup: 'highschool-english' },
  { contentId: 'kikutan_pre2', displayName: 'キクタン準2級', step: 'highschool-setup', dataKey: 'kikutanData', dataFile: 'kikutan_j2.csv', logSheetName: 'キクタン準2級', type: 'quiz', menuGroup: 'highschool-english' },
  { contentId: 'kakushin_kobun_351', displayName: '核心古文単語351', step: 'highschool-setup', dataKey: 'kakushinData', dataFile: 'kakushin351.csv', logSheetName: '核心古文単語351', type: 'quiz', menuGroup: 'highschool-kobun' },
  { contentId: 'kobun_315', displayName: '古文単語315', step: 'highschool-setup', dataKey: 'kobun315Data', dataFile: 'kobunn315.csv', logSheetName: '古文単語315', type: 'quiz', menuGroup: 'highschool-kobun' },
  { contentId: 'iroha_nihoheto', displayName: 'いろはにほへと', step: 'highschool-setup', dataKey: 'irohaData', dataFile: 'iroha.csv', logSheetName: 'いろはにほへと', type: 'quiz', menuGroup: 'highschool-kobun' },
  { contentId: 'kobun_325', displayName: '古文325', step: 'highschool-setup', dataKey: 'kobun325Data', dataFile: 'kobun325.csv', logSheetName: '古文325', type: 'quiz', menuGroup: 'highschool-kobun' },
  { contentId: 'formula_600', displayName: 'FORMULA600', step: 'highschool-setup', dataKey: 'formulaData', dataFile: 'formula600.csv', logSheetName: 'FORMULA600', type: 'quiz', menuGroup: 'highschool-kobun' },
  { contentId: 'kougei_art', displayName: '高松工芸美術科', step: 'highschool-setup', dataKey: 'kougeiData', dataFile: 'kougei.csv', logSheetName: '高松工芸美術科', type: 'quiz', menuGroup: 'highschool-regular-exam', rangeType: 'unit' },
  { contentId: 'miki_bunri', displayName: '三木高校文理コース', step: 'highschool-setup', dataKey: 'mikiData', dataFile: 'miki_high_school.csv', logSheetName: '三木高校文理コース', type: 'quiz', menuGroup: 'highschool-regular-exam', rangeType: 'unit' },
  { contentId: 'takamatsu_higashi_humanities', displayName: '高松東高校２年人文コース', step: 'highschool-setup', dataKey: 'higasiData', dataFile: 'takamatsu-higasi.csv', logSheetName: '高松東高校２年人文コース', type: 'quiz', menuGroup: 'highschool-regular-exam', rangeType: 'unit' },
  { contentId: 'kanji_test', displayName: '定期テスト 漢字対策！　←NEW!!', step: 'kanji-setup', dataKey: 'kanjiList', dataFile: 'kanjilist.csv', logSheetName: '漢字テスト', type: 'handwriting-quiz', menuGroup: 'main', icon: '🖋' },
  { contentId: 'chemistry_formulas', displayName: '化学式・イオン式', step: 'chemistry-setup', dataKey: 'chemistryData', dataFile: 'chemistry.csv', logSheetName: '化学式・イオン式テスト', type: 'quiz', menuGroup: 'main', icon: '🧪' },
];

export const CONTENT_IDS = Object.freeze(
  Object.fromEntries(SUKIMAKUN_CONTENTS.map(({ contentId }) => [contentId, contentId]))
);

export const ALL_CONTENT_IDS = Object.freeze(SUKIMAKUN_CONTENTS.map(({ contentId }) => contentId));

export const MAIN_MENU_CONTENTS = SUKIMAKUN_CONTENTS.filter(({ menuGroup }) => menuGroup === 'main');

export const HIGH_SCHOOL_CONTENTS = SUKIMAKUN_CONTENTS.filter(({ menuGroup }) => menuGroup.startsWith('highschool-'));

export const getContentDefinition = (contentId) =>
  SUKIMAKUN_CONTENTS.find((content) => content.contentId === contentId);
