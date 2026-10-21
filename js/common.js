/* ==========================================================================
   js/common.js - Utilitas Bersama & Sinkronisasi Navigasi Header
   Menyediakan manajemen audio global, mode guru (proyektor), toast notifikasi,
   pemeriksaan navigasi aktif, dan helper penyimpanan aman localStorage.
   ========================================================================== */

window.App = window.App || {};

window.App.common = (function () {
  const STORAGE_KEYS = {
    TEACHER_MODE: "App_teacherMode",
    AUDIO_MUTED: "App_audioMuted"
  };

  // 1. Helper Safe LocalStorage (Aman dari pengecualian quota / sandbox)
  function safeGetItem(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  // 2. Tampilkan Toast Notifikasi Mengambang
  function showToast(message, type = "info", duration = 3000) {
    let toast = document.getElementById("globalToast");
    let toastText = document.getElementById("globalToastText");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "globalToast";
      toast.className = "fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 transition-all duration-300 opacity-0 translate-y-4 pointer-events-none";
      toast.innerHTML = '<i data-lucide="info" class="w-4 h-4 text-blue-400"></i><span id="globalToastText"></span>';
      document.body.appendChild(toast);
      toastText = document.getElementById("globalToastText");
      if (window.lucide) window.lucide.createIcons();
    }

    if (!toast || !toastText) return;

    toastText.textContent = message;

    // Kustomisasi ikon warna sesuai tipe
    const icon = toast.querySelector("i");
    if (icon) {
      icon.className = `w-4 h-4 ${
        type === "success" ? "text-emerald-400" :
        type === "warning" ? "text-amber-400" :
        type === "error" ? "text-rose-400" : "text-blue-400"
      }`;
    }

    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    }, duration);
  }

  // 3. Manajemen Mode Guru (Proyektor Kelas)
  function initTeacherMode() {
    const isTeacherMode = safeGetItem(STORAGE_KEYS.TEACHER_MODE, false);
    if (isTeacherMode) {
      document.body.classList.add("teacher-mode");
    }

    const btn = document.getElementById("btnToggleTeacherMode");
    if (btn) {
      updateTeacherModeBtn(btn, isTeacherMode);
      btn.addEventListener("click", () => {
        const active = document.body.classList.toggle("teacher-mode");
        safeSetItem(STORAGE_KEYS.TEACHER_MODE, active);
        updateTeacherModeBtn(btn, active);
        showToast(
          active ? "Mode Guru Aktif: Teks diperbesar untuk proyektor." : "Mode Guru Nonaktif: Ukuran tampilan normal.",
          "info"
        );
      });
    }
  }

  function updateTeacherModeBtn(btn, isActive) {
    if (isActive) {
      btn.classList.add("bg-indigo-600", "text-white", "border-indigo-700");
      btn.classList.remove("bg-slate-100", "text-slate-700", "border-slate-200");
    } else {
      btn.classList.remove("bg-indigo-600", "text-white", "border-indigo-700");
      btn.classList.add("bg-slate-100", "text-slate-700", "border-slate-200");
    }
  }

  // 4. Manajemen Kontrol Audio Terpadu
  function initAudioControl() {
    const btn = document.getElementById("btnToggleAudio");
    const icon = document.getElementById("audioIcon");
    const label = document.getElementById("audioLabel");

    // Muat preferensi awal
    const savedMuted = safeGetItem(STORAGE_KEYS.AUDIO_MUTED, true);
    if (window.App.audio) {
      window.App.audio.setMuted(savedMuted);
    }
    updateAudioBtnUI(icon, label, savedMuted);

    if (btn && window.App.audio) {
      btn.addEventListener("click", () => {
        const isMuted = window.App.audio.toggleMute();
        safeSetItem(STORAGE_KEYS.AUDIO_MUTED, isMuted);
        updateAudioBtnUI(icon, label, isMuted);
        showToast(isMuted ? "Suara dinonaktifkan (Bisu)." : "Efek suara aktif.", "info");
      });
    }
  }

  function updateAudioBtnUI(icon, label, isMuted) {
    if (label) {
      label.textContent = isMuted ? "Suara: Mati" : "Suara: Nyala";
    }
    if (icon) {
      if (isMuted) {
        icon.setAttribute("data-lucide", "volume-x");
        icon.classList.remove("text-emerald-600");
        icon.classList.add("text-slate-500");
      } else {
        icon.setAttribute("data-lucide", "volume-2");
        icon.classList.remove("text-slate-500");
        icon.classList.add("text-emerald-600");
      }
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // 5. Inisialisasi Modal Bantuan / Tutorial Sederhana
  function initTutorialModal(modalId = "tutorialModal", openBtnId = "btnOpenTutorialModal", closeBtnId = "btnCloseTutorialModal") {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    const finishBtn = document.getElementById("btnFinishTutorial");

    if (!modal) return;

    if (openBtn) {
      openBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
      });
    }

    const closeModal = () => modal.classList.add("hidden");

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (finishBtn) finishBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // 6. Inisialisasi Seluruh Komponen Bersama
  function init() {
    initTeacherMode();
    initAudioControl();
    initTutorialModal();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  return {
    init: init,
    showToast: showToast,
    safeGet: safeGetItem,
    safeSet: safeSetItem,
    safeRemove: safeRemoveItem
  };
})();
