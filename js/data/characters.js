/**
 * 캐릭터 카드 데이터 — 남4 여4 총 8장
 * 메인스탯은 게임 시작 시 플레이어가 4포인트를 배분
 * NPC는 올랜덤
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
export const TOTAL_STAT_POINTS = 4;

/**
 * 스탯값 → 표시 텍스트
 */
export function statValueLabel(key, value) {
  const map = {
    looks:       { 0: '못생김', 1: '평균', 2: '잘생김/예쁨' },
    wealth:      { 0: '없음', 1: '직장인', 2: '부자' },
    personality: { 0: '나쁨', 1: '보통', 2: '좋음' },
    age:         { 0: '40대+', 1: '30대', 2: '20대' },
  };
  return map[key]?.[value] ?? `${value}`;
}

/**
 * NPC용 랜덤 스탯 생성 (올랜덤, 0~2 각각 독립)
 */
export function generateRandomNPCStats() {
  const result = {};
  STAT_KEYS.forEach(k => {
    result[k] = Math.floor(Math.random() * 3); // 0, 1, 2
  });
  return result;
}
