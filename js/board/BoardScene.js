import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  renderCharacterCard, renderCardBack,
  renderPreferenceCard, renderPreferenceCardBack,
  renderTraitTile, renderTraitTileBack,
  renderRoundBoard, renderEmptySlot,
} from './CardRenderer.js';

const TABLE_R = 16;
const CARD_W = 2.8, CARD_H = 1.45, CARD_D = 0.025;
const PREF_W = CARD_W / 3 - 0.06, PREF_H = 1.3;

const TOKEN_R = 0.16;
const P_ANGLES = [0, Math.PI/2, Math.PI, Math.PI*1.5];
const P_DIST = 11;
const NPC_DIST = 4.2;
const NPC_ANGLES_OFFSET = Math.PI / 4;
// 플레이어 영역: 캐릭터시트 2개 나란히 (내것 + 데이트상대)
const SLOT_GAP = 0.25;
const SLOT_OFFSET = (CARD_W + SLOT_GAP) / 2; // 각 시트의 x오프셋

export class BoardScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.meshes = {};
    this.groups = {};
    this.npcOrigPos = [];
    this.roundBoardMesh = null;
    this._playerMats = [];
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._hoveredMat = null;
    this.onPlayerMatClick = null;
    // 3D 선택 모드
    this._selectionMode = null; // 'trait' | 'card' | null
    this._selectableObjects = [];
    this._selectionCallback = null;
    this._hoveredSelectable = null;
    this._npcCardMeshes = [];
    this._initRenderer();
    this._initLighting();
    this._buildTable();
    this._initInteraction();
    this._animate();
    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1c1c2a);
    this.camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 120);
    this.camera.position.set(0, 24, 20);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, logarithmicDepthBuffer: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.minPolarAngle = Math.PI / 8;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 42;
    this.controls.target.set(0, 0, 0);
  }

  _initLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const s1 = new THREE.SpotLight(0xfff8f0, 5, 70, Math.PI/2.5, 0.3);
    s1.position.set(0, 30, 0); s1.castShadow = true;
    s1.shadow.mapSize.set(1024,1024); this.scene.add(s1);
    const s2 = new THREE.SpotLight(0xfff0e0, 2.5, 55, Math.PI/3, 0.5);
    s2.position.set(12, 22, 12); this.scene.add(s2);
    [[-14,10,-14],[14,10,-14],[14,10,14],[-14,10,14]].forEach(p => {
      const l = new THREE.PointLight(0xfff5ee, 0.5, 36);
      l.position.set(...p); this.scene.add(l);
    });
  }

  _initInteraction() {
    this.canvas.addEventListener('mousemove', e => {
      this._mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this._mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      this._raycaster.setFromCamera(this._mouse, this.camera);

      // 선택모드일 때 → 선택가능 오브젝트 호버
      if (this._selectionMode && this._selectableObjects.length > 0) {
        const hits = this._raycaster.intersectObjects(this._selectableObjects);
        const hit = hits.length > 0 ? hits[0].object : null;
        if (this._hoveredSelectable !== hit) {
          if (this._hoveredSelectable) this._hoveredSelectable.position.y -= 0.08;
          this._hoveredSelectable = hit;
          if (hit) { hit.position.y += 0.08; this.canvas.style.cursor = 'pointer'; }
          else { this.canvas.style.cursor = ''; }
        }
        return;
      }

      // 일반모드 → NPC 카드 호버
      const npcHits = this._raycaster.intersectObjects(this._npcCardMeshes);
      if (npcHits.length > 0) {
        this.canvas.style.cursor = 'pointer';
        return;
      }

      // 일반모드 → 매트 호버
      const hits = this._raycaster.intersectObjects(this._playerMats);
      const hit = hits.length > 0 ? hits[0].object : null;
      if (this._hoveredMat !== hit) {
        if (this._hoveredMat) {
          const pi = this._hoveredMat.userData.playerIdx;
          const bdr = this.meshes[`player-border-${pi}`];
          if (bdr && !bdr._active) { bdr.material.opacity = 0.2; bdr.material.color.set(0x6b7280); }
          this._hoveredMat.material.opacity = 0.55;
        }
        this._hoveredMat = hit;
        if (hit) {
          const pi = hit.userData.playerIdx;
          const bdr = this.meshes[`player-border-${pi}`];
          if (bdr && !bdr._active) { bdr.material.opacity = 0.35; bdr.material.color.set(0x94a3b8); }
          hit.material.opacity = 0.65;
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = '';
        }
      }
    });

    let downX = 0, downY = 0;
    this.canvas.addEventListener('mousedown', e => { downX = e.clientX; downY = e.clientY; });
    this.canvas.addEventListener('click', e => {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (dx * dx + dy * dy > 25) return;
      this._mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this._mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      this._raycaster.setFromCamera(this._mouse, this.camera);

      // 선택모드 클릭
      if (this._selectionMode && this._selectableObjects.length > 0) {
        const hits = this._raycaster.intersectObjects(this._selectableObjects);
        if (hits.length > 0) {
          const obj = hits[0].object;
          if (this._selectionCallback) this._selectionCallback(obj.userData);
        }
        return;
      }

      // NPC 카드 클릭 → 줌인
      const npcHits = this._raycaster.intersectObjects(this._npcCardMeshes);
      if (npcHits.length > 0) {
        const ud = npcHits[0].object.userData;
        if (ud.npcId) this.focusOnNPCCard(ud.npcId);
        return;
      }

      // 일반모드 → 매트 클릭
      const hits = this._raycaster.intersectObjects(this._playerMats);
      if (hits.length > 0) {
        const pi = hits[0].object.userData.playerIdx;
        this.focusOnPlayer(pi);
        if (this.onPlayerMatClick) this.onPlayerMatClick(pi);
      }
    });
  }

  _buildTable() {
    const tGeo = new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.22, 64);
    const tMat = new THREE.MeshStandardMaterial({ color: 0x2d2d3a, roughness: 0.6 });
    const table = new THREE.Mesh(tGeo, tMat);
    table.position.y = -0.11; table.receiveShadow = true;
    this.scene.add(table);
    const eGeo = new THREE.TorusGeometry(TABLE_R, 0.12, 12, 64);
    const eMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.4, metalness: 0.2 });
    const edge = new THREE.Mesh(eGeo, eMat);
    edge.rotation.x = -Math.PI/2; edge.position.y = 0.01;
    this.scene.add(edge);
    const feltGeo = new THREE.CylinderGeometry(TABLE_R - 0.5, TABLE_R - 0.5, 0.02, 64);
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x35354a, roughness: 0.85 });
    const felt = new THREE.Mesh(feltGeo, feltMat);
    felt.position.y = 0.01; felt.receiveShadow = true;
    this.scene.add(felt);
  }

  // ── 중앙 라운드 보드 ──
  buildRoundBoard(currentRound, rounds) {
    if (this.roundBoardMesh) this.scene.remove(this.roundBoardMesh);
    const tex = this._cTex(renderRoundBoard(currentRound, rounds));
    const geo = new THREE.CylinderGeometry(2.5, 2.5, 0.07, 48);
    const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3a2060, roughness: 0.5, metalness: 0.3 });
    const botMat = new THREE.MeshStandardMaterial({ color: 0x2a1540 });
    this.roundBoardMesh = new THREE.Mesh(geo, [sideMat, topMat, botMat]);
    this.roundBoardMesh.position.y = 0.06; this.roundBoardMesh.receiveShadow = true;
    this.scene.add(this.roundBoardMesh);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.035, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.4 })
    );
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.1; ring.name = 'center-ring';
    const old = this.scene.getObjectByName('center-ring');
    if (old) this.scene.remove(old);
    this.scene.add(ring);
    const mkOld = this.scene.getObjectByName('round-marker');
    if (mkOld) this.scene.remove(mkOld);
    const mkAngle = -Math.PI/2 + (currentRound / rounds.length) * Math.PI * 2;
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.6 })
    );
    marker.position.set(Math.cos(mkAngle)*1.6, 0.25, Math.sin(mkAngle)*1.6);
    marker.name = 'round-marker';
    this.scene.add(marker);
  }

  // ── NPC 카드 (중앙 다이아몬드) ──
  buildNPCCards(npcs) {
    this._npcsRef = npcs; // 선택모드에서 참조용
    npcs.forEach((npc, i) => {
      const a = P_ANGLES[i] + NPC_ANGLES_OFFSET;
      const x = Math.cos(a) * NPC_DIST;
      const z = Math.sin(a) * NPC_DIST;
      const g = new THREE.Group();
      g.position.set(x, 0.03, z);
      // 카드 텍스트가 바깥을 향하도록 (읽는 사람 시점)
      g.rotation.y = -a + Math.PI / 2;

      const backTex = this._cTex(renderCardBack(npc.gender));
      const frontTex = this._cTex(renderCharacterCard(npc, npc.revealedStats || {}));
      const card = this._mkCard(CARD_W, CARD_H, backTex, frontTex, true);
      card.userData = { type: 'npc-card', npcId: npc.id, npcIdx: i };
      g.add(card);
      this._npcCardMeshes.push(card);

      // 취향카드 3장 (양면 별도 렌더 — 뒷면=top, 앞면=bot, faceDown이라 top이 보임)
      const prefBack = this._cTex(renderPreferenceCardBack());
      const gap = 0.08;
      const totalPW = PREF_W * 3 + gap * 2;
      const sx = -totalPW / 2 + PREF_W / 2;
      for (let c = 0; c < 3; c++) {
        // 앞면은 아직 비어있으므로 back과 동일하게 세팅 (revealNPCPrefCard에서 교체)
        const prefFront = this._cTex(renderPreferenceCardBack());
        const pf = this._mkCard(PREF_W, PREF_H, prefBack, prefFront, true);
        pf.position.set(sx + c * (PREF_W + gap), CARD_D * (c+1) + 0.01, CARD_H/2 + PREF_H/2 + 0.12);
        pf.userData = { type: 'npc-pref', npcId: npc.id, cardIndex: c };
        g.add(pf);
        this.meshes[`${npc.id}-pref-${c}`] = pf;
      }

      // ── 특성 타일 5개 (실제 양면 카드 기물) ──
      // 캔버스→3D 좌표 변환
      const pxToW = CARD_W / 660, pxToH = CARD_H / 340;
      const traitSlotY0 = 38;
      const TRAIT_3D_W = 0.98, TRAIT_3D_H = 0.19;
      const traitBaseX = (412 * pxToW - CARD_W / 2) + (232 * pxToW) / 2;
      for (let t = 0; t < 5; t++) {
        const canvasY = traitSlotY0 + t * (44 + 8);
        const localZ = (canvasY + 44/2) * pxToH - CARD_H / 2;

        const traitName = npc.traits?.[t] || '???';
        const backTex = this._cTex(renderTraitTileBack());
        const frontTex = this._cTex(renderTraitTile(traitName));
        const tile = this._mkCard(TRAIT_3D_W, TRAIT_3D_H, backTex, frontTex, true); // faceDown=true
        tile.position.set(traitBaseX, CARD_D + 0.02, localZ);
        tile.userData = { type: 'npc-trait', npcId: npc.id, traitIndex: t, revealed: false };
        g.add(tile);
        this.meshes[`${npc.id}-trait-${t}`] = tile;
      }

      // 이름
      const nTex = this._cTex(this._textCanvas(npc.name, 200, 48, 20));
      const nP = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.28),
        new THREE.MeshBasicMaterial({ map: nTex, transparent: true }));
      nP.rotation.x = -Math.PI/2;
      nP.position.set(0, 0.06, -CARD_H/2 - 0.25);
      g.add(nP);

      this.scene.add(g);
      this.groups[`npc-${npc.id}`] = g;
      this.meshes[`npc-card-${npc.id}`] = card;
      this.npcOrigPos[i] = { x, z, ry: g.rotation.y };
    });
  }

  // ── 플레이어 카드 (사방) ──
  // 레이아웃: 가로 넓은 매트 위에 [내 캐릭터시트] [데이트슬롯]
  buildPlayerCards(players) {
    this._dateSlotWorld = {};
    this._playerWorldData = {};

    players.forEach((pl, i) => {
      const a = P_ANGLES[i];
      const x = Math.cos(a) * P_DIST;
      const z = Math.sin(a) * P_DIST;
      const ry = -a + Math.PI / 2;
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;

      // ── 가로 넓은 매트 (인터랙티브) ──
      const matW = CARD_W * 2 + SLOT_GAP + 1.6;
      const matH = CARD_H + PREF_H + 2.4;
      const matGeo = new THREE.PlaneGeometry(matW, matH);
      const matMainMat = new THREE.MeshStandardMaterial({
        color: 0x282838, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, roughness: 0.9
      });
      const playerMat = new THREE.Mesh(matGeo, matMainMat);
      playerMat.rotation.x = -Math.PI / 2;
      playerMat.position.set(0, 0.04, 0.6);
      playerMat.userData = { type: 'player-mat', playerIdx: i };
      playerMat.name = `player-mat-${i}`;
      g.add(playerMat);
      this._playerMats.push(playerMat);
      this.meshes[`player-mat-${i}`] = playerMat;

      // 매트 테두리
      const borderGeo = new THREE.PlaneGeometry(matW + 0.06, matH + 0.06);
      const borderMatl = new THREE.MeshStandardMaterial({
        color: 0x6b7280, transparent: true, opacity: 0.2,
        side: THREE.DoubleSide
      });
      const border = new THREE.Mesh(borderGeo, borderMatl);
      border.rotation.x = -Math.PI / 2;
      border.position.set(0, 0.035, 0.6);
      border.name = `player-border-${i}`;
      g.add(border);
      this.meshes[`player-border-${i}`] = border;

      // 왼쪽: 내 캐릭터 카드
      const ft = this._cTex(renderCharacterCard(pl, pl.stats, true));
      const myCard = this._mkCard(CARD_W, CARD_H, ft, ft);
      myCard.position.set(-SLOT_OFFSET, 0.05, 0);
      g.add(myCard);

      // 오른쪽: 데이트 상대 빈 슬롯
      const slotTex = this._cTex(renderEmptySlot('데이트 상대'));
      const dateSlot = this._mkCard(CARD_W, CARD_H, slotTex, slotTex);
      dateSlot.position.set(SLOT_OFFSET, 0.05, 0);
      g.add(dateSlot);
      this.meshes[`player-date-slot-${pl.id}`] = dateSlot;

      // 데이트 슬롯의 월드 좌표 계산 후 저장
      const cosR = Math.cos(ry), sinR = Math.sin(ry);
      this._dateSlotWorld[i] = { x: x + cosR * SLOT_OFFSET, z: z - sinR * SLOT_OFFSET, ry };

      // 토큰/어필 월드 좌표 (비행 애니메이션용)
      const tokLX = -SLOT_OFFSET - CARD_W/2 - 0.5, tokLZ = -0.3;
      const apLX = SLOT_OFFSET + CARD_W/2 + 0.5, apLZ = -0.3;
      this._playerWorldData[pl.id] = {
        tokenWorld: { x: x + cosR*tokLX - sinR*tokLZ, z: z - sinR*tokLX - cosR*tokLZ },
        appealBoxWorld: { x: x + cosR*apLX - sinR*apLZ, z: z - sinR*apLX - cosR*apLZ }
      };

      // 내 취향카드 3장 (내 캐릭터시트 아래)
      const gap = 0.08;
      const totalPW = PREF_W * 3 + gap * 2;
      const sx = -SLOT_OFFSET - totalPW / 2 + PREF_W / 2;
      for (let c = 0; c < 3; c++) {
        const cd = pl.preferenceCards?.[c];
        if (!cd) continue;
        const pt = this._cTex(renderPreferenceCard(cd));
        const pf = this._mkCard(PREF_W, PREF_H, pt, pt);
        pf.position.set(sx + c * (PREF_W + gap), 0.05 + CARD_D*(c+1), CARD_H/2 + PREF_H/2 + 0.12);
        g.add(pf);
      }

      // 토큰 더미 (매트 왼쪽 바깥)
      const tokG = new THREE.Group();
      tokG.position.set(-SLOT_OFFSET - CARD_W/2 - 0.5, 0.03, -0.3);
      this._buildStack(tokG, 13, 0xfbbf24);
      g.add(tokG);
      this.meshes[`player-tokens-${pl.id}`] = tokG;

      // 어필 상자 (매트 오른쪽 바깥)
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4a2060, roughness: 0.5 })
      );
      box.position.set(SLOT_OFFSET + CARD_W/2 + 0.5, 0.175, -0.3);
      box.castShadow = true;
      g.add(box);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25),
        new THREE.MeshBasicMaterial({ map: this._cTex(this._textCanvas('💕',64,64,28)), transparent: true }));
      lbl.rotation.x = -Math.PI/2;
      lbl.position.set(SLOT_OFFSET + CARD_W/2 + 0.5, 0.36, -0.3);
      g.add(lbl);

      // 플레이어 이름
      const nmTex = this._cTex(this._textCanvas(`P${i+1}: ${pl.name}`, 260, 48, 18));
      const nm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.28),
        new THREE.MeshBasicMaterial({ map: nmTex, transparent: true }));
      nm.rotation.x = -Math.PI/2;
      nm.position.set(0, 0.06, CARD_H/2 + PREF_H + 0.55);
      g.add(nm);

      this.scene.add(g);
      this.groups[`player-${pl.id}`] = g;
      this.meshes[`player-card-${pl.id}`] = myCard;
    });
  }

  updateNPCCard(npc, revealedTraitIndices) {
    const m = this.meshes[`npc-card-${npc.id}`]; if (!m) return;
    // 공개된 특성 인덱스 결정: 명시적 전달 > npc._publicTraits > 빈 배열
    const traitIdx = revealedTraitIndices || npc._publicTraits || [];
    const t = this._cTex(renderCharacterCard(npc, npc.revealedStats || {}, false, traitIdx));
    m.material[2] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
    m.material[3] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
  }
  revealNPCPrefCard(npcId, ci, data) {
    const m = this.meshes[`${npcId}-pref-${ci}`]; if (!m) return;
    const frontTex = this._cTex(renderPreferenceCard(data));
    m.material[3] = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.35 });
    m.userData.revealed = true; // 이미 공개됨 마킹
    this._flipCard(m);
  }

  /** 특성 공개 — 캐릭터 카드 텍스처 재렌더 + 특성 타일 뒤집기 */
  revealNPCTrait(npcId, traitIndex, npc, revealedTraitIndices) {
    // 캐릭터 시트 텍스처 업데이트
    const m = this.meshes[`npc-card-${npcId}`]; if (!m) return;
    const t = this._cTex(renderCharacterCard(npc, npc.revealedStats || {}, false, revealedTraitIndices));
    m.material[2] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
    m.material[3] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });

    // 특성 타일 기물 뒤집기
    const tileMesh = this.meshes[`${npcId}-trait-${traitIndex}`];
    if (tileMesh && !tileMesh.userData.revealed) {
      tileMesh.userData.revealed = true;
      this._flipCard(tileMesh);
    }
  }

  /** 특성 선택모드: 미공개 특성 타일 하이라이트 + 클릭 감지 */
  enterTraitSelectionMode(npcId, revealedTraits, callback) {
    this.exitSelectionMode();
    this._selectionMode = 'trait';
    this._selectionCallback = callback;
    this._selectionNpcId = npcId;
    this._selectableObjects = [];
    this._glowingTiles = [];

    // 미공개 타일만 선택 가능 + 글로우 효과
    for (let t = 0; t < 5; t++) {
      const m = this.meshes[`${npcId}-trait-${t}`];
      if (!m) continue;
      if (revealedTraits.includes(t) || m.userData.revealed) {
        // 이미 공개: 선택 불가
        continue;
      }
      // 선택 가능 타일: 글로우 + 살짝 위로
      this._selectableObjects.push(m);
      m.position.y += 0.04;
      // 글로우 링 추가
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.06, 0.27),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.copy(m.position);
      glow.position.y = m.position.y - 0.01;
      glow.name = `trait-glow-${t}`;
      m.parent.add(glow);
      this._glowingTiles.push(glow);
    }

    // 캐릭터 시트도 하이라이트 버전으로 (선택 가능한 슬롯 강조)
    const npc = this._findNPCById(npcId);
    if (npc) {
      const highlightedIndices = [];
      for (let t = 0; t < 5; t++) {
        if (!revealedTraits.includes(t)) highlightedIndices.push(t);
      }
      const cardMesh = this.meshes[`npc-card-${npcId}`];
      if (cardMesh) {
        const hlTex = this._cTex(renderCharacterCard(npc, npc.revealedStats || {}, false, revealedTraits, highlightedIndices));
        cardMesh.material[2] = new THREE.MeshStandardMaterial({ map: hlTex, roughness: 0.35 });
        cardMesh.material[3] = new THREE.MeshStandardMaterial({ map: hlTex, roughness: 0.35 });
      }
    }
  }

  /** 취향카드 선택모드: 카드 emissive glow */
  enterCardSelectionMode(npcId, revealedCards, callback) {
    this.exitSelectionMode();
    this._selectionMode = 'card';
    this._selectionCallback = callback;
    this._selectionNpcId = npcId;
    this._selectableObjects = [];
    for (let c = 0; c < 3; c++) {
      const m = this.meshes[`${npcId}-pref-${c}`];
      if (!m) continue;
      // 이미 뒤집힌 카드(revealed) 또는 revealedCards 인덱스에 포함된 카드 제외
      if (m.userData.revealed || revealedCards.includes(c)) continue;
      if (m.material[2]) { m.material[2].emissive = new THREE.Color(0x60a5fa); m.material[2].emissiveIntensity = 0.4; }
      if (m.material[3]) { m.material[3].emissive = new THREE.Color(0x60a5fa); m.material[3].emissiveIntensity = 0.4; }
      m.material[0] = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.5, roughness: 0.5 });
      this._selectableObjects.push(m);
    }
  }

  /** 선택모드 종료 */
  exitSelectionMode() {
    if (this._selectionNpcId) {
      const npc = this._findNPCById(this._selectionNpcId);
      if (npc) {
        // 카드 텍스처 원래대로 (공개된 특성 포함)
        const cardMesh = this.meshes[`npc-card-${this._selectionNpcId}`];
        if (cardMesh) {
          const traitIdx = npc._publicTraits || [];
          const normalTex = this._cTex(renderCharacterCard(npc, npc.revealedStats || {}, false, traitIdx));
          cardMesh.material[2] = new THREE.MeshStandardMaterial({ map: normalTex, roughness: 0.35 });
          cardMesh.material[3] = new THREE.MeshStandardMaterial({ map: normalTex, roughness: 0.35 });
        }
      }
      // 취향카드 emissive 제거
      for (let c = 0; c < 3; c++) {
        const m = this.meshes[`${this._selectionNpcId}-pref-${c}`];
        if (m) {
          if (m.material[2]) { m.material[2].emissiveIntensity = 0; }
          if (m.material[3]) { m.material[3].emissiveIntensity = 0; }
          m.material[0] = new THREE.MeshStandardMaterial({ color: 0xddd, roughness: 0.5 });
        }
      }
      // 특성 타일 위치 복원
      for (let t = 0; t < 5; t++) {
        const tile = this.meshes[`${this._selectionNpcId}-trait-${t}`];
        if (tile && !tile.userData.revealed && this._selectableObjects.includes(tile)) {
          tile.position.y -= 0.04; // enterTraitSelectionMode에서 올린 만큼 복원
        }
      }
      // 글로우 이펙트 제거
      if (this._glowingTiles) {
        this._glowingTiles.forEach(g => { if (g.parent) g.parent.remove(g); });
        this._glowingTiles = [];
      }
    }
    if (this._hoveredSelectable) {
      this._hoveredSelectable.position.y -= 0.08;
      this._hoveredSelectable = null;
    }
    this._selectionMode = null;
    this._selectionNpcId = null;
    this._selectableObjects = [];
    this._selectionCallback = null;
    this.canvas.style.cursor = '';
  }

  /** NPC ID로 NPC 데이터 찾기 헬퍼 */
  _findNPCById(npcId) {
    return this._npcsRef?.find(n => n.id === npcId) || null;
  }

  moveNPCToPlayer(npcIdx, playerIdx) {
    const nk = Object.keys(this.groups).filter(k => k.startsWith('npc-'));
    if (npcIdx >= nk.length) return;
    const g = this.groups[nk[npcIdx]];
    const slot = this._dateSlotWorld?.[playerIdx];
    if (!slot) return;
    this._animGroup(g, slot.x, slot.z, slot.ry);
  }

  /** 두 플레이어 사이에 NPC 카드 2장을 나란히 배치 + 그룹 인디케이터 */
  moveNPCsBetweenPlayers(npcIndices, playerIdx0, playerIdx1) {
    const a0 = P_ANGLES[playerIdx0];
    const a1 = P_ANGLES[playerIdx1];

    // 두 플레이어 사이 중간 각도
    const midAngle = (a0 + a1) / 2;
    // 매트 중앙 부근에 배치
    const dist = TABLE_R - 5;
    const midX = Math.cos(midAngle) * dist;
    const midZ = Math.sin(midAngle) * dist;
    // 카드가 테이블 중앙을 바라보도록
    const ry = -midAngle + Math.PI / 2;

    const nk = Object.keys(this.groups).filter(k => k.startsWith('npc-'));
    const perpAngle = midAngle + Math.PI / 2;
    const spacing = CARD_W + 0.4; // 3.2 — 겹치지 않으면서 적당히 가까움
    npcIndices.forEach((npcIdx, i) => {
      if (npcIdx >= nk.length) return;
      const g = this.groups[nk[npcIdx]];
      const offset = (i - 0.5) * spacing;
      const tx = midX + Math.cos(perpAngle) * offset;
      const tz = midZ + Math.sin(perpAngle) * offset;
      this._animGroup(g, tx, tz, ry);
    });

    // 그룹 인디케이터: 반투명 매트
    this._clearGroupIndicators();
    const groupFootprint = CARD_H + PREF_H + 1.5; // NPC 그룹 세로 총 길이
    const matW = spacing + CARD_W + 1.0; // 두 카드 전체 + 여백
    const matH = groupFootprint + 0.8;
    const indicatorGeo = new THREE.PlaneGeometry(matW, matH);
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa, transparent: true, opacity: 0.08,
      side: THREE.DoubleSide, roughness: 0.9
    });
    const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    indicator.rotation.x = -Math.PI / 2;
    indicator.rotation.z = -(midAngle - Math.PI / 2);
    indicator.position.set(midX, 0.03, midZ);
    this.scene.add(indicator);
    if (!this._groupIndicators) this._groupIndicators = [];
    this._groupIndicators.push(indicator);

    // 테두리
    const borderGeo = new THREE.PlaneGeometry(matW + 0.1, matH + 0.1);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa, transparent: true, opacity: 0.25,
      side: THREE.DoubleSide
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.rotation.z = -(midAngle - Math.PI / 2);
    border.position.set(midX, 0.025, midZ);
    this.scene.add(border);
    this._groupIndicators.push(border);

    // 그룹 라벨
    const lblTex = this._cTex(this._textCanvas('👥 그룹 데이트', 300, 48, 18));
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.3),
      new THREE.MeshBasicMaterial({ map: lblTex, transparent: true })
    );
    lbl.rotation.x = -Math.PI / 2;
    lbl.rotation.z = -(midAngle - Math.PI / 2);
    const lblDist = dist - matH / 2 - 0.4;
    lbl.position.set(Math.cos(midAngle) * lblDist, 0.06, Math.sin(midAngle) * lblDist);
    this.scene.add(lbl);
    this._groupIndicators.push(lbl);
  }

  /** 그룹 인디케이터 제거 */
  _clearGroupIndicators() {
    if (this._groupIndicators) {
      this._groupIndicators.forEach(m => { this.scene.remove(m); m.geometry?.dispose(); });
      this._groupIndicators = [];
    }
  }

  returnNPCToCenter(npcIdx) {
    const nk = Object.keys(this.groups).filter(k => k.startsWith('npc-'));
    if (npcIdx >= nk.length) return;
    const g = this.groups[nk[npcIdx]];
    const o = this.npcOrigPos[npcIdx]; if (!o) return;
    this._animGroup(g, o.x, o.z, o.ry);
    this._resetNPCCards(npcIdx);
  }

  /** NPC 카드 비주얼 리셋 — 데이트 끝나면 모두 덮기 */
  _resetNPCCards(npcIdx) {
    const nk = Object.keys(this.groups).filter(k => k.startsWith('npc-'));
    if (npcIdx >= nk.length) return;
    const npcId = nk[npcIdx].replace('npc-', '');
    // 취향카드 3장 뒷면으로
    const prefBack = this._cTex(renderPreferenceCardBack());
    for (let c = 0; c < 3; c++) {
      const m = this.meshes[`${npcId}-pref-${c}`];
      if (m) {
        m.material[2] = new THREE.MeshStandardMaterial({ map: prefBack, roughness: 0.35 });
        m.material[3] = new THREE.MeshStandardMaterial({ map: prefBack, roughness: 0.35 });
        m.rotation.x = 0;
      }
    }
    // 캐릭터카드 텍스처를 뒷면으로 리셋 (특성 미공개 상태)
    const cardMesh = this.meshes[`npc-card-${npcId}`];
    if (cardMesh) {
      // NPC 정보로 뒷면 텍스처 복원 — 여기서는 backTex가 이미 설정됨
      // 특별히 하지 않음 (뒷면이 이미 표시됨)
    }
  }

  // ── 토큰 비행 애니메이션 ──
  /** 탐색 시: 토큰 → 테이블 중앙으로 날아가서 사라짐 */
  animateTokenToBank(playerId) {
    const tg = this.meshes[`player-tokens-${playerId}`];
    if (!tg || tg.children.length === 0) return;
    const top = tg.children[tg.children.length - 1];
    tg.remove(top);
    const pw = this._playerWorldData?.[playerId];
    if (!pw) return;
    const start = new THREE.Vector3(pw.tokenWorld.x, 0.5, pw.tokenWorld.z);
    const end = new THREE.Vector3(
      (Math.random() - 0.5) * 2, 0.15, (Math.random() - 0.5) * 2
    );
    top.position.copy(start);
    this.scene.add(top);
    this._flyToken(top, start, end, true); // true = 도착 후 사라짐
  }

  /** 어필 시: 토큰 → 어필 상자 (핑크로 변색 + 비행 후 사라짐) */
  animateTokenToAppealBox(playerId) {
    const tg = this.meshes[`player-tokens-${playerId}`];
    if (!tg || tg.children.length === 0) return;
    const top = tg.children[tg.children.length - 1];
    tg.remove(top);
    const pw = this._playerWorldData?.[playerId];
    if (!pw) return;
    const start = new THREE.Vector3(pw.tokenWorld.x, 0.5, pw.tokenWorld.z);
    const end = new THREE.Vector3(pw.appealBoxWorld.x, 0.45, pw.appealBoxWorld.z);
    top.position.copy(start);
    top.material = new THREE.MeshStandardMaterial({
      color: 0xec4899, roughness: 0.35, metalness: 0.3,
      emissive: 0xec4899, emissiveIntensity: 0.15
    });
    this.scene.add(top);
    this._flyToken(top, start, end, true);
  }

  /** 하위 호환용 */
  spendToken(playerId) { this.animateTokenToBank(playerId); }

  /** 포물선 비행 */
  _flyToken(mesh, start, end, fadeAtEnd) {
    const dur = 550, t0 = performance.now();
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y = Math.max(start.y, end.y) + 1.5;
    const loop = now => {
      const t = Math.min((now - t0) / dur, 1);
      const u = t;
      const a = (1-u)*(1-u), b = 2*(1-u)*u, c = u*u;
      mesh.position.set(
        start.x*a + mid.x*b + end.x*c,
        start.y*a + mid.y*b + end.y*c,
        start.z*a + mid.z*b + end.z*c
      );
      mesh.rotation.y = t * Math.PI * 3;
      if (t < 1) requestAnimationFrame(loop);
      else if (fadeAtEnd) setTimeout(() => this.scene.remove(mesh), 200);
    };
    requestAnimationFrame(loop);
  }

  highlightPlayer(idx, on) {
    const mat = this.meshes[`player-mat-${idx}`];
    const bdr = this.meshes[`player-border-${idx}`];
    if (mat) {
      mat.material.color.set(on ? 0x3a3a50 : 0x282838);
      mat.material.opacity = on ? 0.7 : 0.55;
    }
    if (bdr) {
      bdr.material.color.set(on ? 0x60a5fa : 0x6b7280);
      bdr.material.opacity = on ? 0.5 : 0.2;
    }
  }
  highlightNPC(idx, on) {
    const nk = Object.keys(this.groups).filter(k => k.startsWith('npc-'));
    if (idx >= nk.length) return;
    const g = this.groups[nk[idx]];
    const old = g.getObjectByName('hl'); if (old) g.remove(old);
    if (on) {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(2.0, 2.15, 24),
        new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      );
      r.rotation.x = -Math.PI/2; r.position.y = 0.02; r.name = 'hl';
      g.add(r);
    }
  }

  focusOnCenter() { this._animCam(0, 14, 8, new THREE.Vector3(0, 0, 0)); }
  focusOnPlayer(i) {
    // 1인칭 뷰: 플레이어 뒤에서 자기 매트를 내려다봄
    const a = P_ANGLES[i];
    const camDist = P_DIST + 4;
    const cx = Math.cos(a) * camDist;
    const cz = Math.sin(a) * camDist;
    const cy = 6;
    // 내 매트 중심을 바라봄
    const lookX = Math.cos(a) * P_DIST;
    const lookZ = Math.sin(a) * P_DIST;
    this._animCam(cx, cy, cz, new THREE.Vector3(lookX, 0.1, lookZ));
  }
  resetCamera() { this._animCam(0, 24, 20, new THREE.Vector3(0, 0, 0)); }

  /** 해당 플레이어 자리에 앉은 1인칭 시점 */
  focusOnPlayer(playerIdx) {
    const a = P_ANGLES[playerIdx];
    const camX = Math.cos(a) * (P_DIST + 5.5);
    const camZ = Math.sin(a) * (P_DIST + 5.5);
    const lookX = Math.cos(a) * (P_DIST * 1.1);
    const lookZ = Math.sin(a) * (P_DIST * 1.1);
    this._animCam(camX, 5.5, camZ, new THREE.Vector3(lookX, 0, lookZ), 1200);
  }

  /** 두 플레이어 사이 시점 (그룹 데이트) — 시선은 카드 실제 위치 */
  focusBetweenPlayers(playerIdx0, playerIdx1) {
    const a0 = P_ANGLES[playerIdx0];
    const a1 = P_ANGLES[playerIdx1];
    const midAngle = (a0 + a1) / 2;
    // 카메라: 두 플레이어 뒤쪽
    const camX = Math.cos(midAngle) * (P_DIST + 6);
    const camZ = Math.sin(midAngle) * (P_DIST + 6);
    // 시선: NPC 카드 배치 위치 (TABLE_R - 5 = 11)
    const cardDist = TABLE_R - 5;
    const lookX = Math.cos(midAngle) * cardDist;
    const lookZ = Math.sin(midAngle) * cardDist;
    this._animCam(camX, 6, camZ, new THREE.Vector3(lookX, 0, lookZ), 1200);
  }

  /** NPC 카드 클릭 → 카드 위 75도 시점으로 줌인 */
  focusOnNPCCard(npcId) {
    const gKey = `npc-${npcId}`;
    const g = this.groups[gKey]; if (!g) return;
    const wx = g.position.x;
    const wz = g.position.z;
    const angleFromCenter = Math.atan2(wz, wx);
    const camX = wx + Math.cos(angleFromCenter) * 2.5;
    const camZ = wz + Math.sin(angleFromCenter) * 2.5;
    const lookX = wx + Math.cos(angleFromCenter) * 1.0;
    const lookZ = wz + Math.sin(angleFromCenter) * 1.0;
    this._animCam(camX, 6.5, camZ, new THREE.Vector3(lookX, 0.05, lookZ), 800);
  }

  _animCam(tx, ty, tz, lookTarget, duration = 800) {
    const s = this.camera.position.clone();
    const sLook = this.controls.target.clone();
    const eLook = lookTarget || new THREE.Vector3(0, 0, 0);
    const t0 = performance.now();
    const loop = now => {
      const t = Math.min((now - t0) / duration, 1), e = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(s, new THREE.Vector3(tx, ty, tz), e);
      this.controls.target.lerpVectors(sLook, eLook, e);
      if (t < 1) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _mkCard(w, h, topTex, botTex, faceDown=false) {
    const g = new THREE.BoxGeometry(w, CARD_D, h);
    const side = new THREE.MeshStandardMaterial({ color: 0xddd, roughness: 0.5 });
    const top = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35 });
    const bot = new THREE.MeshStandardMaterial({ map: botTex || topTex, roughness: 0.35 });
    const m = new THREE.Mesh(g, [side,side,top,bot,side,side]);
    m.position.y = CARD_D/2 + 0.008;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  _buildStack(group, count, color) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(TOKEN_R, TOKEN_R, 0.025, 10),
        new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3, emissive: color, emissiveIntensity: 0.03 })
      );
      m.position.y = 0.025 * i + 0.015; m.castShadow = true;
      group.add(m);
    }
  }

  _cTex(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return t;
  }
  _textCanvas(text, w, h, fs) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f8fafc'; ctx.font = `bold ${fs}px Outfit, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w/2, h/2);
    return c;
  }
  /** 카드 뒤집기 — 실제 x축 180° 회전만. 양면 텍스처는 이미 세팅되어 있어야 함 */
  _flipCard(mesh) {
    const dur = 600, start = performance.now(), oy = mesh.position.y;
    const origRx = mesh.rotation.x;
    const loop = now => {
      const t = Math.min((now - start) / dur, 1);
      mesh.rotation.x = origRx + Math.PI * t;
      mesh.position.y = oy + Math.sin(Math.PI * t) * 0.6;
      if (t < 1) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  _animGroup(g, tx, tz, ry) {
    const sx=g.position.x, sz=g.position.z, sr=g.rotation.y;
    const d=600, t0=performance.now();
    const loop = now => {
      const t=Math.min((now-t0)/d,1), e=1-Math.pow(1-t,3);
      g.position.x = sx+(tx-sx)*e; g.position.z = sz+(tz-sz)*e;
      g.rotation.y = sr+(ry-sr)*e;
      if (t < 1) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  _onResize() {
    this.camera.aspect = innerWidth/innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  _animate() {
    requestAnimationFrame(() => this._animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
