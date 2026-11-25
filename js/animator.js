/**
 * CYBER-LFSR : 60fps GPU Animation Choreography Module
 * Coordinates GSAP 3 + Flip physical bit shifts, Anime.js SVG tap circuit signal pulses,
 * tsParticles ambient background speed modulation, Lottie-Web vector padlock state,
 * and Canvas-Confetti decryption completion celebration.
 */
(function (root) {
  'use strict';

  let particlesInstance = null;
  let padlockLottie = null;
  let currentPadlockUnlocked = false;
  let activeAnimeInstances = [];
  let activeStepTimeline = null;
  let pendingStepCleanup = null;

  /**
   * Self-contained Lottie vector JSON for a cryptographic padlock (frames 0..30: Locked -> Unlocked).
   */
  const PADLOCK_LOTTIE_DATA = {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 30,
    w: 64,
    h: 64,
    nm: 'CyberPadlock',
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Shackle',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { t: 0, s: [32, 26, 0], e: [32, 19, 0], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
              { t: 30, s: [32, 19, 0] }
            ]
          },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] }
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            it: [
              {
                ty: 'rc',
                d: 1,
                s: { a: 0, k: [20, 22] },
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: 10 },
                nm: 'ShackleArc'
              },
              {
                ty: 'st',
                c: {
                  a: 1,
                  k: [
                    { t: 0, s: [0.118, 0.843, 0.376, 1], e: [0.325, 0.616, 0.961, 1] },
                    { t: 30, s: [0.325, 0.616, 0.961, 1] }
                  ]
                },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 4.5 },
                lc: 2,
                lj: 2,
                nm: 'ShackleStroke'
              },
              {
                ty: 'tr',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
              }
            ],
            nm: 'ShackleGroup'
          }
        ],
        ip: 0,
        op: 30,
        st: 0,
        bm: 0
      },
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: 'LockBody',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [32, 42, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] }
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            it: [
              {
                ty: 'rc',
                d: 1,
                s: { a: 0, k: [32, 24] },
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: 6 },
                nm: 'BodyRect'
              },
              {
                ty: 'fl',
                c: { a: 0, k: [0.145, 0.145, 0.145, 1] },
                o: { a: 0, k: 100 },
                nm: 'BodyFill'
              },
              {
                ty: 'st',
                c: {
                  a: 1,
                  k: [
                    { t: 0, s: [0.118, 0.843, 0.376, 1], e: [0.325, 0.616, 0.961, 1] },
                    { t: 30, s: [0.325, 0.616, 0.961, 1] }
                  ]
                },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 3.5 },
                lc: 2,
                lj: 2,
                nm: 'BodyStroke'
              },
              {
                ty: 'tr',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
              }
            ],
            nm: 'BodyGroup'
          }
        ],
        ip: 0,
        op: 30,
        st: 0,
        bm: 0
      }
    ]
  };

  function isReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /**
   * Registers GSAP Flip plugin if available on window.
   */
  function initGSAP() {
    if (typeof window.gsap !== 'undefined' && typeof window.Flip !== 'undefined') {
      window.gsap.registerPlugin(window.Flip);
    }
  }

  /**
   * Anti-Race Condition Guard:
   * Kills all active GSAP tweens and Anime.js timelines before starting a new clock step.
   */
  function killActiveAnimations() {
    if (activeStepTimeline) {
      activeStepTimeline.kill();
      activeStepTimeline = null;
    }

    if (typeof pendingStepCleanup === 'function') {
      const fn = pendingStepCleanup;
      pendingStepCleanup = null;
      fn();
    }

    if (typeof window.gsap !== 'undefined') {
      window.gsap.killTweensOf('.reg-cell, .reg-cell-val, .io-slot-box, .xor-gate-node, .ks-bit-pill, .xor-cell');
      window.gsap.set('.reg-cell, .reg-cell-val, .io-slot-box, .xor-gate-node', {
        clearProps: 'transform,opacity'
      });
    }

    if (typeof window.anime !== 'undefined') {
      activeAnimeInstances.forEach((inst) => {
        if (inst && typeof inst.pause === 'function') inst.pause();
      });
      activeAnimeInstances = [];
      window.anime.remove('.tap-signal-path, .feedback-signal-path, .output-signal-path, #xor-gate-badge');
    }
  }

  /**
   * Captures current register cell positions for GSAP Flip before DOM update.
   */
  function captureFlipState(selector = '.reg-cell') {
    if (isReducedMotion()) return null;
    if (typeof window.gsap !== 'undefined' && typeof window.Flip !== 'undefined') {
      const targets = document.querySelectorAll(selector);
      if (targets.length > 0) {
        return window.Flip.getState(targets);
      }
    }
    return null;
  }

  /**
   * Animates the 2-phase LFSR register shift:
   * Phase 1: Prepend b_new at the front so n + 1 boxes (e.g. 5 boxes for n=4: [b_new, b_3, b_2, b_1, b_0]) are shown first.
   * Phase 2: Shift all boxes 1 slot to the right so b_new becomes b_{n-1} and old b_0 slides out into Keystream K_t.
   */
  function animateRegisterStep(options = {}) {
    const {
      direction = 'forward',
      compactMode = false,
      flipState = null,
      speedMultiplier = 1,
      tapIndices = [],
      n = 4
    } = options;

    if (activeStepTimeline) {
      activeStepTimeline.kill();
      activeStepTimeline = null;
    }

    if (typeof window.gsap !== 'undefined') {
      window.gsap.killTweensOf('.reg-cell, .reg-cell-val, .io-slot-box, .xor-gate-node, .ks-bit-pill, .xor-cell');
    }

    const exitingCell = document.querySelector('#register-cells-track .reg-cell-exiting');
    const allCells = Array.from(document.querySelectorAll('#register-cells-track .reg-cell'));
    const keptCells = allCells.filter((c) => !c.classList.contains('reg-cell-exiting'));

    const finalizeStepDOM = () => {
      if (exitingCell && exitingCell.parentNode) {
        exitingCell.parentNode.removeChild(exitingCell);
      }
      keptCells.forEach((cell) => {
        if (cell.dataset.finalClass) {
          cell.className = cell.dataset.finalClass;
        }
        if (cell.dataset.finalTapPos) {
          cell.dataset.tapPos = cell.dataset.finalTapPos;
        }
        const idxEl = cell.querySelector('.reg-cell-index');
        const roleEl = cell.querySelector('.reg-cell-role');
        if (idxEl && cell.dataset.finalIndexHtml) {
          idxEl.innerHTML = cell.dataset.finalIndexHtml;
        }
        if (roleEl && cell.dataset.finalRoleText) {
          roleEl.textContent = cell.dataset.finalRoleText;
          roleEl.className = cell.dataset.finalRoleClass || 'reg-cell-role';
        }
      });
      if (typeof window.gsap !== 'undefined') {
        window.gsap.set(keptCells, { clearProps: 'transform,opacity' });
      }
      renderAndAnimateTapCircuit({
        tapIndices,
        n,
        animateSignal: false,
        compactMode: true
      });
    };

    if (compactMode || isReducedMotion() || typeof window.gsap === 'undefined') {
      finalizeStepDOM();
      return;
    }

    const gsap = window.gsap;
    const feedbackSlot = document.getElementById('feedback-slot-box');
    const outputSlot = document.getElementById('output-slot-box');
    const currentKsPill = document.querySelector('.ks-bit-pill.ks-current');

    // Forward 2-phase choreography when (n + 1) cells are present
    if (direction === 'forward' && exitingCell && keptCells.length > 0) {
      pendingStepCleanup = finalizeStepDOM;

      const stride = allCells.length > 1 ? (allCells[1].offsetLeft - allCells[0].offsetLeft) || 74 : 74;
      const halfStride = stride / 2;

      // Save final post-shift attributes and set Phase 1 pre-shift attributes across the (n + 1) boxes:
      // [b_new, b_{n-1}, ..., b_1, b_0(exitingCell)]
      keptCells.forEach((cell, idx) => {
        cell.dataset.finalClass = cell.className;
        cell.dataset.finalTapPos = cell.dataset.tapPos || '';

        const idxEl = cell.querySelector('.reg-cell-index');
        const roleEl = cell.querySelector('.reg-cell-role');
        if (idxEl) {
          cell.dataset.finalIndexHtml = idxEl.innerHTML;
        }
        if (roleEl) {
          cell.dataset.finalRoleText = roleEl.textContent;
          cell.dataset.finalRoleClass = roleEl.className;
        }

        if (idx === 0) {
          cell.className = 'reg-cell is-new-bit';
          cell.dataset.tapPos = 'new';
          if (idxEl) idxEl.innerHTML = 'b<sub>new</sub>';
          if (roleEl) {
            roleEl.textContent = 'DEPAN';
            roleEl.className = 'reg-cell-role badge-green';
          }
        } else {
          const preShiftPos = n - idx; // b_{n-1} down to b_1
          const isPreTap = tapIndices.includes(preShiftPos);
          cell.className = isPreTap ? 'reg-cell is-tap' : 'reg-cell';
          cell.dataset.tapPos = String(preShiftPos);
          if (idxEl) idxEl.innerHTML = `b<sub>${preShiftPos}</sub>`;
          if (roleEl) {
            roleEl.textContent = isPreTap ? 'TAP' : preShiftPos === n - 1 ? 'MSB' : 'REG';
            roleEl.className = isPreTap
              ? 'reg-cell-role badge-orange'
              : 'reg-cell-role text-[#b3b3b3]';
          }
        }
      });

      // The (n + 1)-th exiting cell represents pre-shift b_0 during Phase 1 & Phase 2
      const isB0Tap = tapIndices.includes(0);
      exitingCell.dataset.tapPos = '0';
      if (isB0Tap) {
        exitingCell.classList.add('is-tap');
      }

      const frontNewCell = keptCells[0];
      const existingRegisterCells = [...keptCells.slice(1), exitingCell];

      // Anchor the old n cells at their pre-shift screen coordinates (-halfStride in (n+1)-cell flex track)
      gsap.set(existingRegisterCells, { x: -halfStride, y: 0, opacity: 1, scale: 1 });
      // Prepare b_new slightly above/left of the front slot
      gsap.set(frontNewCell, { x: -halfStride - 22, y: -22, opacity: 0, scale: 0.86 });

      const timeScale = Math.max(0.65, Math.min(4, Number(speedMultiplier) || 1));
      const tl = gsap.timeline({
        onUpdate: () => {
          renderAndAnimateTapCircuit({
            tapIndices,
            n,
            animateSignal: false,
            compactMode: true
          });
        },
        onComplete: () => {
          activeStepTimeline = null;
          pendingStepCleanup = null;
          finalizeStepDOM();
        }
      });
      tl.timeScale(timeScale);
      activeStepTimeline = tl;

      if (feedbackSlot) {
        tl.fromTo(
          feedbackSlot,
          { scale: 1.08 },
          { scale: 1, duration: 0.2, ease: 'power2.out', clearProps: 'transform' },
          0
        );
      }

      // PHASE 1: b_new drops into the front-most slot -> all (n + 1) / 5 boxes are now visible side-by-side
      tl.to(
        frontNewCell,
        {
          x: -halfStride,
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.23,
          ease: 'back.out(1.7)'
        },
        0
      );

      // Hold briefly (+0.15s) so the (n + 1) / 5 boxes [b_new, b_{n-1}, ..., b_0] are clearly seen,
      // then PHASE 2: shift all (n + 1) boxes 1 slot to the right (+stride px -> x: +halfStride) in lockstep
      const shiftStart = 0.38;

      tl.to(
        keptCells,
        {
          x: halfStride,
          duration: 0.28,
          ease: 'power2.inOut'
        },
        shiftStart
      );

      tl.to(
        exitingCell,
        {
          x: halfStride + 18,
          opacity: 0,
          scale: 0.92,
          duration: 0.28,
          ease: 'power2.inOut'
        },
        shiftStart
      );

      if (outputSlot) {
        tl.fromTo(
          outputSlot,
          { x: -14, scale: 1.08 },
          { x: 0, scale: 1, duration: 0.24, ease: 'power2.out', clearProps: 'transform' },
          shiftStart + 0.12
        );
      }

      if (currentKsPill) {
        tl.fromTo(
          currentKsPill,
          { scale: 1.24 },
          { scale: 1.08, duration: 0.24, ease: 'back.out(2)' },
          shiftStart + 0.14
        );
      }

      return;
    }

    // Backward step or direct jump fallback
    finalizeStepDOM();

    if (flipState && typeof window.Flip !== 'undefined' && keptCells.length > 0) {
      window.Flip.from(flipState, {
        duration: 0.24,
        ease: 'power2.out',
        simple: true
      });
    } else if (keptCells.length > 0) {
      const shiftPx = direction === 'backward' ? 28 : -28;
      gsap.fromTo(
        keptCells,
        { x: shiftPx, opacity: 0.82 },
        {
          x: 0,
          opacity: 1,
          duration: 0.24,
          stagger: 0.015,
          ease: 'power2.out',
          clearProps: 'transform,opacity'
        }
      );
    }
  }

  /**
   * Renders dynamic SVG tap circuit paths connecting active tap register boxes (#ffa42b)
   * to the XOR gate node, and feedback wire (#1ed760) to b_{n-1}, then animates signal flow via Anime.js.
   */
  function renderAndAnimateTapCircuit(options = {}) {
    const {
      tapIndices = [],
      n = 4,
      animateSignal = false,
      compactMode = false
    } = options;

    const svg = document.getElementById('tap-circuit-svg');
    const canvas = document.getElementById('lfsr-circuit-canvas');
    const xorBadge = document.getElementById('xor-gate-badge');
    const feedbackSlot = document.getElementById('feedback-slot-box');
    const outputSlot = document.getElementById('output-slot-box');

    if (!svg || !canvas || !xorBadge) return;

    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) return;

    svg.setAttribute('viewBox', `0 0 ${Math.round(canvasRect.width)} ${Math.round(canvasRect.height)}`);
    svg.innerHTML = '';

    const xorRect = xorBadge.getBoundingClientRect();
    const xorCenterX = xorRect.left - canvasRect.left + xorRect.width / 2;
    const xorCenterY = xorRect.top - canvasRect.top + xorRect.height / 2;
    const xorBottomY = xorRect.bottom - canvasRect.top;
    const xorLeftX = xorRect.left - canvasRect.left;

    const ns = 'http://www.w3.org/2000/svg';
    const busY = Math.max(xorBottomY + 14, 58);

    // 1. Draw wires from each active tap cell up to XOR gate
    tapIndices.forEach((tapBitPos) => {
      const cellEl = canvas.querySelector(`[data-tap-pos="${tapBitPos}"]`);
      if (!cellEl) return;

      const cellRect = cellEl.getBoundingClientRect();
      const startX = cellRect.left - canvasRect.left + cellRect.width / 2;
      const startY = cellRect.top - canvasRect.top;

      const d = `M ${startX} ${startY} L ${startX} ${busY} L ${xorCenterX} ${busY} L ${xorCenterX} ${xorBottomY}`;

      // Base wire
      const basePath = document.createElementNS(ns, 'path');
      basePath.setAttribute('d', d);
      basePath.setAttribute('fill', 'none');
      basePath.setAttribute('stroke', 'rgba(255, 164, 43, 0.28)');
      basePath.setAttribute('stroke-width', '2');
      basePath.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(basePath);

      // Animated signal wire
      const signalPath = document.createElementNS(ns, 'path');
      signalPath.setAttribute('d', d);
      signalPath.setAttribute('fill', 'none');
      signalPath.setAttribute('stroke', '#ffa42b');
      signalPath.setAttribute('stroke-width', '2.5');
      signalPath.setAttribute('stroke-linecap', 'round');
      signalPath.setAttribute('stroke-linejoin', 'round');
      signalPath.setAttribute('stroke-dasharray', '7 7');
      signalPath.setAttribute('class', 'tap-signal-path');
      svg.appendChild(signalPath);

      // Connection dot on top of active tap box
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', String(startX));
      dot.setAttribute('cy', String(startY));
      dot.setAttribute('r', '4');
      dot.setAttribute('fill', '#ffa42b');
      svg.appendChild(dot);
    });

    // 2. Draw feedback wire from XOR gate left side to front b_new / MSB cell (b_{n-1})
    const msbCell =
      canvas.querySelector('[data-tap-pos="new"]') ||
      canvas.querySelector(`[data-tap-pos="${n - 1}"]`);
    const targetEl = msbCell || feedbackSlot;
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      const endX = targetRect.left - canvasRect.left + targetRect.width / 2;
      const endY = targetRect.top - canvasRect.top;

      const fbD = `M ${xorLeftX} ${xorCenterY} L ${endX} ${xorCenterY} L ${endX} ${endY}`;

      const fbBase = document.createElementNS(ns, 'path');
      fbBase.setAttribute('d', fbD);
      fbBase.setAttribute('fill', 'none');
      fbBase.setAttribute('stroke', 'rgba(30, 215, 96, 0.25)');
      fbBase.setAttribute('stroke-width', '2');
      fbBase.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(fbBase);

      const fbSignal = document.createElementNS(ns, 'path');
      fbSignal.setAttribute('d', fbD);
      fbSignal.setAttribute('fill', 'none');
      fbSignal.setAttribute('stroke', '#1ed760');
      fbSignal.setAttribute('stroke-width', '2.5');
      fbSignal.setAttribute('stroke-dasharray', '7 7');
      fbSignal.setAttribute('class', 'feedback-signal-path');
      svg.appendChild(fbSignal);

      const fbDot = document.createElementNS(ns, 'circle');
      fbDot.setAttribute('cx', String(endX));
      fbDot.setAttribute('cy', String(endY));
      fbDot.setAttribute('r', '4.5');
      fbDot.setAttribute('fill', '#1ed760');
      svg.appendChild(fbDot);
    }

    // 3. Draw output wire from rightmost LSB cell (b_0) to Keystream Output Slot (#539df5)
    const exitingEl = canvas.querySelector('.reg-cell-exiting');
    const lsbCell = exitingEl || canvas.querySelector('[data-tap-pos="0"]');
    if (lsbCell && outputSlot) {
      const lsbRect = lsbCell.getBoundingClientRect();
      const outRect = outputSlot.getBoundingClientRect();
      const startX = lsbRect.right - canvasRect.left;
      const startY = lsbRect.top - canvasRect.top + lsbRect.height / 2;
      const endX = outRect.left - canvasRect.left;
      const endY = outRect.top - canvasRect.top + outRect.height / 2;

      if (endX > startX) {
        const outD = `M ${startX} ${startY} L ${endX} ${endY}`;
        const outPath = document.createElementNS(ns, 'path');
        outPath.setAttribute('d', outD);
        outPath.setAttribute('fill', 'none');
        outPath.setAttribute('stroke', '#539df5');
        outPath.setAttribute('stroke-width', '2.5');
        outPath.setAttribute('stroke-dasharray', '5 5');
        outPath.setAttribute('class', 'output-signal-path');
        svg.appendChild(outPath);
      }
    }

    // 4. Trigger Anime.js signal flow animation on clock step
    if (animateSignal && !compactMode && !isReducedMotion() && typeof window.anime !== 'undefined') {
      const tapAnim = window.anime({
        targets: '.tap-signal-path',
        strokeDashoffset: [28, 0],
        easing: 'linear',
        duration: 320
      });

      const fbAnim = window.anime({
        targets: '.feedback-signal-path, .output-signal-path',
        strokeDashoffset: [28, 0],
        easing: 'linear',
        duration: 340
      });

      activeAnimeInstances.push(tapAnim, fbAnim);
    }
  }

  /**
   * Initializes low-density background particles on #121212 canvas via tsParticles.
   */
  async function initBackgroundParticles(containerId = 'tsparticles') {
    if (isReducedMotion()) return;
    if (typeof window.tsParticles === 'undefined') return;

    try {
      particlesInstance = await window.tsParticles.load(containerId, {
        fullScreen: { enable: false },
        fpsLimit: 60,
        background: { color: 'transparent' },
        particles: {
          number: {
            value: 20,
            density: { enable: true, area: 1100 }
          },
          color: {
            value: ['#1ed760', '#539df5', '#ffa42b']
          },
          links: {
            enable: true,
            distance: 155,
            color: '#4d4d4d',
            opacity: 0.14,
            width: 1
          },
          move: {
            enable: true,
            speed: 0.35,
            direction: 'right',
            random: false,
            straight: false,
            outModes: { default: 'out' }
          },
          opacity: {
            value: { min: 0.1, max: 0.26 }
          },
          size: {
            value: { min: 1.5, max: 3 }
          }
        },
        detectRetina: true
      });
    } catch (_err) {
      particlesInstance = null;
    }
  }

  /**
   * Modulates tsParticles drift velocity when Auto-Play starts/stops.
   */
  function setParticlesAutoPlayState(isPlaying, speedMultiplier = 1) {
    if (!particlesInstance) return;
    try {
      const targetSpeed = isPlaying ? Math.min(2.8, 0.75 * Math.max(0.8, speedMultiplier)) : 0.35;
      if (particlesInstance.options && particlesInstance.options.particles && particlesInstance.options.particles.move) {
        particlesInstance.options.particles.move.speed = targetSpeed;
      }
      if (typeof particlesInstance.refresh === 'function') {
        particlesInstance.refresh();
      }
    } catch (_e) {
      // ignore if particles instance not ready
    }
  }

  /**
   * Toggles pause/play on background particles for accessibility (R-39).
   */
  function toggleBackgroundParticles(paused) {
    if (!particlesInstance) return;
    if (paused && typeof particlesInstance.pause === 'function') {
      particlesInstance.pause();
    } else if (!paused && typeof particlesInstance.play === 'function') {
      particlesInstance.play();
    }
  }

  /**
   * Initializes interactive vector padlock in the header via Lottie-Web.
   */
  function initPadlockLottie(containerId = 'lottie-lock') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof window.lottie !== 'undefined') {
      try {
        container.innerHTML = '';
        padlockLottie = window.lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: PADLOCK_LOTTIE_DATA
        });
        padlockLottie.goToAndStop(0, true);
        currentPadlockUnlocked = false;
        return;
      } catch (_e) {
        padlockLottie = null;
      }
    }

    // Fallback SVG padlock if Lottie unavailable
    container.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1ed760" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    `;
  }

  /**
   * Animates padlock between 'locked' (Encryption / active) and 'unlocked' (Decryption recovered).
   */
  function setPadlockState(unlocked) {
    const targetUnlocked = Boolean(unlocked);
    if (!padlockLottie) return;

    if (isReducedMotion()) {
      padlockLottie.goToAndStop(targetUnlocked ? 29 : 0, true);
      currentPadlockUnlocked = targetUnlocked;
      return;
    }

    if (targetUnlocked && !currentPadlockUnlocked) {
      padlockLottie.playSegments([0, 30], true);
      currentPadlockUnlocked = true;
    } else if (!targetUnlocked && currentPadlockUnlocked) {
      padlockLottie.playSegments([30, 0], true);
      currentPadlockUnlocked = false;
    }
  }

  /**
   * Triggers a micro Canvas-Confetti burst when Decryption finishes recovering plaintext.
   */
  function triggerDecryptionConfetti() {
    if (isReducedMotion()) return;
    if (typeof window.confetti !== 'function') return;

    window.confetti({
      particleCount: 42,
      spread: 62,
      origin: { y: 0.72 },
      colors: ['#1ed760', '#539df5', '#ffa42b', '#ffffff'],
      disableForReducedMotion: true,
      scalar: 0.85
    });
  }

  root.LFSRAnimator = {
    initGSAP,
    killActiveAnimations,
    captureFlipState,
    animateRegisterStep,
    renderAndAnimateTapCircuit,
    initBackgroundParticles,
    setParticlesAutoPlayState,
    toggleBackgroundParticles,
    initPadlockLottie,
    setPadlockState,
    triggerDecryptionConfetti
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
