/**
 * CYBER-LFSR : Pure Cryptographic & Mathematical Engine
 * Decoupled from DOM. Handles UTF-8/ASCII <-> 8-bit Big-Endian Binary <-> Hex conversions,
 * Right-Shift LFSR register transitions, bitwise XOR stream cipher operations,
 * primitive polynomial presets (3 <= n <= 16), and pre-computed timeline snapshots.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const engine = factory();
    module.exports = engine;
    if (typeof require !== 'undefined' && require.main === module) {
      const assert = require('assert');
      const fs = require('fs');
      const res = engine.verifyStandardTestCase();
      const pt = engine.textToBinaryStream('HI');
      const sim = engine.runSimulation(pt.fullBitStream, '1001', [1, 0], { mode: 'encrypt' });
      const expReg = [
        '1100','0110','1011','0101','1010','1101','1110','1111',
        '0111','0011','0001','1000','0100','0010','1001','1100'
      ];
      const expKs = [1,0,0,1,1,0,1,0,1,1,1,1,0,0,0,1];
      sim.history.forEach((h, i) => {
        assert.strictEqual(h.registerAfter.join(''), expReg[i]);
        assert.strictEqual(h.keystreamBit, expKs[i]);
      });
      assert.strictEqual(engine.validateLFSRConfig(4, '0000', [1, 0]).code, 'ALL_ZERO_SEED');
      assert.strictEqual(engine.validateLFSRConfig(4, '1001', []).code, 'NO_TAPS');
      assert.strictEqual(engine.normalizeSeedLength('1001', 8).length, 8);
      assert.strictEqual(engine.hexToBinaryStream('D2B').valid, false);
      assert.strictEqual(engine.binaryStringToStream('01001').valid, false);
      const html = fs.readFileSync('index.html', 'utf8');
      const appJs = fs.readFileSync('js/app.js', 'utf8');
      const ids = [...appJs.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
      ids.forEach((id) => assert(html.includes(`id="${id}"`), `Missing DOM ID: ${id}`));
      console.log('SELF-CHECK PASS:', JSON.stringify({ ...res, checkedDomIds: ids.length }));
    }
  } else {
    root.LFSREngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Standard primitive polynomials over GF(2) for register lengths 3 <= n <= 16.
   * Tap indices use mathematical bit position b_k where b_0 is LSB (rightmost, output bit)
   * and b_{n-1} is MSB (leftmost, feedback entry bit).
   * In right-shift convention, x^n corresponds to b_new entry at b_{n-1},
   * and x^k + 1 corresponds to tap positions on b_k and b_0.
   */
  const PRIMITIVE_PRESETS = {
    3: {
      name: '3-Bit Primitif (x³ + x + 1)',
      polynomial: 'x³ + x + 1',
      taps: [1, 0],
      maxPeriod: 7
    },
    4: {
      name: '4-Bit Primitif Standar (x⁴ + x + 1)',
      polynomial: 'x⁴ + x + 1',
      taps: [1, 0],
      maxPeriod: 15
    },
    5: {
      name: '5-Bit Primitif (x⁵ + x² + 1)',
      polynomial: 'x⁵ + x² + 1',
      taps: [2, 0],
      maxPeriod: 31
    },
    6: {
      name: '6-Bit Primitif (x⁶ + x + 1)',
      polynomial: 'x⁶ + x + 1',
      taps: [1, 0],
      maxPeriod: 63
    },
    7: {
      name: '7-Bit Primitif (x⁷ + x + 1)',
      polynomial: 'x⁷ + x + 1',
      taps: [1, 0],
      maxPeriod: 127
    },
    8: {
      name: '8-Bit Primitif (x⁸ + x⁴ + x³ + x² + 1)',
      polynomial: 'x⁸ + x⁴ + x³ + x² + 1',
      taps: [4, 3, 2, 0],
      maxPeriod: 255
    },
    9: {
      name: '9-Bit Primitif (x⁹ + x⁴ + 1)',
      polynomial: 'x⁹ + x⁴ + 1',
      taps: [4, 0],
      maxPeriod: 511
    },
    10: {
      name: '10-Bit Primitif (x¹⁰ + x³ + 1)',
      polynomial: 'x¹⁰ + x³ + 1',
      taps: [3, 0],
      maxPeriod: 1023
    },
    11: {
      name: '11-Bit Primitif (x¹¹ + x² + 1)',
      polynomial: 'x¹¹ + x² + 1',
      taps: [2, 0],
      maxPeriod: 2047
    },
    12: {
      name: '12-Bit Primitif (x¹² + x⁶ + x⁴ + x + 1)',
      polynomial: 'x¹² + x⁶ + x⁴ + x + 1',
      taps: [6, 4, 1, 0],
      maxPeriod: 4095
    },
    13: {
      name: '13-Bit Primitif (x¹³ + x⁴ + x³ + x + 1)',
      polynomial: 'x¹³ + x⁴ + x³ + x + 1',
      taps: [4, 3, 1, 0],
      maxPeriod: 8191
    },
    14: {
      name: '14-Bit Primitif (x¹⁴ + x⁵ + x³ + x + 1)',
      polynomial: 'x¹⁴ + x⁵ + x³ + x + 1',
      taps: [5, 3, 1, 0],
      maxPeriod: 16383
    },
    15: {
      name: '15-Bit Primitif (x¹⁵ + x + 1)',
      polynomial: 'x¹⁵ + x + 1',
      taps: [1, 0],
      maxPeriod: 32767
    },
    16: {
      name: '16-Bit Primitif (x¹⁶ + x⁵ + x³ + x² + 1)',
      polynomial: 'x¹⁶ + x⁵ + x³ + x² + 1',
      taps: [5, 3, 2, 0],
      maxPeriod: 65535
    }
  };

  /**
   * Formats a byte (0..255) into a printable label for UI display.
   */
  function formatDisplayChar(byte) {
    if (byte === 32) return '␣';
    if (byte >= 33 && byte <= 126) return String.fromCharCode(byte);
    const controlMap = {
      0: 'NUL',
      9: 'TAB',
      10: 'LF',
      13: 'CR',
      127: 'DEL'
    };
    if (controlMap[byte]) return controlMap[byte];
    return '0x' + byte.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Converts raw plaintext string into UTF-8 bytes, per-byte 8-bit Big-Endian mappings,
   * and a flat bit stream array.
   */
  function textToBinaryStream(plaintext) {
    const str = String(plaintext ?? '');
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const bytes = encoder
      ? Array.from(encoder.encode(str))
      : Array.from(str).map((ch) => ch.charCodeAt(0) & 0xff);

    const charMappings = [];
    const fullBitStream = [];

    bytes.forEach((byte, index) => {
      const binString = byte.toString(2).padStart(8, '0');
      const hexString = byte.toString(16).toUpperCase().padStart(2, '0');
      const bitsArray = binString.split('').map((b) => Number(b));
      charMappings.push({
        index,
        char: formatDisplayChar(byte),
        rawChar: byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·',
        decimal: byte,
        hex: hexString,
        binary: binString,
        bits: bitsArray,
        startBitIndex: index * 8
      });
      fullBitStream.push(...bitsArray);
    });

    return {
      bytes,
      charMappings,
      fullBitStream
    };
  }

  /**
   * Parses and converts a validated Hexadecimal string into byte mappings and bit stream.
   */
  function hexToBinaryStream(hexInput) {
    const cleaned = String(hexInput ?? '').replace(/\s+/g, '').toUpperCase();
    if (!cleaned) {
      return { valid: false, error: 'Input Hexadecimal tidak boleh kosong.', charMappings: [], fullBitStream: [] };
    }
    if (!/^[0-9A-F]+$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Format Hexadecimal tidak valid. Gunakan hanya karakter 0-9 dan A-F.',
        charMappings: [],
        fullBitStream: []
      };
    }
    if (cleaned.length % 2 !== 0) {
      return {
        valid: false,
        error: `Panjang digit Hexadecimal harus genap (saat ini ${cleaned.length} nibble). Setiap 2 digit mewakili 1 byte (8 bit).`,
        charMappings: [],
        fullBitStream: []
      };
    }

    const bytes = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
    }

    const charMappings = [];
    const fullBitStream = [];

    bytes.forEach((byte, index) => {
      const binString = byte.toString(2).padStart(8, '0');
      const hexString = byte.toString(16).toUpperCase().padStart(2, '0');
      const bitsArray = binString.split('').map((b) => Number(b));
      charMappings.push({
        index,
        char: formatDisplayChar(byte),
        rawChar: byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·',
        decimal: byte,
        hex: hexString,
        binary: binString,
        bits: bitsArray,
        startBitIndex: index * 8
      });
      fullBitStream.push(...bitsArray);
    });

    return {
      valid: true,
      error: null,
      bytes,
      charMappings,
      fullBitStream
    };
  }

  /**
   * Parses and converts a binary string (0 and 1, multiple of 8 bits) into byte mappings and bit stream.
   */
  function binaryStringToStream(binInput) {
    const cleaned = String(binInput ?? '').replace(/\s+/g, '');
    if (!cleaned) {
      return { valid: false, error: 'Input Biner tidak boleh kosong.', charMappings: [], fullBitStream: [] };
    }
    if (!/^[01]+$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Format Biner tidak valid. Gunakan hanya angka 0 dan 1.',
        charMappings: [],
        fullBitStream: []
      };
    }
    if (cleaned.length % 8 !== 0) {
      return {
        valid: false,
        error: `Panjang bit Biner harus kelipatan 8 bit (saat ini ${cleaned.length} bit).`,
        charMappings: [],
        fullBitStream: []
      };
    }

    const bytes = [];
    for (let i = 0; i < cleaned.length; i += 8) {
      bytes.push(parseInt(cleaned.slice(i, i + 8), 2));
    }

    const charMappings = [];
    const fullBitStream = [];

    bytes.forEach((byte, index) => {
      const binString = byte.toString(2).padStart(8, '0');
      const hexString = byte.toString(16).toUpperCase().padStart(2, '0');
      const bitsArray = binString.split('').map((b) => Number(b));
      charMappings.push({
        index,
        char: formatDisplayChar(byte),
        rawChar: byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·',
        decimal: byte,
        hex: hexString,
        binary: binString,
        bits: bitsArray,
        startBitIndex: index * 8
      });
      fullBitStream.push(...bitsArray);
    });

    return {
      valid: true,
      error: null,
      bytes,
      charMappings,
      fullBitStream
    };
  }

  /**
   * Converts an array of bits (0/1) to space-separated uppercase Hexadecimal bytes (e.g. "D2 B8").
   */
  function bitsToHex(bitArray, separator = ' ') {
    if (!Array.isArray(bitArray) || bitArray.length === 0) return '';
    const hexBytes = [];
    for (let i = 0; i < bitArray.length; i += 8) {
      const slice = bitArray.slice(i, i + 8);
      if (slice.length < 8) {
        const nibbleVal = parseInt(slice.join('').padEnd(8, '0'), 2);
        hexBytes.push(nibbleVal.toString(16).toUpperCase().padStart(2, '0'));
      } else {
        const byteVal = parseInt(slice.join(''), 2);
        hexBytes.push(byteVal.toString(16).toUpperCase().padStart(2, '0'));
      }
    }
    return hexBytes.join(separator);
  }

  /**
   * Converts an array of bits (0/1) into 8-bit grouped binary string (e.g. "11010010 10111000").
   */
  function bitsToBinaryGrouped(bitArray, separator = ' ') {
    if (!Array.isArray(bitArray) || bitArray.length === 0) return '';
    const groups = [];
    for (let i = 0; i < bitArray.length; i += 8) {
      groups.push(bitArray.slice(i, i + 8).join(''));
    }
    return groups.join(separator);
  }

  /**
   * Converts an array of bits (0/1) into decoded ASCII/UTF-8 text and safe printable preview.
   */
  function bitsToText(bitArray) {
    if (!Array.isArray(bitArray) || bitArray.length === 0) {
      return { rawText: '', safeText: '', hasNonPrintable: false, bytes: [] };
    }
    const bytes = [];
    for (let i = 0; i + 7 < bitArray.length; i += 8) {
      const byteVal = parseInt(bitArray.slice(i, i + 8).join(''), 2);
      bytes.push(byteVal);
    }

    let hasNonPrintable = false;
    const safeChars = bytes.map((b) => {
      if (b >= 32 && b <= 126) return String.fromCharCode(b);
      hasNonPrintable = true;
      return '·';
    });

    let rawText = '';
    if (typeof TextDecoder !== 'undefined') {
      try {
        rawText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
      } catch (_e) {
        rawText = String.fromCharCode(...bytes);
      }
    } else {
      rawText = String.fromCharCode(...bytes);
    }

    return {
      rawText,
      safeText: safeChars.join(''),
      hasNonPrintable,
      bytes
    };
  }

  /**
   * Validates LFSR parameters (register length n, seed string, active tap indices).
   */
  function validateLFSRConfig(n, seedStr, tapIndices) {
    const regLen = Number(n);
    if (!Number.isInteger(regLen) || regLen < 3 || regLen > 16) {
      return {
        valid: false,
        code: 'INVALID_N',
        error: 'Panjang register (n) harus berada pada rentang 3 hingga 16 bit.'
      };
    }

    const cleanedSeed = String(seedStr ?? '').trim();
    if (!/^[01]+$/.test(cleanedSeed)) {
      return {
        valid: false,
        code: 'INVALID_SEED_CHARS',
        error: 'Seed hanya boleh berisi karakter biner 0 dan 1.'
      };
    }

    if (cleanedSeed.length !== regLen) {
      return {
        valid: false,
        code: 'INVALID_SEED_LENGTH',
        error: `Panjang seed harus tepat ${regLen} bit sesuai ukuran register n=${regLen} (saat ini ${cleanedSeed.length} bit).`
      };
    }

    if (/^0+$/.test(cleanedSeed)) {
      return {
        valid: false,
        code: 'ALL_ZERO_SEED',
        error: 'All-Zero Seed (000...0) terdeteksi! Register akan terjebak pada dead-state dan menghasilkan keystream 0 selamanya.'
      };
    }

    if (!Array.isArray(tapIndices) || tapIndices.length === 0) {
      return {
        valid: false,
        code: 'NO_TAPS',
        error: 'Pilih minimal 1 posisi Tap umpan balik agar gerbang XOR dapat menghitung bit baru.'
      };
    }

    const validTaps = tapIndices.every((t) => Number.isInteger(t) && t >= 0 && t < regLen);
    if (!validTaps) {
      return {
        valid: false,
        code: 'OUT_OF_RANGE_TAP',
        error: `Indeks tap harus berada di antara b0 hingga b${regLen - 1}.`
      };
    }

    return {
      valid: true,
      code: 'OK',
      error: null
    };
  }

  /**
   * Generates a guaranteed non-zero random binary seed of length n.
   */
  function generateRandomSeed(n) {
    const len = Math.max(3, Math.min(16, Number(n) || 4));
    let bits = [];
    for (let i = 0; i < len; i++) {
      bits.push(Math.random() < 0.5 ? '0' : '1');
    }
    if (bits.every((b) => b === '0')) {
      const randPos = Math.floor(Math.random() * len);
      bits[randPos] = '1';
      bits[len - 1] = '1';
    }
    return bits.join('');
  }

  /**
   * Adjusts an existing seed string when register length n changes:
   * slices if longer, pads with deterministic/random non-zero pattern if shorter.
   */
  function normalizeSeedLength(seedStr, targetN) {
    const n = Math.max(3, Math.min(16, Number(targetN) || 4));
    let cleaned = String(seedStr ?? '').replace(/[^01]/g, '');
    if (cleaned.length > n) {
      cleaned = cleaned.slice(0, n);
    } else if (cleaned.length < n) {
      while (cleaned.length < n) {
        cleaned += cleaned.length % 2 === 0 ? '1' : '0';
      }
    }
    if (/^0+$/.test(cleaned)) {
      cleaned = '1' + '0'.repeat(Math.max(0, n - 2)) + '1';
    }
    return cleaned;
  }

  /**
   * Formats mathematical feedback equation string, e.g. "b_new = b₁ ⊕ b₀"
   */
  function formatTapEquation(tapIndices) {
    if (!Array.isArray(tapIndices) || tapIndices.length === 0) {
      return 'b_new = (tidak ada tap)';
    }
    const sorted = [...tapIndices].sort((a, b) => b - a);
    return 'b_new = ' + sorted.map((t) => `b${t}`).join(' ⊕ ');
  }

  /**
   * Formats polynomial notation P(x), e.g. "P(x) = x⁴ + x + 1"
   */
  function formatPolynomial(n, tapIndices) {
    if (!Array.isArray(tapIndices) || tapIndices.length === 0) return `P(x) = x^${n}`;
    const sorted = [...tapIndices].sort((a, b) => b - a);
    const terms = [`x^${n}`];
    sorted.forEach((t) => {
      if (t === 0) terms.push('1');
      else if (t === 1) terms.push('x');
      else terms.push(`x^${t}`);
    });
    return 'P(x) = ' + terms.join(' + ');
  }

  /**
   * Executes a single LFSR right-shift clock cycle.
   * Convention (PRD 4.1.B & 4.2 Modul 2):
   * - currentRegister is an array of length n: [b_{n-1}, b_{n-2}, ..., b_1, b_0]
   *   index 0 = MSB (b_{n-1}, leftmost)
   *   index n-1 = LSB (b_0, rightmost)
   * - Output keystream bit K_t = b_0 = currentRegister[n - 1]
   * - Feedback bit b_new = XOR of all bits at tapIndices (sorted descending for consistent display)
   * - Next register state = [b_new, b_{n-1}, b_{n-2}, ..., b_1]
   */
  function stepLFSR(currentRegister, tapIndices) {
    const n = currentRegister.length;
    const sortedTaps = [...tapIndices].sort((a, b) => b - a);

    // 1. Rightmost bit (LSB, b_0) exits as keystream bit
    const outputBit = currentRegister[n - 1];

    // 2. Calculate feedback bit via XOR across active tap positions
    let feedbackBit = 0;
    const tapValues = [];

    for (let i = 0; i < sortedTaps.length; i++) {
      const tapPos = sortedTaps[i]; // mathematical index b_{tapPos}
      const arrayIdx = n - 1 - tapPos;
      const bitVal = currentRegister[arrayIdx];
      feedbackBit ^= bitVal;
      tapValues.push({
        tapPos,
        arrayIdx,
        bitVal
      });
    }

    // 3. Shift all bits 1 step right, insert feedbackBit at leftmost position (index 0 / b_{n-1})
    const nextRegister = new Array(n);
    nextRegister[0] = feedbackBit;
    for (let i = 1; i < n; i++) {
      nextRegister[i] = currentRegister[i - 1];
    }

    return {
      previousRegister: [...currentRegister],
      outputBit,
      tapValues,
      feedbackBit,
      nextRegister
    };
  }

  /**
   * Runs the full LFSR stream cipher simulation across all input bits and pre-computes
   * every clock snapshot for O(1) instant Step Forward / Step Backward navigation.
   */
  // ponytail: synchronous in-memory history array holds up to ~4KB input (32768 clocks); move to Web Worker + ring buffer if streaming megabyte files.
  function runSimulation(inputBits, seedBits, tapIndices, options = {}) {
    const mode = options.mode === 'decrypt' ? 'decrypt' : 'encrypt';
    const seedArray = Array.isArray(seedBits)
      ? [...seedBits].map(Number)
      : String(seedBits)
          .trim()
          .split('')
          .map(Number);

    const n = seedArray.length;
    const sortedTaps = [...tapIndices].sort((a, b) => b - a);
    let registerState = [...seedArray];

    const history = [];
    const keystreamBits = [];
    const outputBits = [];

    const seenStates = new Map();
    const initialStateKey = registerState.join('');
    seenStates.set(initialStateKey, 0);

    let periodCycleDetected = false;
    let firstRepeatClock = null;
    let cycleLength = null;

    for (let clock = 0; clock < inputBits.length; clock++) {
      const stepResult = stepLFSR(registerState, sortedTaps);
      const kBit = stepResult.outputBit;
      const inBit = Number(inputBits[clock]);
      const outBit = inBit ^ kBit;

      keystreamBits.push(kBit);
      outputBits.push(outBit);

      const nextStateKey = stepResult.nextRegister.join('');
      let stateRepeatedThisClock = false;
      if (seenStates.has(nextStateKey)) {
        stateRepeatedThisClock = true;
        if (!periodCycleDetected) {
          periodCycleDetected = true;
          firstRepeatClock = clock + 1;
          cycleLength = clock + 1 - seenStates.get(nextStateKey);
        }
      } else {
        seenStates.set(nextStateKey, clock + 1);
      }

      const tapFormulaParts = stepResult.tapValues.map((tv) => `b${tv.tapPos}(${tv.bitVal})`);
      const tapExpansion = `${tapFormulaParts.join(' ⊕ ')} = ${stepResult.feedbackBit}`;
      const inLabel = mode === 'encrypt' ? 'P' : 'C';
      const outLabel = mode === 'encrypt' ? 'C' : 'P';

      const narrative =
        `Clock #${clock + 1}: Bit keluar b0 = ${kBit} menjadi K${clock + 1}. ` +
        `Umpan balik b_new = ${tapExpansion} masuk ke b${n - 1}, seluruh register geser kanan, ` +
        `dan ${inLabel}${clock + 1}(${inBit}) ⊕ K${clock + 1}(${kBit}) menghasilkan ${outLabel}${clock + 1} = ${outBit}.`;

      history.push({
        clockNumber: clock + 1,
        bitIndex: clock,
        byteIndex: Math.floor(clock / 8),
        bitInByteIndex: clock % 8,
        registerBefore: stepResult.previousRegister,
        tapDetails: stepResult.tapValues,
        feedbackBit: stepResult.feedbackBit,
        registerAfter: stepResult.nextRegister,
        inputBit: inBit,
        keystreamBit: kBit,
        xorResultBit: outBit,
        tapExpansion,
        narrative,
        stateRepeatedThisClock,
        keystreamSoFar: [...keystreamBits],
        outputSoFar: [...outputBits]
      });

      registerState = stepResult.nextRegister;
    }

    const keystreamHex = bitsToHex(keystreamBits, ' ');
    const outputHex = bitsToHex(outputBits, ' ');
    const outputBinaryGrouped = bitsToBinaryGrouped(outputBits, ' ');
    const keystreamBinaryGrouped = bitsToBinaryGrouped(keystreamBits, ' ');
    const decodedOutput = bitsToText(outputBits);

    return {
      mode,
      n,
      seedBits: seedArray,
      tapIndices: sortedTaps,
      totalClocks: inputBits.length,
      history,
      keystreamBits,
      outputBits,
      keystreamHex,
      outputHex,
      outputBinaryGrouped,
      keystreamBinaryGrouped,
      decodedOutput,
      periodInfo: {
        theoreticalMaxPeriod: Math.pow(2, n) - 1,
        periodCycleDetected,
        firstRepeatClock,
        cycleLength
      }
    };
  }

  /**
   * Self-verification against PRD Section 4.3 Standard Test Case:
   * Plaintext: "HI", n = 4, Seed = "1001", Taps = [1, 0] (b1 XOR b0).
   * Must yield Keystream Hex "9A F1", Ciphertext Hex "D2 B8", and Decrypt back to "HI".
   */
  function verifyStandardTestCase() {
    const pt = textToBinaryStream('HI');
    const enc = runSimulation(pt.fullBitStream, '1001', [1, 0], { mode: 'encrypt' });

    const expectedPlaintextBits = '01001000 01001001';
    const actualPlaintextBits = bitsToBinaryGrouped(pt.fullBitStream, ' ');
    const expectedKeystreamHex = '9A F1';
    const expectedCiphertextHex = 'D2 B8';

    const decStream = hexToBinaryStream(enc.outputHex);
    const dec = runSimulation(decStream.fullBitStream, '1001', [1, 0], { mode: 'decrypt' });

    const passed =
      actualPlaintextBits === expectedPlaintextBits &&
      enc.keystreamHex === expectedKeystreamHex &&
      enc.outputHex === expectedCiphertextHex &&
      dec.decodedOutput.rawText === 'HI';

    if (!passed) {
      throw new Error(
        `LFSR Engine Self-Check Failed: got KS=${enc.keystreamHex}, CT=${enc.outputHex}, PT_DEC=${dec.decodedOutput.rawText}`
      );
    }

    return {
      passed,
      plaintext: 'HI',
      plaintextBits: actualPlaintextBits,
      keystreamHex: enc.keystreamHex,
      ciphertextHex: enc.outputHex,
      decryptedText: dec.decodedOutput.rawText
    };
  }

  return {
    PRIMITIVE_PRESETS,
    formatDisplayChar,
    textToBinaryStream,
    hexToBinaryStream,
    binaryStringToStream,
    bitsToHex,
    bitsToBinaryGrouped,
    bitsToText,
    validateLFSRConfig,
    generateRandomSeed,
    normalizeSeedLength,
    formatTapEquation,
    formatPolynomial,
    stepLFSR,
    runSimulation,
    verifyStandardTestCase
  };
});
