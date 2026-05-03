import { GameManager, GameState } from './game/GameManager.js';
import { BoardScene } from './board/BoardScene.js';
import { CHARACTER_CARDS, STATS, STAT_KEYS, TOTAL_STAT_POINTS, STAT_MIN, STAT_MAX, statValueLabel, statStars } from './data/characters.js';
import { PREFERENCE_CARDS, pickRandomCards } from './data/cards.js';
import { pickRandomTraits } from './data/traits.js';

const canvas = document.getElementById('board-canvas');
const gm = new GameManager();
let board = null;
let selectedMode = 'solo', selectedGender = 'female';
let setupIndex = 0, playerConfigs = [], assignedCardIds = [];
let currentSetupStats = {}, currentSetupTraits = [], currentSetupCards = [];

// ===== HELPERS =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add('active');
  // game 화면일 때만 fixed HUD/Panel 보이기
  const hud = document.getElementById('game-hud');
  const panel = document.getElementById('game-panel');
  if (name === 'game') {
    if (hud) hud.style.display = 'flex';
    if (panel) panel.style.display = 'block';
  } else {
    if (hud) hud.style.display = 'none';
    if (panel) panel.style.display = 'none';
  }
}
function $(id) { return document.getElementById(id); }
function panel() { return $('panel-content'); }
function showModal(html) { const m = $('modal-overlay'); $('modal-content').innerHTML = html; m.style.display = 'flex'; }
function hideModal() { $('modal-overlay').style.display = 'none'; }

function showToast(msg, duration = 2000) {
  let t = document.getElementById('toast-el');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-el';
    t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:999;' +
      'background:rgba(20,10,40,0.85);border:1px solid rgba(168,139,250,0.4);border-radius:12px;' +
      'padding:10px 24px;color:#f8fafc;font-size:14px;font-weight:600;pointer-events:none;' +
      'backdrop-filter:blur(8px);transition:opacity 0.3s ease;white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._tid);
  t._tid = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

function renderPanel(title, desc, actionsHtml) {
  panel().innerHTML = `
    <div class="panel-title text-pink">${title}</div>
    ${desc ? `<div class="panel-desc">${desc}</div>` : ''}
    <div class="panel-actions">${actionsHtml}</div>`;
}

// ===== LOBBY =====
function setupToggle(btnA, btnB, cb) {
  $(btnA).onclick = () => { $(btnA).classList.add('selected'); $(btnB).classList.remove('selected'); cb(true); };
  $(btnB).onclick = () => { $(btnB).classList.add('selected'); $(btnA).classList.remove('selected'); cb(false); };
}
setupToggle('btn-mode-solo', 'btn-mode-multi', v => { selectedMode = v ? 'solo' : 'multi'; });
setupToggle('btn-gender-f', 'btn-gender-m', v => { selectedGender = v ? 'female' : 'male'; });

// 솔로 모드용 랜덤 스탯 배분 (10포인트를 4스탯에 분배, 각 ★1~5)
function randomAllocateStats() {
  const stats = { looks: STAT_MIN, wealth: STAT_MIN, personality: STAT_MIN, age: STAT_MIN };
  const keys = Object.keys(stats);
  let remaining = TOTAL_STAT_POINTS - keys.length * STAT_MIN; // 10 - 4 = 6
  while (remaining > 0) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (stats[k] < STAT_MAX) { stats[k]++; remaining--; }
  }
  return stats;
}

$('btn-start').onclick = () => {
  setupIndex = 0; playerConfigs = []; assignedCardIds = [];
  const pg = selectedGender === 'female' ? 'male' : 'female';
  const pool = [...CHARACTER_CARDS[pg]].sort(() => Math.random() - 0.5);
  assignedCardIds = pool.slice(0, 4).map(c => c.id);

  if (selectedMode === 'solo') {
    // 솔로 모드: 4명 전부 자동 랜덤 배분 → 바로 게임 시작
    for (let i = 0; i < 4; i++) {
      playerConfigs.push({
        cardId: assignedCardIds[i],
        stats: randomAllocateStats(),
        traits: pickRandomTraits(5),
        preferenceCards: pickRandomCards(PREFERENCE_CARDS, 3),
      });
    }
    gm.initGame(selectedMode, selectedGender, playerConfigs);
  } else {
    showStatAllocation(0);
  }
};

// ===== STAT ALLOCATION =====
function showStatAllocation(idx) {
  setupIndex = idx;
  const pg = selectedGender === 'female' ? 'male' : 'female';
  const card = CHARACTER_CARDS[pg].find(c => c.id === assignedCardIds[idx]);
  currentSetupStats = { looks: STAT_MIN, wealth: STAT_MIN, personality: STAT_MIN, age: STAT_MIN };
  currentSetupTraits = pickRandomTraits(5);
  currentSetupCards = pickRandomCards(PREFERENCE_CARDS, 3);

  $('setup-player-name').textContent = `Player ${idx + 1}`;
  $('setup-portrait').innerHTML = `<div style="font-size:3.5rem;">${card.portrait}</div><div style="font-size:var(--text-xl);font-weight:700;margin-top:4px;">${card.name}</div>`;
  renderStatSliders();
  renderTraitsAndCards();
  showScreen('setup');
}

function renderStatSliders() {
  const spent = Object.values(currentSetupStats).reduce((a, b) => a + b, 0);
  const rem = TOTAL_STAT_POINTS - spent;
  $('setup-remaining').textContent = rem;
  const btn = $('btn-setup-confirm');
  btn.disabled = rem !== 0;
  btn.textContent = rem === 0 ? '✓ 확정' : `포인트를 전부 배분하세요 (${rem}남음)`;

  $('setup-stats').innerHTML = STAT_KEYS.map(key => {
    const info = STATS[key]; const val = currentSetupStats[key];
    const stars = Array.from({length: STAT_MAX}, (_, i) => `<span style="font-size:1.2rem;color:${i < val ? info.color : '#333'};">★</span>`).join('');
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
      <span style="width:80px;color:${info.color};font-weight:600;font-size:var(--text-sm);">${info.emoji} ${info.label}</span>
      <button class="btn btn-secondary stat-btn" data-key="${key}" data-dir="-1" style="width:32px;height:32px;padding:0;font-size:18px;" ${val <= STAT_MIN ? 'disabled' : ''}>−</button>
      <span style="min-width:80px;text-align:center;">${stars}</span>
      <button class="btn btn-secondary stat-btn" data-key="${key}" data-dir="1" style="width:32px;height:32px;padding:0;font-size:18px;" ${val >= STAT_MAX || rem <= 0 ? 'disabled' : ''}>+</button>
      <span class="text-muted" style="font-size:var(--text-xs);min-width:70px;">${statValueLabel(key, val)}</span>
    </div>`;
  }).join('');

  $('setup-stats').querySelectorAll('.stat-btn').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.key, d = parseInt(b.dataset.dir);
      const nv = currentSetupStats[k] + d, ns = spent + d;
      if (nv >= STAT_MIN && nv <= STAT_MAX && ns <= TOTAL_STAT_POINTS) { currentSetupStats[k] = nv; renderStatSliders(); }
    };
  });
}

function renderTraitsAndCards() {
  $('setup-traits').innerHTML = currentSetupTraits.map(t => `<span class="trait-tag revealed">${t}</span>`).join('');
  $('setup-pref-cards').innerHTML = currentSetupCards.map(c => `
    <div class="pref-card" style="margin-top:4px;padding:8px;">
      <div class="card-name" style="font-size:var(--text-sm);">${c.emoji} ${c.name}</div>
      <div class="card-desc" style="font-size:var(--text-xs);">${c.description}</div>
      <div class="card-likes" style="font-size:0.65rem;">➕ ${c.likes.slice(0, 3).join(', ')}</div>
      <div class="card-dislikes" style="font-size:0.65rem;">➖ ${c.dislikes.slice(0, 3).join(', ')}</div>
    </div>`).join('');
}

$('btn-setup-confirm').onclick = () => {
  playerConfigs.push({ cardId: assignedCardIds[setupIndex], stats: { ...currentSetupStats }, traits: [...currentSetupTraits], preferenceCards: [...currentSetupCards] });
  if (setupIndex + 1 < 4) {
    if (selectedMode === 'solo') { showStatAllocation(setupIndex + 1); }
    else {
      showModal(`<div style="text-align:center;"><div style="font-size:3rem;">🙈</div><div style="font-size:var(--text-lg);font-weight:700;margin:16px 0;">Player ${setupIndex + 2}에게 화면을 넘겨주세요!</div><button class="btn btn-primary" id="btn-ho">준비 완료</button></div>`);
      $('btn-ho').onclick = () => { hideModal(); showStatAllocation(setupIndex + 1); };
    }
  } else {
    gm.initGame(selectedMode, selectedGender, playerConfigs);
  }
};

// ===== GAME READY =====
gm.on('gameReady', ({ players, npcs }) => {
  board = new BoardScene(canvas);
  board.buildRoundBoard(0, gm.rounds);
  board.buildNPCCards(npcs);
  board.buildPlayerCards(players);
  showScreen('game');
  updateHUD();
  gm.startRound();
});

// ===== HUD =====
function updateHUD() {
  const r = gm.getCurrentRound();
  const p = gm.getCurrentPlayer();
  $('hud-round').textContent = r ? `R${r.number}: ${r.emoji} ${r.name}` : '준비 중';
  $('hud-phase').textContent = r ? r.intro?.split('\n')[0] || '' : '';
  if (p) {
    $('hud-token-count').textContent = ``;
    $('hud-player-emoji').textContent = p.portrait;
    $('hud-player-name').textContent = p.playerName;
  }
}

// ===== STATE MACHINE =====
gm.on('stateChange', ({ state }) => {
  if (state === GameState.FINAL_SELECTION) startFinalSelection();
});

// ===== ROUND INTRO =====
gm.on('roundIntro', ({ round }) => {
  updateHUD();
  if (board) {
    board.resetCamera();
    board.buildRoundBoard(gm.currentRound, gm.rounds);
  }
  renderPanel(
    `R${round.number}: ${round.emoji} ${round.name}`,
    round.intro.replace(/\n/g, '<br>'),
    round.revealDesc
      ? `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-next">정보 공개 →</button>`
      : `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-skip-reveal">매칭 단계 →</button>`
  );
  if (round.revealDesc) {
    $('btn-next').onclick = () => gm.revealRoundStat();
  } else {
    $('btn-skip-reveal').onclick = () => {
      if (round.matchType === 'reveal_phase') { showTraitRevealPhase(0); }
      else { gm.startMatching(); startMatchingUI(); }
    };
  }
});

// ===== ROUND REVEAL =====
gm.on('roundReveal', ({ round, npcs }) => {
  npcs.forEach(npc => { if (board) board.updateNPCCard(npc); });
  if (round.revealNPCCard) {
    npcs.forEach(npc => { if (board) board.revealNPCPrefCard(npc.id, 0, npc.preferenceCards[0]); });
  }
  if (board) board.focusOnCenter();

  if (round.matchType === 'reveal_phase') {
    renderPanel(
      `${round.revealDesc}`,
      '공략 대상의 외모가 공개되었습니다. 이제 돌아가며 NPC의 특성을 하나씩 전체 공개합니다!',
      `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-to-trait-reveal">💫 특성 공개 시작 →</button>`
    );
    $('btn-to-trait-reveal').onclick = () => showTraitRevealPhase(0);
  } else {
    renderPanel(
      `${round.revealDesc}`,
      '공략 대상의 정보가 새로 공개되었습니다. 3D 보드에서 확인하세요!',
      `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-to-match">매칭 단계 →</button>`
    );
    $('btn-to-match').onclick = () => { gm.startMatching(); startMatchingUI(); };
  }
});

// ===== R1 TRAIT REVEAL PHASE =====
function showTraitRevealPhase(turnIdx) {
  const totalTurns = gm.players.length; // 각 플레이어 1회씩
  if (turnIdx >= totalTurns) {
    // 전원 공개 완료 → R1 종료
    renderPanel(
      `💫 첫인상 라운드 완료!`,
      `모든 플레이어가 NPC 특성을 하나씩 공개했습니다.<br>이 정보는 게임 끝까지 전체 공유됩니다.`,
      `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-r1-end">다음 라운드 →</button>`
    );
    $('btn-r1-end').onclick = () => gm.nextRound();
    return;
  }

  const p = gm.players[turnIdx];
  gm.currentPlayerIndex = turnIdx;
  updateHUD();
  if (board) {
    board.highlightPlayer(turnIdx, true);
    board.focusOnCenter();
  }

  // 핸드오버 (로컬 멀티에서)
  if (selectedMode !== 'solo' && turnIdx > 0) {
    showModal(`<div style="text-align:center;">
      <div style="font-size:3rem;">🙈</div>
      <div style="font-weight:700;margin:16px 0;">${p.playerName}에게 넘겨주세요!</div>
      <button class="btn btn-primary" id="btn-handover">준비</button>
    </div>`);
    $('btn-handover').onclick = () => { hideModal(); doTraitRevealTurn(turnIdx); };
  } else {
    doTraitRevealTurn(turnIdx);
  }
}

function doTraitRevealTurn(turnIdx) {
  const p = gm.players[turnIdx];

  // NPC 선택 그리드
  const npcGrid = gm.npcs.map((npc, npcIdx) => {
    const unrevealed = gm.getUnrevealedPublicTraits(npc.id);
    const allDone = unrevealed.length === 0;
    return `<div class="npc-pick-item ${allDone ? 'taken' : ''}" data-id="${npc.id}" data-npc-idx="${npcIdx}" ${allDone ? 'style="opacity:0.3;pointer-events:none;"' : ''}>
      <div style="font-size:2rem;">${npc.portrait}</div>
      <div style="font-weight:700;">${npc.name}</div>
      <div style="font-size:0.7rem;color:#94a3b8;">미공개 특성: ${unrevealed.length}개</div>
    </div>`;
  }).join('');

  renderPanel(
    `💫 ${p.playerName}의 차례 (${turnIdx + 1}/${gm.players.length})`,
    `NPC를 선택하면 캐릭터 시트에서 <span class="text-gold">? 특성 칩</span>을 직접 클릭해 공개합니다.`,
    `<div style="width:100%;"><div class="npc-pick-grid">${npcGrid}</div></div>`
  );

  document.querySelectorAll('.npc-pick-item:not(.taken)').forEach(el => {
    el.onclick = () => {
      const npcId = el.dataset.id;
      const npc = gm.npcs.find(n => n.id === npcId);
      const npcIdx = parseInt(el.dataset.npcIdx);
      const unrevealed = gm.getUnrevealedPublicTraits(npcId);
      if (unrevealed.length === 0 || !board) return;

      // 이미 공개된 특성 인덱스
      const revealedIndices = npc._publicTraits || [];

      // 카메라를 NPC 쪽으로 포커스
      board.focusOnNPCCard(npcId);

      // 하단 패널: 안내 + 돌아가기
      renderPanel(
        `💫 ${npc.portrait} ${npc.name}의 특성을 공개하세요`,
        `캐릭터 시트 우측의 <span class="text-gold">? 칩</span>을 클릭하면 전체 공개됩니다.`,
        `<button class="date-action-btn" id="btn-back"><span class="action-icon">←</span>NPC 다시 선택</button>`
      );

      // 3D 특성 선택 모드 진입
      board.enterTraitSelectionMode(npcId, revealedIndices, (data) => {
        const traitIdx = data.traitIndex;
        const result = gm.revealTraitPublic(p.id, npcId, traitIdx);
        if (result) {
          board.exitSelectionMode();
          const allPublic = npc._publicTraits || [];
          board.revealNPCTrait(npcId, traitIdx, npc, allPublic);
          board.updateNPCCard(npc);
          showToast(`💫 ${p.playerName} → ${npc.name}: "${result.value}" 공개!`);

          if (board) board.highlightPlayer(turnIdx, false);
          setTimeout(() => showTraitRevealPhase(turnIdx + 1), 1200);
        }
      });

      const backEl = $('btn-back');
      if (backEl) backEl.onclick = () => {
        board.exitSelectionMode();
        board.focusOnCenter();
        doTraitRevealTurn(turnIdx);
      };
    };
  });
}

// ===== MATCHING =====
function startMatchingUI() {
  const round = gm.getCurrentRound();
  if (round.matchType === 'random' || round.matchType === 'group') {
    const result = gm.performMatching();
    showMatchResult(result);
  } else if (round.matchType === 'open') {
    const draftOrder = gm.getDraftOrder();
    const firstPlayer = gm.players[draftOrder[0]];
    showToast(`💡 마지막으로 연애를 시작한 ${firstPlayer.playerName}이(가) 먼저 선택합니다!`);
    promptDraftSelection(0, draftOrder, {});
  } else {
    promptPlayerSelection(0, {});
  }
}

/** 오픈 매칭 드래프트 — 순서대로 남은 NPC 중 선택 (중앙 모달, 클릭 즉시 확정) */
function promptDraftSelection(orderIdx, draftOrder, selections) {
  if (orderIdx >= draftOrder.length) {
    hideModal();
    const result = gm.performMatching(
      Object.entries(selections).map(([pid, nid]) => ({ playerId: pid, npcId: nid }))
    );
    showMatchResult(result);
    return;
  }

  const playerIdx = draftOrder[orderIdx];
  const p = gm.players[playerIdx];
  gm.currentPlayerIndex = playerIdx;
  updateHUD();
  if (board) {
    board.highlightPlayer(playerIdx, true);
    board.focusOnPlayer(playerIdx);
  }

  const takenNpcs = new Set(Object.values(selections));
  const npcGrid = gm.npcs.map(n => {
    const isTaken = takenNpcs.has(n.id);
    return `<div class="npc-pick-item ${isTaken ? 'taken' : ''}" data-id="${n.id}" ${isTaken ? 'style="opacity:0.3;pointer-events:none;"' : ''}>
      <div style="font-size:2rem;">${n.portrait}</div>
      <div style="font-weight:700;">${n.name}</div>
      ${isTaken ? '<div style="font-size:0.7rem;color:#f87171;">선택됨</div>' : ''}
    </div>`;
  }).join('');

  showModal(`
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:var(--text-xl);font-weight:800;">${p.playerName}</div>
      <div style="color:var(--text-muted);margin-top:4px;">데이트 상대를 선택하세요 (${orderIdx + 1}/${draftOrder.length})</div>
    </div>
    <div class="npc-pick-grid">${npcGrid}</div>
  `);

  $('modal-content').querySelectorAll('.npc-pick-item:not(.taken)').forEach(el => {
    el.onclick = () => {
      selections[p.id] = el.dataset.id;
      if (board) board.highlightPlayer(playerIdx, false);
      hideModal();
      if (selectedMode === 'solo') {
        promptDraftSelection(orderIdx + 1, draftOrder, selections);
      } else {
        const nextIdx = orderIdx + 1;
        if (nextIdx < draftOrder.length) {
          showModal(`<div style="text-align:center;"><div style="font-size:3rem;">🙈</div><div style="font-weight:700;margin:16px 0;">${gm.players[draftOrder[nextIdx]].playerName}에게 넘겨주세요!</div><button class="btn btn-primary" id="btn-ho2">준비</button></div>`);
          $('btn-ho2').onclick = () => { hideModal(); promptDraftSelection(nextIdx, draftOrder, selections); };
        } else {
          promptDraftSelection(nextIdx, draftOrder, selections);
        }
      }
    };
  });
}

function promptPlayerSelection(idx, selections) {
  if (idx >= gm.players.length) {
    hideModal();
    const result = gm.performMatching(selections);
    showMatchResult(result);
    return;
  }
  gm.currentPlayerIndex = idx;
  updateHUD();
  if (board) {
    board.highlightPlayer(idx, true);
    board.focusOnPlayer(idx);
  }

  const npcGrid = gm.npcs.map(n => `<div class="npc-pick-item" data-id="${n.id}"><div style="font-size:2rem;">${n.portrait}</div><div style="font-weight:700;">${n.name}</div></div>`).join('');

  showModal(`
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:var(--text-xl);font-weight:800;">${gm.players[idx].playerName}</div>
      <div style="color:var(--text-muted);margin-top:4px;">데이트 상대를 선택하세요</div>
    </div>
    <div class="npc-pick-grid">${npcGrid}</div>
  `);

  $('modal-content').querySelectorAll('.npc-pick-item').forEach(el => {
    el.onclick = () => {
      selections[gm.players[idx].id] = el.dataset.id;
      if (board) board.highlightPlayer(idx, false);
      hideModal();
      if (selectedMode === 'solo') { promptPlayerSelection(idx + 1, selections); }
      else {
        showModal(`<div style="text-align:center;"><div style="font-size:3rem;">🙈</div><div style="font-weight:700;margin:16px 0;">Player ${idx + 2}에게 넘겨주세요!</div><button class="btn btn-primary" id="btn-ho2">준비</button></div>`);
        $('btn-ho2').onclick = () => { hideModal(); promptPlayerSelection(idx + 1, selections); };
      }
    };
  });
}

function showMatchResult(result) {
  if (result.conflicts.length > 0) {
    const html = result.conflicts.map(c => {
      const npc = gm.npcs.find(n => n.id === c.npcId);
      return `<div style="margin-bottom:12px;"><div style="font-size:var(--text-lg);font-weight:700;">🎲 ${npc.name} 쟁탈전!</div>` +
        c.rolls.map(r => {
          const p = gm.players.find(pl => pl.id === r.playerId); const w = r.playerId === c.winner;
          return `<div style="${w ? 'color:var(--stat-high);font-weight:700;' : 'color:var(--text-muted);'}">${p.portrait} ${p.playerName} 🎲${r.roll} ${w ? '✅' : '❌ 고독정식'}</div>`;
        }).join('') + `</div>`;
    }).join('');
    showModal(html + `<button class="btn btn-primary" style="width:100%;" id="btn-cd">확인</button>`);
    $('btn-cd').onclick = () => { hideModal(); showMatchSummary(result); };
  } else {
    showMatchSummary(result);
  }
}

function showMatchSummary(result) {
  const lines = Object.entries(result.matches).map(([pid, nid]) => {
    const p = gm.players.find(pl => pl.id === pid);
    const n = gm.npcs.find(np => np.id === nid);
    return `<div style="padding:2px 0;">${p.portrait} ${p.playerName} → ${n.portrait} ${n.name}</div>`;
  }).join('');

  renderPanel('📋 매칭 결과', lines, `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-date">데이트 시작 →</button>`);
  $('btn-date').onclick = () => startDatingPhase(0);
}

// ===== DATING =====
function startDatingPhase(idx) {
  const round = gm.getCurrentRound();

  // 그룹 데이트 → 그룹 단위 진행
  if (round.matchType === 'group' && gm.currentGroups) {
    startGroupDatingPhase(0);
    return;
  }

  if (idx >= gm.players.length) { endRound(); return; }
  const p = gm.players[idx];
  gm.currentPlayerIndex = idx;
  if (!p.currentDateNpcId) { startDatingPhase(idx + 1); return; }


  if (selectedMode !== 'solo' && idx > 0) {
    showModal(`<div style="text-align:center;"><div style="font-size:3rem;">🙈</div><div style="font-weight:700;margin:16px 0;">${p.playerName}의 데이트 차례!</div><button class="btn btn-primary" id="btn-dh">준비</button></div>`);
    $('btn-dh').onclick = () => { hideModal(); showDating(idx); };
  } else { showDating(idx); }
}

// ── 그룹 데이트 ──
function startGroupDatingPhase(groupIdx) {
  if (groupIdx >= gm.currentGroups.length) { endRound(); return; }
  const group = gm.currentGroups[groupIdx];
  const players = group.playerIds.map(pid => gm.players.find(p => p.id === pid));
  const npcs = group.npcIds.map(nid => gm.npcs.find(n => n.id === nid));

  if (selectedMode !== 'solo' && groupIdx > 0) {
    showModal(`<div style="text-align:center;"><div style="font-size:3rem;">👥</div><div style="font-weight:700;margin:16px 0;">${players[0].playerName} & ${players[1].playerName}의 그룹 데이트!</div><button class="btn btn-primary" id="btn-gh">준비</button></div>`);
    $('btn-gh').onclick = () => { hideModal(); showGroupDating(groupIdx); };
  } else { showGroupDating(groupIdx); }
}

function showGroupDating(groupIdx) {
  const group = gm.currentGroups[groupIdx];
  const players = group.playerIds.map(pid => gm.players.find(p => p.id === pid));
  const npcs = group.npcIds.map(nid => gm.npcs.find(n => n.id === nid));
  const round = gm.getCurrentRound();
  updateHUD();

  const pi0 = gm.players.indexOf(players[0]);
  const pi1 = gm.players.indexOf(players[1]);
  if (board) {
    board.highlightPlayer(pi0, true);
    board.highlightPlayer(pi1, true);
    const npcIndices = npcs.map(npc => gm.npcs.indexOf(npc));
    board.moveNPCsBetweenPlayers(npcIndices, pi0, pi1);
    board.focusBetweenPlayers(pi0, pi1);
  }




  renderPanel(
    `👥 ${players[0].playerName} & ${players[1].playerName} — 그룹 데이트`,
    `행동을 선택하세요.`,
    `<div style="width:100;"><div class="date-actions">
      <button class="date-action-btn" id="btn-trait"><span class="action-icon">🔍</span>탐색</button>
      <button class="date-action-btn" id="btn-event"><span class="action-icon">🎲</span>이벤트</button>
      <button class="date-action-btn" id="btn-pass"><span class="action-icon">⏭️</span>패스</button>
    </div></div>`
  );

  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };

  /** 행동 완료 → 보드 정리 → 다음 그룹 */
  function endGroupAction() {
    if (board) {
      board.exitSelectionMode();
      board.highlightPlayer(pi0, false);
      board.highlightPlayer(pi1, false);
      board._clearGroupIndicators();
      npcs.forEach(npc => { board.returnNPCToCenter(gm.npcs.indexOf(npc)); });
    }
    startGroupDatingPhase(groupIdx + 1);
  }

  /** 모달 체인: 플레이어 → NPC 선택 → 콜백 */
  function pickSpenderAndNpc(callback) {
    function pickNpc(spender) {
      showModal(`<div style="text-align:center;">
        <div style="font-weight:700;margin-bottom:12px;">어떤 NPC를 선택할까요?</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-primary" id="btn-npc0" style="flex:1;padding:12px;">${npcs[0].portrait} ${npcs[0].name}</button>
          <button class="btn btn-primary" id="btn-npc1" style="flex:1;padding:12px;">${npcs[1].portrait} ${npcs[1].name}</button>
        </div>
        <button class="btn" id="btn-mc" style="margin-top:8px;width:100%;opacity:0.7;">취소</button>
      </div>`);
      $('btn-npc0').onclick = () => { hideModal(); callback(spender, npcs[0]); };
      $('btn-npc1').onclick = () => { hideModal(); callback(spender, npcs[1]); };
      $('btn-mc').onclick = () => { hideModal(); };
    }

    showModal(`<div style="text-align:center;">
      <div style="font-weight:700;margin-bottom:12px;">누가 행동할까요?</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-primary" id="btn-sp0" style="flex:1;padding:12px;">${players[0].portrait} ${players[0].playerName}</button>
        <button class="btn btn-primary" id="btn-sp1" style="flex:1;padding:12px;">${players[1].portrait} ${players[1].playerName}</button>
      </div>
      <button class="btn" id="btn-mc" style="margin-top:8px;width:100%;opacity:0.7;">취소</button>
    </div>`);
    $('btn-sp0').onclick = () => { hideModal(); pickNpc(players[0]); };
    $('btn-sp1').onclick = () => { hideModal(); pickNpc(players[1]); };
    $('btn-mc').onclick = () => { hideModal(); };
  }

  bind('btn-trait', () => {
    if (!board) return;
    showModal(`<div style="text-align:center;">
      <div style="font-weight:700;margin-bottom:12px;">🔍 무엇을 탐색할까요?</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn btn-primary" id="btn-gtr" style="padding:12px;">🔍 특성 확인 <small>(1개 공개)</small></button>
        <button class="btn btn-primary" id="btn-gca" style="padding:12px;">🃏 취향카드 확인 <small>(1장 공개)</small></button>
        <button class="btn" id="btn-mc" style="opacity:0.7;">취소</button>
      </div>
    </div>`);
    $('btn-mc').onclick = () => { hideModal(); };

    $('btn-gtr').onclick = () => {
      hideModal();
      pickSpenderAndNpc((spender, npc) => {
        const info0 = players[0].revealedInfo?.[npc.id] || { traits: [], cards: [] };
        const info1 = players[1].revealedInfo?.[npc.id] || { traits: [], cards: [] };
        const allTraits = [...new Set([...info0.traits, ...info1.traits])];
        const revIdx = npc.traits.map((t, i) => allTraits.includes(t) ? i : -1).filter(i => i >= 0);
        showToast(`🔍 ${npc.name}의 특성 칩을 클릭하세요`);
        board.enterTraitSelectionMode(npc.id, revIdx, (data) => {
          const r = gm.investigate(spender.id, npc.id, 'trait', data.traitIndex);
          if (r) {
            board.exitSelectionMode();
            const allT = [...new Set([...(players[0].revealedInfo?.[npc.id]?.traits||[]),...(players[1].revealedInfo?.[npc.id]?.traits||[])])];
            const upIdx = npc.traits.map((t, i) => allT.includes(t) ? i : -1).filter(i => i >= 0);
            board.revealNPCTrait(npc.id, data.traitIndex, npc, upIdx);
            updateHUD();
            showToast(`🔍 ${r.value} (${spender.playerName})`);
            setTimeout(endGroupAction, 1200);
          }
        });
      });
    };

    $('btn-gca').onclick = () => {
      hideModal();
      pickSpenderAndNpc((spender, npc) => {
        const info0 = players[0].revealedInfo?.[npc.id] || { traits: [], cards: [] };
        const info1 = players[1].revealedInfo?.[npc.id] || { traits: [], cards: [] };
        const allC = [...new Set([...info0.cards, ...info1.cards])];
        const revIdx = npc.preferenceCards.map((c, i) => allC.includes(c.id) ? i : -1).filter(i => i >= 0);
        showToast(`🃏 ${npc.name}의 취향카드를 클릭하세요`);
        board.enterCardSelectionMode(npc.id, revIdx, (data) => {
          const r = gm.investigate(spender.id, npc.id, 'card', data.cardIndex);
          if (r) {
            board.exitSelectionMode();
            board.revealNPCPrefCard(npc.id, data.cardIndex, r.value);
            updateHUD();
            showToast(`🃏 ${r.value.emoji} ${r.value.name} (${spender.playerName})`);
            setTimeout(endGroupAction, 1200);
          }
        });
      });
    };
  });

  bind('btn-event', () => {
    const activePlayer = players[0];
    const activeNpc = npcs[0];
    const event = gm.drawDateEvent(activePlayer.id, activeNpc.id);
    if (!event) { showToast('⚠️ 이벤트 카드를 뽑을 수 없습니다'); return; }

    showModal(`<div style="text-align:center;">
      <div style="font-size:3rem;margin-bottom:8px;">${event.emoji}</div>
      <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;">${event.name}</div>
      <div style="font-size:0.9rem;color:#94a3b8;margin-bottom:16px;">${event.description}</div>
      <button class="btn btn-primary" id="btn-event-ok" style="width:100%;">확인</button>
    </div>`);

    $('btn-event-ok').onclick = () => {
      hideModal();
      showToast(`${event.emoji} ${event.name}`);
      updateHUD();
      setTimeout(endGroupAction, 1200);
    };
  });

  bind('btn-pass', endGroupAction);
}

function showDating(idx) {
  const p = gm.players[idx];
  const npc = gm.npcs.find(n => n.id === p.currentDateNpcId);
  const npcIdx = gm.npcs.indexOf(npc);
  const round = gm.getCurrentRound();
  gm.currentPlayerIndex = idx;
  updateHUD();

  if (board) {
    board.highlightPlayer(idx, true);
    board.moveNPCToPlayer(npcIdx, idx);
    board.focusOnPlayer(idx);
  }

  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };

  /** 행동 완료 → 보드 정리 → 다음 플레이어 */
  function endDateAction() {
    if (board) { board.exitSelectionMode(); board.highlightPlayer(idx, false); board.returnNPCToCenter(npcIdx); }
    startDatingPhase(idx + 1);
  }

  // 탐색 또는 이벤트 택1 (1회만)
  const actionsHtml = `
    <button class="date-action-btn" id="btn-investigate"><span class="action-icon">🔍</span>탐색</button>
    <button class="date-action-btn" id="btn-event"><span class="action-icon">🎲</span>이벤트</button>
    <button class="date-action-btn" id="btn-pass"><span class="action-icon">⏭️</span>패스</button>`;

  renderPanel(
    `${p.playerName} ✦ ${npc.name}와(과) 데이트 중`,
    `행동을 하나 선택하세요. (1회만 가능)`,
    `<div style="width:100%;"><div class="date-actions">${actionsHtml}</div></div>`
  );

  bind('btn-investigate', () => {
    const info = p.revealedInfo?.[npc.id] || { traits: [], cards: [] };
    const unrevealedTraits = npc.traits.filter(t => !info.traits.includes(t));
    const revealedCardIds = info.cards || [];
    const hiddenCards = npc.preferenceCards.filter((c, i) => i !== npc.publicCardIndex && !revealedCardIds.includes(c.id));

    const hasTrait = unrevealedTraits.length > 0;
    const hasCard = hiddenCards.length > 0;

    renderPanel(
      `🔍 탐색 — 무엇을 확인할까요?`,
      ``,
      `<div style="width:100%;"><div class="date-actions" style="flex-direction:column;gap:6px;">
        <button class="date-action-btn" id="btn-sub-trait" ${!hasTrait ? 'disabled' : ''} style="width:100%;justify-content:space-between;">
          <span>🔍 특성 확인 <small style="opacity:0.7;">(1개 공개)</small></span>
        </button>
        <button class="date-action-btn" id="btn-sub-card" ${!hasCard ? 'disabled' : ''} style="width:100%;justify-content:space-between;">
          <span>🃏 취향카드 확인 <small style="opacity:0.7;">(1장 공개)</small></span>
        </button>
        <button class="date-action-btn" id="btn-back" style="width:100%;opacity:0.7;"><span class="action-icon">←</span>돌아가기</button>
      </div></div>`
    );

    const bindSub = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    bindSub('btn-sub-trait', () => {
      if (!board) return;
      const revealedIndices = npc.traits.map((t, i) => (info.traits || []).includes(t) ? i : -1).filter(i => i >= 0);
      renderPanel(`🔍 특성 탐색`, `카드 우측의 <span class="text-gold">? 특성 칩</span>을 클릭하세요`,
        `<button class="date-action-btn" id="btn-back"><span class="action-icon">←</span>돌아가기</button>`);
      board.enterTraitSelectionMode(npc.id, revealedIndices, (data) => {
        const r = gm.investigate(p.id, npc.id, 'trait', data.traitIndex);
        if (r) {
          board.exitSelectionMode();
          const updatedInfo = p.revealedInfo?.[npc.id] || { traits: [], cards: [] };
          const updatedIndices = npc.traits.map((t, i) => updatedInfo.traits.includes(t) ? i : -1).filter(i => i >= 0);
          board.revealNPCTrait(npc.id, data.traitIndex, npc, updatedIndices);
          updateHUD();
          showToast(`🔍 ${r.value}`);
          setTimeout(endDateAction, 1200);
        }
      });
      $('btn-back').onclick = () => { board.exitSelectionMode(); showDating(idx); };
    });

    bindSub('btn-sub-card', () => {
      if (!board) return;
      const revealedIndices = npc.preferenceCards.map((c, i) => (info.cards || []).includes(c.id) ? i : -1).filter(i => i >= 0);
      renderPanel(`🃏 취향카드 탐색`, `보드 위의 <span class="text-gold">취향카드</span>를 클릭하세요`,
        `<button class="date-action-btn" id="btn-back"><span class="action-icon">←</span>돌아가기</button>`);
      board.enterCardSelectionMode(npc.id, revealedIndices, (data) => {
        const r = gm.investigate(p.id, npc.id, 'card', data.cardIndex);
        if (r) {
          board.exitSelectionMode();
          board.revealNPCPrefCard(npc.id, data.cardIndex, r.value);
          updateHUD();
          showToast(`🃏 ${r.value.emoji} ${r.value.name}`);
          setTimeout(endDateAction, 1200);
        }
      });
      $('btn-back').onclick = () => { board.exitSelectionMode(); showDating(idx); };
    });

    bindSub('btn-back', () => showDating(idx));
  });

  bind('btn-event', () => {
    const event = gm.drawDateEvent(p.id, npc.id);
    if (!event) { showToast('⚠️ 이벤트 카드를 뽑을 수 없습니다'); return; }

    // 이벤트 카드 결과 모달
    showModal(`<div style="text-align:center;">
      <div style="font-size:3rem;margin-bottom:8px;">${event.emoji}</div>
      <div style="font-weight:700;font-size:1.1rem;margin-bottom:8px;">${event.name}</div>
      <div style="font-size:0.9rem;color:#94a3b8;margin-bottom:16px;">${event.description}</div>
      <button class="btn btn-primary" id="btn-event-ok" style="width:100%;">확인</button>
    </div>`);

    $('btn-event-ok').onclick = () => {
      hideModal();
      // 이벤트 효과 적용
      const eff = event.effect;
      switch (eff.type) {
        case 'free_trait_reveal': {
          const traitInfo = p.revealedInfo?.[npc.id] || { traits: [], cards: [] };
          const unrevealed = npc.traits.filter(t => !traitInfo.traits.includes(t));
          if (unrevealed.length > 0) {
            const r = gm.investigate(p.id, npc.id, 'trait');
            if (r && board) {
              const upInfo = p.revealedInfo?.[npc.id] || { traits: [] };
              const upIdx = npc.traits.map((t, i) => upInfo.traits.includes(t) ? i : -1).filter(i => i >= 0);
              board.revealNPCTrait(npc.id, r.index, npc, upIdx);
              showToast(`🌧️ ${r.value} 특성 공개!`);
            }
          } else { showToast('이미 모든 특성이 공개됨'); }
          break;
        }
        case 'free_card_reveal': {
          const cardInfo = p.revealedInfo?.[npc.id] || { traits: [], cards: [] };
          const hidden = npc.preferenceCards.filter((c, i) => i !== npc.publicCardIndex && !cardInfo.cards.includes(c.id));
          if (hidden.length > 0) {
            const r = gm.investigate(p.id, npc.id, 'card');
            if (r && board) {
              board.revealNPCPrefCard(npc.id, r.index, r.value);
              showToast(`🎯 ${r.value.emoji} ${r.value.name} 공개!`);
            }
          } else { showToast('이미 모든 취향카드가 공개됨'); }
          break;
        }
        case 'compat_bonus':
          showToast(`${event.emoji} 궁합 보너스 +${eff.value}!`);
          break;
        case 'skip_turn':
          showToast(`📱 데이트 중단!`);
          endDateAction();
          return;
        case 'private_trait_reveal': {
          const privInfo = p.revealedInfo?.[npc.id] || { traits: [], cards: [] };
          const unrevealed = npc.traits.filter(t => !privInfo.traits.includes(t));
          if (unrevealed.length > 0) {
            // 비공개로 직접 추가 (정보공유 안 함)
            if (!p.revealedInfo[npc.id]) p.revealedInfo[npc.id] = { traits: [], cards: [] };
            p.revealedInfo[npc.id].traits.push(unrevealed[0]);
            showToast(`🤫 비밀: ${unrevealed[0]} (나만 앎!)`);
          } else { showToast('이미 모든 특성이 공개됨'); }
          break;
        }
        case 'reveal_cutline_hint': {
          const cutline = npc.preferenceCards.reduce((s, c) => s + (c.cutline || 5), 0);
          const hint = cutline <= 12 ? '낮은 편' : cutline <= 15 ? '보통' : '높은 편';
          showToast(`🔮 ${npc.name}의 커트라인은 ${hint}이다...`);
          break;
        }
        case 'force_share':
          showToast(`😠 이번 데이트 정보가 전원 공개!`);
          break;
        case 'next_double_reveal':
          showToast(`${event.emoji} 다음 탐색 시 보너스 효과!`);
          break;
        default:
          showToast(`${event.emoji} ${event.description}`);
          break;
      }
      updateHUD();
      setTimeout(endDateAction, 1200);
    };
  });

  bind('btn-pass', endDateAction);
}



// ===== ROUND END =====
function endRound() {
  if (board) board.resetCamera();
  // Return all NPCs to center
  gm.npcs.forEach((_, i) => { if (board) board.returnNPCToCenter(i); });

  const round = gm.getCurrentRound();
  const records = gm.dateHistory.filter(d => d.round === round.number).map(d => {
    const p = gm.players.find(pl => pl.id === d.playerId);
    const n = gm.npcs.find(np => np.id === d.npcId);
    return `<div style="padding:2px 0;">${p.portrait} ${p.playerName} → ${n.portrait} ${n.name}</div>`;
  }).join('');

  renderPanel(
    `${round.emoji} R${round.number} 종료!`,
    `<strong>이번 라운드 데이트 기록:</strong><br>${records}`,
    `<button class="btn btn-primary btn-lg" style="flex:1;" id="btn-nr">다음 라운드 →</button>`
  );
  $('btn-nr').onclick = () => gm.nextRound();
}

// ===== FINAL SELECTION =====
function startFinalSelection() {
  if (board) board.resetCamera();
  updateHUD();
  $('hud-round').textContent = '🌹 최종 선택';
  $('hud-phase').textContent = '평생의 파트너를 선택하세요!';
  promptFinalChoice(0, {});
}

function promptFinalChoice(idx, selections) {
  if (idx >= gm.players.length) { gm.performFinalSelection(selections); return; }
  gm.currentPlayerIndex = idx;
  updateHUD();
  if (board) board.highlightPlayer(idx, true);

  let picked = null;
  const npcGrid = gm.npcs.map(n => `<div class="npc-pick-item" data-id="${n.id}"><div style="font-size:2rem;">${n.portrait}</div><div style="font-weight:700;">${n.name}</div></div>`).join('');

  renderPanel(
    `${gm.players[idx].playerName} — 최종 선택`,
    '평생의 파트너를 선택하세요!',
    `<div style="width:100%;"><div class="npc-pick-grid" style="margin-bottom:12px;">${npcGrid}</div><button class="btn btn-primary btn-lg" style="width:100%;" id="btn-fc" disabled>최종 선택 확정</button></div>`
  );

  panel().querySelectorAll('.npc-pick-item').forEach(el => {
    el.onclick = () => {
      panel().querySelectorAll('.npc-pick-item').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      picked = el.dataset.id;
      $('btn-fc').disabled = false;
    };
  });

  $('btn-fc').onclick = () => {
    if (!picked) return;
    selections[gm.players[idx].id] = picked;
    if (board) board.highlightPlayer(idx, false);
    if (selectedMode === 'solo' || idx + 1 >= gm.players.length) { promptFinalChoice(idx + 1, selections); }
    else {
      showModal(`<div style="text-align:center;"><div style="font-size:3rem;">🙈</div><div style="font-weight:700;margin:16px 0;">Player ${idx + 2}에게 넘겨주세요!</div><button class="btn btn-primary" id="btn-fh">준비</button></div>`);
      $('btn-fh').onclick = () => { hideModal(); promptFinalChoice(idx + 1, selections); };
    }
  };
}

// ===== GAME END =====
gm.on('gameEnd', ({ results, rivalries }) => {
  $('final-results').innerHTML = results.map((r, i) => {
    const contested = r.wasContested ? '<span style="color:#ef4444;">🔥 경합</span>' : '<span style="color:#22c55e;">독점</span>';
    let matchStatus;
    if (r.coupleFormed) {
      matchStatus = `<span class="text-pink">커플 성사!</span> (${contested})`;
    } else if (r.npcRejected) {
      const cl = r.chosenNpc?.preferenceCards.reduce((s, c) => s + (c.cutline || 5), 0) || '?';
      matchStatus = `<span style="color:#ef4444;">💔 NPC 거절</span> <small style="color:#94a3b8;">(궁합 ${r.compatibilityScore} < 커트라인 ${cl})</small>`;
    } else if (!r.passesCutline) {
      const cl = r.chosenNpc?.preferenceCards.reduce((s, c) => s + (c.cutline || 5), 0) || '?';
      matchStatus = `<span style="color:#f97316;">⚠️ 커트라인 미달</span> <small style="color:#94a3b8;">(궁합 ${r.compatibilityScore} < ${cl})</small>`;
    } else {
      matchStatus = `<span class="text-muted">경합 패배</span> (${contested})`;
    }
    return `
    <div class="glass-card" style="padding:20px;margin-bottom:12px;${i === 0 && r.coupleFormed ? 'border:2px solid var(--gold-400);box-shadow:0 0 30px rgba(251,191,36,0.3);' : ''}">
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="font-size:2rem;">${r.player.portrait}</span>
        ${r.coupleFormed ? '<span style="font-size:2rem;">✅</span>' : '<span style="font-size:2rem;">❌</span>'}
        <span style="font-size:2rem;">${r.chosenNpc?.portrait || '❓'}</span>
      </div>
      <div style="font-weight:700;margin-top:8px;">${r.player.playerName} → ${r.chosenNpc?.name || '없음'} ${matchStatus}</div>
      <div style="font-size:var(--text-sm);margin-top:4px;">
        궁합: <span class="text-purple">${r.compatibilityScore}</span> |
        미션: <span class="text-gold">+${r.missionBonus}</span>
      </div>
      <div style="font-size:var(--text-xl);font-weight:800;margin-top:6px;">총점: <span class="${r.coupleFormed ? 'text-gold' : 'text-muted'}">${r.totalScore}</span>${i === 0 && r.coupleFormed ? ' 👑' : ''}</div>
    </div>`;
  }).join('');
  showScreen('final');
});

$('btn-restart').onclick = () => location.reload();
console.log('Heart Pockets v0.4 — 보드게임 시뮬레이터');
