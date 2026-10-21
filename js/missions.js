/* ==========================================================================
   js/missions.js - Sistem Misi Bertahap, Pelacak Kriteria, & Petunjuk Tiga Tingkat (T1, T4)
   Mengelola 7 misi pembelajaran, evaluasi kriteria kelulusan, pembukaan
   petunjuk bertingkat (tingkat 3 terbuka setelah 2x gagal), dan persistensi data.
   ========================================================================== */

window.App = window.App || {};

window.App.missions = (function () {
  let activeMissionId = "M1";
  const missionProgress = {}; // { missionId: { status: 'SELESAI'|'BERJALAN', failCount: 0, hintsUnlocked: 0 } }

  // 1. Inisialisasi Data Misi & Muat dari LocalStorage
  function init() {
    window.App.config.missions.forEach(m => {
      missionProgress[m.id] = {
        status: m.id === "M1" ? "BERJALAN" : "BELUM",
        failCount: 0,
        hintsUnlocked: 0,
        passedDate: null
      };
    });

    try {
      const saved = localStorage.getItem("App_missionProgress");
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(k => {
          if (missionProgress[k]) {
            missionProgress[k] = Object.assign(missionProgress[k], parsed[k]);
          }
        });
      }
      const savedActive = localStorage.getItem("App_activeMissionId");
      if (savedActive && missionProgress[savedActive]) {
        activeMissionId = savedActive;
      }
    } catch (e) {}
  }

  function persistProgress() {
    try {
      localStorage.setItem("App_missionProgress", JSON.stringify(missionProgress));
      localStorage.setItem("App_activeMissionId", activeMissionId);
    } catch (e) {}
  }

  function getActiveMission() {
    return window.App.config.missions.find(m => m.id === activeMissionId) || window.App.config.missions[0];
  }

  function getAllMissions() {
    return window.App.config.missions;
  }

  function getMissionState(missionId) {
    return missionProgress[missionId] || { status: "BELUM", failCount: 0, hintsUnlocked: 0 };
  }

  // 2. Pilih Misi Aktif
  function selectMission(missionId) {
    const targetMission = window.App.config.missions.find(m => m.id === missionId);
    if (!targetMission) return;

    activeMissionId = missionId;
    if (missionProgress[missionId].status === "BELUM") {
      missionProgress[missionId].status = "BERJALAN";
    }
    persistProgress();

    // Pastikan tema berganti jika misi berbeda tema
    if (window.App.ui && window.App.ui.getCurrentTheme() !== targetMission.theme) {
      window.App.ui.switchTheme(targetMission.theme, false);
    }

    // Jika misi memiliki template bug bawaan (M3), muat otomatis
    if (targetMission.initialBug === "kereta_missing_else") {
      const bugPreset = window.App.config.teacherPresets.bugs.kereta.find(b => b.id === "bug_k_missing_else");
      if (bugPreset && window.App.blocks) {
        window.App.blocks.setProgram("kereta", bugPreset.blocks);
      }
    }

    renderMissionPanel();
  }

  // 3. Catat Percobaan Gagal untuk Membuka Petunjuk Tingkat 3
  function recordFailure() {
    const state = missionProgress[activeMissionId];
    if (state) {
      state.failCount += 1;
      persistProgress();
      renderMissionPanel();
    }
  }

  // 4. Buka Petunjuk Bertingkat (T4)
  function unlockNextHint() {
    const mission = getActiveMission();
    const state = missionProgress[activeMissionId];
    if (!state || !mission) return;

    // Cek syarat petunjuk tingkat 3 (baru bisa dibuka jika gagal minimal 2 kali)
    if (state.hintsUnlocked === 2 && state.failCount < 2) {
      if (window.App.ui) {
        window.App.ui.showToast("Petunjuk Tingkat 3 (Kerangka Solusi) baru terbuka setelah 2 kali pengujian gagal. Coba uji dahulu logikamu!");
      }
      return;
    }

    if (state.hintsUnlocked < mission.hints.length) {
      state.hintsUnlocked += 1;
      persistProgress();
      renderMissionPanel();
    }
  }

  // 5. Evaluasi Kriteria Misi terhadap Hasil Pengujian Skenario
  function evaluateMissionSuccess(themeKey, program, testSummary) {
    const mission = getActiveMission();
    if (!mission || mission.theme !== themeKey) return false;

    let isEligible = false;

    // Evaluasi spesifik per misi
    if (mission.id === "M1") {
      // Sirine hanya bunyi saat ada kereta (IF-THEN)
      const s1 = testSummary.scenarioResults.find(r => r.scenarioId === "S1");
      const s2 = testSummary.scenarioResults.find(r => r.scenarioId === "S2");
      isEligible = Boolean(s1 && s1.passed && s2 && s2.passed);
    } else if (mission.id === "M2" || mission.id === "M3") {
      // Palang turun saat ada kereta dan naik saat tidak ada kereta (S3 lulus)
      const s3 = testSummary.scenarioResults.find(r => r.scenarioId === "S3");
      isEligible = Boolean(s3 && s3.passed && s3.stuckCarsCount === 0 && !s3.dangerWarning);
    } else if (mission.id === "M4") {
      // Seluruh skenario kereta lulus serempak
      isEligible = testSummary.overallPassed;
    } else if (mission.id === "M5") {
      // Kupon Kantin (Skenario E dan F)
      const sE = testSummary.scenarioResults.find(r => r.scenarioId === "Skenario E");
      const sF = testSummary.scenarioResults.find(r => r.scenarioId === "Skenario F");
      isEligible = Boolean(sE && sE.passed && sF && sF.passed);
    } else if (mission.id === "M6") {
      // Diskon Kantin (Skenario A, B, C, D)
      const subset = testSummary.scenarioResults.filter(r => ["Skenario A", "Skenario B", "Skenario C", "Skenario D"].includes(r.scenarioId));
      isEligible = subset.length === 4 && subset.every(r => r.passed);
    } else if (mission.id === "M7") {
      // Seluruh skenario A hingga F lulus 100%
      isEligible = testSummary.overallPassed;
    }

    if (isEligible) {
      missionProgress[mission.id].status = "SELESAI";
      missionProgress[mission.id].passedDate = new Date().toISOString();
      persistProgress();

      if (window.App.audio) {
        window.App.audio.playSuccessChime();
      }

      if (window.App.ui) {
        window.App.ui.showCelebrationModal(mission);
      }
      renderMissionPanel();
      return true;
    } else {
      recordFailure();
      return false;
    }
  }

  // 6. Render Panel Misi di Antarmuka Utama
  function renderMissionPanel() {
    const container = document.getElementById("missionHeaderPanel");
    if (!container) return;

    const mission = getActiveMission();
    const state = getMissionState(mission.id);
    const isCompleted = (state.status === "SELESAI");

    let html = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 select-none">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <span class="w-8 h-8 rounded-xl ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} flex items-center justify-center font-bold text-xs font-mono">
              ${mission.id}
            </span>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="font-bold text-sm sm:text-base text-slate-800">${mission.title}</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}">
                  ${isCompleted ? 'SELESAI' : 'BERJALAN'}
                </span>
              </div>
              <p class="text-xs text-slate-500">${mission.objective}</p>
            </div>
          </div>

          <!-- Selector Cepat Misi 1 - 7 -->
          <div class="flex items-center space-x-1 overflow-x-auto py-1">
            ${window.App.config.missions.map(m => {
              const mState = getMissionState(m.id);
              const isCur = m.id === mission.id;
              const isPass = mState.status === "SELESAI";
              return `
                <button class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1 ${isCur ? 'bg-blue-600 text-white shadow-sm' : (isPass ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}" onclick="window.App.missions.selectMission('${m.id}')" title="${m.title}">
                  <span>${m.id}</span>
                  ${isPass ? '<i data-lucide="circle-check" class="w-3 h-3 text-emerald-600"></i>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Kriteria Keberhasilan & Petunjuk Bertingkat (T4) -->
        <div class="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <!-- Kolom Kriteria (7 Kolom) -->
          <div class="md:col-span-7 space-y-1.5">
            <span class="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center space-x-1">
              <i data-lucide="target" class="w-3.5 h-3.5 text-blue-600"></i>
              <span>Kriteria Kelulusan Misi:</span>
            </span>
            <ul class="space-y-1 text-slate-600">
              ${mission.criteria.map(crit => `
                <li class="flex items-start space-x-1.5">
                  <i data-lucide="circle-check" class="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0"></i>
                  <span>${crit}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Kolom Petunjuk Bertingkat (5 Kolom) -->
          <div class="md:col-span-5 bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-amber-900 text-[11px] flex items-center space-x-1">
                  <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-600"></i>
                  <span>Petunjuk Bantuan (${state.hintsUnlocked}/${mission.hints.length})</span>
                </span>
                <span class="text-[10px] text-amber-800 font-mono">Gagal: ${state.failCount}x</span>
              </div>

              <!-- Tampilan Petunjuk yang Terbuka -->
              <div class="space-y-1.5 text-amber-950 text-[11px]">
                ${state.hintsUnlocked === 0 ? `
                  <p class="text-amber-800/80 italic">Belum ada petunjuk yang dibuka. Klik tombol di bawah jika kelompok Anda memerlukan panduan.</p>
                ` : ''}

                ${state.hintsUnlocked >= 1 ? `
                  <div class="bg-white/80 p-2 rounded border border-amber-200">
                    <strong class="text-amber-900">Tingkat 1 (Pemandu):</strong> ${mission.hints[0]}
                  </div>
                ` : ''}

                ${state.hintsUnlocked >= 2 ? `
                  <div class="bg-white/80 p-2 rounded border border-amber-200">
                    <strong class="text-amber-900">Tingkat 2 (Struktur):</strong> ${mission.hints[1]}
                  </div>
                ` : ''}

                ${state.hintsUnlocked >= 3 ? `
                  <div class="bg-amber-100 p-2 rounded border border-amber-300 font-mono text-[10px]">
                    <strong class="text-amber-950 font-sans block mb-0.5">Tingkat 3 (Kerangka Solusi):</strong> ${mission.hints[2]}
                  </div>
                ` : ''}
              </div>
            </div>

            ${state.hintsUnlocked < mission.hints.length ? `
              <button class="mt-2 w-full py-1.5 bg-amber-200 hover:bg-amber-300 active:scale-98 text-amber-950 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition" onclick="window.App.missions.unlockNextHint()">
                <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-700"></i>
                <span>Buka Petunjuk Tingkat ${state.hintsUnlocked + 1} ${state.hintsUnlocked === 2 ? '(Butuh 2x Gagal)' : ''}</span>
              </button>
            ` : `
              <span class="text-center text-[10px] text-amber-800 mt-2 block font-semibold">Semua petunjuk telah terbuka</span>
            `}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Hitung Total Statistik untuk Rekap Belajar Siswa (T6)
  function getSummaryStats() {
    let completedCount = 0;
    let totalHintsUsed = 0;

    Object.keys(missionProgress).forEach(id => {
      const p = missionProgress[id];
      if (p.status === "SELESAI") completedCount += 1;
      totalHintsUsed += (p.hintsUnlocked || 0);
    });

    return {
      totalMissions: window.App.config.missions.length,
      completedMissions: completedCount,
      totalHintsUsed: totalHintsUsed,
      progressMap: missionProgress
    };
  }

  return {
    init: init,
    getActiveMission: getActiveMission,
    getAllMissions: getAllMissions,
    getMissionState: getMissionState,
    selectMission: selectMission,
    recordFailure: recordFailure,
    unlockNextHint: unlockNextHint,
    evaluateMissionSuccess: evaluateMissionSuccess,
    renderMissionPanel: renderMissionPanel,
    getSummaryStats: getSummaryStats
  };
})();
