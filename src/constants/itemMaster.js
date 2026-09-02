export const EQUIPMENT_SLOTS = Object.freeze(['head', 'face', 'neck', 'body', 'handheld', 'background', 'effect']);
const PLACEHOLDERS = Object.freeze({ head: '🎓', face: '👓', neck: '🧣', body: '🧥', handheld: '📘', background: '🖼️', effect: '✨' });
const item = (itemId, label, category, price, sortOrder, options = {}) => Object.freeze({
  itemId, label, description: options.description || '', category, slot: category,
  itemType: options.itemType || (options.characterType ? 'character_specific' : 'common'),
  characterTypes: Object.freeze(options.characterType ? [options.characterType] : []), ownershipScope: options.ownershipScope || 'player',
  requiredLevel: options.requiredLevel ?? null, evolutionLevel: options.evolutionLevel ?? null, nextEvolutionLevel: options.nextEvolutionLevel ?? null,
  price, assetKey: `item-${itemId.replaceAll('_', '-')}`, placeholder: options.placeholder || PLACEHOLDERS[category],
  enabled: true, sortOrder, availableFrom: null, availableUntil: null
});
const evolutionItem = (characterType, level, label, category, price, sortOrder) => item(`${characterType}_evolution_${level}`, label, category, price, sortOrder, {
  characterType, itemType: 'evolution_limited', ownershipScope: 'character_instance', requiredLevel: level,
  evolutionLevel: level, nextEvolutionLevel: level === 100 ? null : level + 20
});
export const ITEM_MASTER = Object.freeze([
  item('round_glasses', '丸メガネ', 'face', 100, 10), item('sunglasses', 'サングラス', 'face', 120, 20),
  item('knit_hat', 'ニット帽', 'head', 200, 30), item('cap', 'キャップ', 'head', 220, 40), item('graduation_cap', '学士帽', 'head', 250, 50), item('small_crown', '小さな王冠', 'head', 350, 60),
  item('scarf', 'マフラー', 'neck', 200, 70), item('necktie', 'ネクタイ', 'neck', 220, 80), item('bow_tie', '蝶ネクタイ', 'neck', 220, 90), item('cape', 'マント', 'body', 400, 100),
  item('pencil', 'えんぴつ', 'handheld', 100, 110), item('book', '本', 'handheld', 150, 120), item('small_flag', '小さな旗', 'handheld', 180, 130), item('star_wand', '星のステッキ', 'handheld', 350, 140),
  item('sparkles', 'キラキラ', 'effect', 500, 150), item('heart_effect', 'ハートエフェクト', 'effect', 550, 160), item('rainbow_effect', '虹エフェクト', 'effect', 700, 170),
  item('classroom_background', '教室背景', 'background', 1000, 180), item('blue_sky_background', '青空背景', 'background', 1200, 190), item('starry_sky_background', '星空背景', 'background', 1500, 200),
  item('silver_spoon', '銀のスプーン', 'handheld', 50, 210, { characterType: 'pudding' }), item('gold_spoon', '金のスプーン', 'handheld', 150, 220, { characterType: 'pudding' }),
  item('special_plate', '特別なお皿', 'background', 300, 230, { characterType: 'pudding' }), item('fish', 'おさかな', 'handheld', 80, 240, { characterType: 'penguin' }),
  item('ice_necklace', '氷の首飾り', 'neck', 180, 250, { characterType: 'penguin' }), item('fish_bag', '魚バッグ', 'body', 250, 260, { characterType: 'penguin' }),
  item('small_cloud', 'ちいさな雲', 'effect', 100, 270, { characterType: 'sun' }), item('light_ring', '光のリング', 'effect', 250, 280, { characterType: 'sun' }), item('star_ornament', '星の飾り', 'head', 300, 290, { characterType: 'sun' }),
  evolutionItem('pudding', 20, 'プリン色カスタム', 'effect', 250, 310), evolutionItem('pudding', 40, 'プリン専用アクセサリー', 'head', 350, 320), evolutionItem('pudding', 60, 'プリン進化分岐', 'effect', 600, 330), evolutionItem('pudding', 80, 'プリン特別エフェクト', 'effect', 800, 340), evolutionItem('pudding', 100, 'プリン最終カスタム', 'background', 1200, 350),
  evolutionItem('penguin', 20, 'ペンギン色カスタム', 'effect', 250, 410), evolutionItem('penguin', 40, 'ペンギン専用アクセサリー', 'head', 350, 420), evolutionItem('penguin', 60, 'ペンギン進化分岐', 'effect', 600, 430), evolutionItem('penguin', 80, 'ペンギン特別エフェクト', 'effect', 800, 440), evolutionItem('penguin', 100, 'ペンギン最終カスタム', 'background', 1200, 450),
  evolutionItem('sun', 20, '太陽色カスタム', 'effect', 250, 510), evolutionItem('sun', 40, '太陽専用アクセサリー', 'head', 350, 520), evolutionItem('sun', 60, '太陽進化分岐', 'effect', 600, 530), evolutionItem('sun', 80, '太陽特別エフェクト', 'effect', 800, 540), evolutionItem('sun', 100, '太陽最終カスタム', 'background', 1200, 550)
]);
export const getItemDefinition = (itemId) => ITEM_MASTER.find((entry) => entry.itemId === itemId) || null;
export const createEmptyEquipment = () => Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
