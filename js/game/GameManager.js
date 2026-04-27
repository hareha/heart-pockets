import { CHARACTER_CARDS, STAT_KEYS, TOTAL_STAT_POINTS, generateRandomNPCStats } from '../data/characters.js';
import { pickRandomTraits } from '../data/traits.js';
import { PREFERENCE_CARDS, MISSION_CARDS, pickRandomCards, calculateCompatibility } from '../data/cards.js';

/**
 * 라운드 정의 — 토큰 제한 포함
 */
const ROUNDS = [
  { number: 1, name: '첫만남', emoji: '💫', matchType: 'random', tokenLimit: 2,
    revealStat: 'looks', revealNPCCard: false, appealOnly: false, hasRumor: false,
    intro: '첫 만남의 시간입니다! 공략 대상의 외모가 공개됩니다.\n랜덤으로 매칭되어 데이트를 진행합니다.',
    revealDesc: '💎 외모 스탯이 공개됩니다!',
  },
  { number: 2, name: '자기소개', emoji: '🗣️', matchType: 'open', tokenLimit: 2,
    revealStat: 'age', revealNPCCard: false, appealOnly: false, hasRumor: false,
    intro: '자기소개 시간! 나이가 공개됩니다.\n순서대로 원하는 상대를 선택합니다.',
    revealDesc: '🎂 나이 스탯이 공개됩니다!',
  },
  { number: 3, name: '그룹 데이트', emoji: '👥', matchType: 'group', tokenLimit: 2,
    revealStat: 'personality', revealNPCCard: true, appealOnly: false, hasRumor: false,
    intro: '그룹 데이트! 성격이 공개되고 NPC 취향카드 1장이 공개됩니다.\n2:2로 나뉘어 데이트합니다.',
    revealDesc: '💖 성격 스탯 + 🃏 취향카드 1장이 공개됩니다!',
  },
  { number: 4, name: '경쟁 데이트', emoji: '🔥', matchType: 'blind', tokenLimit: 2,
    revealStat: 'wealth', revealNPCCard: false, appealOnly: false, hasRumor: false,
    intro: '경쟁 데이트! 재력이 공개되어 모든 메인스탯이 오픈!\n블라인드픽으로 경쟁합니다. 겹치면 주사위 대결!',
    revealDesc: '💰 재력 스탯이 공개됩니다! (메인스탯 전부 오픈!)',
  },
  { number: 5, name: '폭풍전야', emoji: '🌪️', matchType: 'blind', tokenLimit: 3,
    revealStat: null, revealNPCCard: false, appealOnly: false, hasRumor: true,
    intro: '폭풍전야! 이번 라운드는 토큰 3개까지 사용 가능!\n블라인드픽 + 소문 타임으로 마지막 정보전.',
    revealDesc: null,
  },
  { number: 6, name: '고백의 밤', emoji: '💕', matchType: 'free', tokenLimit: 99,
    revealStat: null, revealNPCCard: false, appealOnly: true, hasRumor: false,
    intro: '고백의 밤! 탐색은 불가능합니다.\n남은 토큰을 모두 어필에 투자하세요!',
    revealDesc: null,
  },
];

export const GameState = {
  LOBBY: 'lobby',
  SETUP: 'setup',
  ROUND_INTRO: 'round_intro',
  ROUND_REVEAL: 'round_reveal',
  MATCHING: 'matching',
  DATING: 'dating',
  RUMOR: 'rumor',
  ROUND_END: 'round_end',
  FINAL_SELECTION: 'final_selection',
  RESULTS: 'results',
};

export const TOTAL_TOKENS = 13; // 행동 토큰 총량

export class GameManager {
  constructor() {
    this.state = GameState.LOBBY;
    this.mode = 'solo';
    this.npcGender = 'female';
    this.players = [];
    this.npcs = [];
    this.currentRound = 0;
    this.currentPlayerIndex = 0;
    this.rounds = ROUNDS;
    this.publicMissions = [];
    this.dateHistory = [];
    this.matches = {};
    this._listeners = {};
  }

  on(event, cb) { if (!this._listeners[event]) this._listeners[event] = []; this._listeners[event].push(cb); }
  emit(event, data) { (this._listeners[event] || []).forEach(cb => cb(data)); }

  // ===== INIT =====
  initGame(mode, npcGender, playerConfigs) {
    this.mode = mode;
    this.npcGender = npcGender;

    this.players = playerConfigs.map((config, i) => {
      const card = [...CHARACTER_CARDS.male, ...CHARACTER_CARDS.female].find(c => c.id === config.cardId);
      return {
        id: config.cardId,
        name: card?.name || `P${i + 1}`,
        gender: card?.gender || 'male',
        portrait: card?.portrait || '😀',
        playerIndex: i,
        playerName: `Player ${i + 1}`,
        stats: config.stats,
        mainStats: config.stats,
        traits: config.traits,
        preferenceCards: config.preferenceCards,
        // 토큰 시스템
        tokens: TOTAL_TOKENS, // 행동 토큰 (비공개)
        tokensUsedThisRound: 0,
        appealTokens: {}, // npcId -> count (비공개)
        revealedInfo: {},
        currentDateNpcId: null,
        blindPickWins: 0,
        lonelySuppersCount: 0,
        hiddenCardsRevealed: 0,
        personalMissions: [],
        changedTargetAfterR5: false,
        lastAppealTarget: null,
      };
    });

    const npcCards = [...CHARACTER_CARDS[npcGender]].sort(() => Math.random() - 0.5);
    this.npcs = npcCards.map((card, i) => ({
      id: `npc-${i}`,
      name: card.name,
      gender: card.gender,
      portrait: card.portrait,
      stats: generateRandomNPCStats(),
      mainStats: null,
      traits: pickRandomTraits(5),
      preferenceCards: pickRandomCards(PREFERENCE_CARDS, 3),
      publicCardIndex: -1,
      revealedStats: {}, // 공개된 스탯만
    }));
    this.npcs.forEach(n => { n.mainStats = n.stats; });

    this.publicMissions = pickRandomCards(MISSION_CARDS, 3);
    this.currentRound = 0;
    this.currentPlayerIndex = 0;
    this.dateHistory = [];
    this.matches = {};

    this.emit('gameReady', { players: this.players, npcs: this.npcs });
  }

  setState(s) { this.state = s; this.emit('stateChange', { state: s }); }
  getCurrentRound() { return this.rounds[this.currentRound]; }
  getCurrentPlayer() { return this.players[this.currentPlayerIndex]; }

  // ===== ROUND FLOW =====
  startRound() {
    const round = this.getCurrentRound();
    if (!round) { this.setState(GameState.FINAL_SELECTION); return; }

    // 플레이어 라운드 토큰 사용량 초기화
    this.players.forEach(p => {
      p.tokensUsedThisRound = 0;
      p.currentDateNpcId = null;
    });

    this.matches[round.number] = {};
    this.setState(GameState.ROUND_INTRO);
    this.emit('roundIntro', { round });
  }

  /** 스탯 공개 (라운드 reveal phase) */
  revealRoundStat() {
    const round = this.getCurrentRound();
    if (round.revealStat) {
      this.npcs.forEach(npc => {
        npc.revealedStats[round.revealStat] = npc.stats[round.revealStat];
      });
    }
    if (round.revealNPCCard) {
      this.npcs.forEach(npc => { npc.publicCardIndex = 0; });
    }
    this.setState(GameState.ROUND_REVEAL);
    this.emit('roundReveal', { round, npcs: this.npcs });
  }

  /** 매칭 시작 */
  startMatching() {
    this.setState(GameState.MATCHING);
  }

  performMatching(selections) {
    const round = this.getCurrentRound();
    switch (round.matchType) {
      case 'random': return this._randomMatch();
      case 'open': return this._openMatch(selections);
      case 'group': return this._groupMatch();
      case 'blind': return this._blindMatch(selections);
      case 'free': return this._freeMatch(selections);
    }
  }

  // ===== DATING / TOKENS =====

  /** 이번 라운드에 남은 토큰 사용 가능량 */
  getRemainingRoundTokens(playerId) {
    const player = this.players.find(p => p.id === playerId);
    const round = this.getCurrentRound();
    if (!player || !round) return 0;
    const roundLimit = round.tokenLimit;
    const used = player.tokensUsedThisRound;
    const remaining = player.tokens;
    return Math.min(roundLimit - used, remaining);
  }

  /** 탐색 (공개 소비 — 공동 은행으로) */
  investigate(playerId, npcId, infoType, targetIndex = -1) {
    const player = this.players.find(p => p.id === playerId);
    const npc = this.npcs.find(n => n.id === npcId);
    if (!player || !npc) return null;
    if (this.getRemainingRoundTokens(playerId) <= 0) return null;
    if (this.getCurrentRound().appealOnly) return null;

    if (!player.revealedInfo[npcId]) {
      player.revealedInfo[npcId] = { traits: [], cards: [] };
    }

    const info = player.revealedInfo[npcId];
    let revealed = null;

    if (infoType === 'trait') {
      if (targetIndex >= 0 && targetIndex < npc.traits.length) {
        const trait = npc.traits[targetIndex];
        if (!info.traits.includes(trait)) {
          revealed = { type: 'trait', value: trait, index: targetIndex };
          info.traits.push(trait);
        }
      } else {
        const unrevealed = npc.traits.filter(t => !info.traits.includes(t));
        if (unrevealed.length > 0) {
          revealed = { type: 'trait', value: unrevealed[0], index: npc.traits.indexOf(unrevealed[0]) };
          info.traits.push(unrevealed[0]);
        }
      }
    } else if (infoType === 'card') {
      if (targetIndex >= 0 && targetIndex < npc.preferenceCards.length) {
        const card = npc.preferenceCards[targetIndex];
        if (!info.cards.includes(card.id)) {
          revealed = { type: 'card', value: card, index: targetIndex };
          info.cards.push(card.id);
          player.hiddenCardsRevealed++;
        }
      } else {
        const hiddenCards = npc.preferenceCards.filter((c, i) =>
          i !== npc.publicCardIndex && !info.cards.includes(c.id)
        );
        if (hiddenCards.length > 0) {
          revealed = { type: 'card', value: hiddenCards[0], index: npc.preferenceCards.indexOf(hiddenCards[0]) };
          info.cards.push(hiddenCards[0].id);
          player.hiddenCardsRevealed++;
        }
      }
    }

    if (revealed) {
      player.tokens--;
      player.tokensUsedThisRound++;
      this.emit('tokenSpent', { playerId, type: 'investigate' });
      this.emit('investigated', { playerId, npcId, revealed });
    }

    return revealed;
  }

  /** 어필 투자 (비밀 — 어필 상자로) */
  appeal(playerId, npcId, count = 1) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    const available = this.getRemainingRoundTokens(playerId);
    const actual = Math.min(count, available);
    if (actual <= 0) return false;

    if (!player.appealTokens[npcId]) player.appealTokens[npcId] = 0;
    player.appealTokens[npcId] += actual;
    player.tokens -= actual;
    player.tokensUsedThisRound += actual;

    if (this.currentRound >= 4) {
      if (player.lastAppealTarget && player.lastAppealTarget !== npcId) {
        player.changedTargetAfterR5 = true;
      }
    }
    player.lastAppealTarget = npcId;

    this.emit('tokenSpent', { playerId, type: 'appeal', count: actual });
    this.emit('appealed', { playerId, npcId });
    return true;
  }

  // ===== ROUND TRANSITION =====
  nextRound() {
    this.currentRound++;
    if (this.currentRound >= this.rounds.length) {
      this.setState(GameState.FINAL_SELECTION);
    } else {
      this.startRound();
    }
  }

  // ===== MATCHING METHODS =====
  _randomMatch() {
    const npcIds = this.npcs.map(n => n.id);
    const shuffled = [...npcIds].sort(() => Math.random() - 0.5);
    const result = {};
    this.players.forEach((p, i) => { result[p.id] = shuffled[i]; p.currentDateNpcId = shuffled[i]; });
    this.matches[this.getCurrentRound().number] = result;
    this._recordDateHistory(result);
    return { matches: result, conflicts: [] };
  }

  _openMatch(selections) {
    // 드래프트 방식: selections는 이미 순서대로 확정된 결과
    const result = {};
    selections.forEach(({ playerId, npcId }) => {
      result[playerId] = npcId;
    });
    Object.entries(result).forEach(([pid, nid]) => {
      const p = this.players.find(pl => pl.id === pid);
      if (p) p.currentDateNpcId = nid;
    });
    this.matches[this.getCurrentRound().number] = result;
    this._recordDateHistory(result);
    return { matches: result, conflicts: [] };
  }

  /** 드래프트 순서 — 실제 순서는 현실에서 알아서 정함, 웹에서는 기본 순서 */
  getDraftOrder() {
    return this.players.map((_, i) => i);
  }

  _groupMatch() {
    // 인접 플레이어 기반 2:2 그룹 — Player [0,1] vs [2,3]
    const sn = [...this.npcs].sort(() => Math.random() - 0.5);
    const result = {};
    const groups = [
      { players: [this.players[0], this.players[1]], npcs: [sn[0], sn[1]] },
      { players: [this.players[2], this.players[3]], npcs: [sn[2], sn[3]] },
    ];
    groups.forEach(g => {
      g.players.forEach((p, i) => {
        result[p.id] = g.npcs[i].id;
        p.currentDateNpcId = g.npcs[i].id;
      });
    });
    // 그룹 정보 저장 (그룹 데이트 UI에서 사용)
    this.currentGroups = groups.map(g => ({
      playerIds: g.players.map(p => p.id),
      npcIds: g.npcs.map(n => n.id),
    }));
    this.matches[this.getCurrentRound().number] = result;
    this._recordDateHistory(result);
    return { matches: result, conflicts: [], groups };
  }

  _blindMatch(selections) {
    const result = {};
    const conflicts = [];
    const npcPickers = {};

    Object.entries(selections).forEach(([pid, nid]) => {
      if (!npcPickers[nid]) npcPickers[nid] = [];
      npcPickers[nid].push(pid);
    });

    Object.entries(npcPickers).forEach(([nid, pids]) => {
      if (pids.length === 1) {
        result[pids[0]] = nid;
      } else {
        const rolls = pids.map(pid => ({ playerId: pid, roll: Math.floor(Math.random() * 6) + 1 }));
        rolls.sort((a, b) => b.roll - a.roll);
        let winner = rolls[0];
        const tied = rolls.filter(r => r.roll === winner.roll);
        if (tied.length > 1) {
          tied.forEach(r => { r.roll = Math.floor(Math.random() * 6) + 1; });
          tied.sort((a, b) => b.roll - a.roll);
          winner = tied[0];
        }
        result[winner.playerId] = nid;
        const wp = this.players.find(p => p.id === winner.playerId);
        if (wp) wp.blindPickWins++;

        pids.filter(pid => pid !== winner.playerId).forEach(pid => {
          const loser = this.players.find(p => p.id === pid);
          if (loser) {
            loser.lonelySuppersCount++;
            const avail = MISSION_CARDS.filter(m => !loser.personalMissions.find(pm => pm.id === m.id));
            if (avail.length > 0) loser.personalMissions.push(avail[Math.floor(Math.random() * avail.length)]);
          }
        });
        conflicts.push({ npcId: nid, rolls, winner: winner.playerId, losers: pids.filter(p => p !== winner.playerId) });
      }
    });

    Object.entries(result).forEach(([pid, nid]) => {
      const p = this.players.find(pl => pl.id === pid);
      if (p) p.currentDateNpcId = nid;
    });
    this.matches[this.getCurrentRound().number] = result;
    this._recordDateHistory(result);
    return { matches: result, conflicts };
  }

  _freeMatch(selections) {
    const result = {};
    Object.entries(selections).forEach(([pid, nid]) => {
      result[pid] = nid;
      const p = this.players.find(pl => pl.id === pid);
      if (p) p.currentDateNpcId = nid;
    });
    this.matches[this.getCurrentRound().number] = result;
    this._recordDateHistory(result);
    return { matches: result, conflicts: [] };
  }

  _recordDateHistory(matches) {
    const rn = this.getCurrentRound().number;
    Object.entries(matches).forEach(([pid, nid]) => { this.dateHistory.push({ round: rn, playerId: pid, npcId: nid }); });
  }

  // ===== FINAL SELECTION =====
  performFinalSelection(selections) {
    const results = [];
    const npcChoices = {};

    this.npcs.forEach(npc => {
      const suitors = Object.entries(selections)
        .filter(([_, nid]) => nid === npc.id)
        .map(([pid]) => this.players.find(p => p.id === pid))
        .filter(Boolean);

      if (suitors.length === 0) { npcChoices[npc.id] = null; return; }

      const scores = suitors.map(player => {
        const compat = calculateCompatibility(npc.preferenceCards, player);
        const appeal = player.appealTokens[npc.id] || 0;
        return { player, compatibility: compat, appealCount: appeal, totalScore: compat + appeal * 2 };
      });
      scores.sort((a, b) => b.totalScore - a.totalScore);
      npcChoices[npc.id] = scores[0].player.id;
    });

    this.players.forEach(player => {
      const chosenNpcId = selections[player.id];
      const chosenNpc = this.npcs.find(n => n.id === chosenNpcId);
      const coupleFormed = npcChoices[chosenNpcId] === player.id;

      let compatibilityScore = 0;
      if (chosenNpc) compatibilityScore = calculateCompatibility(player.preferenceCards, chosenNpc);

      let missionBonus = 0;
      const allMissions = [...this.publicMissions, ...player.personalMissions];
      const completedMissions = [];
      allMissions.forEach(m => {
        try { if (m.check(player, chosenNpc)) { missionBonus += m.points; completedMissions.push(m); } } catch (e) {}
      });

      results.push({
        player, chosenNpc,
        npcChosePlayer: npcChoices[chosenNpcId],
        coupleFormed,
        compatibilityScore,
        missionBonus,
        completedMissions,
        totalScore: (coupleFormed ? compatibilityScore : 0) + missionBonus,
        appealTokensUsed: player.appealTokens[chosenNpcId] || 0,
      });
    });

    results.sort((a, b) => b.totalScore - a.totalScore);
    this.emit('gameEnd', { results, npcChoices });
    this.setState(GameState.RESULTS);
    return results;
  }

  // ===== UTILITIES =====
  getDateCount(pid, nid) { return this.dateHistory.filter(d => d.playerId === pid && d.npcId === nid).length; }

  getKnownInfo(pid, nid) {
    const p = this.players.find(pl => pl.id === pid);
    const n = this.npcs.find(np => np.id === nid);
    if (!p || !n) return null;
    return {
      revealedStats: { ...n.revealedStats },
      revealedTraits: p.revealedInfo[nid]?.traits || [],
      revealedCards: p.revealedInfo[nid]?.cards || [],
      publicCard: n.publicCardIndex >= 0 ? n.preferenceCards[n.publicCardIndex] : null,
      totalTraits: n.traits.length,
      totalHiddenCards: n.preferenceCards.filter((_, i) => i !== n.publicCardIndex).length,
      dateCount: this.getDateCount(pid, nid),
      appealTokens: p.appealTokens[nid] || 0,
    };
  }

  hasUnrevealedInfo(pid, nid) {
    const info = this.getKnownInfo(pid, nid);
    if (!info) return false;
    return info.revealedTraits.length < info.totalTraits || info.revealedCards.length < info.totalHiddenCards;
  }
}
