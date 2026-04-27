/**
 * 취향카드 — 캐릭터의 연애관/이상형을 정의하는 카드
 * 스탯은 숫자 0(하), 1(중), 2(상)
 */
export const PREFERENCE_CARDS = [
  {
    id: 'perfectionist',
    name: '완벽주의자',
    emoji: '👑',
    description: '스탯 2(상) 1개당 +3점',
    mainStatRule: (t) => Object.values(t.stats).filter(v => v === 2).length * 3,
    likes: ['결벽증', '고학력', '계산적', '자기관리', '계획적'],
    dislikes: ['백치미', '저학력', '자유분방함', '즉흥적', '무직'],
  },
  {
    id: 'romanticist',
    name: '로맨티스트',
    emoji: '🌹',
    description: '성격 2이면 +5점',
    mainStatRule: (t) => t.stats.personality === 2 ? 5 : 0,
    likes: ['감성적', '요리잘함', '편지좋아함', '순수함', '가정적'],
    dislikes: ['워커홀릭', '계산적', '무뚝뚝', '도도함', '바람끼'],
  },
  {
    id: 'realist',
    name: '현실주의자',
    emoji: '💰',
    description: '재력 2이면 +5점',
    mainStatRule: (t) => t.stats.wealth === 2 ? 5 : 0,
    likes: ['계획적', '저축형', '고학력', '워커홀릭', '자기관리'],
    dislikes: ['즉흥적', '소비형', '무직', '자유분방함', '파티광'],
  },
  {
    id: 'free_spirit',
    name: '자유영혼',
    emoji: '🌊',
    description: '나이 2(젊음)이면 +5점',
    mainStatRule: (t) => t.stats.age === 2 ? 5 : 0,
    likes: ['자유분방함', '즉흥적', '여행좋아함', '파티광', '감성적'],
    dislikes: ['결벽증', '계획적', '종교적', '완벽주의', '가정적'],
  },
  {
    id: 'caretaker',
    name: '모성애/부성애',
    emoji: '🤱',
    description: '스탯 0(하) 1개당 +2점',
    mainStatRule: (t) => Object.values(t.stats).filter(v => v === 0).length * 2,
    likes: ['백치미', '자녀있음', '순수함', '반려동물', '감성적'],
    dislikes: ['완벽주의', '도도함', '계산적', '카리스마', '워커홀릭'],
  },
  {
    id: 'looks_first',
    name: '외모지상주의',
    emoji: '💎',
    description: '외모 2이면 +5점, 0이면 -3점',
    mainStatRule: (t) => t.stats.looks === 2 ? 5 : t.stats.looks === 0 ? -3 : 0,
    likes: ['자기관리', '패션감각', '운동좋아함', '카리스마'],
    dislikes: ['집순이', '결벽증'],
  },
  {
    id: 'family_person',
    name: '가정파',
    emoji: '🏡',
    description: '성격 1 이상이면 +3점',
    mainStatRule: (t) => t.stats.personality >= 1 ? 3 : 0,
    likes: ['가정적', '요리잘함', '자녀있음', '반려동물', '저축형'],
    dislikes: ['워커홀릭', '파티광', '해외이주계획', '바람끼', '자유분방함'],
  },
  {
    id: 'bad_boy_girl',
    name: '나쁜남자/여자 좋아',
    emoji: '😈',
    description: '성격 0이면 +5점',
    mainStatRule: (t) => t.stats.personality === 0 ? 5 : 0,
    likes: ['자유분방함', '바람끼', '카리스마', '파티광', '술좋아함'],
    dislikes: ['순수함', '가정적', '종교적', '계획적', '완벽주의'],
  },
  {
    id: 'older_lover',
    name: '어른이 좋아',
    emoji: '🍷',
    description: '나이 0(40대+)이면 +5점',
    mainStatRule: (t) => t.stats.age === 0 ? 5 : 0,
    likes: ['카리스마', '고학력', '워커홀릭', '저축형', '요리잘함'],
    dislikes: ['백치미', '즉흥적', '파티광', '소비형'],
  },
  {
    id: 'broke_is_ok',
    name: '돈보다 사랑',
    emoji: '💕',
    description: '재력 0이면 +5점',
    mainStatRule: (t) => t.stats.wealth === 0 ? 5 : 0,
    likes: ['감성적', '순수함', '가정적', '편지좋아함', '반려동물'],
    dislikes: ['계산적', '소비형', '도도함', '워커홀릭'],
  },
  {
    id: 'ugly_charm',
    name: '편한게 최고',
    emoji: '😊',
    description: '외모 0이면 +4점',
    mainStatRule: (t) => t.stats.looks === 0 ? 4 : 0,
    likes: ['순수함', '요리잘함', '가정적', '백치미'],
    dislikes: ['도도함', '패션감각', '자기관리', '카리스마'],
  },
];

/** 미션 카드 */
export const MISSION_CARDS = [
  { id: 'winner', name: '승부사', emoji: '🏆', description: '블라인드픽 2회 이상 승리', points: 5,
    check: (p) => p.blindPickWins >= 2 },
  { id: 'popular', name: '인싸', emoji: '🎭', description: '고독 정식 0회', points: 3,
    check: (p) => p.lonelySuppersCount === 0 },
  { id: 'observer', name: '관찰자', emoji: '🕵️', description: '비공개 취향카드 4장 이상 확인', points: 4,
    check: (p) => p.hiddenCardsRevealed >= 4 },
  { id: 'devoted', name: '일편단심', emoji: '💘', description: '한 NPC에게만 어필 전부 투자', points: 5,
    check: (p) => { const t = Object.keys(p.appealTokens).filter(k => p.appealTokens[k] > 0); return t.length === 1; } },
  { id: 'spread_love', name: '인기왕', emoji: '🌹', description: '3명+ NPC에 어필', points: 3,
    check: (p) => Object.keys(p.appealTokens).filter(k => p.appealTokens[k] > 0).length >= 3 },
  { id: 'reversal', name: '반전매력', emoji: '🔥', description: '스탯0이 궁합+로 작용', points: 4,
    check: (p, n) => n && n.preferenceCards.some(c => c.mainStatRule(p) > 0 && Object.values(p.stats).some(v => v === 0)) },
  { id: 'sniper', name: '정조준', emoji: '🎯', description: 'R5 후 대상 변경 → 커플 성사', points: 6,
    check: (p) => p.changedTargetAfterR5 && p.coupleFormed },
];

export function pickRandomCards(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function scoreWithCard(card, target) {
  let score = card.mainStatRule(target);
  for (const trait of card.likes) {
    if (target.traits?.includes(trait)) score += 1;
  }
  for (const trait of card.dislikes) {
    if (target.traits?.includes(trait)) score -= 1;
  }
  return score;
}

export function calculateCompatibility(cards, target) {
  return cards.reduce((total, card) => total + scoreWithCard(card, target), 0);
}
