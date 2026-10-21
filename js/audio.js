/* ==========================================================================
   js/audio.js - Sintesis Efek Suara Web Audio API
   Semua suara disintesis secara murni tanpa memuat file audio eksternal.
   Default berstatus BISU (Muted) demi kenyamanan kelas.
   ========================================================================== */

window.App = window.App || {};

window.App.audio = (function () {
  let audioCtx = null;
  let masterGain = null;
  let isMuted = true; // Sesuai spesifikasi: DEFAULT BISU
  let sirenOsc = null;
  let sirenGain = null;
  let sirenInterval = null;

  // Inisialisasi AudioContext saat interaksi pengguna pertama
  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0 : 0.2, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    } else if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  // Pengaturan status bisu / aktif
  function setMuted(muted) {
    isMuted = muted;
    if (audioCtx && masterGain) {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.2, audioCtx.currentTime);
    }
    if (isMuted) {
      stopSiren();
    }
    return isMuted;
  }

  function toggleMute() {
    initAudioContext();
    return setMuted(!isMuted);
  }

  function getIsMuted() {
    return isMuted;
  }

  // 1. Suara Sirine Kereta Api (Meluncur 650Hz - 900Hz Berulang)
  function startSiren() {
    if (isMuted) return;
    initAudioContext();
    if (sirenOsc) return; // Sudah bunyi

    try {
      sirenOsc = audioCtx.createOscillator();
      sirenGain = audioCtx.createGain();
      sirenOsc.type = "sine";
      sirenOsc.frequency.setValueAtTime(650, audioCtx.currentTime);

      sirenGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      sirenOsc.connect(sirenGain);
      sirenGain.connect(masterGain);
      sirenOsc.start();

      let high = false;
      sirenInterval = setInterval(() => {
        if (!audioCtx || !sirenOsc) return;
        const targetFreq = high ? 650 : 900;
        sirenOsc.frequency.cancelScheduledValues(audioCtx.currentTime);
        sirenOsc.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.25);
        high = !high;
      }, 260);
    } catch (e) {
      console.warn("Audio sirine tidak dapat dimulai:", e);
    }
  }

  function stopSiren() {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (sirenOsc) {
      try {
        sirenOsc.stop();
        sirenOsc.disconnect();
      } catch (e) {}
      sirenOsc = null;
      sirenGain = null;
    }
  }

  // 2. Lonceng Palang (Dua nada "Ding")
  function playCrossingBell() {
    if (isMuted) return;
    initAudioContext();
    try {
      const now = audioCtx.currentTime;
      [800, 600].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.2, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.32);
      });
    } catch (e) {}
  }

  // 3. Klik Palang Naik
  function playBarrierClick() {
    if (isMuted) return;
    initAudioContext();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {}
  }

  // 4. Klakson Mobil Pendek saat Tertahan
  function playCarHorn() {
    if (isMuted) return;
    initAudioContext();
    try {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = "sawtooth";
      osc2.type = "sawtooth";
      osc1.frequency.setValueAtTime(380, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(475, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.23);
      osc2.stop(audioCtx.currentTime + 0.23);
    } catch (e) {}
  }

  // 5. Ting Kasir Diskon Kantin
  function playCashChime() {
    if (isMuted) return;
    initAudioContext();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.46);
    } catch (e) {}
  }

  // 6. Suara Derit Mesin Printer Kasir (Struk / Kupon)
  function playReceiptPrinter() {
    if (isMuted) return;
    initAudioContext();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  // 7. Chime Keberhasilan Uji (Akord C Mayor Harmonis)
  function playSuccessChime() {
    if (isMuted) return;
    initAudioContext();
    try {
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.42);
      });
    } catch (e) {}
  }

  // 8. Buzzer Rendah saat Gagal / Error
  function playBuzzer() {
    if (isMuted) return;
    initAudioContext();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
    } catch (e) {}
  }

  // Menghentikan seluruh suara yang sedang aktif (Pause / Reset)
  function stopAllSounds() {
    stopSiren();
  }

  return {
    init: initAudioContext,
    toggleMute: toggleMute,
    setMuted: setMuted,
    isMuted: getIsMuted,
    startSiren: startSiren,
    stopSiren: stopSiren,
    playCrossingBell: playCrossingBell,
    playBarrierClick: playBarrierClick,
    playCarHorn: playCarHorn,
    playCashChime: playCashChime,
    playReceiptPrinter: playReceiptPrinter,
    playSuccessChime: playSuccessChime,
    playBuzzer: playBuzzer,
    stopAll: stopAllSounds
  };
})();
