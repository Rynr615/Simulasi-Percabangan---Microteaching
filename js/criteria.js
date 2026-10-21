/* ==========================================================================
   js/criteria.js - Sistem Evaluasi Kriteria LKS & Petunjuk 3 Tingkat (Scaffolding)
   Mengelola status pencapaian kriteria A1.1 sampai A3.4, penghitung pengecekan,
   serta pemberian petunjuk bertingkat yang mendidik bagi siswa Fase E SMA.
   ========================================================================== */

window.App = window.App || {};

window.App.criteria = (function () {
  const STORAGE_KEY = "LKS_Kantin_Criteria";

  // Data status kriteria internal
  let criteriaState = {};

  // Status Enum
  const STATUS = {
    UNTESTED: "untested",     // Belum diperiksa (Abu-abu)
    INCORRECT: "incorrect",   // Belum tepat (Merah muda)
    PARTIAL: "partial",       // Hampir tepat (Kuning)
    COMPLETED: "completed"    // Tercapai (Hijau)
  };

  // Muat status dari LocalStorage aman
  function loadState() {
    criteriaState = {};
    const criteriaList = window.App.config?.lks?.criteriaList || [];
    const saved = window.App.common?.safeGet(STORAGE_KEY, null);

    criteriaList.forEach(crit => {
      if (saved && saved[crit.id]) {
        criteriaState[crit.id] = saved[crit.id];
      } else {
        criteriaState[crit.id] = {
          status: STATUS.UNTESTED,
          checkCount: 0,
          notes: ""
        };
      }
    });
  }

  function saveState() {
    if (window.App.common) {
      window.App.common.safeSet(STORAGE_KEY, criteriaState);
    }
  }

  // Evaluasi seluruh kriteria berdasarkan data state halaman latihan
  function evaluateAll(lksData) {
    const criteriaList = window.App.config?.lks?.criteriaList || [];
    let achievedCount = 0;

    criteriaList.forEach(crit => {
      const prev = criteriaState[crit.id] || { status: STATUS.UNTESTED, checkCount: 0 };
      const evalResult = evaluateSingle(crit.id, lksData);

      // Hitung berapa kali siswa menekan periksa untuk kriteria yang belum selesai
      let count = prev.checkCount || 0;
      if (evalResult.status !== STATUS.COMPLETED) {
        count += 1;
      }

      criteriaState[crit.id] = {
        status: evalResult.status,
        checkCount: count,
        notes: evalResult.notes || ""
      };

      if (evalResult.status === STATUS.COMPLETED) {
        achievedCount++;
      }
    });

    saveState();
    return {
      total: criteriaList.length,
      achieved: achievedCount,
      allCompleted: achievedCount === criteriaList.length,
      state: criteriaState
    };
  }

  // Evaluator per Kriteria
  function evaluateSingle(critId, data) {
    if (!data) return { status: STATUS.UNTESTED, notes: "Data belum terisi." };

    switch (critId) {
      // -------------------------------------------------------------
      // AKTIVITAS 1
      // -------------------------------------------------------------
      case "A1.1": {
        // Cek Pemahaman: 3 soal pilihan ganda
        const answers = data.understandingAnswers || {};
        const qList = window.App.config?.lks?.understandingQuestions || [];
        let correctCount = 0;
        let answeredCount = 0;

        qList.forEach(q => {
          if (answers[q.id]) {
            answeredCount++;
            const correctOpt = q.options.find(o => o.isCorrect);
            if (correctOpt && answers[q.id] === correctOpt.id) {
              correctCount++;
            }
          }
        });

        if (answeredCount === 0) return { status: STATUS.UNTESTED, notes: "Belum dijawab." };
        if (correctCount === qList.length) return { status: STATUS.COMPLETED, notes: "Seluruh 3 pertanyaan dijawab benar." };
        if (correctCount > 0) return { status: STATUS.PARTIAL, notes: `${correctCount} dari ${qList.length} pertanyaan benar.` };
        return { status: STATUS.INCORRECT, notes: "Jawaban belum tepat. Cermati materi If-Then vs If-Then-Else." };
      }

      case "A1.2": {
        // Analisis Kupon Undian (Tabel 1): 4 slot
        const slots = data.slots || {};
        const condOk = slots["slot_a1_kupon_cond"] === "c_cond_kupon_correct";
        const thenOk = slots["slot_a1_kupon_then"] === "c_act_kupon_then";
        const elseOk = slots["slot_a1_kupon_else"] === "c_act_kupon_else";
        const structOk = slots["slot_a1_kupon_struct"] === "c_struct_ifthen";

        const correctCount = [condOk, thenOk, elseOk, structOk].filter(Boolean).length;
        if (correctCount === 4) return { status: STATUS.COMPLETED, notes: "Tabel 1 Kupon lengkap dan benar!" };
        if (correctCount >= 2) return { status: STATUS.PARTIAL, notes: `${correctCount} dari 4 slot Tabel Kupon tepat.` };
        if (correctCount > 0) return { status: STATUS.INCORRECT, notes: "Tabel Kupon belum tepat." };
        return { status: STATUS.UNTESTED, notes: "Tabel Kupon belum diisi." };
      }

      case "A1.3": {
        // Analisis Diskon Pelajar (Tabel 2): 4 slot
        const slots = data.slots || {};
        const condOk = slots["slot_a1_diskon_cond"] === "c_cond_diskon_correct";
        const thenOk = slots["slot_a1_diskon_then"] === "c_act_diskon_then";
        const elseOk = slots["slot_a1_diskon_else"] === "c_act_diskon_else";
        const structOk = slots["slot_a1_diskon_struct"] === "c_struct_ifthenelse";

        const correctCount = [condOk, thenOk, elseOk, structOk].filter(Boolean).length;
        if (correctCount === 4) return { status: STATUS.COMPLETED, notes: "Tabel 2 Diskon lengkap dan benar!" };
        if (correctCount >= 2) return { status: STATUS.PARTIAL, notes: `${correctCount} dari 4 slot Tabel Diskon tepat.` };
        if (correctCount > 0) return { status: STATUS.INCORRECT, notes: "Tabel Diskon belum tepat." };
        return { status: STATUS.UNTESTED, notes: "Tabel Diskon belum diisi." };
      }

      case "A1.4": {
        // Bebas kartu pengecoh
        const slots = data.slots || {};
        const cardBank = window.App.config?.lks?.cardBank || [];
        const distractors = cardBank.filter(c => c.isDistractor).map(c => c.id);

        let hasDistractor = false;
        let filledCount = 0;
        Object.values(slots).forEach(cardId => {
          if (cardId) {
            filledCount++;
            if (distractors.includes(cardId)) {
              hasDistractor = true;
            }
          }
        });

        if (filledCount < 8) return { status: STATUS.UNTESTED, notes: "Selesaikan pengisian seluruh slot Tabel 1 & 2." };
        if (hasDistractor) return { status: STATUS.INCORRECT, notes: "Terdapat kartu pengecoh yang terpasang pada slot." };
        return { status: STATUS.COMPLETED, notes: "Semua slot bebas dari jebakan kartu pengecoh." };
      }

      // -------------------------------------------------------------
      // AKTIVITAS 2
      // -------------------------------------------------------------
      case "A2.1": {
        // Nama Sistem & Deklarasi
        const dec = data.declarations || {};
        const sysName = (dec.systemName || "").trim().toLowerCase();
        const vars = dec.variables || {};

        const sysNameOk = sysName === "kantinsekolah" || sysName.includes("kantin");
        const totBelanjaOk = vars["totalBelanja"] === "integer";
        const potOk = vars["potongan"] === "integer";
        const statKuponOk = vars["statusKupon"] === "string";
        const totAkhirOk = vars["totalAkhir"] === "integer";

        const correctCount = [sysNameOk, totBelanjaOk, potOk, statKuponOk, totAkhirOk].filter(Boolean).length;
        if (correctCount === 5) return { status: STATUS.COMPLETED, notes: "Nama sistem dan 4 tipe data variabel tepat." };
        if (correctCount >= 3) return { status: STATUS.PARTIAL, notes: "Beberapa tipe data variabel perlu ditinjau kembali." };
        return { status: STATUS.INCORRECT, notes: "Format nama sistem atau tipe data belum sesuai ketentuan." };
      }

      case "A2.2": {
        // Blok Diskon (If-Then-Else)
        const program = data.program || [];
        const diskonBlock = program.find(b => {
          if (b.type !== "IF_THEN_ELSE") return false;
          const c = b.condition;
          return c && c.variable === "total_belanja" && (c.operator === ">=" || c.operator === ">") && Number(c.value) === 20000;
        });

        if (!diskonBlock) return { status: STATUS.INCORRECT, notes: "Belum ada blok If-Then-Else untuk diskon belanja (>= 20000)." };

        const c = diskonBlock.condition;
        const hasCorrectOp = c.operator === ">=";
        const hasThenAct = diskonBlock.thenActions?.some(a => a.targetVar === "potongan" && Number(a.value) === 2000);
        const hasElseAct = diskonBlock.elseActions?.some(a => a.targetVar === "potongan" && Number(a.value) === 0);

        if (hasCorrectOp && hasThenAct && hasElseAct) {
          return { status: STATUS.COMPLETED, notes: "Blok Diskon terkonfigurasi sempurna." };
        }
        if (!hasCorrectOp) {
          return { status: STATUS.PARTIAL, notes: "Perhatikan operator diskon: gunakan '>=' agar belanja Rp20.000 berhak promo." };
        }
        return { status: STATUS.PARTIAL, notes: "Pastikan aksi MAKA adalah potongan ← 2000 dan SELAIN ITU adalah potongan ← 0." };
      }

      case "A2.3": {
        // Blok Kupon (If-Then)
        const program = data.program || [];
        const kuponBlock = program.find(b => {
          if (b.type !== "IF_THEN") return false;
          const c = b.condition;
          return c && c.variable === "total_belanja" && (c.operator === ">=" || c.operator === ">") && Number(c.value) === 30000;
        });

        if (!kuponBlock) return { status: STATUS.INCORRECT, notes: "Belum ada blok If-Then untuk kupon undian (>= 30000)." };

        const c = kuponBlock.condition;
        const hasCorrectOp = c.operator === ">=";
        const hasThenAct = kuponBlock.thenActions?.some(a => a.targetVar === "status_kupon" && a.value === "Dapat 1 kupon");

        if (hasCorrectOp && hasThenAct) {
          return { status: STATUS.COMPLETED, notes: "Blok Kupon terkonfigurasi sempurna." };
        }
        if (!hasCorrectOp) {
          return { status: STATUS.PARTIAL, notes: "Gunakan operator '>=' untuk syarat kupon undian Rp30.000." };
        }
        return { status: STATUS.PARTIAL, notes: "Pastikan aksi MAKA adalah status_kupon ← 'Dapat 1 kupon'." };
      }

      case "A2.4": {
        // Formula total_akhir terkunci
        return { status: STATUS.COMPLETED, notes: "Formula perhitungan total_akhir ← total_belanja - potongan terpasang aktif." };
      }

      // -------------------------------------------------------------
      // AKTIVITAS 3
      // -------------------------------------------------------------
      case "A3.1": {
        // Prediksi Skenario Diskon (A - D)
        const predictions = data.predictions || {};
        const scenIds = ["Skenario A", "Skenario B", "Skenario C", "Skenario D"];
        let filledCount = 0;
        let accurateCount = 0;

        scenIds.forEach(id => {
          const p = predictions[id];
          if (p && p.potongan !== undefined && p.potongan !== "") {
            filledCount++;
            const expected = getExpectedOutput(id);
            if (expected && Number(p.potongan) === Number(expected.potongan) && String(p.cek_diskon).toLowerCase() === String(expected.cek_diskon).toLowerCase()) {
              accurateCount++;
            }
          }
        });

        if (filledCount === 0) return { status: STATUS.UNTESTED, notes: "Prediksi Skenario A-D belum diisi." };
        if (accurateCount === scenIds.length) return { status: STATUS.COMPLETED, notes: "Prediksi Skenario A s/d D 100% akurat." };
        if (filledCount === scenIds.length) return { status: STATUS.PARTIAL, notes: "Seluruh prediksi A-D telah diisi, beberapa nilai perlu disesuaikan." };
        return { status: STATUS.PARTIAL, notes: `${filledCount} dari ${scenIds.length} skenario A-D telah diprediksi.` };
      }

      case "A3.2": {
        // Prediksi Skenario Kupon (E - F)
        const predictions = data.predictions || {};
        const scenIds = ["Skenario E", "Skenario F"];
        let filledCount = 0;
        let accurateCount = 0;

        scenIds.forEach(id => {
          const p = predictions[id];
          if (p && p.status_kupon !== undefined && p.status_kupon !== "") {
            filledCount++;
            const expected = getExpectedOutput(id);
            if (expected && p.status_kupon === expected.status_kupon && String(p.cek_kupon).toLowerCase() === String(expected.cek_kupon).toLowerCase()) {
              accurateCount++;
            }
          }
        });

        if (filledCount === 0) return { status: STATUS.UNTESTED, notes: "Prediksi Skenario E & F belum diisi." };
        if (accurateCount === scenIds.length) return { status: STATUS.COMPLETED, notes: "Prediksi Skenario E & F 100% akurat." };
        return { status: STATUS.PARTIAL, notes: "Lengkapi prediksi skenario kupon E & F." };
      }

      case "A3.3": {
        // Verifikasi Kasir Batas Ambang (B & E)
        const testResults = data.testResults || {};
        const resB = testResults["Skenario B"];
        const resE = testResults["Skenario E"];

        if (!resB || !resE) return { status: STATUS.UNTESTED, notes: "Klik tombol 'Jalankan Pengujian' untuk menguji skenario batas." };
        if (resB.passed && resE.passed) return { status: STATUS.COMPLETED, notes: "Skenario batas Rp20.000 dan Rp30.000 terverifikasi valid." };
        return { status: STATUS.INCORRECT, notes: "Skenario batas B atau E belum lulus. Periksa operator percabangan." };
      }

      case "A3.4": {
        // Kelulusan Penuh 100% Seluruh Skenario (A - F)
        const testResults = data.testResults || {};
        const scenIds = ["Skenario A", "Skenario B", "Skenario C", "Skenario D", "Skenario E", "Skenario F"];
        const testedCount = scenIds.filter(id => testResults[id] !== undefined).length;
        const passedCount = scenIds.filter(id => testResults[id]?.passed).length;

        if (testedCount === 0) return { status: STATUS.UNTESTED, notes: "Algoritma belum diuji terhadap skenario LKS." };
        if (passedCount === scenIds.length) return { status: STATUS.COMPLETED, notes: "Lulus 100% pada seluruh Skenario A sampai F!" };
        return { status: STATUS.PARTIAL, notes: `${passedCount} dari ${scenIds.length} skenario berhasil lulus.` };
      }

      default:
        return { status: STATUS.UNTESTED, notes: "" };
    }
  }

  function getExpectedOutput(scenarioId) {
    const scenarios = window.App.config?.themes?.kantin?.scenarios || [];
    const sc = scenarios.find(s => s.id === scenarioId);
    return sc?.expectedOutputs?.[0] || null;
  }

  // Render Panel Kriteria & Tombol Petunjuk 3 Tingkat
  function renderCriteriaPanel(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const criteriaList = window.App.config?.lks?.criteriaList || [];

    let html = `
      <div class="space-y-3">
    `;

    criteriaList.forEach(crit => {
      const state = criteriaState[crit.id] || { status: STATUS.UNTESTED, checkCount: 0 };
      const statusMeta = getStatusBadgeMeta(state.status);
      const checkCount = state.checkCount || 0;
      const hintLvl3Unlocked = checkCount >= 2;

      html += `
        <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-sm transition hover:border-slate-300">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <div class="flex items-center space-x-1.5 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  ${crit.id}
                </span>
                <span class="text-[10px] font-semibold text-slate-400">&bull; ${crit.activity}</span>
              </div>
              <h5 class="text-xs font-bold text-slate-800 leading-snug">${crit.title}</h5>
              <p class="text-[11px] text-slate-500 mt-0.5">${crit.description}</p>
            </div>
            <div class="flex flex-col items-end flex-shrink-0">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.badgeClass}">
                <i data-lucide="${statusMeta.icon}" class="w-3 h-3 mr-1"></i>
                <span>${statusMeta.label}</span>
              </span>
              ${state.notes ? `<span class="text-[10px] text-slate-400 mt-1 italic text-right max-w-[120px] truncate" title="${state.notes}">${state.notes}</span>` : ''}
            </div>
          </div>

          <!-- Bagian Petunjuk Bertingkat (Accordion / Collapsible) -->
          <div class="mt-2.5 pt-2 border-t border-slate-100">
            <button class="btn-toggle-hint text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition" data-crit-id="${crit.id}">
              <i data-lucide="help-circle" class="w-3.5 h-3.5"></i>
              <span>Buka Petunjuk Belajar</span>
              <i data-lucide="chevron-down" class="w-3 h-3 transform transition-transform" id="hint_icon_${crit.id}"></i>
            </button>

            <div id="hint_box_${crit.id}" class="hidden mt-2 space-y-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <!-- Tingkat 1: Pertanyaan Pemandu -->
              <div class="p-2 bg-blue-50 border border-blue-200 rounded text-blue-900">
                <div class="flex items-center space-x-1 font-bold text-[11px] text-blue-700 mb-0.5">
                  <i data-lucide="compass" class="w-3 h-3"></i>
                  <span>Tingkat 1: Pertanyaan Pemandu</span>
                </div>
                <p class="text-[11px]">${crit.hints.level1}</p>
              </div>

              <!-- Tingkat 2: Petunjuk Struktur -->
              <div class="p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-900">
                <div class="flex items-center space-x-1 font-bold text-[11px] text-indigo-700 mb-0.5">
                  <i data-lucide="layers" class="w-3 h-3"></i>
                  <span>Tingkat 2: Petunjuk Struktur</span>
                </div>
                <p class="text-[11px]">${crit.hints.level2}</p>
              </div>

              <!-- Tingkat 3: Solusi Bagian Tersebut (Terbuka setelah 2x periksa) -->
              ${hintLvl3Unlocked ? `
                <div class="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                  <div class="flex items-center space-x-1 font-bold text-[11px] text-emerald-700 mb-0.5">
                    <i data-lucide="key" class="w-3 h-3"></i>
                    <span>Tingkat 3: Solusi Kunci</span>
                  </div>
                  <p class="text-[11px] font-mono">${crit.hints.level3}</p>
                </div>
              ` : `
                <div class="p-2 bg-slate-100 border border-slate-200 rounded text-slate-500 flex items-center justify-between">
                  <div class="flex items-center space-x-1.5 text-[11px]">
                    <i data-lucide="lock" class="w-3.5 h-3.5 text-slate-400"></i>
                    <span>Tingkat 3: Solusi Bagian Tersebut</span>
                  </div>
                  <span class="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    ${checkCount}/2 Periksa Belum Tepat
                  </span>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Pasang Event Handler untuk Accordion Petunjuk
    container.querySelectorAll(".btn-toggle-hint").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-crit-id");
        const box = document.getElementById(`hint_box_${id}`);
        const icon = document.getElementById(`hint_icon_${id}`);
        if (box) {
          const isHidden = box.classList.contains("hidden");
          if (isHidden) {
            box.classList.remove("hidden");
            if (icon) icon.classList.add("rotate-180");
          } else {
            box.classList.add("hidden");
            if (icon) icon.classList.remove("rotate-180");
          }
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function getStatusBadgeMeta(status) {
    switch (status) {
      case STATUS.COMPLETED:
        return { label: "Tercapai", badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-300", icon: "circle-check" };
      case STATUS.PARTIAL:
        return { label: "Hampir Tepat", badgeClass: "bg-amber-100 text-amber-800 border border-amber-300", icon: "alert-triangle" };
      case STATUS.INCORRECT:
        return { label: "Belum Tepat", badgeClass: "bg-rose-100 text-rose-800 border border-rose-300", icon: "circle-x" };
      case STATUS.UNTESTED:
      default:
        return { label: "Belum Diperiksa", badgeClass: "bg-slate-100 text-slate-600 border border-slate-300", icon: "circle-dashed" };
    }
  }

  function getCompletionStats() {
    const criteriaList = window.App.config?.lks?.criteriaList || [];
    const total = criteriaList.length;
    let achieved = 0;
    Object.values(criteriaState).forEach(st => {
      if (st.status === STATUS.COMPLETED) achieved++;
    });
    return {
      total: total,
      achieved: achieved,
      percentage: total > 0 ? Math.round((achieved / total) * 100) : 0
    };
  }

  function getState() {
    return criteriaState;
  }

  return {
    init: function () {
      loadState();
    },
    evaluateAll: evaluateAll,
    renderPanel: renderCriteriaPanel,
    getStats: getCompletionStats,
    getState: getState,
    STATUS: STATUS
  };
})();
