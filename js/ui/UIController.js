import { STAT_LABELS, STAT_VALUE_LABELS } from '../data/characters.js';
import { scoreWithCard } from '../data/cards.js';

/**
 * UI 컨트롤러 — 화면 전환 + 동적 콘텐츠 렌더링
 */
export class UIController {
  constructor(gameManager) {
    this.gm = gameManager;
    this.screens = {
      lobby: document.getElementById('screen-lobby'),
      character: document.getElementById('screen-character'),
      game: document.getElementById('screen-game'),
      final: document.getElementById('screen-final'),
    };
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this._charRevealIndex = 0;
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) this.screens[name].classList.add('active');
  }

  // ===== Modal =====
  showModal(html) {
    this.modalContent.innerHTML = html;
    this.modal.style.display = 'flex';
  }

  hideModal() {
    this.modal.style.display = 'none';
  }

  // ===== Character Reveal =====
  showCharacterReveal(playerIndex) {
    const p = this.gm.players[playerIndex];
    if (!p) return;
    document.getElementById('char-reveal-player-name').textContent = p.playerName;
    const card = document.getElementById('char-reveal-card');
    card.innerHTML = `
      <div class="avatar player" style="width:80px;height:80px;font-size:2.5rem;margin:0 auto var(--sp-md);">${p.emoji}</div>
      <div style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--sp-xs);">${p.name}</div>
      <div class="text-muted" style="margin-bottom:var(--sp-md);">"${p.quote}"</div>
      <div style="display:flex;gap:var(--sp-sm);justify-content:center;flex-wrap:wrap;margin-bottom:var(--sp-lg);">
        ${this.renderStatBadges(p.mainStats)}
      </div>
      <div style="margin-bottom:var(--sp-md);">
        <div class="text-muted" style="font-size:var(--text-xs);margin-bottom:var(--sp-xs);">세부특성</div>
        <div style="display:flex;gap:var(--sp-xs);justify-content:center;flex-wrap:wrap;">
          ${p.traits.map(t => `<span class="trait-tag revealed">${t}</span>`).join('')}
        </div>
      </div>
      <div>
        <div class="text-muted" style="font-size:var(--text-xs);margin-bottom:var(--sp-sm);">취향카드</div>
        ${p.preferenceCards.map(c => this.renderPrefCardMini(c)).join('')}
      </div>
    `;
    this.showScreen('character');
  }

  // ===== Game HUD =====
  updateHUD() {
    const round = this.gm.getCurrentRound();
    const player = this.gm.getCurrentPlayer();
    if (!round || !player) return;
    document.getElementById('hud-round').textContent = `R${round.number}: ${round.emoji} ${round.name}`;
    document.getElementById('hud-phase').textContent = round.description;
    document.getElementById('hud-ap').innerHTML = `AP: <span class="text-gold" style="font-weight:700;">${player.ap}/${round.ap}</span>`;
    document.getElementById('hud-player-emoji').textContent = player.emoji;
    document.getElementById('hud-player-name').textContent = player.playerName;
  }

  // ===== NPC Grid =====
  renderNPCGrid(onSelect) {
    const content = document.getElementById('game-content');
    const player = this.gm.getCurrentPlayer();
    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-md);max-width:600px;margin:0 auto;">
        ${this.gm.npcs.map(npc => {
          const info = this.gm.getKnownInfo(player.id, npc.id);
          const dates = info?.dateCount || 0;
          return `
            <div class="glass-card npc-select-card" data-npc-id="${npc.id}" style="padding:var(--sp-md);cursor:pointer;transition:all var(--duration-normal) var(--ease-out);">
              <div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-sm);">
                <div class="avatar npc" style="width:44px;height:44px;font-size:1.4rem;">${npc.emoji}</div>
                <div>
                  <div style="font-weight:700;">${npc.name}</div>
                  <div class="text-muted" style="font-size:var(--text-xs);">데이트 ${dates}회</div>
                </div>
              </div>
              <div style="display:flex;gap:var(--sp-xs);flex-wrap:wrap;">
                ${this.renderStatBadges(npc.revealedStats, true)}
              </div>
            </div>`;
        }).join('')}
      </div>
      <div class="text-center text-muted mt-md" style="font-size:var(--text-sm);">데이트 상대를 선택하세요</div>
    `;
    content.querySelectorAll('.npc-select-card').forEach(el => {
      el.addEventListener('click', () => {
        content.querySelectorAll('.npc-select-card').forEach(c => c.style.borderColor = '');
        el.style.borderColor = 'var(--pink-400)';
        if (onSelect) onSelect(el.dataset.npcId);
      });
    });
  }

  // ===== Dating Phase =====
  renderDatingPhase(npcId) {
    const content = document.getElementById('game-content');
    const player = this.gm.getCurrentPlayer();
    const npc = this.gm.npcs.find(n => n.id === npcId);
    const info = this.gm.getKnownInfo(player.id, npcId);
    const round = this.gm.getCurrentRound();

    content.innerHTML = `
      <div style="max-width:500px;margin:0 auto;">
        <div class="glass-card" style="padding:var(--sp-lg);margin-bottom:var(--sp-md);text-align:center;">
          <div class="avatar npc" style="width:72px;height:72px;font-size:2.2rem;margin:0 auto var(--sp-sm);">${npc.emoji}</div>
          <div style="font-size:var(--text-xl);font-weight:700;">${npc.name}와(과) 데이트 중</div>
          <div class="text-muted mt-sm" style="font-size:var(--text-sm);">남은 AP: <span class="text-gold">${player.ap}</span></div>
        </div>

        <!-- 알려진 정보 -->
        <div class="glass-card" style="padding:var(--sp-md);margin-bottom:var(--sp-md);">
          <div style="font-weight:600;margin-bottom:var(--sp-sm);">📋 알려진 정보</div>
          <div style="display:flex;gap:var(--sp-xs);flex-wrap:wrap;margin-bottom:var(--sp-sm);">
            ${this.renderStatBadges(info.revealedStats, true)}
          </div>
          ${info.revealedTraits.length > 0 ? `
            <div style="margin-bottom:var(--sp-sm);">
              <span class="text-muted" style="font-size:var(--text-xs);">세부특성:</span>
              ${info.revealedTraits.map(t => `<span class="trait-tag revealed" style="margin:2px;">${t}</span>`).join('')}
            </div>` : ''}
          ${info.publicCard ? `
            <div style="margin-bottom:var(--sp-xs);">
              <span class="text-muted" style="font-size:var(--text-xs);">공개 취향카드:</span>
              ${this.renderPrefCardMini(info.publicCard)}
            </div>` : ''}
          ${info.revealedCards.length > 0 ? `
            <div>
              <span class="text-muted" style="font-size:var(--text-xs);">확인한 비공개 카드:</span>
              ${info.revealedCards.map(cId => {
                const c = npc.preferenceCards.find(pc => pc.id === cId);
                return c ? this.renderPrefCardMini(c) : '';
              }).join('')}
            </div>` : ''}
        </div>
      </div>
    `;

    this.renderActionButtons(npcId);
  }

  renderActionButtons(npcId) {
    const actions = document.getElementById('game-actions');
    const player = this.gm.getCurrentPlayer();
    const round = this.gm.getCurrentRound();
    const hasUnrevealed = this.gm.hasUnrevealedInfo(player.id, npcId);
    const apLeft = player.ap > 0;

    if (!apLeft) {
      actions.innerHTML = `
        <button class="btn btn-primary btn-lg" style="flex:1;" id="btn-end-date">라운드 종료 →</button>
      `;
      return;
    }

    if (round.appealOnly) {
      actions.innerHTML = `
        <button class="btn btn-primary" style="flex:1;" id="btn-appeal">💕 어필 (토큰 +1)</button>
        <button class="btn btn-secondary" id="btn-end-date">종료 →</button>
      `;
    } else {
      actions.innerHTML = `
        <button class="btn btn-secondary" style="flex:1;" id="btn-investigate-trait" ${!hasUnrevealed ? 'disabled' : ''}>🔍 세부특성 탐색</button>
        <button class="btn btn-secondary" style="flex:1;" id="btn-investigate-card" ${!hasUnrevealed ? 'disabled' : ''}>🃏 취향카드 탐색</button>
        <button class="btn btn-primary" style="flex:1;" id="btn-appeal">💕 어필</button>
      `;
    }
  }

  // ===== Dice Animation =====
  showDiceResult(conflicts) {
    const html = conflicts.map(c => {
      const npc = this.gm.npcs.find(n => n.id === c.npcId);
      return `
        <div style="text-align:center;margin-bottom:var(--sp-lg);">
          <div style="font-size:var(--text-xl);font-weight:700;margin-bottom:var(--sp-md);">
            🎲 ${npc.name} 쟁탈전!
          </div>
          ${c.rolls.map(r => {
            const p = this.gm.players.find(pl => pl.id === r.playerId);
            const isWinner = r.playerId === c.winner;
            return `
              <div style="display:flex;align-items:center;gap:var(--sp-md);justify-content:center;padding:var(--sp-sm);${isWinner ? 'color:var(--stat-high);font-weight:700;' : 'color:var(--text-muted);'}">
                <span>${p.emoji} ${p.playerName}</span>
                <span style="font-size:var(--text-2xl);">🎲 ${r.roll}</span>
                <span>${isWinner ? '✅ 승리!' : '❌ 고독 정식'}</span>
              </div>`;
          }).join('')}
        </div>`;
    }).join('');
    this.showModal(html + `<button class="btn btn-primary" style="width:100%;margin-top:var(--sp-md);" id="btn-close-dice">확인</button>`);
  }

  // ===== Final Results =====
  renderFinalResults(results, npcChoices) {
    const container = document.getElementById('final-results');
    container.innerHTML = results.map((r, i) => `
      <div class="glass-card" style="padding:var(--sp-lg);margin-bottom:var(--sp-md);${i === 0 && r.coupleFormed ? 'border:2px solid var(--gold-400);box-shadow:0 0 30px rgba(251,191,36,0.3);' : ''}">
        <div style="display:flex;align-items:center;gap:var(--sp-md);margin-bottom:var(--sp-md);">
          <div class="avatar player">${r.player.emoji}</div>
          ${r.coupleFormed ? '<span style="font-size:2rem;">💘</span>' : '<span style="font-size:2rem;">💔</span>'}
          <div class="avatar npc">${r.chosenNpc?.emoji || '❓'}</div>
        </div>
        <div style="font-weight:700;font-size:var(--text-lg);">
          ${r.player.playerName} → ${r.chosenNpc?.name || '없음'}
          ${r.coupleFormed ? ' <span class="text-pink">커플 성사! 💕</span>' : ' <span class="text-muted">미성사</span>'}
        </div>
        <div style="margin-top:var(--sp-sm);font-size:var(--text-sm);">
          <span>궁합: <span class="text-purple">${r.compatibilityScore}점</span></span>
          <span style="margin-left:var(--sp-md);">어필: <span class="text-pink">${r.appealTokensUsed}개</span></span>
          <span style="margin-left:var(--sp-md);">미션: <span class="text-gold">+${r.missionBonus}점</span></span>
        </div>
        <div style="font-size:var(--text-xl);font-weight:800;margin-top:var(--sp-sm);">
          총점: <span class="${r.coupleFormed ? 'text-gold' : 'text-muted'}">${r.totalScore}점</span>
          ${i === 0 && r.coupleFormed ? ' 👑 우승!' : ''}
        </div>
        ${r.completedMissions.length > 0 ? `
          <div style="margin-top:var(--sp-sm);font-size:var(--text-xs);">
            완료 미션: ${r.completedMissions.map(m => `${m.emoji} ${m.name}`).join(', ')}
          </div>` : ''}
      </div>
    `).join('');
    this.showScreen('final');
  }

  // ===== Helpers =====
  renderStatBadges(stats, showHidden = false) {
    return Object.entries(STAT_LABELS).map(([key, label]) => {
      const val = stats[key];
      if (!val && !showHidden) return '';
      if (!val) return `<span class="stat-badge hidden">${label.emoji} ${label.name} ???</span>`;
      const cls = val === '상' ? 'high' : val === '중' ? 'mid' : 'low';
      return `<span class="stat-badge ${cls}">${label.emoji} ${val}</span>`;
    }).join('');
  }

  renderPrefCardMini(card) {
    return `
      <div class="pref-card" style="margin-top:var(--sp-xs);padding:var(--sp-sm);">
        <div class="card-name" style="font-size:var(--text-sm);">${card.emoji} ${card.name}</div>
        <div class="card-desc" style="font-size:var(--text-xs);">${card.description}</div>
        <div class="card-likes" style="font-size:0.65rem;">➕ ${card.likes.slice(0, 3).join(', ')}</div>
        <div class="card-dislikes" style="font-size:0.65rem;">➖ ${card.dislikes.slice(0, 3).join(', ')}</div>
      </div>
    `;
  }
}
