/* ==========================================================================
   js/ui.js - Manajemen Tampilan Antarmuka, Kontrol Eksekusi, & Modul Interaktif
   Mengatur kontrol simulasi (Play, Step, Pause, Reset, Kecepatan), tabel uji LKS,
   mode prediksi, mode guru, rekap belajar, tutorial, serta tab responsif mobile.
   ========================================================================== */

window.App = window.App || {};

window.App.ui = (function () {
  let currentTheme = "kereta";
  let activeMobileTab = "tab-blocks";
  let isPredictionMode = false;
  let isTeacherMode = false;
  let simSpeed = 1; // 0.5x, 1x, 2x
  let simTimer = null;
  let isPaused = false;
  let isRunning = false;

  // Status Eksekusi Berjalan
  let currentScenarioIndex = 0;
  let currentTickIndex = 0;
  let currentTraceStepIndex = 0;
  let activeExecutionData = null; // Menyimpan hasil pengujian dan trace skenario aktif

  // Riwayat Log Eksekusi
  const executionLogs = [];

  // Data Tebakan Siswa untuk Mode Prediksi (T3)
  const studentPredictions = {};

  // 1. Inisialisasi Tampilan & Listener Global
  function init() {
    wireHeaderControls();
    wireSimulationButtons();
    wirePredictionToggle();
    wireTeacherControls();
    wireMobileTabs();
    wireRecapModal();
    wireTutorialModal();
    renderTestTable();
    updateVariableMonitor({});

    // Cek Tutorial Pertama Kali
    try {
      const seen = localStorage.getItem("App_tutorialCompleted");
      if (!seen) {
        showTutorialModal();
      }
    } catch (e) {}
  }

  function getCurrentTheme() {
    return currentTheme;
  }

  // 2. Ganti Tema Skenario (Kereta | Kantin) (F4)
  function switchTheme(themeKey, notifyMission = true) {
    if (themeKey === currentTheme) return;
    pauseSimulation();
    currentTheme = themeKey;

    // Perbarui Tampilan Segmented Control
    const btnKereta = document.getElementById("btnThemeKereta");
    const btnKantin = document.getElementById("btnThemeKantin");
    if (btnKereta && btnKantin) {
      if (themeKey === "kereta") {
        btnKereta.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 shadow-sm flex items-center space-x-1.5 transition";
        btnKantin.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1.5 transition";
      } else {
        btnKantin.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 shadow-sm flex items-center space-x-1.5 transition";
        btnKereta.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1.5 transition";
      }
    }

    // Alihkan Modul Blok
    if (window.App.blocks) {
      window.App.blocks.setTheme(themeKey);
    }

    // Reset Panggung & Tampilan Pengujian
    resetSimulationState();
    renderStage({});
    renderTestTable();

    if (notifyMission && window.App.missions) {
      // Cari misi pertama yang relevan dengan tema baru
      const targetM = window.App.config.missions.find(m => m.theme === themeKey);
      if (targetM) {
        window.App.missions.selectMission(targetM.id);
      }
    }

    showToast(`Beralih ke tema: ${window.App.config.themes[themeKey].name}`);
  }

  // 3. Render Panggung Sesuai Tema Aktif
  function renderStage(state = {}) {
    if (currentTheme === "kereta") {
      if (window.App.stageKereta) {
        window.App.stageKereta.render("stageCanvasContainer", state);
      }
    } else {
      if (window.App.stageKantin) {
        window.App.stageKantin.render("stageCanvasContainer", state);
      }
    }
  }

  // 4. Update Monitor Variabel Melayang di Panggung (F5)
  function updateVariableMonitor(env, changedVar = null, oldVal = null) {
    const container = document.getElementById("variableMonitorContent");
    if (!container) return;

    const themeConfig = window.App.config.themes[currentTheme];
    let html = `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">`;

    themeConfig.variables.forEach(v => {
      const val = (env[v.name] !== undefined) ? env[v.name] : v.defaultValue;
      const isChanged = (changedVar === v.name);

      let valDisplay = val;
      if (typeof val === "boolean") {
        valDisplay = val ? "True" : "False";
      } else if (typeof val === "number" && v.name.includes("total") || v.name === "potongan") {
        valDisplay = "Rp" + Number(val).toLocaleString("id-ID");
      }

      html += `
        <div class="p-2 rounded-xl border ${isChanged ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300' : 'bg-white/90 border-slate-200'} shadow-sm transition-all duration-300">
          <div class="flex items-center justify-between text-[10px] text-slate-500 font-sans">
            <span class="font-bold uppercase tracking-wider">${v.name}</span>
            <span class="font-mono text-slate-400">${v.type}</span>
          </div>
          <div class="mt-1 font-mono text-xs sm:text-sm font-bold ${typeof val === 'boolean' ? (val ? 'text-emerald-600' : 'text-slate-600') : 'text-slate-900'}">
            ${isChanged && oldVal !== null ? `
              <span class="text-slate-400 line-through text-[10px] mr-1">${oldVal}</span>
            ` : ''}
            <span>${valDisplay}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // 5. Update Bilah Narasi Eksekusi Bahasa Indonesia (F3)
  function updateNarration(text) {
    const el = document.getElementById("executionNarrationText");
    if (el) {
      el.textContent = text;
    }
  }

  // 6. Kontrol Tombol Simulasi (Play, Step, Pause, Reset, Kecepatan, Langsung Hasil)
  function wireSimulationButtons() {
    const btnPlay = document.getElementById("btnPlaySim");
    const btnStep = document.getElementById("btnStepSim");
    const btnPause = document.getElementById("btnPauseSim");
    const btnReset = document.getElementById("btnResetSim");
    const btnFast = document.getElementById("btnSkipSim");
    const speedSelect = document.getElementById("speedSelector");

    if (btnPlay) {
      btnPlay.addEventListener("click", () => {
        playSimulation();
      });
    }

    if (btnStep) {
      btnStep.addEventListener("click", () => {
        stepSimulation();
      });
    }

    if (btnPause) {
      btnPause.addEventListener("click", () => {
        pauseSimulation();
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", () => {
        resetSimulationState();
        showToast("Simulasi diatur ulang.");
      });
    }

    if (btnFast) {
      btnFast.addEventListener("click", () => {
        skipToEndSimulation();
      });
    }

    if (speedSelect) {
      speedSelect.addEventListener("change", (e) => {
        simSpeed = parseFloat(e.target.value) || 1;
        if (isRunning && !isPaused) {
          pauseSimulation();
          playSimulation();
        }
      });
    }
  }

  // Eksekusi Penuh / Otomatis
  function playSimulation() {
    if (!prepareExecution()) return;
    isRunning = true;
    isPaused = false;
    updateSimulationControlsUI();

    const interval = Math.max(250, Math.floor(1000 / simSpeed));
    if (simTimer) clearInterval(simTimer);

    simTimer = setInterval(() => {
      const hasMore = executeNextStep();
      if (!hasMore) {
        pauseSimulation();
        finalizeExecution();
      }
    }, interval);
  }

  // Eksekusi Langkah demi Langkah (Step by Step)
  function stepSimulation() {
    if (!isRunning && !isPaused) {
      if (!prepareExecution()) return;
    }
    isRunning = true;
    isPaused = true;
    updateSimulationControlsUI();

    const hasMore = executeNextStep();
    if (!hasMore) {
      finalizeExecution();
    }
  }

  function pauseSimulation() {
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    isPaused = true;
    if (window.App.audio) {
      window.App.audio.stopAll();
    }
    updateSimulationControlsUI();
  }

  function skipToEndSimulation() {
    if (!prepareExecution()) return;
    pauseSimulation();

    // Jalankan seluruh detak secara instan
    const program = window.App.blocks.getProgram(currentTheme);
    const themeConfig = window.App.config.themes[currentTheme];
    const scenario = themeConfig.scenarios[currentScenarioIndex];
    const outcome = window.App.engine.runScenarioTest(currentTheme, program, scenario);

    // Tampilkan kondisi akhir
    activeExecutionData = outcome;
    const lastTick = outcome.tickResults[outcome.tickResults.length - 1];
    if (lastTick) {
      renderStage({
        ada_kereta: lastTick.input.ada_kereta,
        status_sirine: lastTick.output.status_sirine,
        status_palang: lastTick.output.status_palang,
        total_belanja: lastTick.input.total_belanja,
        potongan: lastTick.output.potongan,
        status_kupon: lastTick.output.status_kupon,
        total_akhir: lastTick.output.total_akhir,
        isTested: true,
        stuckCount: outcome.stuckCarsCount,
        tickIndex: outcome.tickResults.length - 1,
        expected: lastTick.expected
      });
      updateVariableMonitor(lastTick.output);
    }

    finalizeExecution();
  }

  function prepareExecution() {
    const program = window.App.blocks.getProgram(currentTheme);
    const themeConfig = window.App.config.themes[currentTheme];

    // Validasi Awal Program (Acceptance Test 8)
    const validation = window.App.engine.validateProgram(program, themeConfig);
    if (!validation.isValid) {
      const firstErr = validation.errors[0];
      showToast(firstErr.message);
      updateNarration(`Gagal Memulai: ${firstErr.message}`);
      if (firstErr.blockId && window.App.blocks) {
        window.App.blocks.highlightBlock(firstErr.blockId);
      }
      return false;
    }

    // Ambil skenario yang dipilih (default skenario pertama atau pilihan aktif)
    const scenario = themeConfig.scenarios[currentScenarioIndex];
    const testOutcome = window.App.engine.runScenarioTest(currentTheme, program, scenario);

    activeExecutionData = testOutcome;
    currentTickIndex = 0;
    currentTraceStepIndex = 0;

    // Bersihkan status blok visual
    if (window.App.blocks) {
      window.App.blocks.resetAllBlockStatuses();
    }

    return true;
  }

  function executeNextStep() {
    if (!activeExecutionData || currentTickIndex >= activeExecutionData.tickResults.length) {
      return false;
    }

    const currentTick = activeExecutionData.tickResults[currentTickIndex];
    const trace = currentTick.trace;

    if (currentTraceStepIndex < trace.length) {
      const step = trace[currentTraceStepIndex];
      handleTraceStep(step, currentTick);
      currentTraceStepIndex += 1;
      return true;
    } else {
      // Selesai satu tick, lanjutkan ke tick berikutnya
      currentTickIndex += 1;
      currentTraceStepIndex = 0;
      return (currentTickIndex < activeExecutionData.tickResults.length);
    }
  }

  // Tangani Visualisasi Langkah Trace (F3)
  function handleTraceStep(step, currentTick) {
    updateNarration(step.narrative || "");

    if (step.type === "eval") {
      if (window.App.blocks) {
        window.App.blocks.setBlockExecutionStatus(step.blockId, "evaluating", { expr: step.condExpr });
      }
    } else if (step.type === "enter") {
      if (window.App.blocks) {
        window.App.blocks.setBlockExecutionStatus(step.blockId, "executed", { branch: step.branch });
      }
    } else if (step.type === "skip") {
      if (window.App.blocks) {
        window.App.blocks.setBlockExecutionStatus(step.blockId, "skipped", { branch: step.branch });
      }
    } else if (step.type === "action") {
      updateVariableMonitor(currentTick.output, step.targetVar, step.oldValue);

      // Mainkan Efek Audio Khusus Berdasarkan Aksi
      if (window.App.audio) {
        if (step.targetVar === "status_sirine" && step.newValue === "BUNYI") {
          window.App.audio.startSiren();
        } else if (step.targetVar === "status_sirine" && step.newValue === "MATI") {
          window.App.audio.stopSiren();
        } else if (step.targetVar === "status_palang" && step.newValue === "TURUN") {
          window.App.audio.playCrossingBell();
        } else if (step.targetVar === "status_palang" && step.newValue === "NAIK") {
          window.App.audio.playBarrierClick();
        } else if (step.targetVar === "potongan" && Number(step.newValue) > 0) {
          window.App.audio.playCashChime();
        } else if (step.targetVar === "status_kupon" && step.newValue === "Dapat 1 kupon") {
          window.App.audio.playReceiptPrinter();
        }
      }

      // Update Panggung Simulasi
      renderStage({
        ada_kereta: currentTick.input.ada_kereta,
        status_sirine: currentTick.output.status_sirine,
        status_palang: currentTick.output.status_palang,
        total_belanja: currentTick.input.total_belanja,
        potongan: currentTick.output.potongan,
        status_kupon: currentTick.output.status_kupon,
        total_akhir: currentTick.output.total_akhir,
        tickIndex: currentTickIndex,
        isTested: false,
        stuckCount: (currentTickIndex >= 5 && currentTick.output.status_palang === "TURUN") ? (currentTickIndex - 4) : 0,
        expected: currentTick.expected
      });
    }
  }

  function finalizeExecution() {
    isRunning = false;
    isPaused = false;
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    updateSimulationControlsUI();

    const program = window.App.blocks.getProgram(currentTheme);
    const allResults = window.App.engine.runAllScenarios(currentTheme, program);

    // Perbarui Tabel Pengujian Skenario Lengkap LKS
    renderTestTable(allResults);

    // Suara Klakson jika Mobil Menumpuk
    if (activeExecutionData && activeExecutionData.stuckCarsCount > 0 && window.App.audio) {
      window.App.audio.playCarHorn();
    }

    // Evaluasi Kelulusan Misi Aktif (T1)
    if (window.App.missions) {
      window.App.missions.evaluateMissionSuccess(currentTheme, program, allResults);
    }

    // Tambahkan ke Log Riwayat Eksekusi (T7)
    addExecutionLog(activeExecutionData);
  }

  function resetSimulationState() {
    pauseSimulation();
    isRunning = false;
    isPaused = false;
    currentTickIndex = 0;
    currentTraceStepIndex = 0;
    activeExecutionData = null;

    if (window.App.blocks) {
      window.App.blocks.resetAllBlockStatuses();
    }
    if (window.App.stageKereta) {
      window.App.stageKereta.resetState();
    }
    if (window.App.audio) {
      window.App.audio.stopAll();
    }

    updateNarration("Simulasi siap dijalankan. Klik 'Jalankan' atau 'Langkah'.");
    updateVariableMonitor({});
    renderStage({});
    updateSimulationControlsUI();
  }

  function updateSimulationControlsUI() {
    const btnPlay = document.getElementById("btnPlaySim");
    const btnPause = document.getElementById("btnPauseSim");
    if (!btnPlay || !btnPause) return;

    if (isRunning && !isPaused) {
      btnPlay.classList.add("hidden");
      btnPause.classList.remove("hidden");
    } else {
      btnPlay.classList.remove("hidden");
      btnPause.classList.add("hidden");
    }
  }

  // 7. Render Tabel Pengujian Skenario LKS (T2 & Mode Prediksi T3)
  function renderTestTable(allResults = null) {
    const container = document.getElementById("scenarioTestTableContainer");
    if (!container) return;

    const themeConfig = window.App.config.themes[currentTheme];
    const scenarios = themeConfig.scenarios;
    const isKantin = (currentTheme === "kantin");

    let html = `
      <div class="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm text-xs select-none">
        <div class="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-slate-800 flex items-center space-x-1.5">
              <i data-lucide="table-2" class="w-4 h-4 text-blue-600"></i>
              <span>Tabel Pengujian Logika (Aktivitas 3 LKS)</span>
            </span>
            ${isPredictionMode ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">Mode Prediksi Aktif</span>' : ''}
          </div>
          <div class="text-[11px] text-slate-500 font-sans">
            Status: ${allResults ? (allResults.overallPassed ? '<strong class="text-emerald-600 font-bold">100% Lulus Semua Skenario</strong>' : '<strong class="text-rose-600 font-bold">Perlu Perbaikan</strong>') : 'Belum diuji'}
          </div>
        </div>

        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <th class="p-2.5">Skenario</th>
              <th class="p-2.5">Input Masukan</th>
              ${isKantin ? `
                <th class="p-2.5">Cek Diskon</th>
                <th class="p-2.5">Cek Kupon</th>
                <th class="p-2.5">Potongan</th>
                <th class="p-2.5">Status Kupon</th>
                <th class="p-2.5">Total Akhir</th>
              ` : `
                <th class="p-2.5">Sensor Kereta</th>
                <th class="p-2.5">Sirine</th>
                <th class="p-2.5">Palang</th>
              `}
              <th class="p-2.5 text-center">Hasil Uji</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
    `;

    scenarios.forEach((sc, scIdx) => {
      const outcome = allResults ? allResults.scenarioResults[scIdx] : null;
      const lastTick = outcome ? outcome.tickResults[outcome.tickResults.length - 1] : null;
      const passed = outcome ? outcome.passed : null;

      html += `
        <tr class="hover:bg-slate-50/80 transition ${outcome && !outcome.passed ? 'bg-rose-50/40' : ''}">
          <!-- Kolom Skenario -->
          <td class="p-2.5 font-bold text-slate-800 font-mono">${sc.name}</td>

          <!-- Kolom Input -->
          <td class="p-2.5 font-mono text-slate-600">
            ${isKantin ? `Rp${sc.ticks[0].total_belanja.toLocaleString('id-ID')}` : (sc.ticks[0].ada_kereta ? 'True' : 'False')}
          </td>
      `;

      if (isKantin) {
        const cekD = lastTick ? lastTick.cekDiskon : "-";
        const cekK = lastTick ? lastTick.cekKupon : "-";
        const potVal = lastTick ? `Rp${lastTick.output.potongan.toLocaleString('id-ID')}` : "-";
        const kupVal = lastTick ? lastTick.output.status_kupon : "-";
        const totVal = lastTick ? `Rp${lastTick.output.total_akhir.toLocaleString('id-ID')}` : "-";

        html += `
          <td class="p-2.5 font-mono font-bold ${cekD === 'True' ? 'text-emerald-600' : (cekD === 'False' ? 'text-rose-600' : 'text-slate-400')}">${cekD}</td>
          <td class="p-2.5 font-mono font-bold ${cekK === 'True' ? 'text-emerald-600' : (cekK === 'False' ? 'text-rose-600' : 'text-slate-400')}">${cekK}</td>
          <td class="p-2.5 font-mono ${lastTick && lastTick.discrepancies.potongan ? 'text-rose-600 font-bold bg-rose-100/60 rounded' : 'text-slate-800'}">${potVal}</td>
          <td class="p-2.5 font-mono ${lastTick && lastTick.discrepancies.status_kupon ? 'text-rose-600 font-bold bg-rose-100/60 rounded' : 'text-slate-800'}">${kupVal}</td>
          <td class="p-2.5 font-mono font-bold ${lastTick && lastTick.discrepancies.total_akhir ? 'text-rose-600 font-bold bg-rose-100/60 rounded' : 'text-blue-700'}">${totVal}</td>
        `;
      } else {
        const sirVal = lastTick ? lastTick.output.status_sirine : "-";
        const palVal = lastTick ? lastTick.output.status_palang : "-";

        html += `
          <td class="p-2.5 font-mono font-semibold">${sc.ticks[0].ada_kereta ? 'True (Ada)' : 'False (Sepi)'}</td>
          <td class="p-2.5 font-mono font-bold ${sirVal === 'BUNYI' ? 'text-rose-600' : 'text-slate-600'}">${sirVal}</td>
          <td class="p-2.5 font-mono font-bold ${palVal === 'TURUN' ? 'text-amber-600' : 'text-emerald-600'}">${palVal}</td>
        `;
      }

      // Kolom Status Lulus / Gagal
      html += `
        <td class="p-2.5 text-center">
          ${passed === true ? `
            <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              <i data-lucide="circle-check" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>LULUS</span>
            </span>
          ` : (passed === false ? `
            <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]" title="${outcome.failureReason || 'Nilai tidak sesuai'}">
              <i data-lucide="circle-x" class="w-3.5 h-3.5 text-rose-600"></i>
              <span>GAGAL</span>
            </span>
          ` : `
            <span class="text-slate-400 font-mono">-</span>
          `)}
        </td>
      </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 8. Mode Prediksi Terlebih Dahulu (T3)
  function wirePredictionToggle() {
    const btnToggle = document.getElementById("togglePredictionMode");
    if (!btnToggle) return;

    btnToggle.addEventListener("click", () => {
      isPredictionMode = !isPredictionMode;
      btnToggle.className = isPredictionMode
        ? "px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center space-x-1.5 transition"
        : "px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center space-x-1.5 transition";

      showToast(isPredictionMode ? "Mode Prediksi Dulu diaktifkan!" : "Mode Prediksi dinonaktifkan.");
      renderTestTable();
    });
  }

  // 9. Mode Guru / Proyektor Kelas (T5)
  function wireTeacherControls() {
    const btnToggleTeacher = document.getElementById("btnToggleTeacherMode");
    const teacherDrawer = document.getElementById("teacherDrawerPanel");
    const btnLoadSolution = document.getElementById("btnTeacherLoadSolution");
    const btnLoadBug = document.getElementById("btnTeacherLoadBug");
    const btnResetAll = document.getElementById("btnTeacherResetAll");

    if (btnToggleTeacher) {
      btnToggleTeacher.addEventListener("click", () => {
        isTeacherMode = !isTeacherMode;
        document.body.classList.toggle("teacher-mode", isTeacherMode);

        if (teacherDrawer) {
          teacherDrawer.classList.toggle("hidden", !isTeacherMode);
        }

        btnToggleTeacher.className = isTeacherMode
          ? "px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm flex items-center space-x-1.5 transition"
          : "px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center space-x-1.5 transition";

        showToast(isTeacherMode ? "Mode Guru (Proyektor Kontras Tinggi) Aktif." : "Mode Guru dinonaktifkan.");
      });
    }

    if (btnLoadSolution) {
      btnLoadSolution.addEventListener("click", () => {
        const solutions = window.App.config.teacherPresets.solutions[currentTheme];
        if (solutions && solutions.length > 0 && window.App.blocks) {
          window.App.blocks.setProgram(currentTheme, solutions[0].blocks);
          showToast(`Berhasil memuat contoh solusi ${solutions[0].title}`);
        }
      });
    }

    if (btnLoadBug) {
      btnLoadBug.addEventListener("click", () => {
        const bugs = window.App.config.teacherPresets.bugs[currentTheme];
        if (bugs && bugs.length > 0 && window.App.blocks) {
          // Pilih bug pertama
          window.App.blocks.setProgram(currentTheme, bugs[0].blocks);
          showToast(`Memuat contoh miskonsepsi siswa: ${bugs[0].title}`);
        }
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener("click", () => {
        if (confirm("Reset seluruh data pembelajaran, susunan blok, dan kemajuan misi?")) {
          try {
            localStorage.clear();
          } catch (e) {}
          location.reload();
        }
      });
    }
  }

  // 10. Navigasi Tab Responsif Mobile (Layar < lg)
  function wireMobileTabs() {
    const tabs = document.querySelectorAll(".mobile-tab-btn");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        const tabTarget = btn.getAttribute("data-tab");
        activeMobileTab = tabTarget;

        tabs.forEach(t => {
          t.classList.remove("text-blue-600", "font-bold");
          t.classList.add("text-slate-500");
        });
        btn.classList.add("text-blue-600", "font-bold");
        btn.classList.remove("text-slate-500");

        // Sembunyikan semua panel tab mobile
        const panels = ["tabPanelBlocks", "tabPanelSim", "tabPanelPseudo", "tabPanelTest"];
        panels.forEach(pId => {
          const p = document.getElementById(pId);
          if (p) p.classList.add("hidden", "lg:block");
        });

        const activePanel = document.getElementById(tabTarget);
        if (activePanel) {
          activePanel.classList.remove("hidden");
        }
      });
    });
  }

  // 11. Modal Rekap Hasil Belajar Siswa (T6)
  function wireRecapModal() {
    const btnOpenRecap = document.getElementById("btnOpenRecapModal");
    const modal = document.getElementById("recapModal");
    const btnCloseRecap = document.getElementById("btnCloseRecapModal");
    const btnCopyRecap = document.getElementById("btnCopyRecapText");
    const btnPrintRecap = document.getElementById("btnPrintRecap");

    if (btnOpenRecap) {
      btnOpenRecap.addEventListener("click", () => {
        renderRecapContent();
        if (modal) modal.classList.remove("hidden");
      });
    }

    if (btnCloseRecap) {
      btnCloseRecap.addEventListener("click", () => {
        if (modal) modal.classList.add("hidden");
      });
    }

    if (btnCopyRecap) {
      btnCopyRecap.addEventListener("click", () => {
        const textEl = document.getElementById("recapSummaryText");
        if (textEl) {
          navigator.clipboard.writeText(textEl.innerText).then(() => {
            showToast("Ringkasan hasil belajar disalin ke clipboard!");
          });
        }
      });
    }

    if (btnPrintRecap) {
      btnPrintRecap.addEventListener("click", () => {
        window.print();
      });
    }
  }

  function renderRecapContent() {
    const content = document.getElementById("recapModalDynamicContent");
    if (!content || !window.App.missions) return;

    const stats = window.App.missions.getSummaryStats();
    const missions = window.App.missions.getAllMissions();

    let html = `
      <div id="recapSummaryText" class="space-y-4 text-xs sm:text-sm">
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div>
            <span class="text-xs text-blue-700 font-semibold uppercase">Total Misi Selesai</span>
            <div class="text-xl font-bold text-blue-900">${stats.completedMissions} dari ${stats.totalMissions} Misi</div>
          </div>
          <div class="text-right">
            <span class="text-xs text-blue-700 font-semibold uppercase">Petunjuk Dipakai</span>
            <div class="text-xl font-bold text-amber-600">${stats.totalHintsUsed} Bantuan</div>
          </div>
        </div>

        <div class="space-y-2">
          <h5 class="font-bold text-slate-800">Rincian Capaian Misi:</h5>
          <div class="space-y-1.5 font-mono text-xs">
            ${missions.map(m => {
              const state = stats.progressMap[m.id];
              const isDone = (state.status === "SELESAI");
              return `
                <div class="p-2 rounded-lg border flex items-center justify-between ${isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'}">
                  <div>
                    <strong class="font-sans block">${m.title}</strong>
                    <span class="text-[11px] text-slate-500 font-sans">${m.objective}</span>
                  </div>
                  <span class="font-bold text-xs px-2 py-0.5 rounded ${isDone ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'}">
                    ${isDone ? 'LULUS 100%' : 'BELUM'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    content.innerHTML = html;
  }

  // 12. Modal Tutorial Singkat 3 Langkah (T8)
  function wireTutorialModal() {
    const btnOpenTutorial = document.getElementById("btnOpenTutorialModal");
    const modal = document.getElementById("tutorialModal");
    const btnCloseTutorial = document.getElementById("btnCloseTutorialModal");
    const btnFinishTutorial = document.getElementById("btnFinishTutorial");

    if (btnOpenTutorial) {
      btnOpenTutorial.addEventListener("click", () => {
        showTutorialModal();
      });
    }

    if (btnCloseTutorial) {
      btnCloseTutorial.addEventListener("click", () => {
        if (modal) modal.classList.add("hidden");
      });
    }

    if (btnFinishTutorial) {
      btnFinishTutorial.addEventListener("click", () => {
        if (modal) modal.classList.add("hidden");
        try {
          localStorage.setItem("App_tutorialCompleted", "true");
        } catch (e) {}
      });
    }
  }

  function showTutorialModal() {
    const modal = document.getElementById("tutorialModal");
    if (modal) modal.classList.remove("hidden");
  }

  // 13. Modal Perayaan Keberhasilan Misi
  function showCelebrationModal(mission) {
    const modal = document.getElementById("celebrationModal");
    const titleEl = document.getElementById("celebrationTitle");
    const descEl = document.getElementById("celebrationDesc");
    const btnNext = document.getElementById("btnCelebrationNext");

    if (titleEl) titleEl.textContent = `Selamat! ${mission.title} Berhasil Diselesaikan!`;
    if (descEl) descEl.textContent = `Kerja bagus! Seluruh kriteria dan pengujian skenario terpenuhi dengan sempurna.`;

    if (btnNext) {
      btnNext.onclick = () => {
        if (modal) modal.classList.add("hidden");
        // Cari misi berikutnya
        const currentIdx = window.App.config.missions.findIndex(m => m.id === mission.id);
        if (currentIdx !== -1 && currentIdx + 1 < window.App.config.missions.length) {
          const nextM = window.App.config.missions[currentIdx + 1];
          window.App.missions.selectMission(nextM.id);
        }
      };
    }

    if (modal) modal.classList.remove("hidden");
  }

  // 14. Log Riwayat Eksekusi (T7)
  function addExecutionLog(outcome) {
    if (!outcome) return;
    executionLogs.unshift({
      time: new Date().toLocaleTimeString("id-ID"),
      scenario: outcome.scenarioName,
      passed: outcome.passed,
      summary: outcome.summary
    });

    if (executionLogs.length > 20) executionLogs.pop();
    renderExecutionLogs();
  }

  function renderExecutionLogs() {
    const container = document.getElementById("executionLogsContainer");
    if (!container) return;

    if (executionLogs.length === 0) {
      container.innerHTML = `<span class="text-xs text-slate-400 italic">Belum ada riwayat pengujian.</span>`;
      return;
    }

    let html = `<div class="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">`;
    executionLogs.forEach(log => {
      html += `
        <div class="p-2 rounded-lg border flex items-center justify-between ${log.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}">
          <div class="flex items-center space-x-2">
            <span class="text-slate-400 text-[10px]">${log.time}</span>
            <span class="font-bold ${log.passed ? 'text-emerald-800' : 'text-rose-800'}">${log.scenario}</span>
          </div>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${log.passed ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}">
            ${log.passed ? 'LULUS' : 'GAGAL'}
          </span>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  // 15. Header Controls (Audio, Bantuan, Ganti Tema, Mode Guru)
  function wireHeaderControls() {
    const btnAudio = document.getElementById("btnToggleAudio");
    const audioIcon = document.getElementById("audioIcon");
    const audioLabel = document.getElementById("audioLabel");

    if (btnAudio && window.App.audio) {
      btnAudio.addEventListener("click", () => {
        const isMuted = window.App.audio.toggleMute();
        if (audioIcon) {
          audioIcon.setAttribute("data-lucide", isMuted ? "volume-x" : "volume-2");
        }
        if (audioLabel) {
          audioLabel.textContent = isMuted ? "Suara: Mati" : "Suara: Aktif";
        }
        if (window.lucide) window.lucide.createIcons();
        showToast(isMuted ? "Audio dinonaktifkan." : "Audio aktif (Volume aman).");
      });
    }

    const btnKereta = document.getElementById("btnThemeKereta");
    const btnKantin = document.getElementById("btnThemeKantin");
    if (btnKereta) btnKereta.addEventListener("click", () => switchTheme("kereta"));
    if (btnKantin) btnKantin.addEventListener("click", () => switchTheme("kantin"));
  }

  // 16. Toast Notification Helper
  function showToast(message) {
    const toast = document.getElementById("globalToast");
    const textEl = document.getElementById("globalToastText");
    if (!toast || !textEl) return;

    textEl.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");

    setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
    }, 2800);
  }

  function onWorkspaceChanged(themeKey, program) {
    resetSimulationState();
  }

  return {
    init: init,
    switchTheme: switchTheme,
    getCurrentTheme: getCurrentTheme,
    renderStage: renderStage,
    updateVariableMonitor: updateVariableMonitor,
    updateNarration: updateNarration,
    renderTestTable: renderTestTable,
    showToast: showToast,
    showCelebrationModal: showCelebrationModal,
    onWorkspaceChanged: onWorkspaceChanged
  };
})();
