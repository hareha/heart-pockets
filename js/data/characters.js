/**
 * 캐릭터 카드 데이터 — 남4 여4 총 8장
 * 메인스탯은 게임 시작 시 플레이어가 10포인트를 배분 (★1~5)
 * NPC는 올랜덤 (★1~5)
 */

export const CHARACTER_CARDS = {
  male: [
    { id: 'm1', name: '도윤', gender: 'male', portrait: '😎' },
    { id: 'm2', name: '시우', gender: 'male', portrait: '🤵' },
    { id: 'm3', name: '준혁', gender: 'male', portrait: '🧑‍💼' },
    { id: 'm4', name: '현우', gender: 'male', portrait: '🕺' },
  ],
  female: [
    { id: 'f1', name: '수아', gender: 'female', portrait: '👩‍🦰' },
    { id: 'f2', name: '하은', gender: 'female', portrait: '💃' },
    { id: 'f3', name: '지은', gender: 'female', portrait: '👩‍🎤' },
    { id: 'f4', name: '민서', gender: 'female', portrait: '🧑‍🎓' },
  ],
};

/**
 * 메인스탯 키 + 라벨
 */
export const STATS = {
  looks:       { key: 'looks',       label: '외모', emoji: '💎', color: '#f472b6' },
  wealth:      { key: 'wealth',      label: '재력', emoji: '💰', color: '#fbbf24' },
  personality: { key: 'personality', label: '성격', emoji: '💖', color: '#a78bfa' },
  age:         { key: 'age',         label: '나이', emoji: '🎂', color: '#34d399' },
};

export const STAT_KEYS = ['looks', 'wealth', 'personality', 'age'];
export const TOTAL_STAT_POINTS = 10;
export const STAT_MIN = 1;
export const STAT_MAX = 5;

/**
 * 스탯값 → 표시 텍스트 (★1~5)
 */
export function statValueLabel(key, value) {
  const map = {
    looks:       { 1: '매우 못생김', 2: '못생김', 3: '보통', 4: '잘생김', 5: '최상' },
    wealth:      { 1: '무직', 2: '알바', 3: '직장인', 4: '고소득', 5: '재벌' },
    personality: { 1: '최악', 2: '까칠', 3: '보통', 4: '좋음', 5: '천사' },
    age:         { 1: '50대', 2: '40대', 3: '30대', 4: '20후반', 5: '20초반' },
  };
  return map[key]?.[value] ?? `★${value}`;
}

/**
 * 스탯값 → ★ 문자열
 */
export function statStars(value) {
  return '★'.repeat(value) + '☆'.repeat(STAT_MAX - value);
}

/**
 * NPC용 랜덤 스탯 생성 (★1~5 각각 독립)
 */
export function generateRandomNPCStats() {
  const result = {};
  STAT_KEYS.forEach(k => {
    result[k] = Math.floor(Math.random() * STAT_MAX) + STAT_MIN; // 1~5
  });
  return result;
}
