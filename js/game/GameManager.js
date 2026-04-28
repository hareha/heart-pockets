import { CHARACTER_CARDS, STAT_KEYS, TOTAL_STAT_POINTS, generateRandomNPCStats } from '../data/characters.js';
import { pickRandomTraits } from '../data/traits.js';
import { PREFERENCE_CARDS, MISSION_CARDS, pickRandomCards, calculateCompatibility } from '../data/cards.js';
import { ROUND_EVENTS, LOCATION_CARDS, DATE_EVENTS, drawCard } from '../data/events.js';

/**
 * 라운드 정의
 */
const ROUNDS = [
  { number: 1, name: '첫인상', emoji: '💫', matchType: 'reveal_phase',
    revealStat: 'looks', revealNPCCard: false, infoShared: true,
    intro: '첫인상 시간! 외모 스탯이 공개됩니다.\n돌아가면서 NPC의 특성을 하나씩 전체 공개합니다.',
    revealDesc: '💎 외모 스탯이 공개됩니다!',
  },
  { number: 2, name: '자기소개', emoji: '🗣️', matchType: 'open',
    revealStat: 'age', revealNPCCard: false, infoShared: true,
    intro: '자기소개 시간! 나이가 공개됩니다.\n순서대로 원하는 상대를 선택합니다.',
    revealDesc: '🎂 나이 스탯이 공개됩니다!',
  },
  { number: 3, name: '그룹 데이트', emoji: '👥', matchType: 'group',
    revealStat: 'personality', revealNPCCard: true, infoShared: true,
    intro: '그룹 데이트! 성격이 공개되고 NPC 취향카드 1장이 공개됩니다.\n2:2로 나뉘어 데이트합니다.',
    revealDesc: '💖 성격 스탯 + 🃏 취향카드 1장이 공개됩니다!',
  },
  { number: 4, name: '경쟁 데이트', emoji: '🔥', matchType: 'blind',
    revealStat: 'wealth', revealNPCCard: false, infoShared: false,
    intro: '경쟁 데이트! 재력이 공개되어 모든 메인스탯이 오픈!\n블라인드픽으로 경쟁합니다. 겹치면 주사위 대결!',
    revealDesc: '💰 재력 스탯이 공개됩니다! (메인스탯 전부 오픈!)',
  },
  { number: 5, name: '폭풍전야', emoji: '🌪️', matchType: 'blind',
    revealStat: null, revealNPCCard: false, infoShared: false,
    intro: '폭풍전야! 마지막 정보전!\n블라인드픽으로 경쟁합니다.',
    revealDesc: null,
  },
];

export const GameState = {
  LOBBY: 'lobby',
  SETUP: 'setup',
  ROUND_INTRO: 'round_intro',
  ROUND_EVENT: 'round_event',
  ROUND_REVEAL: 'round_reveal',
  TRAIT_REVEAL: 'trait_reveal',
  MATCHING: 'matching',
  DATING: 'dating',
  ROUND_END: 'round_end',
  FINAL_SELECTION: 'final_selection',
  RESULTS: 'results',
};



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
    // 이벤트/장소 시스템
    this.currentRoundEvent = null;
    this.currentLocationCard = null;
    this.usedEventIds = [];
    this.usedLocationIds = [];
    this._dateEvents = DATE_EVENTS;
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
        // 정보
        revealedInfo: {},
        currentDateNpcId: null,
        // 트래킹
        blindPickWins: 0,
        lonelySuppersCount: 0,
        hiddenCardsRevealed: 0,
        personalMissions: [],
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
      revealedStats: {},
    }));
    this.npcs.forEach(n => { n.mainStats = n.stats; });

    this.publicMissions = pickRandomCards(MISSION_CARDS, 3);
    this.currentRound = 0;
    this.currentPlayerIndex = 0;
    this.dateHistory = [];
    this.matches = {};
    this.usedEventIds = [];
    this.usedLocationIds = [];

    this.emit('gameReady', { players: this.players, npcs: this.npcs });
  }

  setState(s) { this.state = s; this.emit('stateChange', { state: s }); }
  getCurrentRound() { return this.rounds[this.currentRound]; }
  getCurrentPlayer() { return this.players[this.currentPlayerIndex]; }

  // ===== ROUND FLOW =====
  startRound() {
    const round = this.getCurrentRound();
    if (!round) { this.setState(GameState.FINAL_SELECTION); return; }

    // 라운드 초기화
    this.players.forEach(p => {
      p.currentDateNpcId = null;
    });

    // 라운드 이벤트 뽑기
    this.currentRoundEvent = drawCard(ROUND_EVENTS, this.usedEventIds);
    this.usedEventIds.push(this.currentRoundEvent.id);
    this._applyRoundEvent(this.currentRoundEvent);


    this.matches[round.number] = {};
    this.currentLocationCard = null;
    this.setState(GameState.ROUND_INTRO);
    this.emit('roundIntro', { round, event: this.currentRoundEvent });
  }

  /** 라운드 이벤트 효과 적용 */
  _applyRoundEvent(event) {
    this._eventConversionRate = 1;
    this._eventInvestigationPrivate = false;
    const e = event.effect;
    switch (e.type) {
      case 'conversion_bonus':
        this._eventConversionRate = e.value;
        break;
      case 'investigation_private':
        this._eventInvestigationPrivate = true;
        break;
      default:
        break;
    }
  }

  /** 장소 카드 뽑기 (데이트 시작 시) */
  drawLocationCard() {
    this.currentLocationCard = drawCard(LOCATION_CARDS, this.usedLocationIds);
    this.usedLocationIds.push(this.currentLocationCard.id);
    this.emit('locationDrawn', { location: this.currentLocationCard });
    return this.currentLocationCard;
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

  // ===== INVESTIGATE ACTIONS =====

  /** 탐색 */
  investigate(playerId, npcId, infoType, targetIndex = -1) {
    const player = this.players.find(p => p.id === playerId);
    const npc = this.npcs.find(n => n.id === npcId);
    if (!player || !npc) return null;

    // 장소 효과: 탐색 불가
    const loc = this.currentLocationCard;
    // 장소 효과: 탐색 불가 체크 (추후 장소 카드 시스템 구현 시 활용)

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
      // R1~R3 정보 공유 (이벤트로 비공개 강제 가능)
      const round = this.getCurrentRound();
      const shared = round.infoShared && !this._eventInvestigationPrivate;
      if (shared) {
        this.players.forEach(other => {
          if (other.id === playerId) return;
          if (!other.revealedInfo[npcId]) other.revealedInfo[npcId] = { traits: [], cards: [] };
          if (revealed.type === 'trait' && !other.revealedInfo[npcId].traits.includes(revealed.value)) {
            other.revealedInfo[npcId].traits.push(revealed.value);
          }
          if (revealed.type === 'card' && !other.revealedInfo[npcId].cards.includes(revealed.value.id)) {
            other.revealedInfo[npcId].cards.push(revealed.value.id);
          }
        });
      }
      this.emit('investigated', { playerId, npcId, revealed, shared });
    }
    return revealed;
  }

  /** 데이트 중 이벤트 카드 뽑기 */
  drawDateEvent(playerId, npcId) {
    const player = this.players.find(p => p.id === playerId);
    const npc = this.npcs.find(n => n.id === npcId);
    if (!player || !npc) return null;
    const event = this._dateEvents[Math.floor(Math.random() * this._dateEvents.length)];
    this.emit('dateEvent', { playerId, npcId, event });
    return event;
  }

  /** R1 특성 전체공개 (전원 영구 공유) */
  revealTraitPublic(playerId, npcId, traitIndex) {
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc || traitIndex < 0 || traitIndex >= npc.traits.length) return null;
    const trait = npc.traits[traitIndex];
    if (!npc._publicTraits) npc._publicTraits = [];
    if (npc._publicTraits.includes(traitIndex)) return null;
    npc._publicTraits.push(traitIndex);
    this.players.forEach(p => {
      if (!p.revealedInfo[npcId]) p.revealedInfo[npcId] = { traits: [], cards: [] };
      if (!p.revealedInfo[npcId].traits.includes(trait)) {
        p.revealedInfo[npcId].traits.push(trait);
      }
    });
    this.emit('traitRevealed', { playerId, npcId, trait, traitIndex });
    return { type: 'trait', value: trait, index: traitIndex };
  }

  /** R1 특성공개 라운드에서 아직 공개 안 된 특성 있는지 */
  getUnrevealedPublicTraits(npcId) {
    const npc = this.npcs.find(n => n.id === npcId);
    if (!npc) return [];
    const revealed = npc._publicTraits || [];
    return npc.traits.map((t, i) => revealed.includes(i) ? null : { trait: t, index: i }).filter(Boolean);
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
    const rivalries = {}; // 경합 정보

    // ── STEP 1: NPC별 후보 평가 & 선택 ──
    this.npcs.forEach(npc => {
      const suitors = Object.entries(selections)
        .filter(([_, nid]) => nid === npc.id)
        .map(([pid]) => this.players.find(p => p.id === pid))
        .filter(Boolean);

      if (suitors.length === 0) { npcChoices[npc.id] = null; return; }

      const npcCutline = npc.preferenceCards.reduce((sum, c) => sum + (c.cutline || 5), 0);
      const scored = suitors.map(player => {
        const compat = calculateCompatibility(npc.preferenceCards, player);
        const passesCutline = compat >= npcCutline;
        const dateCount = this.getDateCount(player.id, npc.id);
        return { player, compat, passesCutline, npcCutline, dateCount };
      });

      // 커트라인 통과자만 후보
      const eligible = scored.filter(s => s.passesCutline);

      if (eligible.length === 0) {
        // 모두 커트라인 미달 → NPC 거절
        npcChoices[npc.id] = null;
        rivalries[npc.id] = { candidates: scored, contested: false, allRejected: true };
        return;
      }

      // 궁합 → 동점 시 데이트 횟수
      eligible.sort((a, b) =>
        b.compat - a.compat ||
        b.dateCount - a.dateCount
      );

      npcChoices[npc.id] = eligible[0].player.id;
      rivalries[npc.id] = { candidates: scored, contested: eligible.length > 1 };
    });

    // ── STEP 2: 각 플레이어 최종 점수 ──
    this.players.forEach(player => {
      const chosenNpcId = selections[player.id];
      const chosenNpc = this.npcs.find(n => n.id === chosenNpcId);
      const coupleFormed = npcChoices[chosenNpcId] === player.id;

      // 궁합 = NPC 취향카드 3장 합산
      let compatibilityScore = 0;
      let npcCutline = 15; // 기본값
      if (chosenNpc) {
        compatibilityScore = calculateCompatibility(chosenNpc.preferenceCards, player);
        npcCutline = chosenNpc.preferenceCards.reduce((sum, c) => sum + (c.cutline || 5), 0);
      }
      const passesCutline = compatibilityScore >= npcCutline;

      // 미션 보너스
      let missionBonus = 0;
      const allMissions = [...this.publicMissions, ...player.personalMissions];
      const completedMissions = [];
      allMissions.forEach(m => {
        try { if (m.check(player, chosenNpc)) { missionBonus += m.points; completedMissions.push(m); } } catch (e) {}
      });

      // 경합 정보
      const rivalry = rivalries[chosenNpcId];
      const wasContested = rivalry?.contested || false;
      const npcRejected = !coupleFormed && rivalry?.allRejected;

      // 최종 점수 = 커플 성사 시 궁합, 미성사 시 0
      const totalScore = (coupleFormed ? compatibilityScore : 0) + missionBonus;

      results.push({
        player, chosenNpc,
        npcChosePlayer: npcChoices[chosenNpcId],
        coupleFormed,
        compatibilityScore,
        passesCutline,
        missionBonus,
        completedMissions,
        totalScore,
        wasContested,
        npcRejected,
      });
    });

    results.sort((a, b) => b.totalScore - a.totalScore);
    this.emit('gameEnd', { results, npcChoices, rivalries });
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
    };
  }

  hasUnrevealedInfo(pid, nid) {
    const info = this.getKnownInfo(pid, nid);
    if (!info) return false;
    return info.revealedTraits.length < info.totalTraits || info.revealedCards.length < info.totalHiddenCards;
  }
}
