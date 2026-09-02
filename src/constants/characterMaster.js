export const CHARACTER_STAGE_MIN_LEVELS = Object.freeze([1, 20, 40, 60, 80, 100]);

const createStages = (characterType, labels) => Object.freeze(labels.map((label, index) => Object.freeze({
  stage: index + 1,
  minLevel: CHARACTER_STAGE_MIN_LEVELS[index],
  label,
  assetKey: `${characterType}-stage${index + 1}`
})));

export const CHARACTER_MASTER = Object.freeze([
  Object.freeze({
    id: 'pudding', characterType: 'pudding', label: 'プリン', theme: 'food', themeLabel: '食べ物', placeholder: '🍮',
    description: 'シンプルなプリンから、豪華なスイーツへ成長します。',
    stages: createStages('pudding', [
      'シンプルなプリン', 'ホイップとさくらんぼ', 'フルーツプリン',
      'プリンサンデー', '豪華なプリンアラモード', 'スペシャルプリンアラモード'
    ]),
    visualBranches: Object.freeze(['fruit', 'chocolate', 'matcha'])
  }),
  Object.freeze({
    id: 'penguin', characterType: 'penguin', label: 'ペンギン', theme: 'animal', themeLabel: '動物', placeholder: '🐧',
    description: 'ひなから、堂々とした成鳥へ成長します。',
    stages: createStages('penguin', [
      'ひなペンギン', 'ちびペンギン', 'わかペンギン',
      'おとなペンギン', '特別感のあるペンギン', '堂々とした最終形態'
    ]),
    visualBranches: Object.freeze(['ice', 'sea', 'snow'])
  }),
  Object.freeze({
    id: 'sun', characterType: 'sun', label: '太陽', theme: 'weather', themeLabel: '天気', placeholder: '☀️',
    description: '小さな太陽から、光の精霊へ成長します。',
    stages: createStages('sun', [
      '小さな太陽', '光線が増えた太陽', 'きらめく太陽',
      '晴れの精', '光の精霊', '最終光精霊形態'
    ]),
    visualBranches: Object.freeze(['clear', 'sunrise', 'sunset'])
  })
]);

export const CHARACTER_TYPES = Object.freeze(CHARACTER_MASTER.map(({ characterType }) => characterType));

export const getCharacterDefinition = (characterType) =>
  CHARACTER_MASTER.find((character) => character.characterType === characterType) || null;

export const getCharacterStageDefinition = (characterType, stage) =>
  getCharacterDefinition(characterType)?.stages.find((definition) => definition.stage === stage) || null;
