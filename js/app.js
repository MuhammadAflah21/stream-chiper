/**
 * CYBER-LFSR : Application State Controller & UI Orchestrator
 * Manages Panel 1 (LFSR Configuration & Validation), Panel 2 (8-Bit Character Mapping),
 * Panel 3 (Shift Register, Dynamic SVG Tap Circuit & Playback Controls),
 * and Panel 4 (Bitwise XOR Matrix & Final Output with One-Click Decryption Verification).
 */
(function () {
  'use strict';

  const Engine = window.LFSREngine;
  const Animator = window.LFSRAnimator;

  const COMPACT_THRESHOLD_CHARS = 32; // 256 bits threshold for automatic 60fps compact mode
  const BASE_INTERVAL_MS = 820;

  const state = {
    mode: 'encrypt', // 'encrypt' | 'decrypt'
    decryptFormat: 'hex', // 'hex' | 'binary'
    n: 4,
    seed: '1001',
    tapIndices: [1, 0],
    messageInput: 'HI',
    compactMode: false,
    compactForcedByLength: false,
    currentClock: 0, // 0 = initial state, 1..totalClocks = active clock step
    isPlaying: false,
    speedMultiplier: 1,
    timerId: null,
    bgMotionPaused: false,
    charMappings: [],
    inputBitStream: [],
    simulation: null,
    validationError: null
  };

  const dom = {};

  function cacheDOM() {
    // Header status elements
    dom.headerModeBadge = document.getElementById('header-mode-badge');
    dom.headerClockBadge = document.getElementById('header-clock-badge');
    dom.headerPeriodBadge = document.getElementById('header-period-badge');
    dom.headerTestBadge = document.getElementById('header-test-badge');
    dom.btnLoadTestCase = document.getElementById('btn-load-test-case');
    dom.btnToggleBgMotion = document.getElementById('btn-toggle-bg-motion');

    // Panel 1: Configuration & Inputs
    dom.btnModeEncrypt = document.getElementById('btn-mode-encrypt');
    dom.btnModeDecrypt = document.getElementById('btn-mode-decrypt');
    dom.decryptFormatWrapper = document.getElementById('decrypt-format-wrapper');
    dom.btnDecFormatHex = document.getElementById('btn-dec-format-hex');
    dom.btnDecFormatBin = document.getElementById('btn-dec-format-bin');

    dom.selectRegLength = document.getElementById('select-reg-length');
    dom.inputSeed = document.getElementById('input-seed');
    dom.seedBitCounter = document.getElementById('seed-bit-counter');
    dom.btnShuffleSeed = document.getElementById('btn-shuffle-seed');
    dom.btnFixSeed = document.getElementById('btn-fix-seed');

    dom.selectTapPreset = document.getElementById('select-tap-preset');
    dom.tapTogglesContainer = document.getElementById('tap-toggles-container');
    dom.livePolynomialFormula = document.getElementById('live-polynomial-formula');
    dom.liveTapEquation = document.getElementById('live-tap-equation');

    dom.labelMessageInput = document.getElementById('label-message-input');
    dom.inputMessage = document.getElementById('input-message');
    dom.messageLengthInfo = document.getElementById('message-length-info');
    dom.toggleCompactMode = document.getElementById('toggle-compact-mode');
    dom.btnInitSimulation = document.getElementById('btn-init-simulation');
    dom.btnClearInput = document.getElementById('btn-clear-input');

    dom.validationAlertBox = document.getElementById('validation-alert-box');
    dom.validationAlertText = document.getElementById('validation-alert-text');
    dom.btnValidationQuickFix = document.getElementById('btn-validation-quick-fix');
    dom.periodWarningBox = document.getElementById('period-warning-box');
    dom.periodWarningText = document.getElementById('period-warning-text');

    // Panel 2: Character to 8-Bit Binary Mapping
    dom.panel2Subtitle = document.getElementById('panel2-subtitle');
    dom.charCardsContainer = document.getElementById('char-cards-container');

    // Panel 3: LFSR Shift Register & SVG Circuit
    dom.stageClockIndicator = document.getElementById('stage-clock-indicator');
    dom.stageStateBadge = document.getElementById('stage-state-badge');
    dom.xorGateBadge = document.getElementById('xor-gate-badge');
    dom.xorGateFormulaText = document.getElementById('xor-gate-formula-text');
    dom.feedbackSlotBox = document.getElementById('feedback-slot-box');
    dom.feedbackSlotVal = document.getElementById('feedback-slot-val');
    dom.registerCellsTrack = document.getElementById('register-cells-track');
    dom.outputSlotBox = document.getElementById('output-slot-box');
    dom.outputSlotVal = document.getElementById('output-slot-val');
    dom.narrativeBox = document.getElementById('narrative-explanation-box');
    dom.keystreamQueueContainer = document.getElementById('keystream-queue-container');
    dom.keystreamHexPreview = document.getElementById('keystream-hex-preview');

    // Playback Controls
    dom.btnStepReset = document.getElementById('btn-step-reset');
    dom.btnStepPrev = document.getElementById('btn-step-prev');
    dom.btnAutoPlay = document.getElementById('btn-auto-play');
    dom.iconAutoPlay = document.getElementById('icon-auto-play');
    dom.btnStepNext = document.getElementById('btn-step-next');
    dom.btnStepByte = document.getElementById('btn-step-byte');
    dom.btnStepInstant = document.getElementById('btn-step-instant');
    dom.speedButtons = document.querySelectorAll('[data-speed]');

    // Panel 4: Bitwise XOR Matrix & Final Outputs
    dom.xorMatrixContainer = document.getElementById('xor-matrix-container');
    dom.outputHexValue = document.getElementById('output-hex-value');
    dom.outputBinValue = document.getElementById('output-bin-value');
    dom.outputAsciiValue = document.getElementById('output-ascii-value');
    dom.outputAsciiNote = document.getElementById('output-ascii-note');
    dom.outputKsHexValue = document.getElementById('output-ks-hex-value');
    dom.outputKsBinValue = document.getElementById('output-ks-bin-value');

    dom.btnCopyHex = document.getElementById('btn-copy-hex');
    dom.btnCopyBin = document.getElementById('btn-copy-bin');
    dom.btnCopyAscii = document.getElementById('btn-copy-ascii');
    dom.btnTestDecryptResult = document.getElementById('btn-test-decrypt-result');
    dom.toastFeedback = document.getElementById('toast-feedback');
  }

  /**
   * Displays a temporary toast message for copy/preset actions.
   */
  function showToast(msg) {
    if (!dom.toastFeedback) return;
    dom.toastFeedback.textContent = msg;
    dom.toastFeedback.classList.remove('hidden');
    clearTimeout(dom.toastFeedback._timer);
    dom.toastFeedback._timer = setTimeout(() => {
      dom.toastFeedback.classList.add('hidden');
    }, 2400);
  }

  /**
   * Populates register length options (3 <= n <= 16) and primitive polynomial presets.
   */
  function populateConfigSelects() {
    dom.selectRegLength.innerHTML = '';
    for (let len = 3; len <= 16; len++) {
      const opt = document.createElement('option');
      opt.value = String(len);
      opt.textContent = `${len}-Bit Register (Periode Maks: ${Math.pow(2, len) - 1})`;
      if (len === state.n) opt.selected = true;
      dom.selectRegLength.appendChild(opt);
    }

    dom.selectTapPreset.innerHTML = '';
    Object.keys(Engine.PRIMITIVE_PRESETS).forEach((key) => {
      const preset = Engine.PRIMITIVE_PRESETS[key];
      const opt = document.createElement('option');
      opt.value = String(key);
      opt.textContent = preset.name;
      if (Number(key) === state.n) opt.selected = true;
      dom.selectTapPreset.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Kustom (Pilih Tap Manual)';
    dom.selectTapPreset.appendChild(customOpt);
  }

  /**
   * Renders interactive tap toggle buttons [b_{n-1} ... b_0] for current register size n.
   */
  function renderTapToggleButtons() {
    dom.tapTogglesContainer.innerHTML = '';
    for (let bitPos = state.n - 1; bitPos >= 0; bitPos--) {
      const isTap = state.tapIndices.includes(bitPos);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tap-toggle-btn';
      btn.setAttribute('aria-pressed', isTap ? 'true' : 'false');
      btn.setAttribute('aria-label', `Toggle posisi tap b${bitPos}`);
      btn.dataset.bitPos = String(bitPos);

      const roleTag = bitPos === state.n - 1 ? 'MSB' : bitPos === 0 ? 'LSB' : 'BIT';
      btn.innerHTML = `
        <span class="text-xs font-bold">b<sub>${bitPos}</sub></span>
        <span class="text-[10px] opacity-75">${ isTap ? 'TAP ON' : roleTag }</span>
      `;

      btn.addEventListener('click', () => {
        toggleTapPosition(bitPos);
      });

      dom.tapTogglesContainer.appendChild(btn);
    }

    updatePolynomialBadges();
  }

  /**
   * Updates polynomial formula and XOR feedback equation badges.
   */
  function updatePolynomialBadges() {
    const polyStr = Engine.formatPolynomial(state.n, state.tapIndices);
    const eqStr = Engine.formatTapEquation(state.tapIndices);
    dom.livePolynomialFormula.textContent = polyStr;
    dom.liveTapEquation.textContent = eqStr;

    // Check if current tapIndices match the primitive preset for state.n
    const preset = Engine.PRIMITIVE_PRESETS[state.n];
    if (preset) {
      const a = [...preset.taps].sort((x, y) => y - x).join(',');
      const b = [...state.tapIndices].sort((x, y) => y - x).join(',');
      dom.selectTapPreset.value = a === b ? String(state.n) : 'custom';
    }
  }

  /**
   * Toggles a single tap index in state.tapIndices and re-runs validation & simulation.
   */
  function toggleTapPosition(bitPos) {
    stopAutoPlay();
    if (state.tapIndices.includes(bitPos)) {
      state.tapIndices = state.tapIndices.filter((t) => t !== bitPos);
    } else {
      state.tapIndices = [...state.tapIndices, bitPos].sort((a, b) => b - a);
    }
    renderTapToggleButtons();
    validateAndRebuildSimulation({ preserveClock: false });
  }

  /**
   * Parses current message input based on active mode ('encrypt' vs 'decrypt') and format ('hex' vs 'binary').
   */
  function parseCurrentMessageInput() {
    const raw = state.messageInput;
    if (state.mode === 'encrypt') {
      if (!raw || raw.length === 0) {
        return {
          valid: false,
          code: 'EMPTY_MESSAGE',
          error: 'Masukkan minimal 1 karakter plaintext untuk memulai simulasi enkripsi.',
          charMappings: [],
          fullBitStream: []
        };
      }
      const res = Engine.textToBinaryStream(raw);
      return {
        valid: true,
        code: 'OK',
        error: null,
        charMappings: res.charMappings,
        fullBitStream: res.fullBitStream
      };
    } else {
      if (state.decryptFormat === 'hex') {
        const res = Engine.hexToBinaryStream(raw);
        return {
          valid: res.valid,
          code: res.valid ? 'OK' : 'INVALID_HEX',
          error: res.error,
          charMappings: res.charMappings,
          fullBitStream: res.fullBitStream
        };
      } else {
        const res = Engine.binaryStringToStream(raw);
        return {
          valid: res.valid,
          code: res.valid ? 'OK' : 'INVALID_BIN',
          error: res.error,
          charMappings: res.charMappings,
          fullBitStream: res.fullBitStream
        };
      }
    }
  }

  /**
   * Validates all LFSR parameters and message input, updates error banners,
   * and builds the pre-computed simulation timeline.
   */
  function validateAndRebuildSimulation(options = {}) {
    const { preserveClock = false } = options;

    dom.seedBitCounter.textContent = `${state.seed.length} / ${state.n} bit`;

    const lfsrCheck = Engine.validateLFSRConfig(state.n, state.seed, state.tapIndices);
    const msgCheck = parseCurrentMessageInput();

    const charCount = msgCheck.valid ? msgCheck.charMappings.length : 0;
    const bitCount = msgCheck.valid ? msgCheck.fullBitStream.length : 0;
    dom.messageLengthInfo.textContent = `${charCount} Byte • ${bitCount} Bit (${bitCount} Clock)`;

    // Auto-enable Compact Mode if message exceeds 32 bytes (256 bits) to protect 60fps
    if (charCount > COMPACT_THRESHOLD_CHARS && !state.compactForcedByLength) {
      state.compactMode = true;
      state.compactForcedByLength = true;
      dom.toggleCompactMode.checked = true;
    } else if (charCount <= COMPACT_THRESHOLD_CHARS && state.compactForcedByLength) {
      state.compactForcedByLength = false;
    }

    // Highlight seed input on error
    const isSeedError =
      !lfsrCheck.valid &&
      (lfsrCheck.code === 'ALL_ZERO_SEED' ||
        lfsrCheck.code === 'INVALID_SEED_CHARS' ||
        lfsrCheck.code === 'INVALID_SEED_LENGTH');

    dom.inputSeed.classList.toggle('input-error', isSeedError);
    dom.btnFixSeed.classList.toggle('hidden', !isSeedError);
    dom.inputMessage.classList.toggle('input-error', !msgCheck.valid && msgCheck.code !== 'EMPTY_MESSAGE');

    if (!lfsrCheck.valid || !msgCheck.valid) {
      const errObj = !lfsrCheck.valid ? lfsrCheck : msgCheck;
      state.validationError = errObj;
      showValidationAlert(errObj);

      if (!msgCheck.valid) {
        state.charMappings = [];
        state.inputBitStream = [];
        state.simulation = null;
        state.currentClock = 0;
        renderEmptyOrErrorViews(errObj);
        updatePlaybackControlsState();
        return false;
      }

      // If message is valid but LFSR seed/taps has an error, still render Panel 2 mapping
      state.charMappings = msgCheck.charMappings;
      state.inputBitStream = msgCheck.fullBitStream;
      state.simulation = null;
      state.currentClock = 0;
      renderPanel2CharacterCards();
      renderRegisterStageAtClock();
      renderPanel4XORMatrix();
      updatePlaybackControlsState();
      return false;
    }

    // Valid configuration and input!
    state.validationError = null;
    hideValidationAlert();

    state.charMappings = msgCheck.charMappings;
    state.inputBitStream = msgCheck.fullBitStream;
    state.simulation = Engine.runSimulation(state.inputBitStream, state.seed, state.tapIndices, {
      mode: state.mode
    });

    if (!preserveClock || state.currentClock > state.simulation.totalClocks) {
      state.currentClock = 0;
    }

    updatePeriodWarningBanner();
    renderPanel2CharacterCards();
    renderRegisterStageAtClock({ animate: false });
    renderPanel4XORMatrix();
    updateFinalOutputsSummary();
    updateHeaderBadges();
    updatePlaybackControlsState();
    return true;
  }

  /**
   * Shows educational validation banner with a contextual 1-click quick-fix button.
   */
  function showValidationAlert(errObj) {
    dom.validationAlertBox.classList.remove('hidden');
    dom.validationAlertText.textContent = errObj.error;

    if (errObj.code === 'ALL_ZERO_SEED' || errObj.code === 'INVALID_SEED_LENGTH' || errObj.code === 'INVALID_SEED_CHARS') {
      dom.btnValidationQuickFix.classList.remove('hidden');
      dom.btnValidationQuickFix.textContent = 'Isi Seed Valid Otomatis';
      dom.btnValidationQuickFix.onclick = () => {
        fixSeedAutomatically();
      };
    } else if (errObj.code === 'NO_TAPS') {
      dom.btnValidationQuickFix.classList.remove('hidden');
      dom.btnValidationQuickFix.textContent = 'Aktifkan Tap Primitif';
      dom.btnValidationQuickFix.onclick = () => {
        const preset = Engine.PRIMITIVE_PRESETS[state.n];
        state.tapIndices = preset ? [...preset.taps] : [1, 0];
        renderTapToggleButtons();
        validateAndRebuildSimulation();
      };
    } else if (errObj.code === 'EMPTY_MESSAGE' || errObj.code === 'INVALID_HEX' || errObj.code === 'INVALID_BIN') {
      dom.btnValidationQuickFix.classList.remove('hidden');
      dom.btnValidationQuickFix.textContent =
        state.mode === 'encrypt' ? 'Isi Contoh "HI"' : 'Isi Contoh Hex "D2 B8"';
      dom.btnValidationQuickFix.onclick = () => {
        if (state.mode === 'encrypt') {
          state.messageInput = 'HI';
        } else {
          state.decryptFormat = 'hex';
          updateModeUI();
          state.messageInput = 'D2 B8';
        }
        dom.inputMessage.value = state.messageInput;
        validateAndRebuildSimulation();
      };
    } else {
      dom.btnValidationQuickFix.classList.add('hidden');
    }
  }

  function hideValidationAlert() {
    dom.validationAlertBox.classList.add('hidden');
  }

  /**
   * Displays info banner if the LFSR period cycle repeats before the message finishes.
   */
  function updatePeriodWarningBanner() {
    if (!state.simulation) {
      dom.periodWarningBox.classList.add('hidden');
      return;
    }
    const pInfo = state.simulation.periodInfo;
    if (pInfo.periodCycleDetected) {
      dom.periodWarningBox.classList.remove('hidden');
      dom.periodWarningText.textContent =
        `Siklus Register Berulang: State register kembali ke pola sebelumnya pada Clock #${pInfo.firstRepeatClock} ` +
        `(periode siklus = ${pInfo.cycleLength} bit, maks teoritis 2^${state.n}-1 = ${pInfo.theoreticalMaxPeriod} bit). ` +
        `Untuk pesan panjang, gunakan panjang register n yang lebih besar.`;
    } else {
      dom.periodWarningBox.classList.add('hidden');
    }
  }

  /**
   * Renders empty/error states in Panels 2, 3, and 4 when input is empty or invalid (R-27).
   */
  function renderEmptyOrErrorViews(errObj) {
    const isEmpty = errObj && errObj.code === 'EMPTY_MESSAGE';
    const title = isEmpty ? 'Belum Ada Input Pesan' : 'Menunggu Perbaikan Input Valid';
    const desc = isEmpty
      ? 'Ketik pesan teks pada kolom input di atas atau klik tombol "Muat Kasus Uji Standar (HI)" untuk memvisualisasikan pemetaan biner 8-bit.'
      : errObj.error;

    dom.charCardsContainer.innerHTML = `
      <div class="elevated-card w-full text-center py-8 px-4">
        <p class="font-bold text-white mb-1">${title}</p>
        <p class="text-xs text-[#b3b3b3] max-w-xl mx-auto">${desc}</p>
      </div>
    `;

    dom.xorMatrixContainer.innerHTML = `
      <div class="text-center py-6 px-4">
        <p class="font-bold text-white mb-1">${title}</p>
        <p class="text-xs text-[#b3b3b3]">Matriks perbandingan bitwise XOR (P ⊕ K = C) akan dirender setelah parameter LFSR dan pesan valid.</p>
      </div>
    `;

    dom.keystreamQueueContainer.innerHTML = `
      <span class="text-xs text-[#b3b3b3]">Antrean bit keystream belum terbentuk (Clock = 0).</span>
    `;
    dom.keystreamHexPreview.textContent = 'HEX: --';

    dom.outputHexValue.textContent = '--';
    dom.outputBinValue.textContent = '--';
    dom.outputAsciiValue.textContent = '--';
    dom.outputKsHexValue.textContent = '--';
    dom.outputKsBinValue.textContent = '--';
    renderRegisterStageAtClock({ animate: false });
    updateHeaderBadges();
  }

  /**
   * Panel 2: Renders Character / Byte to 8-Bit Big-Endian Binary Mapping Cards.
   */
  function renderPanel2CharacterCards() {
    dom.charCardsContainer.innerHTML = '';

    if (!state.charMappings || state.charMappings.length === 0) {
      return;
    }

    dom.panel2Subtitle.textContent =
      state.mode === 'encrypt'
        ? 'Pemetaan setiap karakter Plaintext ke nilai Desimal ASCII/UTF-8, Hexadecimal, dan blok 8-bit Biner (MSB ke LSB).'
        : 'Pemetaan setiap byte Ciphertext ke nilai Desimal, Hexadecimal, dan blok 8-bit Biner yang akan di-XOR dengan Keystream.';

    const activeBitGlobalIdx = state.currentClock > 0 ? state.currentClock - 1 : -1;

    state.charMappings.forEach((item, byteIdx) => {
      const isCurrentByte =
        activeBitGlobalIdx >= item.startBitIndex && activeBitGlobalIdx < item.startBitIndex + 8;

      const card = document.createElement('div');
      card.className = 'elevated-card flex flex-col gap-2.5';
      if (isCurrentByte) {
        card.style.boxShadow = 'inset 0 0 0 2px #1ed760, rgba(0,0,0,0.3) 0px 8px 8px';
      }

      const bitsHtml = item.bits
        .map((bitVal, bitOffset) => {
          const globalBitIdx = item.startBitIndex + bitOffset;
          const clockForBit = globalBitIdx + 1;
          let stateClass = '';
          if (clockForBit === state.currentClock) {
            stateClass = 'bit-active-clock';
          } else if (clockForBit < state.currentClock) {
            stateClass = 'bit-processed';
          }
          const bitImportance = bitOffset === 0 ? 'MSB (b7)' : bitOffset === 7 ? 'LSB (b0)' : `b${7 - bitOffset}`;
          return `
            <button
              type="button"
              class="bit-box ${stateClass}"
              data-jump-clock="${clockForBit}"
              title="Byte #${byteIdx + 1} (${bitImportance}) : Klik untuk lompat ke Clock #${clockForBit}"
              aria-label="Bit ${bitVal} pada Clock ${clockForBit}"
            >${bitVal}</button>
          `;
        })
        .join('');

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#181818] text-white font-bold text-base mono-code border border-[#4d4d4d]">
              ${item.char}
            </span>
            <div>
              <div class="text-xs font-bold text-white">Byte #${byteIdx + 1}</div>
              <div class="text-[11px] text-[#b3b3b3] mono-code">ASCII ${item.decimal} • 0x${item.hex}</div>
            </div>
          </div>
          <span class="status-badge ${isCurrentByte ? 'badge-green' : 'badge-blue'} mono-code">
            Bit ${item.startBitIndex + 1}..${item.startBitIndex + 8}
          </span>
        </div>
        <div class="flex items-center justify-between gap-1 pt-1" role="group" aria-label="Deretan 8-bit untuk byte ${byteIdx + 1}">
          ${bitsHtml}
        </div>
        <div class="flex justify-between text-[10px] text-[#b3b3b3] mono-code px-0.5">
          <span>MSB (2⁷)</span>
          <span>Big-Endian 8-Bit</span>
          <span>LSB (2⁰)</span>
        </div>
      `;

      dom.charCardsContainer.appendChild(card);
    });

    // Attach click listeners on bit boxes to jump directly to that clock step
    dom.charCardsContainer.querySelectorAll('[data-jump-clock]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetClock = Number(btn.getAttribute('data-jump-clock'));
        jumpToClock(targetClock);
      });
    });
  }

  /**
   * Panel 3: Renders LFSR Register Boxes [b_{n-1} ... b_0], Feedback/Output slots,
   * Narrative Explanation, Keystream Queue, and triggers GSAP + Anime.js circuit choreography.
   */
  function renderRegisterStageAtClock(options = {}) {
    const { animate = false, direction = 'forward' } = options;

    Animator.killActiveAnimations();
    const flipState = animate && !state.compactMode ? Animator.captureFlipState('.reg-cell') : null;

    const totalClocks = state.simulation ? state.simulation.totalClocks : 0;
    const clock = state.currentClock;

    dom.stageClockIndicator.textContent = `CLOCK: ${clock} / ${totalClocks}`;

    let currentRegisterBits = [];
    let currentSnapshot = null;

    if (!state.simulation || clock === 0) {
      const cleanSeed = Engine.normalizeSeedLength(state.seed, state.n);
      currentRegisterBits = cleanSeed.split('').map(Number);
      dom.stageStateBadge.textContent = 'STATE AWAL (SEED)';
      dom.stageStateBadge.className = 'status-badge badge-blue mono-code';
    } else {
      currentSnapshot = state.simulation.history[clock - 1];
      currentRegisterBits = currentSnapshot.registerAfter;
      dom.stageStateBadge.textContent = currentSnapshot.stateRepeatedThisClock
        ? `CLOCK #${clock} (SIKLUS BERULANG)`
        : `CLOCK #${clock} AKTIF`;
      dom.stageStateBadge.className = currentSnapshot.stateRepeatedThisClock
        ? 'status-badge badge-orange mono-code'
        : 'status-badge badge-green mono-code';
    }

    // Preview XOR calculation for current or just-completed clock step
    const activePreviewStep = currentSnapshot
      ? currentSnapshot
      : Engine.stepLFSR(currentRegisterBits, state.tapIndices.length ? state.tapIndices : [0]);

    const tapEqText = currentSnapshot
      ? `b_new = ${currentSnapshot.tapExpansion}`
      : `${Engine.formatTapEquation(state.tapIndices)} = ${activePreviewStep.feedbackBit}`;

    dom.xorGateFormulaText.textContent = tapEqText;
    dom.feedbackSlotVal.textContent = currentSnapshot ? String(currentSnapshot.feedbackBit) : String(activePreviewStep.feedbackBit);
    dom.outputSlotVal.textContent = currentSnapshot ? String(currentSnapshot.keystreamBit) : '--';

    // Render register cells [b_{n-1} ... b_0]
    dom.registerCellsTrack.innerHTML = '';
    for (let idx = 0; idx < state.n; idx++) {
      const bitPos = state.n - 1 - idx; // mathematical b_k
      const bitVal = currentRegisterBits[idx] ?? 0;
      const isTap = state.tapIndices.includes(bitPos);
      const isNewBit = clock > 0 && idx === 0;
      const isOutBit = idx === state.n - 1;

      const cell = document.createElement('div');
      const classes = ['reg-cell'];
      if (isTap) classes.push('is-tap');
      if (isNewBit) classes.push('is-new-bit');
      if (isOutBit && !isTap) classes.push('is-out-bit');

      cell.className = classes.join(' ');
      cell.dataset.tapPos = String(bitPos);
      cell.dataset.flipId = `reg-pos-${bitPos}`;

      let roleBadge = '';
      if (isTap && isOutBit) {
        roleBadge = `<span class="reg-cell-role badge-orange">TAP•OUT</span>`;
      } else if (isTap) {
        roleBadge = `<span class="reg-cell-role badge-orange">TAP</span>`;
      } else if (isNewBit) {
        roleBadge = `<span class="reg-cell-role badge-green">b_new</span>`;
      } else if (isOutBit) {
        roleBadge = `<span class="reg-cell-role badge-blue">LSB•OUT</span>`;
      } else if (idx === 0) {
        roleBadge = `<span class="reg-cell-role text-[#b3b3b3]">MSB</span>`;
      } else {
        roleBadge = `<span class="reg-cell-role text-[#b3b3b3]">REG</span>`;
      }

      cell.innerHTML = `
        <span class="reg-cell-index">b<sub>${bitPos}</sub></span>
        <span class="reg-cell-val">${bitVal}</span>
        ${roleBadge}
      `;

      dom.registerCellsTrack.appendChild(cell);
    }

    // Phase 1 of forward step: temporarily include the (n + 1)-th exiting b0 cell so 5 boxes (for n=4)
    // [b_new, b_{n-1}, ..., b_1, b_0] are visualized first before shifting right.
    if (animate && direction === 'forward' && currentSnapshot && !state.compactMode) {
      const exitingCell = document.createElement('div');
      exitingCell.className = 'reg-cell is-out-bit reg-cell-exiting';
      exitingCell.innerHTML = `
        <span class="reg-cell-index">b<sub>0</sub></span>
        <span class="reg-cell-val">${currentSnapshot.keystreamBit}</span>
        <span class="reg-cell-role badge-blue">KELUAR</span>
      `;
      dom.registerCellsTrack.appendChild(exitingCell);
    }

    // Update Narrative Explanation Bar
    if (!state.simulation) {
      dom.narrativeBox.textContent =
        'Perbaiki parameter LFSR atau masukkan pesan valid untuk memulai simulasi register geser.';
    } else if (clock === 0) {
      dom.narrativeBox.textContent =
        `Clock #0 (Inisialisasi): Register diisi dengan Seed awal [${currentRegisterBits.join(' ')}]. ` +
        `Tekan [Step +1] atau tombol bulat [Play] untuk mengeksekusi pergeseran bit pertama.`;
    } else if (currentSnapshot) {
      dom.narrativeBox.textContent = currentSnapshot.narrative;
    }

    // Render Keystream Queue
    renderKeystreamStrip();

    // Sync Panel 2 & Panel 4 active highlights
    updateSynchronizedBitHighlights();

    // Draw SVG Tap Circuit & Run GSAP + Anime.js choreography
    if (state.stageRafId) {
      cancelAnimationFrame(state.stageRafId);
    }
    state.stageRafId = requestAnimationFrame(() => {
      state.stageRafId = null;
      if (animate) {
        Animator.animateRegisterStep({
          direction,
          compactMode: state.compactMode,
          flipState,
          speedMultiplier: state.speedMultiplier,
          tapIndices: state.tapIndices,
          n: state.n
        });
      }

      Animator.renderAndAnimateTapCircuit({
        tapIndices: state.tapIndices,
        n: state.n,
        animateSignal: animate,
        compactMode: state.compactMode
      });
    });
  }

  /**
   * Renders the accumulated Keystream bits K_1 .. K_t in Panel 3.
   */
  function renderKeystreamStrip() {
    if (!state.simulation) {
      dom.keystreamQueueContainer.innerHTML = `<span class="text-xs text-[#b3b3b3]">Belum ada keystream.</span>`;
      dom.keystreamHexPreview.textContent = 'HEX: --';
      return;
    }

    const total = state.simulation.totalClocks;
    const clock = state.currentClock;
    const ksBits = state.simulation.keystreamBits;

    const activeKsSlice = ksBits.slice(0, clock);
    dom.keystreamHexPreview.textContent =
      clock > 0 ? `HEX (${clock} bit): ${Engine.bitsToHex(activeKsSlice, ' ')}` : 'HEX: (Clock 0)';

    // If compactMode and huge bit count, render grouped or capped pills
    const htmlParts = [];
    for (let i = 0; i < total; i++) {
      const stepNum = i + 1;
      const isFilled = stepNum <= clock;
      const isCurrent = stepNum === clock;
      const pillClass = isCurrent
        ? 'ks-bit-pill ks-current'
        : isFilled
        ? 'ks-bit-pill ks-filled'
        : 'ks-bit-pill';

      htmlParts.push(`
        <button
          type="button"
          class="${pillClass}"
          data-jump-clock="${stepNum}"
          title="Keystream K${stepNum} = ${ksBits[i]} (Klik untuk ke Clock #${stepNum})"
          aria-label="Keystream bit ${stepNum} nilai ${isFilled ? ksBits[i] : 'belum dihitung'}"
        >
          <span class="text-[9px] opacity-70">K${stepNum}</span>
          <span>${isFilled ? ksBits[i] : '_'}</span>
        </button>
      `);
    }

    dom.keystreamQueueContainer.innerHTML = htmlParts.join('');
    dom.keystreamQueueContainer.querySelectorAll('[data-jump-clock]').forEach((btn) => {
      btn.addEventListener('click', () => {
        jumpToClock(Number(btn.getAttribute('data-jump-clock')));
      });
    });
  }

  /**
   * Panel 4: Renders the Bitwise XOR Comparison Matrix (Input Bit, Keystream Bit, XOR Result Bit).
   */
  function renderPanel4XORMatrix() {
    if (!state.simulation || state.simulation.totalClocks === 0) {
      return;
    }

    const sim = state.simulation;
    const total = sim.totalClocks;
    const inHeader = state.mode === 'encrypt' ? 'Plaintext (P)' : 'Ciphertext (C)';
    const outHeader = state.mode === 'encrypt' ? 'Ciphertext (C)' : 'Plaintext (P)';

    let clockHeaders = '';
    let inputRowCells = '';
    let ksRowCells = '';
    let xorOpCells = '';
    let outRowCells = '';

    for (let i = 0; i < total; i++) {
      const clockNum = i + 1;
      const snap = sim.history[i];
      const isByteEnd = (i + 1) % 8 === 0 && i !== total - 1;
      const gapStyle = isByteEnd ? 'border-right: 2px solid rgba(179,179,179,0.28);' : '';

      clockHeaders += `
        <td class="xor-cell text-[10px] text-[#b3b3b3]" data-matrix-col="${clockNum}" data-role="hdr" style="${gapStyle}">
          #${clockNum}
        </td>
      `;

      inputRowCells += `
        <td class="xor-cell col-computed-input" data-matrix-col="${clockNum}" data-role="in" style="${gapStyle}">
          ${snap.inputBit}
        </td>
      `;

      ksRowCells += `
        <td class="xor-cell" data-matrix-col="${clockNum}" data-role="ks" data-val="${snap.keystreamBit}" style="${gapStyle}">
          _
        </td>
      `;

      xorOpCells += `
        <td class="text-center text-xs text-[#ffa42b] font-bold" style="${gapStyle}">⊕</td>
      `;

      outRowCells += `
        <td class="xor-cell" data-matrix-col="${clockNum}" data-role="out" data-val="${snap.xorResultBit}" style="${gapStyle}">
          _
        </td>
      `;
    }

    dom.xorMatrixContainer.innerHTML = `
      <table class="xor-matrix-table" aria-label="Matriks Perbandingan Bitwise XOR">
        <tbody>
          <tr>
            <th scope="row">Clock (t)</th>
            ${clockHeaders}
          </tr>
          <tr>
            <th scope="row">${inHeader}</th>
            ${inputRowCells}
          </tr>
          <tr>
            <th scope="row" class="text-[#539df5]">Keystream (K)</th>
            ${ksRowCells}
          </tr>
          <tr>
            <th scope="row" class="text-[#ffa42b]">Operasi XOR</th>
            ${xorOpCells}
          </tr>
          <tr>
            <th scope="row" class="text-[#1ed760]">${outHeader}</th>
            ${outRowCells}
          </tr>
        </tbody>
      </table>
    `;

    // Allow clicking any column in the XOR matrix to jump directly to that clock
    dom.xorMatrixContainer.querySelectorAll('[data-matrix-col]').forEach((cell) => {
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        jumpToClock(Number(cell.getAttribute('data-matrix-col')));
      });
    });

    updateSynchronizedBitHighlights();
  }

  /**
   * Synchronizes active clock highlighting across Panel 2 (Character Bit Boxes)
   * and Panel 4 (XOR Matrix Columns) without full DOM teardown.
   */
  function updateSynchronizedBitHighlights() {
    const clock = state.currentClock;

    // 1. Update Panel 2 bit boxes
    const bitBoxes = dom.charCardsContainer.querySelectorAll('[data-jump-clock]');
    bitBoxes.forEach((box) => {
      const c = Number(box.getAttribute('data-jump-clock'));
      box.classList.toggle('bit-active-clock', c === clock);
      box.classList.toggle('bit-processed', c < clock);
    });

    // 2. Update Panel 4 XOR Matrix cells
    const matrixCells = dom.xorMatrixContainer.querySelectorAll('[data-matrix-col]');
    let activeCellToScroll = null;

    matrixCells.forEach((cell) => {
      const c = Number(cell.getAttribute('data-matrix-col'));
      const role = cell.getAttribute('data-role');
      const isComputed = c <= clock;
      const isCurrent = c === clock;

      cell.classList.toggle('col-active', isCurrent);
      if (isCurrent && role === 'out') {
        activeCellToScroll = cell;
      }

      if (role === 'ks') {
        cell.textContent = isComputed ? cell.getAttribute('data-val') : '_';
        cell.classList.toggle('col-computed-ks', isComputed);
      } else if (role === 'out') {
        cell.textContent = isComputed ? cell.getAttribute('data-val') : '_';
        cell.classList.toggle('col-computed-out', isComputed);
      }
    });

    // Keep active column visible inside horizontal scroll container
    if (activeCellToScroll && dom.xorMatrixContainer) {
      const containerRect = dom.xorMatrixContainer.getBoundingClientRect();
      const cellRect = activeCellToScroll.getBoundingClientRect();
      if (cellRect.right > containerRect.right - 24 || cellRect.left < containerRect.left + 120) {
        dom.xorMatrixContainer.scrollLeft += cellRect.left - containerRect.left - containerRect.width / 2;
      }
    }

    updateFinalOutputsSummary();
    updateHeaderBadges();
    updatePlaybackControlsState();
  }

  /**
   * Updates Final Output Cards (Hexadecimal, Binary, ASCII Text, Keystream) in Panel 4.
   */
  function updateFinalOutputsSummary() {
    if (!state.simulation) return;

    const sim = state.simulation;
    // Show full pre-computed result or progressive result up to current clock (if clock > 0, show progressive + full)
    const activeCount = state.currentClock > 0 ? state.currentClock : sim.totalClocks;
    const outSlice = sim.outputBits.slice(0, activeCount);
    const ksSlice = sim.keystreamBits.slice(0, activeCount);

    const outHex = Engine.bitsToHex(outSlice, ' ');
    const outBin = Engine.bitsToBinaryGrouped(outSlice, ' ');
    const decoded = Engine.bitsToText(outSlice);

    dom.outputHexValue.textContent = outHex || '--';
    dom.outputBinValue.textContent = outBin || '--';

    if (decoded.bytes.length === 0) {
      dom.outputAsciiValue.textContent = '(Menunggu 8 bit pertama selesai)';
      dom.outputAsciiNote.textContent = 'Minimal 8 clock diperlukan untuk membentuk 1 karakter ASCII.';
    } else {
      dom.outputAsciiValue.textContent = decoded.hasNonPrintable
        ? `${decoded.safeText}  (Raw: ${decoded.rawText})`
        : decoded.rawText;
      dom.outputAsciiNote.textContent = decoded.hasNonPrintable
        ? 'Mengandung byte non-cetak (ditampilkan sebagai ·). Gunakan Hexadecimal untuk dekripsi.'
        : 'Seluruh byte berada pada rentang karakter ASCII cetak (32–126).';
    }

    dom.outputKsHexValue.textContent = Engine.bitsToHex(ksSlice, ' ') || '--';
    dom.outputKsBinValue.textContent = Engine.bitsToBinaryGrouped(ksSlice, ' ') || '--';
  }

  /**
   * Updates Header status badges and Lottie padlock state.
   */
  function updateHeaderBadges() {
    const isDecrypt = state.mode === 'decrypt';
    dom.headerModeBadge.textContent = isDecrypt ? 'MODE: DEKRIPSI' : 'MODE: ENKRIPSI';
    dom.headerModeBadge.className = isDecrypt
      ? 'status-badge badge-blue'
      : 'status-badge badge-green';

    const total = state.simulation ? state.simulation.totalClocks : 0;
    dom.headerClockBadge.textContent = `CLOCK: ${state.currentClock} / ${total}`;

    const maxPeriod = Math.pow(2, state.n) - 1;
    dom.headerPeriodBadge.textContent = `N=${state.n} BIT • T_MAX=${maxPeriod}`;

    const isDecryptionComplete =
      isDecrypt && state.simulation && state.currentClock === state.simulation.totalClocks && total > 0;
    Animator.setPadlockState(isDecryptionComplete);
  }

  /**
   * Updates enabled/disabled states of playback buttons.
   */
  function updatePlaybackControlsState() {
    const hasSim = Boolean(state.simulation && state.simulation.totalClocks > 0);
    const atStart = !hasSim || state.currentClock <= 0;
    const atEnd = !hasSim || state.currentClock >= (state.simulation ? state.simulation.totalClocks : 0);

    dom.btnStepReset.disabled = atStart && !state.isPlaying;
    dom.btnStepPrev.disabled = atStart;
    dom.btnStepNext.disabled = atEnd;
    dom.btnStepByte.disabled = atEnd;
    dom.btnStepInstant.disabled = atEnd;
    dom.btnAutoPlay.disabled = !hasSim;

    dom.btnAutoPlay.setAttribute('aria-label', state.isPlaying ? 'Pause Auto-Play' : 'Jalankan Auto-Play');
    dom.btnAutoPlay.innerHTML = state.isPlaying
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
  }

  /**
   * Steps simulation forward or backward by delta clocks.
   */
  function stepClock(delta) {
    if (!state.simulation) return;
    const total = state.simulation.totalClocks;
    const nextClock = Math.max(0, Math.min(total, state.currentClock + delta));
    if (nextClock === state.currentClock) {
      if (state.isPlaying && nextClock >= total) {
        stopAutoPlay();
      }
      return;
    }

    const direction = delta >= 0 ? 'forward' : 'backward';
    state.currentClock = nextClock;

    renderRegisterStageAtClock({
      animate: Math.abs(delta) === 1,
      direction
    });

    // If decryption reaches final clock, unlock padlock & fire micro confetti burst
    if (state.currentClock === total && total > 0) {
      if (state.isPlaying) {
        stopAutoPlay();
      }
      if (state.mode === 'decrypt') {
        Animator.setPadlockState(true);
        Animator.triggerDecryptionConfetti();
      }
    }
  }

  /**
   * Jumps directly to a target clock index (0..totalClocks).
   */
  function jumpToClock(targetClock) {
    if (!state.simulation) return;
    stopAutoPlay();
    const total = state.simulation.totalClocks;
    const clamped = Math.max(0, Math.min(total, Number(targetClock) || 0));
    const direction = clamped >= state.currentClock ? 'forward' : 'backward';
    state.currentClock = clamped;

    renderRegisterStageAtClock({
      animate: !state.compactMode,
      direction
    });

    if (state.currentClock === total && total > 0 && state.mode === 'decrypt') {
      Animator.setPadlockState(true);
      Animator.triggerDecryptionConfetti();
    }
  }

  /**
   * Starts Auto-Play interval timer and accelerates tsParticles ambient background.
   */
  function startAutoPlay() {
    if (!state.simulation) return;
    if (state.currentClock >= state.simulation.totalClocks) {
      state.currentClock = 0;
      renderRegisterStageAtClock({ animate: false });
    }

    state.isPlaying = true;
    Animator.setParticlesAutoPlayState(true, state.speedMultiplier);
    updatePlaybackControlsState();

    clearInterval(state.timerId);
    const intervalMs = Math.max(70, Math.round(BASE_INTERVAL_MS / state.speedMultiplier));
    state.timerId = setInterval(() => {
      if (!state.simulation || state.currentClock >= state.simulation.totalClocks) {
        stopAutoPlay();
        return;
      }
      stepClock(1);
    }, intervalMs);
  }

  /**
   * Stops Auto-Play interval timer and returns tsParticles to calm drift speed.
   */
  function stopAutoPlay() {
    state.isPlaying = false;
    clearInterval(state.timerId);
    state.timerId = null;
    Animator.setParticlesAutoPlayState(false, 1);
    updatePlaybackControlsState();
  }

  /**
   * Fixes an invalid or all-zero seed automatically.
   */
  function fixSeedAutomatically() {
    stopAutoPlay();
    if (state.n === 4) {
      state.seed = '1001';
    } else {
      state.seed = Engine.normalizeSeedLength(state.seed, state.n);
    }
    dom.inputSeed.value = state.seed;
    validateAndRebuildSimulation();
    showToast(`Seed diperbaiki ke nilai valid: ${state.seed}`);
  }

  /**
   * Updates mode buttons and input labels when switching between Encryption and Decryption.
   */
  function updateModeUI() {
    const isEncrypt = state.mode === 'encrypt';
    dom.btnModeEncrypt.setAttribute('aria-pressed', isEncrypt ? 'true' : 'false');
    dom.btnModeDecrypt.setAttribute('aria-pressed', !isEncrypt ? 'true' : 'false');

    dom.decryptFormatWrapper.classList.toggle('hidden', isEncrypt);
    dom.btnDecFormatHex.setAttribute('aria-pressed', state.decryptFormat === 'hex' ? 'true' : 'false');
    dom.btnDecFormatBin.setAttribute('aria-pressed', state.decryptFormat === 'binary' ? 'true' : 'false');

    if (isEncrypt) {
      dom.labelMessageInput.textContent = 'Input Pesan Plaintext (ASCII / UTF-8)';
      dom.inputMessage.placeholder = 'Ketik pesan teks, misal: HI';
      dom.btnTestDecryptResult.textContent = 'Uji Dekripsi Hasil Ini';
    } else {
      dom.labelMessageInput.textContent =
        state.decryptFormat === 'hex'
          ? 'Input Ciphertext (Format Hexadecimal Genap)'
          : 'Input Ciphertext (Format Biner Kelipatan 8-Bit)';
      dom.inputMessage.placeholder =
        state.decryptFormat === 'hex'
          ? 'Contoh Hex: D2 B8'
          : 'Contoh Biner: 11010010 10111000';
      dom.btnTestDecryptResult.textContent = 'Kembalikan ke Mode Enkripsi';
    }
  }

  /**
   * Transfers current encryption output Hex directly into Decryption mode with identical LFSR config.
   */
  function transferOutputToDecryptionMode() {
    if (!state.simulation) return;
    stopAutoPlay();

    if (state.mode === 'encrypt') {
      const cipherHex = state.simulation.outputHex;
      state.mode = 'decrypt';
      state.decryptFormat = 'hex';
      state.messageInput = cipherHex;
      dom.inputMessage.value = cipherHex;
      updateModeUI();
      validateAndRebuildSimulation();
      // Step to end or start at 0? Let's jump to full result so user immediately sees "HI" recovered and can step through
      jumpToClock(state.simulation.totalClocks);
      showToast(`Ciphertext Hex (${cipherHex}) dipindahkan ke Mode Dekripsi!`);
    } else {
      const recoveredText = state.simulation.decodedOutput.rawText || 'HI';
      state.mode = 'encrypt';
      state.messageInput = recoveredText;
      dom.inputMessage.value = recoveredText;
      updateModeUI();
      validateAndRebuildSimulation();
      showToast(`Plaintext ("${recoveredText}") dikembalikan ke Mode Enkripsi.`);
    }
  }

  /**
   * Loads the PRD Section 4.3 Standard Test Case ("HI", n=4, seed=1001, tap b1 XOR b0).
   */
  function loadStandardTestCase() {
    stopAutoPlay();
    state.mode = 'encrypt';
    state.n = 4;
    state.seed = '1001';
    state.tapIndices = [1, 0];
    state.messageInput = 'HI';

    dom.selectRegLength.value = '4';
    dom.inputSeed.value = '1001';
    dom.inputMessage.value = 'HI';

    updateModeUI();
    renderTapToggleButtons();
    validateAndRebuildSimulation();
    showToast('Kasus Uji Standar PRD ("HI", Seed 1001, Tap b1⊕b0 -> D2 B8) dimuat.');
  }

  /**
   * Copies text to clipboard and displays toast confirmation.
   */
  async function copyToClipboard(text, label) {
    if (!text || text === '--') return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      showToast(`${label} berhasil disalin ke clipboard!`);
    } catch (_err) {
      showToast(`Gagal menyalin ${label}.`);
    }
  }

  /**
   * Binds all DOM event listeners and keyboard shortcuts.
   */
  function bindEvents() {
    // Header shortcuts
    dom.btnLoadTestCase.addEventListener('click', loadStandardTestCase);

    dom.btnToggleBgMotion.addEventListener('click', () => {
      state.bgMotionPaused = !state.bgMotionPaused;
      Animator.toggleBackgroundParticles(state.bgMotionPaused);
      dom.btnToggleBgMotion.setAttribute('aria-pressed', state.bgMotionPaused ? 'true' : 'false');
      dom.btnToggleBgMotion.textContent = state.bgMotionPaused ? 'Partikel: Nonaktif' : 'Partikel: Aktif';
    });

    // Mode switchers
    dom.btnModeEncrypt.addEventListener('click', () => {
      if (state.mode === 'encrypt') return;
      stopAutoPlay();
      state.mode = 'encrypt';
      if (/^[0-9A-Fa-f\s]+$/.test(state.messageInput) && state.simulation) {
        state.messageInput = state.simulation.decodedOutput.hasNonPrintable
          ? 'HI'
          : state.simulation.decodedOutput.rawText || 'HI';
        dom.inputMessage.value = state.messageInput;
      }
      updateModeUI();
      validateAndRebuildSimulation();
    });

    dom.btnModeDecrypt.addEventListener('click', () => {
      if (state.mode === 'decrypt') return;
      stopAutoPlay();
      const prevSim = state.simulation;
      state.mode = 'decrypt';
      if (prevSim && prevSim.outputHex) {
        state.messageInput =
          state.decryptFormat === 'hex' ? prevSim.outputHex : prevSim.outputBinaryGrouped;
        dom.inputMessage.value = state.messageInput;
      }
      updateModeUI();
      validateAndRebuildSimulation();
    });

    // Decryption format switchers (Hex vs Binary)
    dom.btnDecFormatHex.addEventListener('click', () => {
      if (state.decryptFormat === 'hex') return;
      stopAutoPlay();
      state.decryptFormat = 'hex';
      if (state.inputBitStream.length > 0) {
        state.messageInput = Engine.bitsToHex(state.inputBitStream, ' ');
        dom.inputMessage.value = state.messageInput;
      }
      updateModeUI();
      validateAndRebuildSimulation();
    });

    dom.btnDecFormatBin.addEventListener('click', () => {
      if (state.decryptFormat === 'binary') return;
      stopAutoPlay();
      state.decryptFormat = 'binary';
      if (state.inputBitStream.length > 0) {
        state.messageInput = Engine.bitsToBinaryGrouped(state.inputBitStream, ' ');
        dom.inputMessage.value = state.messageInput;
      }
      updateModeUI();
      validateAndRebuildSimulation();
    });

    // Register Length (n) Change
    dom.selectRegLength.addEventListener('change', (e) => {
      stopAutoPlay();
      const newN = Number(e.target.value);
      state.n = newN;
      state.seed = Engine.normalizeSeedLength(state.seed, newN);
      dom.inputSeed.maxLength = newN;
      dom.inputSeed.value = state.seed;

      // Apply default primitive taps for newN
      const preset = Engine.PRIMITIVE_PRESETS[newN];
      state.tapIndices = preset ? [...preset.taps] : [1, 0];

      renderTapToggleButtons();
      validateAndRebuildSimulation();
    });

    // Seed Input
    dom.inputSeed.addEventListener('input', (e) => {
      stopAutoPlay();
      state.seed = e.target.value.replace(/\s+/g, '');
      validateAndRebuildSimulation();
    });

    dom.btnShuffleSeed.addEventListener('click', () => {
      stopAutoPlay();
      state.seed = Engine.generateRandomSeed(state.n);
      dom.inputSeed.value = state.seed;
      validateAndRebuildSimulation();
      showToast(`Seed acak ${state.n}-bit dibuat: ${state.seed}`);
    });

    dom.btnFixSeed.addEventListener('click', fixSeedAutomatically);

    // Primitive Polynomial Preset Selector
    dom.selectTapPreset.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') return;
      stopAutoPlay();
      const targetN = Number(val);
      const preset = Engine.PRIMITIVE_PRESETS[targetN];
      if (!preset) return;

      if (state.n !== targetN) {
        state.n = targetN;
        dom.selectRegLength.value = String(targetN);
        state.seed = Engine.normalizeSeedLength(state.seed, targetN);
        dom.inputSeed.maxLength = targetN;
        dom.inputSeed.value = state.seed;
      }
      state.tapIndices = [...preset.taps];
      renderTapToggleButtons();
      validateAndRebuildSimulation();
    });

    // Message Input
    dom.inputMessage.addEventListener('input', (e) => {
      stopAutoPlay();
      state.messageInput = e.target.value;
      validateAndRebuildSimulation();
    });

    // Compact Mode Checkbox
    dom.toggleCompactMode.addEventListener('change', (e) => {
      state.compactMode = e.target.checked;
      showToast(
        state.compactMode
          ? 'Mode Ringkas 60fps aktif (animasi per kotak dinonaktifkan).'
          : 'Mode Animasi Penuh aktif.'
      );
    });

    // Initialize & Clear buttons
    dom.btnInitSimulation.addEventListener('click', () => {
      stopAutoPlay();
      const ok = validateAndRebuildSimulation({ preserveClock: false });
      if (ok) {
        showToast('Mesin LFSR berhasil diinisialisasi pada Clock #0.');
      }
    });

    dom.btnClearInput.addEventListener('click', () => {
      stopAutoPlay();
      state.messageInput = '';
      dom.inputMessage.value = '';
      validateAndRebuildSimulation();
    });

    // Playback Controls
    dom.btnStepReset.addEventListener('click', () => {
      jumpToClock(0);
    });

    dom.btnStepPrev.addEventListener('click', () => {
      stopAutoPlay();
      stepClock(-1);
    });

    dom.btnStepNext.addEventListener('click', () => {
      stopAutoPlay();
      stepClock(1);
    });

    dom.btnStepByte.addEventListener('click', () => {
      stopAutoPlay();
      stepClock(8);
    });

    dom.btnStepInstant.addEventListener('click', () => {
      if (!state.simulation) return;
      jumpToClock(state.simulation.totalClocks);
    });

    dom.btnAutoPlay.addEventListener('click', () => {
      if (state.isPlaying) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
    });

    // Speed Multiplier Pill Buttons
    dom.speedButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mult = Number(btn.getAttribute('data-speed')) || 1;
        state.speedMultiplier = mult;
        dom.speedButtons.forEach((b) => {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        if (state.isPlaying) {
          startAutoPlay();
        }
      });
    });

    // Copy & Test Decryption Actions
    dom.btnCopyHex.addEventListener('click', () => {
      copyToClipboard(dom.outputHexValue.textContent, 'Output Hexadecimal');
    });

    dom.btnCopyBin.addEventListener('click', () => {
      copyToClipboard(dom.outputBinValue.textContent, 'Output Biner');
    });

    dom.btnCopyAscii.addEventListener('click', () => {
      const raw = state.simulation ? state.simulation.decodedOutput.rawText : '';
      copyToClipboard(raw, 'Teks Hasil');
    });

    dom.btnTestDecryptResult.addEventListener('click', transferOutputToDecryptionMode);

    // Redraw SVG tap wires on window or stage resize
    window.addEventListener('resize', () => {
      Animator.renderAndAnimateTapCircuit({
        tapIndices: state.tapIndices,
        n: state.n,
        animateSignal: false,
        compactMode: true
      });
    });
  }

  /**
   * Bootstraps the application on DOMContentLoaded.
   */
  function initApp() {
    cacheDOM();
    Animator.initGSAP();
    Animator.initPadlockLottie('lottie-lock');
    Animator.initBackgroundParticles('tsparticles');

    // Run mandatory cryptographic unit test check ("HI" -> KS: 9A F1, CT: D2 B8 -> "HI")
    try {
      const testRes = Engine.verifyStandardTestCase();
      if (dom.headerTestBadge && testRes.passed) {
        dom.headerTestBadge.textContent = `VERIFIKASI "HI" → D2 B8: LULUS`;
        dom.headerTestBadge.className = 'status-badge badge-green mono-code';
      }
    } catch (err) {
      if (dom.headerTestBadge) {
        dom.headerTestBadge.textContent = 'SELF-TEST GAGAL';
        dom.headerTestBadge.className = 'status-badge badge-red mono-code';
      }
    }

    populateConfigSelects();
    updateModeUI();
    renderTapToggleButtons();
    bindEvents();
    validateAndRebuildSimulation();

    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
