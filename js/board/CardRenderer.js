import { STATS, STAT_KEYS, statValueLabel } from '../data/characters.js';

// ── 캐릭터 시트: 가로로 넓은 직사각형 ──
const CARD_W = 660, CARD_H = 340;

// ── 취향카드: 캐릭터 시트 가로의 1/3, 세로로 긴 직사각형 ──
const PREF_W = 220, PREF_H = 320;
const TOKEN_PX = 128;

/**
 * 캐릭터 카드 앞면 — 가로 넓은 직사각형
 * 좌측: 초상화 + 이름, 중간: 스탯4개(컴팩트), 우측: 세부특성5개(크게)
 */
export function renderCharacterCard(character, revealedStats = {}, showAllStats = false, revealedTraitIndices = [], highlightedTraitIndices = []) {
  const c = document.createElement('canvas');
  c.width = CARD_W; c.height = CARD_H;
  const ctx = c.getContext('2d');

  // 배경
  const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
  grad.addColorStop(0, '#1e2230'); grad.addColorStop(0.5, '#1a1e2c'); grad.addColorStop(1, '#16192a');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(0, 0, CARD_W, CARD_H, 18); ctx.fill();

  // 상단 장식 바
  const accentColor = character.gender === 'female' ? '#ec4899' : '#6366f1';
  ctx.fillStyle = accentColor + '80';
  ctx.fillRect(0, 0, CARD_W, 4);

  // 테두리
  ctx.strokeStyle = accentColor + '40';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(1, 1, CARD_W - 2, CARD_H - 2, 18); ctx.stroke();

  // ══ 좌측: 초상화 + 이름 (0~180) ══
  const leftW = 180;
  const cx2 = leftW / 2, cy2 = 105;
  ctx.beginPath(); ctx.arc(cx2, cy2, 48, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
  ctx.strokeStyle = accentColor + '30';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '56px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(character.portrait, cx2, cy2 + 2);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px Outfit, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(character.name, cx2, 190);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px Outfit, sans-serif';
  ctx.fillText(character.gender === 'female' ? '♀ 여성' : '♂ 남성', cx2, 210);

  // ══ 구분선 ══
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(leftW, 16); ctx.lineTo(leftW, CARD_H - 16); ctx.stroke();

  // ══ 중간: 스탯 4개 컴팩트 (180~400) ══
  const midX = leftW + 12;
  const midW = 208;
  let sy = 32;
  const statsToShow = showAllStats ? character.stats : revealedStats;
  STAT_KEYS.forEach(key => {
    const info = STATS[key];
    const isRevealed = showAllStats || (key in revealedStats);
    const value = isRevealed ? (statsToShow[key] ?? character.stats?.[key]) : null;

    ctx.fillStyle = isRevealed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
    ctx.beginPath(); ctx.roundRect(midX, sy - 8, midW, 30, 6); ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = isRevealed ? info.color : '#4a5568';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText(`${info.emoji} ${info.label}`, midX + 8, sy + 10);

    ctx.textAlign = 'right';
    if (isRevealed) {
      for (let i = 0; i < 2; i++) {
        const starX = midX + midW - 12 - (1 - i) * 18;
        ctx.fillStyle = i < value ? info.color : '#2a2a3a';
        ctx.font = '15px serif';
        ctx.fillText('★', starX, sy + 10);
      }
    } else {
      ctx.fillStyle = '#4a5568';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText('???', midX + midW - 12, sy + 10);
    }
    sy += 36;
  });

  // ══ 구분선 ══
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(leftW + midW + 16, 16); ctx.lineTo(leftW + midW + 16, CARD_H - 16); ctx.stroke();

  // ══ 우측: 세부특성 5개 (400~660) ══
  const rightX = leftW + midW + 24;
  const rightW = CARD_W - rightX - 16;
  const traits = character.traits || [];

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.fillText('세부특성', rightX, 28);

  const slotH = 44;
  const slotGap = 8;
  const slotY0 = 38;
  for (let i = 0; i < 5; i++) {
    const ty = slotY0 + i * (slotH + slotGap);
    const isRevealed = showAllStats || revealedTraitIndices.includes(i);
    const isHighlighted = highlightedTraitIndices.includes(i);
    const trait = traits[i];

    // 슬롯 배경
    if (isHighlighted) {
      ctx.fillStyle = 'rgba(96,165,250,0.2)';
    } else if (isRevealed) {
      ctx.fillStyle = 'rgba(96,165,250,0.12)';
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
    }
    ctx.beginPath(); ctx.roundRect(rightX, ty, rightW, slotH, 8); ctx.fill();

    // 테두리
    if (isHighlighted) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 8;
    } else if (isRevealed) {
      ctx.strokeStyle = 'rgba(96,165,250,0.4)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    ctx.beginPath(); ctx.roundRect(rightX, ty, rightW, slotH, 8); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (isRevealed && trait) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.fillText(trait, rightX + rightW / 2, ty + slotH / 2);
    } else if (isHighlighted) {
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('?', rightX + rightW / 2, ty + slotH / 2);
    } else {
      ctx.fillStyle = '#4a5568';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText('?', rightX + rightW / 2, ty + slotH / 2);
    }
  }

  // 하단 장식
  const botGrad = ctx.createLinearGradient(0, CARD_H - 16, CARD_W, CARD_H);
  botGrad.addColorStop(0, accentColor + '10'); botGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, CARD_H - 16, CARD_W, 16);

  return c;
}

/**
 * 카드 뒷면 — 가로 직사각형
 */
export function renderCardBack(gender) {
  const c = document.createElement('canvas');
  c.width = CARD_W; c.height = CARD_H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1a1028';
  ctx.beginPath(); ctx.roundRect(0, 0, CARD_W, CARD_H, 18); ctx.fill();

  // 대각선 패턴
  const color = gender === 'female' ? '#ec4899' : '#6366f1';
  ctx.strokeStyle = color + '18';
  ctx.lineWidth = 1;
  for (let i = -CARD_H; i < CARD_W + CARD_H; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - CARD_H, CARD_H); ctx.stroke();
  }

  // 중앙 로고
  ctx.font = '64px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color + '50';
  ctx.fillText('💘', CARD_W / 2, CARD_H / 2 - 16);

  ctx.fillStyle = color + '60';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillText('HEART POCKETS', CARD_W / 2, CARD_H / 2 + 24);

  // 외곽 프레임
  ctx.strokeStyle = color + '30';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(8, 8, CARD_W - 16, CARD_H - 16, 14); ctx.stroke();
  ctx.strokeStyle = color + '15';
  ctx.beginPath(); ctx.roundRect(14, 14, CARD_W - 28, CARD_H - 28, 10); ctx.stroke();

  return c;
}

/**
 * 취향카드 앞면 — 세로로 긴 직사각형
 */
export function renderPreferenceCard(card) {
  const c = document.createElement('canvas');
  c.width = PREF_W; c.height = PREF_H;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, PREF_H);
  grad.addColorStop(0, '#1e1040'); grad.addColorStop(1, '#2a1530');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(0, 0, PREF_W, PREF_H, 12); ctx.fill();

  // 상단 바
  ctx.fillStyle = '#a78bfa30';
  ctx.fillRect(0, 0, PREF_W, 4);

  ctx.strokeStyle = '#a78bfa30';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(1, 1, PREF_W - 2, PREF_H - 2, 12); ctx.stroke();

  // 이모지
  ctx.font = '36px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(card.emoji, PREF_W / 2, 40);

  // 이름
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px Outfit, sans-serif';
  ctx.fillText(card.name, PREF_W / 2, 72);

  // 설명 (줄바꿈)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px Outfit, sans-serif';
  const words = card.description.split(' ');
  let line = '', lineY = 100;
  words.forEach(w => {
    if (ctx.measureText(line + w).width > PREF_W - 30) {
      ctx.fillText(line, PREF_W / 2, lineY); line = w + ' '; lineY += 16;
    } else { line += w + ' '; }
  });
  if (line) ctx.fillText(line, PREF_W / 2, lineY);

  // 구분선
  lineY += 20;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(20, lineY); ctx.lineTo(PREF_W - 20, lineY); ctx.stroke();
  lineY += 18;

  // 좋아하는/싫어하는
  ctx.fillStyle = '#34d399'; ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('➕ 좋아하는', PREF_W / 2, lineY);
  lineY += 15;
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px Outfit, sans-serif';
  const likes = (card.likes || []).slice(0, 3).join(', ');
  ctx.fillText(likes, PREF_W / 2, lineY);

  lineY += 22;
  ctx.fillStyle = '#f87171'; ctx.font = 'bold 11px Outfit, sans-serif';
  ctx.fillText('➖ 싫어하는', PREF_W / 2, lineY);
  lineY += 15;
  ctx.fillStyle = '#94a3b8'; ctx.font = '11px Outfit, sans-serif';
  const dislikes = (card.dislikes || []).slice(0, 3).join(', ');
  ctx.fillText(dislikes, PREF_W / 2, lineY);

  // 하단 장식
  const botGrad = ctx.createLinearGradient(0, PREF_H - 30, 0, PREF_H);
  botGrad.addColorStop(0, '#a78bfa15'); botGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, PREF_H - 30, PREF_W, 30);

  return c;
}

/**
 * 취향카드 뒷면 — 세로로 긴 직사각형
 */
export function renderPreferenceCardBack() {
  const c = document.createElement('canvas');
  c.width = PREF_W; c.height = PREF_H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1a1028';
  ctx.beginPath(); ctx.roundRect(0, 0, PREF_W, PREF_H, 12); ctx.fill();

  ctx.strokeStyle = '#a78bfa20';
  ctx.lineWidth = 1;
  for (let i = -PREF_H; i < PREF_W + PREF_H; i += 12) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - PREF_H, PREF_H); ctx.stroke();
  }

  ctx.font = '42px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a78bfa40';
  ctx.fillText('🃏', PREF_W / 2, PREF_H / 2);

  ctx.strokeStyle = '#a78bfa20'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(4, 4, PREF_W - 8, PREF_H - 8, 8); ctx.stroke();

  return c;
}

/**
 * 특성 타일 앞면 — 직사각형 작은 카드
 */
const TRAIT_W = 140, TRAIT_H = 60;
export function renderTraitTile(traitName) {
  const c = document.createElement('canvas');
  c.width = TRAIT_W; c.height = TRAIT_H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.roundRect(0, 0, TRAIT_W, TRAIT_H, 8); ctx.fill();
  ctx.strokeStyle = '#60a5fa60';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(1, 1, TRAIT_W - 2, TRAIT_H - 2, 8); ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 16px Outfit, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(traitName, TRAIT_W / 2, TRAIT_H / 2);

  return c;
}

/**
 * 특성 타일 뒷면 — "?" 표시
 */
export function renderTraitTileBack() {
  const c = document.createElement('canvas');
  c.width = TRAIT_W; c.height = TRAIT_H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.roundRect(0, 0, TRAIT_W, TRAIT_H, 8); ctx.fill();
  ctx.strokeStyle = '#4b556340';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(1, 1, TRAIT_W - 2, TRAIT_H - 2, 8); ctx.stroke();

  // 대각선 패턴
  ctx.strokeStyle = '#4b556318';
  for (let i = -TRAIT_H; i < TRAIT_W + TRAIT_H; i += 10) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - TRAIT_H, TRAIT_H); ctx.stroke();
  }

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', TRAIT_W / 2, TRAIT_H / 2);

  return c;
}

/**
 * 어필 토큰
 */
export function renderAppealToken() {
  const c = document.createElement('canvas');
  c.width = TOKEN_PX; c.height = TOKEN_PX;
  const ctx = c.getContext('2d');
  ctx.beginPath(); ctx.arc(TOKEN_PX/2, TOKEN_PX/2, TOKEN_PX/2-2, 0, Math.PI*2);
  ctx.fillStyle = '#ec4899'; ctx.fill();
  ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '32px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💕', TOKEN_PX/2, TOKEN_PX/2);
  return c;
}

/**
 * 라운드 보드 (중앙 원판에 그릴 텍스처)
 */
export function renderRoundBoard(currentRound, rounds) {
  const SIZE = 512;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');

  // 원형 배경
  ctx.beginPath(); ctx.arc(SIZE/2, SIZE/2, SIZE/2 - 4, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(SIZE/2, SIZE/2, 0, SIZE/2, SIZE/2, SIZE/2);
  bg.addColorStop(0, '#2a2050'); bg.addColorStop(1, '#1a1530');
  ctx.fillStyle = bg; ctx.fill();

  // 외곽 링
  ctx.strokeStyle = '#ec489980'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(SIZE/2, SIZE/2, SIZE/2 - 10, 0, Math.PI * 2);
  ctx.strokeStyle = '#a78bfa40'; ctx.lineWidth = 1; ctx.stroke();

  // 타이틀
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ec4899';
  ctx.font = 'bold 28px Outfit, sans-serif';
  ctx.fillText('HEART POCKETS', SIZE/2, 60);

  // 라운드 트랙 (원형 배치)
  const trackR = 130;
  rounds.forEach((r, i) => {
    const angle = -Math.PI/2 + (i / rounds.length) * Math.PI * 2;
    const rx = SIZE/2 + Math.cos(angle) * trackR;
    const ry = SIZE/2 + Math.sin(angle) * trackR;
    const isActive = i === currentRound;
    const isPast = i < currentRound;

    // 라운드 원
    ctx.beginPath(); ctx.arc(rx, ry, 28, 0, Math.PI * 2);
    if (isActive) {
      ctx.fillStyle = '#ec4899'; ctx.fill();
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 3; ctx.stroke();
    } else if (isPast) {
      ctx.fillStyle = '#3a2060'; ctx.fill();
      ctx.strokeStyle = '#6b21a8'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.fillStyle = '#1e1540'; ctx.fill();
      ctx.strokeStyle = '#4a3570'; ctx.lineWidth = 1; ctx.stroke();
    }

    // 라운드 이모지
    ctx.font = '20px serif';
    ctx.fillStyle = isActive ? '#fff' : isPast ? '#a78bfa' : '#4a5568';
    ctx.fillText(r.emoji, rx, ry - 2);

    // 라운드 번호
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillStyle = isActive ? '#fff' : '#64748b';
    ctx.fillText(`R${r.number}`, rx, ry + 16);
  });

  // 중앙 표시
  if (rounds[currentRound]) {
    const r = rounds[currentRound];
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText(`${r.emoji} ${r.name}`, SIZE/2, SIZE/2 + 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText(`Round ${r.number} / ${rounds.length}`, SIZE/2, SIZE/2 + 32);
  }

  return c;
}

/**
 * 빈 슬롯 표시 (데이트 상대 자리) — 가로 직사각형
 */
export function renderEmptySlot(label) {
  const c = document.createElement('canvas');
  c.width = CARD_W; c.height = CARD_H;
  const ctx = c.getContext('2d');

  ctx.strokeStyle = '#ffffff15';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.roundRect(4, 4, CARD_W - 8, CARD_H - 8, 14); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ffffff08';
  ctx.beginPath(); ctx.roundRect(4, 4, CARD_W - 8, CARD_H - 8, 14); ctx.fill();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a5568';
  ctx.font = '14px Outfit, sans-serif';
  ctx.fillText(label || '데이트 상대', CARD_W / 2, CARD_H / 2);

  return c;
}
