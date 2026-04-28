/**
 * 취향카드 — 5단계 스탯 기반 시너지 시스템
 *
 * 카드 유형:
 *   linear   — 스탯 × 계수 (매 ★이 의미 있음)
 *   threshold — 특정 구간에서 점프
 *   combo    — 복수 스탯 조합
 *   synergy  — 스탯 + 특성 연계
 */
export const PREFERENCE_CARDS = [
  // ── 선형 스케일링 (Linear) ──
  {
    id: 'looks_fan',
    name: '외모지상주의',
    emoji: '💎',
    type: 'linear',
    description: '외모 ★ × 2점',
    cutline: 6,
    mainStatRule: (t) => (t.stats.looks || 0) * 2,
    likes: ['자기관리', '패션감각', '운동좋아함', '카리스마'],
    dislikes: ['집순이', '결벽증'],
  },
  {
    id: 'realist',
    name: '현실주의자',
    emoji: '💰',
    type: 'linear',
    description: '재력 ★ × 2점',
    cutline: 6,
    mainStatRule: (t) => (t.stats.wealth || 0) * 2,
    likes: ['계획적', '저축형', '고학력', '워커홀릭', '자기관리'],
    dislikes: ['즉흥적', '소비형', '무직', '자유분방함', '파티광'],
  },
  {
    id: 'personality_fan',
    name: '인성 최고',
    emoji: '😇',
    type: 'linear',
    description: '성격 ★ × 2점',
    cutline: 6,
    mainStatRule: (t) => (t.stats.personality || 0) * 2,
    likes: ['감성적', '순수함', '가정적', '편지좋아함'],
    dislikes: ['바람끼', '계산적', '도도함'],
  },
  {
    id: 'youth_lover',
    name: '젊음이 좋아',
    emoji: '🌱',
    type: 'linear',
    description: '나이 ★ × 2점',
    cutline: 6,
    mainStatRule: (t) => (t.stats.age || 0) * 2,
    likes: ['자유분방함', '즉흥적', '여행좋아함', '파티광', '감성적'],
    dislikes: ['결벽증', '계획적', '종교적', '완벽주의'],
  },

  // ── 구간 보너스 (Threshold) ──
  {
    id: 'romanticist',
    name: '로맨티스트',
    emoji: '🌹',
    type: 'threshold',
    description: '성격 ★4+: +6 / ★3: +2 / ★2↓: -2',
    cutline: 5,
    mainStatRule: (t) => {
      const v = t.stats.personality || 0;
      return v >= 4 ? 6 : v === 3 ? 2 : -2;
    },
    likes: ['감성적', '요리잘함', '편지좋아함', '순수함', '가정적'],
    dislikes: ['워커홀릭', '계산적', '무뚝뚝', '도도함', '바람끼'],
  },
  {
    id: 'older_lover',
    name: '어른이 좋아',
    emoji: '🍷',
    type: 'threshold',
    description: '나이 ★1: +8 / ★2: +4 / ★3+: 0',
    cutline: 5,
    mainStatRule: (t) => {
      const v = t.stats.age || 0;
      return v <= 1 ? 8 : v === 2 ? 4 : 0;
    },
    likes: ['카리스마', '고학력', '워커홀릭', '저축형', '요리잘함'],
    dislikes: ['백치미', '즉흥적', '파티광', '소비형'],
  },
  {
    id: 'bad_boy_girl',
    name: '나쁜남자/여자',
    emoji: '😈',
    type: 'threshold',
    description: '성격 ★1: +8 / ★2: +3 / ★3+: -1',
    cutline: 5,
    mainStatRule: (t) => {
      const v = t.stats.personality || 0;
      return v <= 1 ? 8 : v === 2 ? 3 : -1;
    },
    likes: ['자유분방함', '바람끼', '카리스마', '파티광', '술좋아함'],
    dislikes: ['순수함', '가정적', '종교적', '계획적', '완벽주의'],
  },
  {
    id: 'broke_is_ok',
    name: '돈보다 사랑',
    emoji: '💕',
    type: 'threshold',
    description: '재력 ★1: +8 / ★2: +4 / ★3+: 0',
    cutline: 5,
    mainStatRule: (t) => {
      const v = t.stats.wealth || 0;
      return v <= 1 ? 8 : v === 2 ? 4 : 0;
    },
    likes: ['감성적', '순수함', '가정적', '편지좋아함', '반려동물'],
    dislikes: ['계산적', '소비형', '도도함', '워커홀릭'],
  },
  {
    id: 'ugly_charm',
    name: '편한게 최고',
    emoji: '😊',
    type: 'threshold',
    description: '외모 ★1~2: +6 / ★3: +2 / ★4+: -2',
    cutline: 5,
    mainStatRule: (t) => {
      const v = t.stats.looks || 0;
      return v <= 2 ? 6 : v === 3 ? 2 : -2;
    },
    likes: ['순수함', '요리잘함', '가정적', '백치미'],
    dislikes: ['도도함', '패션감각', '자기관리', '카리스마'],
  },

  // ── 멀티스탯 콤보 (Combo) ──
  {
    id: 'perfectionist',
    name: '엄친아/엄친딸',
    emoji: '👑',
    type: 'combo',
    description: '외모+재력 합 ★8+: +8 / ★6+: +4 / 그외: 0',
    cutline: 7,
    mainStatRule: (t) => {
      const sum = (t.stats.looks || 0) + (t.stats.wealth || 0);
      return sum >= 8 ? 8 : sum >= 6 ? 4 : 0;
    },
    likes: ['결벽증', '고학력', '계산적', '자기관리', '계획적'],
    dislikes: ['백치미', '저학력', '자유분방함', '즉흥적', '무직'],
  },
  {
    id: 'gap_moe',
    name: '갭모에',
    emoji: '🎭',
    type: 'combo',
    description: '최고스탯-최저스탯 차이 × 2점',
    cutline: 5,
    mainStatRule: (t) => {
      const vals = Object.values(t.stats);
      return (Math.max(...vals) - Math.min(...vals)) * 2;
    },
    likes: ['카리스마', '백치미', '감성적', '자유분방함'],
    dislikes: ['계획적', '완벽주의', '결벽증'],
  },
  {
    id: 'balance',
    name: '밸런스형',
    emoji: '⚖️',
    type: 'combo',
    description: '4스탯 모두 ★2~4면 +7, 아니면 0',
    cutline: 6,
    mainStatRule: (t) => {
      const vals = Object.values(t.stats);
      return vals.every(v => v >= 2 && v <= 4) ? 7 : 0;
    },
    likes: ['계획적', '자기관리', '가정적', '저축형'],
    dislikes: ['즉흥적', '파티광', '바람끼'],
  },
  {
    id: 'diamond',
    name: '다이아몬드',
    emoji: '💠',
    type: 'combo',
    description: '★5 스탯 1개: +6, 2개+: +3',
    cutline: 5,
    mainStatRule: (t) => {
      const count = Object.values(t.stats).filter(v => v >= 5).length;
      return count === 1 ? 6 : count >= 2 ? 3 : 0;
    },
    likes: ['카리스마', '자기관리', '고학력'],
    dislikes: ['백치미', '무직'],
  },
  {
    id: 'family_person',
    name: '가정파',
    emoji: '🏡',
    type: 'combo',
    description: '성격+재력 합 ★7+: +7 / ★5+: +3 / 그외: 0',
    cutline: 6,
    mainStatRule: (t) => {
      const sum = (t.stats.personality || 0) + (t.stats.wealth || 0);
      return sum >= 7 ? 7 : sum >= 5 ? 3 : 0;
    },
    likes: ['가정적', '요리잘함', '자녀있음', '반려동물', '저축형'],
    dislikes: ['워커홀릭', '파티광', '해외이주계획', '바람끼', '자유분방함'],
  },

  // ── 특성 연계 시너지 (Synergy) ──
  {
    id: 'fitness_lover',
    name: '운동광',
    emoji: '💪',
    type: 'synergy',
    description: '외모 ★ × 1점 + \'운동좋아함\' 특성: +4',
    cutline: 5,
    mainStatRule: (t) => {
      let score = (t.stats.looks || 0) * 1;
      if (t.traits?.includes('운동좋아함')) score += 4;
      return score;
    },
    likes: ['운동좋아함', '자기관리', '패션감각'],
    dislikes: ['집순이', '술좋아함'],
  },
  {
    id: 'homebody_fan',
    name: '집순이 마니아',
    emoji: '🏠',
    type: 'synergy',
    description: '성격 ★3+일 때 \'집순이\' 특성: +7',
    cutline: 5,
    mainStatRule: (t) => {
      if ((t.stats.personality || 0) >= 3 && t.traits?.includes('집순이')) return 7;
      return (t.stats.personality || 0) >= 3 ? 2 : 0;
    },
    likes: ['집순이', '요리잘함', '반려동물', '감성적'],
    dislikes: ['파티광', '여행좋아함', '자유분방함'],
  },
  {
    id: 'free_spirit',
    name: '자유영혼',
    emoji: '🌊',
    type: 'synergy',
    description: '나이 ★4+: +4, \'여행좋아함\' 특성: +3',
    cutline: 5,
    mainStatRule: (t) => {
      let score = (t.stats.age || 0) >= 4 ? 4 : 0;
      if (t.traits?.includes('여행좋아함')) score += 3;
      return score;
    },
    likes: ['자유분방함', '즉흥적', '여행좋아함', '파티광', '감성적'],
    dislikes: ['결벽증', '계획적', '종교적', '완벽주의', '가정적'],
  },
  {
    id: 'caretaker',
    name: '모성애/부성애',
    emoji: '🤱',
    type: 'synergy',
    description: '★2이하 스탯 개수 × 2점 + \'순수함\': +3',
    cutline: 5,
    mainStatRule: (t) => {
      let score = Object.values(t.stats).filter(v => v <= 2).length * 2;
      if (t.traits?.includes('순수함')) score += 3;
      return score;
    },
    likes: ['백치미', '자녀있음', '순수함', '반려동물', '감성적'],
    dislikes: ['완벽주의', '도도함', '계산적', '카리스마', '워커홀릭'],
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
  { id: 'reversal', name: '반전매력', emoji: '🔥', description: '★2이하 스탯이 궁합+로 작용', points: 4,
    check: (p, n) => n && n.preferenceCards.some(c => c.mainStatRule(p) > 0 && Object.values(p.stats).some(v => v <= 2)) },
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
