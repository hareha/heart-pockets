/**
 * 라운드 이벤트 카드 (12종)
 * 매 라운드 시작 시 1장 뽑아 보드 중앙에 공개. 그 라운드 전체 적용.
 */
export const ROUND_EVENTS = [
  {
    id: 'rose_ceremony',
    name: '장미 세레모니',
    emoji: '🌹',
    description: '모든 플레이어 어필 토큰 +2',
    effect: { type: 'appeal_bonus', value: 2 },
  },
  {
    id: 'paparazzi',
    name: '파파라치',
    emoji: '🕵️',
    description: '이번 라운드 어필 행위 전원 공개 (누가 누구한테 넣었는지)',
    effect: { type: 'appeal_visible', value: true },
  },
  {
    id: 'gift_time',
    name: '선물 타임',
    emoji: '🎁',
    description: 'AP +1 추가 지급',
    effect: { type: 'ap_bonus', value: 1 },
  },
  {
    id: 'love_triangle',
    name: '삼각관계',
    emoji: '💔',
    description: '같은 NPC에 어필한 플레이어가 2명+면 어필 효과 1.5배',
    effect: { type: 'competition_bonus', value: 1.5 },
  },
  {
    id: 'live_broadcast',
    name: '생방송',
    emoji: '📺',
    description: '각 플레이어의 어필 토큰 보유량 공개',
    effect: { type: 'reveal_appeal_count', value: true },
  },
  {
    id: 'moonlight',
    name: '달빛 산책',
    emoji: '🌙',
    description: 'AP→어필 전환 비율 1:2로 상향',
    effect: { type: 'conversion_bonus', value: 2 },
  },
  {
    id: 'twist_of_fate',
    name: '운명의 장난',
    emoji: '🔀',
    description: '매칭 후 어필 토큰 1개 지불하면 상대 변경 가능',
    effect: { type: 'rematch', cost: 1 },
  },
  {
    id: 'masquerade',
    name: '가면무도회',
    emoji: '🎭',
    description: '이번 라운드 탐색 결과 비공개 (R1~R3에서도)',
    effect: { type: 'investigation_private', value: true },
  },
  {
    id: 'jackpot',
    name: '잭팟',
    emoji: '💰',
    description: '어필 토큰 가장 적게 가진 플레이어에게 +3',
    effect: { type: 'underdog_bonus', value: 3 },
  },
  {
    id: 'joker',
    name: '조커',
    emoji: '🃏',
    description: '탐색 1회 무료 (AP 소비 없음)',
    effect: { type: 'free_investigate', value: 1 },
  },
  {
    id: 'speed_date',
    name: '스피드 데이트',
    emoji: '⚡',
    description: 'AP -1, 어필 토큰 +1',
    effect: { type: 'trade_ap_appeal', ap: -1, appeal: 1 },
  },
  {
    id: 'rival_declaration',
    name: '라이벌 선언',
    emoji: '🔥',
    description: '어필 토큰 가장 많이 보유한 플레이어 공개',
    effect: { type: 'reveal_richest', value: true },
  },
];

/**
 * 장소 카드 (8종)
 * 각 데이트 시작 시 1장 뽑기. 해당 데이트에만 적용.
 */
export const LOCATION_CARDS = [
  {
    id: 'beach',
    name: '해변',
    emoji: '🏖️',
    description: '탐색 시 2개 동시 공개 (1AP에 2개)',
    effect: { type: 'double_investigate' },
  },
  {
    id: 'wine_bar',
    name: '와인바',
    emoji: '🍷',
    description: '이 데이트에서 어필 효과 2배',
    effect: { type: 'appeal_multiplier', value: 2 },
  },
  {
    id: 'amusement_park',
    name: '놀이공원',
    emoji: '🎢',
    description: '탐색 불가, 어필 토큰 +1 보너스',
    effect: { type: 'no_investigate_appeal_bonus', appeal: 1 },
  },
  {
    id: 'quiet_cafe',
    name: '조용한 카페',
    emoji: '☕',
    description: 'AP +1 (이 데이트에서만)',
    effect: { type: 'ap_bonus', value: 1 },
  },
  {
    id: 'worst_restaurant',
    name: '최악의 식당',
    emoji: '💀',
    description: '어필 불가, AP +2',
    effect: { type: 'no_appeal_ap_bonus', ap: 2 },
  },
  {
    id: 'home_date',
    name: '집 데이트',
    emoji: '🏠',
    description: '취향카드 1장 자동 공개 (AP 소비 없음)',
    effect: { type: 'free_card_reveal' },
  },
  {
    id: 'festival',
    name: '축제',
    emoji: '🎪',
    description: '데이트 상대가 아닌 다른 NPC 1명 탐색 가능',
    effect: { type: 'cross_investigate' },
  },
  {
    id: 'night_view',
    name: '야경 명소',
    emoji: '🌃',
    description: '어필 토큰 +2 보너스',
    effect: { type: 'appeal_bonus_location', value: 2 },
  },
];

/**
 * 데이팅 이벤트 카드 (12종)
 * 데이트 중 '이벤트' 선택 시 1장 랜덤 뽑기. 즉시 적용.
 */
export const DATE_EVENTS = [
  {
    id: 'sudden_rain',
    name: '갑작스러운 비',
    emoji: '🌧️',
    description: '비를 함께 피하며 가까워졌다! NPC 특성 1개 자동 공개.',
    effect: { type: 'free_trait_reveal' },
  },
  {
    id: 'matching_taste',
    name: '취향 적중',
    emoji: '🎯',
    description: '대화 중 취향이 맞는 부분을 발견! NPC 취향카드 1장 자동 공개.',
    effect: { type: 'free_card_reveal' },
  },
  {
    id: 'awkward_silence',
    name: '어색한 침묵',
    emoji: '😶',
    description: '대화가 끊겼다... 아무 일도 일어나지 않는다.',
    effect: { type: 'nothing' },
  },
  {
    id: 'photo_time',
    name: '사진 타임',
    emoji: '📸',
    description: '함께 사진을 찍으며 좋은 추억을 만들었다! 다음 탐색 시 2개 동시 공개.',
    effect: { type: 'next_double_reveal' },
  },
  {
    id: 'surprise_gift',
    name: '깜짝 선물',
    emoji: '🎁',
    description: 'NPC에게 선물을 받았다! 궁합 보너스 +2.',
    effect: { type: 'compat_bonus', value: 2 },
  },
  {
    id: 'rival_encounter',
    name: '라이벌 등장',
    emoji: '😠',
    description: '다른 사람이 끼어들었다! 이번 데이트 정보가 전원에게 공개된다.',
    effect: { type: 'force_share' },
  },
  {
    id: 'love_fortune',
    name: '사랑 점괘',
    emoji: '🔮',
    description: '점술사를 만났다! NPC의 커트라인이 살짝 공개된다.',
    effect: { type: 'reveal_cutline_hint' },
  },
  {
    id: 'food_disaster',
    name: '음식 사고',
    emoji: '🍝',
    description: '옷에 음식을 쏟았다! 민망하지만 웃으며 넘겼다. 아무 일 없음.',
    effect: { type: 'nothing' },
  },
  {
    id: 'secret_whisper',
    name: '비밀 고백',
    emoji: '🤫',
    description: 'NPC가 비밀을 털어놓았다! 특성 1개 비공개 공개 (나만 앎).',
    effect: { type: 'private_trait_reveal' },
  },
  {
    id: 'sunset_walk',
    name: '노을 산책',
    emoji: '🌅',
    description: '로맨틱한 산책! 궁합 보너스 +3.',
    effect: { type: 'compat_bonus', value: 3 },
  },
  {
    id: 'phone_ring',
    name: '전화벨',
    emoji: '📱',
    description: 'NPC에게 전화가 와서 데이트가 중단됐다. 이번 턴 즉시 종료.',
    effect: { type: 'skip_turn' },
  },
  {
    id: 'lucky_charm',
    name: '행운의 부적',
    emoji: '🍀',
    description: '길에서 네잎클로버를 발견! 다음 라운드 탐색 시 추가 1개 공개.',
    effect: { type: 'next_double_reveal' },
  },
];

/**
 * 이벤트/장소 카드 덱에서 뽑기
 */
export function drawCard(deck, usedIds = []) {
  const available = deck.filter(c => !usedIds.includes(c.id));
  if (available.length === 0) return deck[Math.floor(Math.random() * deck.length)]; // 리셔플
  return available[Math.floor(Math.random() * available.length)];
}
