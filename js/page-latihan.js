/* ==========================================================================
   js/page-latihan.js - Logika Pengendali Utama Halaman Latihan LKS Digital
   Mengelola alur pembelajaran (stepper), aktivitas 1 (bank kartu & drag-drop),
   aktivitas 2 (deklarasi, blok & coba 1 angka), aktivitas 3 (prediksi & pengujian),
   evaluasi kriteria LKS, dan rekap cetak hasil belajar.
   ========================================================================== */

window.App = window.App || {};

window.App.pageLatihan = (function () {
  const STORAGE_KEY = "LKS_Kantin_Data";

  // State Utama Pembelajaran
  let lksState = {
    currentStep: 0, // 0: Identitas, 1: Skenario, 2: A1, 3: A2, 4: A3, 5: Rekap
    identity: {
      groupName: "",
      groupClass: "",
      member1: "",
      member2: "",
      member3: "",
      member4: "",
      member5: ""
    },
    understandingAnswers: {},
    slots: {
      slot_a1_kupon_cond: null,
      slot_a1_kupon_then: null,
      slot_a1_kupon_else: null,
      slot_a1_kupon_struct: null,
      slot_a1_diskon_cond: null,
      slot_a1_diskon_then: null,
      slot_a1_diskon_else: null,
      slot_a1_diskon_struct: null
    },
    declarations: {
      systemName: "KantinSekolah",
      variables: {
        totalBelanja: "integer",
        potongan: "integer",
        statusKupon: "string",
        totalAkhir: "integer"
      }
    },
    selectedCardId: null, // Untuk mode klik-lalu-tempatkan kartu
    predictions: {},
    testResults: {},
    testValidationError: false,
    isStale: false,
    activeScenarioId: "Skenario A",
    // Pelacak langkah yang pernah dibuka/dikerjakan untuk sequential locking
    visitedSteps: { 0: true, 1: false, 2: false, 3: false, 4: false, 5: false }
  };

  // Muat data dari Safe LocalStorage
  function loadState() {
    const saved = window.App.common?.safeGet(STORAGE_KEY, null);
    if (saved) {
      if (saved.identity) lksState.identity = Object.assign(lksState.identity, saved.identity);
      if (saved.understandingAnswers) lksState.understandingAnswers = saved.understandingAnswers;
      if (saved.slots) lksState.slots = Object.assign(lksState.slots, saved.slots);
      if (saved.declarations) lksState.declarations = Object.assign(lksState.declarations, saved.declarations);
      if (saved.predictions) lksState.predictions = saved.predictions;
      if (saved.testResults) lksState.testResults = saved.testResults;
      if (saved.testValidationError !== undefined) lksState.testValidationError = saved.testValidationError;
      if (saved.isStale !== undefined) lksState.isStale = saved.isStale;
      if (saved.currentStep !== undefined) lksState.currentStep = saved.currentStep;
      if (saved.visitedSteps) lksState.visitedSteps = Object.assign(lksState.visitedSteps, saved.visitedSteps);
    }
  }

  function saveState() {
    if (window.App.common) {
      window.App.common.safeSet(STORAGE_KEY, lksState);
    }
  }

  // 1. MANAJEMEN STEPPER ALUR PEMBELAJARAN
  const stepIds = [
    "stepIdentity",
    "stepScenario",
    "stepActivity1",
    "stepActivity2",
    "stepActivity3",
    "stepRecap"
  ];

  // Periksa apakah suatu langkah sudah boleh dibuka
  // Langkah N boleh dibuka jika langkah N-1 sudah pernah dikunjungi
  function isStepUnlocked(stepIndex) {
    if (stepIndex === 0) return true;
    return lksState.visitedSteps[stepIndex - 1] === true;
  }

  function goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= stepIds.length) return;

    // Sequential lock: blokir jika langkah sebelumnya belum pernah dikunjungi
    if (!isStepUnlocked(stepIndex)) {
      if (window.App.common) {
        window.App.common.showToast("Selesaikan atau buka tahap sebelumnya terlebih dahulu.", "warning", 2500);
      }
      return;
    }

    // Tandai langkah ini sudah pernah dikunjungi
    lksState.visitedSteps[stepIndex] = true;
    lksState.currentStep = stepIndex;
    saveState();

    // Sembunyikan semua langkah
    stepIds.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        if (idx === stepIndex) {
          el.classList.remove("hidden");
        } else {
          el.classList.add("hidden");
        }
      }
    });

    // Perbarui indikator visual stepper bar
    updateStepperBarUI(stepIndex);

    // Tindakan khusus saat memasuki langkah tertentu
    if (stepIndex === 2) {
      renderActivity1();
    } else if (stepIndex === 3) {
      renderActivity2();
    } else if (stepIndex === 4) {
      renderActivity3();
    } else if (stepIndex === 5) {
      renderRecap();
    }

    // Scroll ke atas dengan halus
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (window.lucide) window.lucide.createIcons();
  }

  function updateStepperBarUI(stepIndex) {
    const items = document.querySelectorAll(".stepper-item");
    items.forEach((item, idx) => {
      const circle = item.querySelector(".stepper-circle");
      const label = item.querySelector(".stepper-label");
      const unlocked = isStepUnlocked(idx);

      if (idx < stepIndex && lksState.visitedSteps[idx]) {
        // Langkah selesai/pernah dikunjungi
        if (circle) circle.className = "stepper-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm";
        if (label) label.className = "stepper-label hidden md:block text-xs font-semibold text-emerald-800";
      } else if (idx === stepIndex) {
        // Langkah aktif
        if (circle) circle.className = "stepper-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-blue-100 shadow-md";
        if (label) label.className = "stepper-label hidden md:block text-xs font-bold text-blue-900";
      } else if (!unlocked) {
        // Langkah terkunci
        if (circle) circle.className = "stepper-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-300 cursor-not-allowed";
        if (label) label.className = "stepper-label hidden md:block text-xs font-medium text-slate-400";
      } else {
        // Langkah mendatang tapi sudah terbuka
        if (circle) circle.className = "stepper-circle w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs";
        if (label) label.className = "stepper-label hidden md:block text-xs font-medium text-slate-400";
      }
    });
  }

  // 2. IDENTITAS KELOMPOK
  function initIdentityForm() {
    const fields = ["groupName", "groupClass", "member1", "member2", "member3", "member4", "member5"];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) {
        el.value = lksState.identity[f] || "";
        el.addEventListener("input", (e) => {
          lksState.identity[f] = e.target.value;
          saveState();
        });
      }
    });

    const btnStart = document.getElementById("btnStartLKS");
    if (btnStart) {
      btnStart.addEventListener("click", () => {
        goToStep(1); // Ke Skenario Masalah
      });
    }
  }

  // 3. AKTIVITAS 1: CEK PEMAHAMAN & BANK KARTU
  function renderActivity1() {
    renderUnderstandingSection();
    renderCardBankSection();
  }

  function renderUnderstandingSection() {
    const container = document.getElementById("understandingQuestionsContainer");
    if (!container) return;

    const questions = window.App.config?.lks?.understandingQuestions || [];

    let html = "";
    questions.forEach((q, idx) => {
      const selected = lksState.understandingAnswers[q.id];
      const correctOpt = q.options.find(o => o.isCorrect);
      const isAnswered = Boolean(selected);
      const isCorrect = isAnswered && (selected === correctOpt?.id);

      // Urutkan opsi sesuai displayOrder jika ada (misal: ["D","A","B","C"])
      let orderedOptions = q.options.slice();
      if (q.displayOrder && q.displayOrder.length === q.options.length) {
        orderedOptions = q.displayOrder.map(id => q.options.find(o => o.id === id)).filter(Boolean);
      }

      html += `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 transition hover:border-slate-300">
          <div class="flex items-start space-x-2.5 mb-3">
            <span class="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 font-mono">
              Q${idx + 1}
            </span>
            <h4 class="font-bold text-xs sm:text-sm text-slate-800 leading-snug">${q.question}</h4>
          </div>

          <div class="space-y-2">
            ${orderedOptions.map(opt => {
              const isOptionSelected = selected === opt.id;
              let btnClass = "border-slate-200 hover:bg-slate-50 text-slate-700";

              if (isOptionSelected) {
                if (opt.isCorrect) {
                  btnClass = "bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold ring-2 ring-emerald-200";
                } else {
                  btnClass = "bg-rose-50 border-rose-500 text-rose-900 font-semibold ring-2 ring-rose-200";
                }
              }

              return `
                <button class="w-full text-left p-3 rounded-xl border text-xs flex items-start space-x-2.5 transition active:scale-[0.99] ${btnClass}"
                        onclick="window.App.pageLatihan.selectUnderstandingOption('${q.id}', '${opt.id}')">
                  <span class="w-5 h-5 rounded-md ${isOptionSelected ? (opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-100 text-slate-700'} flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0">
                    ${opt.id}
                  </span>
                  <span class="flex-1">${opt.text}</span>
                  ${isOptionSelected ? (opt.isCorrect ? '<i data-lucide="circle-check" class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"></i>' : '<i data-lucide="circle-x" class="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5"></i>') : ''}
                </button>
              `;
            }).join("")}
          </div>

          ${isAnswered ? `
            <div class="mt-3 p-3 rounded-xl text-xs flex items-start space-x-2 ${isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}">
              <i data-lucide="${isCorrect ? 'check-circle' : 'info'}" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
              <div>
                <strong>${isCorrect ? 'Tepat Sekali!' : 'Belum Tepat:'}</strong> ${q.explanation}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  function selectUnderstandingOption(qId, optId) {
    lksState.understandingAnswers[qId] = optId;
    saveState();
    renderUnderstandingSection();

    // Efek audio responsif
    const qList = window.App.config?.lks?.understandingQuestions || [];
    const q = qList.find(item => item.id === qId);
    const opt = q?.options.find(o => o.id === optId);
    if (opt?.isCorrect) {
      if (window.App.audio) window.App.audio.playCashChime();
    } else {
      if (window.App.audio) window.App.audio.playBuzzer();
    }
  }

  function renderCardBankSection() {
    const bankContainer = document.getElementById("cardBankContainer");
    if (!bankContainer) return;

    const cardBank = window.App.config?.lks?.cardBank || [];
    const placedCardIds = Object.values(lksState.slots).filter(Boolean);

    // Kategori Kartu
    const categories = [
      { key: "condition", title: "Kondisi Logika", icon: "help-circle", color: "blue" },
      { key: "action", title: "Aksi Penugasan", icon: "check-circle-2", color: "emerald" },
      { key: "structure", title: "Jenis Percabangan", icon: "git-branch", color: "purple" }
    ];

    let bankHtml = "";
    categories.forEach(cat => {
      const cardsInCat = cardBank.filter(c => c.category === cat.key);
      bankHtml += `
        <div class="mb-3">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center space-x-1">
            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 text-${cat.color}-600"></i>
            <span>${cat.title}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            ${cardsInCat.map(card => {
              const isPlaced = placedCardIds.includes(card.id);
              const isSelected = lksState.selectedCardId === card.id;

              return `
                <div class="card-item relative px-3 py-2 rounded-xl text-xs font-mono font-bold select-none transition
                            ${isPlaced ? 'opacity-40 bg-slate-100 text-slate-400 border border-dashed border-slate-300 pointer-events-none' :
                              (isSelected ? 'ring-4 ring-amber-400 bg-amber-50 border-2 border-amber-500 text-amber-950 shadow-md cursor-grab' :
                                'bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 shadow-sm cursor-grab active:cursor-grabbing')}"
                     draggable="${!isPlaced}"
                     data-card-id="${card.id}"
                     data-category="${card.category}"
                     onclick="window.App.pageLatihan.onCardClick('${card.id}')">
                  <span>${card.label}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    });

    bankContainer.innerHTML = bankHtml;

    // Render Konten Slot pada Tabel 1 (Kupon) dan Tabel 2 (Diskon)
    renderAllSlots();

    // Pasang Event Drag pada Card Bank
    attachDragEvents();

    if (window.lucide) window.lucide.createIcons();
  }

  // Update visual kartu bank dan slot secara minimal (tanpa rebuild DOM penuh) — dipakai setelah drop/place
  function refreshAfterCardPlaced() {
    const cardBank = window.App.config?.lks?.cardBank || [];
    const placedCardIds = Object.values(lksState.slots).filter(Boolean);

    // Update kelas setiap card-item yang sudah ada di DOM
    document.querySelectorAll(".card-item").forEach(el => {
      const cardId = el.getAttribute("data-card-id");
      const isPlaced = placedCardIds.includes(cardId);
      const isSelected = lksState.selectedCardId === cardId;

      if (isPlaced) {
        el.className = "card-item relative px-3 py-2 rounded-xl text-xs font-mono font-bold select-none transition opacity-40 bg-slate-100 text-slate-400 border border-dashed border-slate-300 pointer-events-none";
        el.setAttribute("draggable", "false");
      } else if (isSelected) {
        el.className = "card-item relative px-3 py-2 rounded-xl text-xs font-mono font-bold select-none transition ring-4 ring-amber-400 bg-amber-50 border-2 border-amber-500 text-amber-950 shadow-md cursor-grab";
        el.setAttribute("draggable", "true");
      } else {
        el.className = "card-item relative px-3 py-2 rounded-xl text-xs font-mono font-bold select-none transition bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 shadow-sm cursor-grab active:cursor-grabbing";
        el.setAttribute("draggable", "true");
      }
    });

    // Update hanya slot yang berubah
    renderAllSlots();
  }

  function renderAllSlots() {
    const slotKeys = Object.keys(lksState.slots);
    const cardBank = window.App.config?.lks?.cardBank || [];

    slotKeys.forEach(slotKey => {
      const el = document.getElementById(slotKey);
      if (!el) return;

      const cardId = lksState.slots[slotKey];
      if (cardId) {
        const card = cardBank.find(c => c.id === cardId);
        const isDistractor = card?.isDistractor || false;
        const isCorrectTarget = card && (card.targetSlot === slotKey);

        let slotStyle = "bg-emerald-50 border-emerald-500 text-emerald-950";
        let statusIcon = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>';

        if (isDistractor || !isCorrectTarget) {
          slotStyle = "bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-300";
          statusIcon = '<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-rose-600"></i>';
        }

        el.className = `slot-zone relative p-2 rounded-xl border-2 font-mono text-xs font-bold flex items-center justify-between shadow-sm transition ${slotStyle}`;
        el.innerHTML = `
          <div class="flex items-center space-x-1.5 truncate">
            ${statusIcon}
            <span class="truncate">${card ? card.label : cardId}</span>
          </div>
          <button class="p-1 rounded-lg hover:bg-black/10 text-slate-600 transition"
                  title="Keluarkan kartu dari slot"
                  onclick="event.stopPropagation(); window.App.pageLatihan.clearSlot('${slotKey}')">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        `;
      } else {
        el.className = "slot-zone relative p-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-400 text-slate-400 font-sans text-xs flex items-center justify-center transition cursor-pointer";
        el.innerHTML = `
          <div class="flex items-center space-x-1">
            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
            <span>Ketuk kartu lalu ketuk slot ini</span>
          </div>
        `;
      }

      // Klik pada slot kosong untuk menempatkan kartu terpilih
      el.onclick = () => {
        if (!lksState.slots[slotKey] && lksState.selectedCardId) {
          placeCardIntoSlot(lksState.selectedCardId, slotKey);
          lksState.selectedCardId = null;
          renderCardBankSection();
        }
      };
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function onCardClick(cardId) {
    if (lksState.selectedCardId === cardId) {
      lksState.selectedCardId = null; // Batalkan pilihan
    } else {
      lksState.selectedCardId = cardId;
    }
    // Gunakan refresh ringan tanpa rebuild DOM penuh
    refreshAfterCardPlaced();
  }

  function placeCardIntoSlot(cardId, slotKey) {
    const cardBank = window.App.config?.lks?.cardBank || [];
    const card = cardBank.find(c => c.id === cardId);
    if (!card) return;

    lksState.slots[slotKey] = cardId;
    saveState();

    // Periksa apakah kartu adalah pengecoh atau salah slot
    if (card.isDistractor) {
      if (window.App.audio) window.App.audio.playBuzzer();
      if (window.App.common) {
        window.App.common.showToast(card.feedback || "Kartu ini adalah pengecoh! Perhatikan tanda batas dan logika LKS.", "error", 4500);
      }
    } else if (card.targetSlot !== slotKey) {
      if (window.App.audio) window.App.audio.playBuzzer();
      if (window.App.common) {
        window.App.common.showToast("Kartu ini benar, namun ditempatkan pada baris atau kolom yang belum sesuai.", "warning", 3500);
      }
    } else {
      if (window.App.audio) window.App.audio.playCashChime();
      if (window.App.common) {
        window.App.common.showToast("Tepat! Kartu terkunci.", "success", 2000);
      }
    }

    // Gunakan refresh ringan tanpa rebuild DOM penuh
    refreshAfterCardPlaced();
  }

  function clearSlot(slotKey) {
    lksState.slots[slotKey] = null;
    saveState();
    refreshAfterCardPlaced();
  }

  function resetActivity1Slots() {
    Object.keys(lksState.slots).forEach(k => {
      lksState.slots[k] = null;
    });
    lksState.selectedCardId = null;
    saveState();
    renderCardBankSection();
    if (window.App.common) window.App.common.showToast("Seluruh slot kartu telah dikosongkan.", "info");
  }

  function attachDragEvents() {
    const cards = document.querySelectorAll(".card-item");
    cards.forEach(cardEl => {
      cardEl.addEventListener("dragstart", (e) => {
        const id = cardEl.getAttribute("data-card-id");
        e.dataTransfer.setData("text/plain", id);
      });
    });

    const slots = document.querySelectorAll(".slot-zone");
    slots.forEach(slotEl => {
      slotEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        slotEl.classList.add("drop-zone-active");
      });
      slotEl.addEventListener("dragleave", () => {
        slotEl.classList.remove("drop-zone-active");
      });
      slotEl.addEventListener("drop", (e) => {
        e.preventDefault();
        slotEl.classList.remove("drop-zone-active");
        const cardId = e.dataTransfer.getData("text/plain");
        const slotKey = slotEl.id;
        if (cardId && slotKey) {
          placeCardIntoSlot(cardId, slotKey);
        }
      });
    });
  }

  // 4. AKTIVITAS 2: PERANCANGAN ALGORITMA & COBA 1 ANGKA
  function renderActivity2() {
    initDeclarationsForm();
    initBlocksWorkspace();
    renderLivePseudocode();
    initQuickTestSandbox();
  }

  function initDeclarationsForm() {
    const sysNameInput = document.getElementById("declarationSystemName");
    if (sysNameInput) {
      sysNameInput.value = lksState.declarations.systemName || "KantinSekolah";
      sysNameInput.addEventListener("input", (e) => {
        lksState.declarations.systemName = e.target.value;
        saveState();
        renderLivePseudocode();
      });
    }

    const varKeys = ["totalBelanja", "potongan", "statusKupon", "totalAkhir"];
    varKeys.forEach(vk => {
      const selectEl = document.getElementById(`decl_type_${vk}`);
      if (selectEl) {
        selectEl.value = lksState.declarations.variables[vk] || "integer";
        selectEl.addEventListener("change", (e) => {
          lksState.declarations.variables[vk] = e.target.value;
          saveState();
          renderLivePseudocode();
        });
      }
    });
  }

  function initBlocksWorkspace() {
    if (!window.App.blocks) return;

    // Pastikan tema kantin aktif
    window.App.blocks.setTheme("kantin");

    // Di Aktivitas 2, muat solusi default jika workspace masih kosong (belum pernah diisi siswa)
    const savedBlocks = window.App.blocks.getProgram("kantin");
    if (!savedBlocks || savedBlocks.length === 0) {
      const defaultSolution = (window.App.config?.teacherPresets?.solutions?.kantin || [])[0];
      if (defaultSolution && defaultSolution.blocks) {
        window.App.blocks.setProgram("kantin", JSON.parse(JSON.stringify(defaultSolution.blocks)));
      }
    }

    // Render palet & workspace
    window.App.blocks.renderPalette();
    window.App.blocks.renderWorkspace();

    // Hook perubahan workspace blok untuk mendeteksi perubahan stale dan update pseudocode
    window.App.ui = window.App.ui || {};
    window.App.ui.onWorkspaceChanged = function (themeKey, program) {
      lksState.isStale = true;
      lksState.testValidationError = false;
      saveState();
      renderLivePseudocode();
      renderPredictionTable();
      renderLiveStage();
      updateStaleWarningUI();
    };

    renderLivePseudocode();
  }

  function renderLivePseudocode() {
    const container = document.getElementById("pseudocodeOutput");
    if (!container) return;

    const program = window.App.blocks ? window.App.blocks.getProgram("kantin") : [];
    const sysName = lksState.declarations.systemName || "KantinSekolah";
    const decVars = lksState.declarations.variables;

    let lineNum = 1;
    let html = "";

    function addRow(indent, textHtml) {
      html += `
        <div class="flex items-center hover:bg-slate-100/70 py-0.5 px-2 rounded font-mono text-xs leading-relaxed">
          <span class="w-6 text-slate-400 select-none text-[11px] font-mono text-right mr-3 flex-shrink-0">${lineNum++}</span>
          <span class="flex-1" style="padding-left: ${indent * 1.25}rem">${textHtml}</span>
        </div>
      `;
    }

    // 1. NAMA SISTEM
    addRow(0, `<span class="text-blue-700 font-bold">ALGORITMA</span> <span class="text-slate-900 font-bold">${sysName}</span>`);

    // 2. DEKLARASI
    addRow(0, `<span class="text-blue-700 font-bold">DEKLARASI</span>`);
    addRow(1, `<span class="text-slate-700">totalBelanja</span> : <span class="text-indigo-600 font-semibold">${decVars.totalBelanja}</span>`);
    addRow(1, `<span class="text-slate-700">potongan</span> : <span class="text-indigo-600 font-semibold">${decVars.potongan}</span>`);
    addRow(1, `<span class="text-slate-700">statusKupon</span> : <span class="text-indigo-600 font-semibold">${decVars.statusKupon}</span>`);
    addRow(1, `<span class="text-slate-700">totalAkhir</span> : <span class="text-indigo-600 font-semibold">${decVars.totalAkhir}</span>`);

    // 3. ALGORITMA
    addRow(0, `<span class="text-blue-700 font-bold">DESKRIPSI (ALGORITMA)</span>`);

    if (program.length === 0) {
      addRow(1, `<span class="text-slate-400 italic">&lt;Workspace blok masih kosong&gt;</span>`);
    } else {
      program.forEach(b => {
        const cond = b.condition;
        const condText = cond ? `<span class="text-slate-800">${cond.variable}</span> <span class="text-blue-600 font-bold">${cond.operator}</span> <span class="text-amber-700 font-bold">${cond.value}</span>` : `<span class="text-rose-500">&lt;kondisi kosong&gt;</span>`;

        addRow(1, `<span class="text-blue-700 font-bold">JIKA</span> ${condText} <span class="text-blue-700 font-bold">MAKA</span>`);

        // THEN ACTIONS
        if (b.thenActions && b.thenActions.length > 0) {
          b.thenActions.forEach(act => {
            const val = typeof act.value === "string" ? `"${act.value}"` : act.value;
            addRow(2, `<span class="text-slate-800">${act.targetVar}</span> <span class="text-slate-500 font-bold">←</span> <span class="text-emerald-700 font-semibold">${val}</span>`);
          });
        }

        // ELSE ACTIONS
        if (b.type === "IF_THEN_ELSE") {
          addRow(1, `<span class="text-indigo-700 font-bold">SELAIN ITU</span>`);
          if (b.elseActions && b.elseActions.length > 0) {
            b.elseActions.forEach(act => {
              const val = typeof act.value === "string" ? `"${act.value}"` : act.value;
              addRow(2, `<span class="text-slate-800">${act.targetVar}</span> <span class="text-slate-500 font-bold">←</span> <span class="text-emerald-700 font-semibold">${val}</span>`);
            });
          }
        }

        addRow(1, `<span class="text-slate-500 font-bold">ENDIF</span>`);
      });
    }

    // Formula penutup terkunci
    addRow(1, `<span class="text-slate-800 font-semibold">totalAkhir</span> <span class="text-slate-500 font-bold">←</span> <span class="text-slate-700">totalBelanja - potongan</span> <span class="text-[10px] text-slate-400 font-sans italic">// Perhitungan Kasir</span>`);

    container.innerHTML = html;
  }

  function copyPseudocode() {
    const container = document.getElementById("pseudocodeOutput");
    if (!container) return;
    const text = container.innerText;
    navigator.clipboard.writeText(text).then(() => {
      if (window.App.common) window.App.common.showToast("Pseudocode berhasil disalin ke clipboard!", "success");
    }).catch(() => {
      if (window.App.common) window.App.common.showToast("Gagal menyalin otomatis. Silakan salin manual.", "warning");
    });
  }

  // 4b. FITUR COBA 1 ANGKA (QUICK TEST SANDBOX)
  function initQuickTestSandbox() {
    const btnRun = document.getElementById("btnRunQuickTest");
    const inputAmount = document.getElementById("quickTestInput");

    if (btnRun && inputAmount) {
      btnRun.addEventListener("click", () => {
        const val = Number(inputAmount.value) || 0;
        executeQuickTest(val);
      });
    }

    // Tombol preset angka cepat (15.000, 20.000, 23.500, 30.000)
    document.querySelectorAll(".quick-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const amt = btn.getAttribute("data-amount");
        if (inputAmount && amt) {
          inputAmount.value = amt;
          executeQuickTest(Number(amt));
        }
      });
    });
  }

  function executeQuickTest(totalBelanja) {
    const program = window.App.blocks ? window.App.blocks.getProgram("kantin") : [];
    const themeConfig = window.App.config?.themes?.kantin;
    if (!themeConfig || !window.App.engine) return;

    const initialEnv = {
      total_belanja: totalBelanja,
      potongan: 0,
      status_kupon: "Tidak dapat",
      total_akhir: totalBelanja
    };

    const result = window.App.engine.runTick(program, initialEnv, themeConfig);
    const endEnv = result.newEnv;

    const resBox = document.getElementById("quickTestResultBox");
    if (resBox) {
      resBox.classList.remove("hidden");
      resBox.innerHTML = `
        <div class="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono space-y-1.5 shadow-md">
          <div class="flex justify-between pb-1 border-b border-slate-700 text-slate-400 font-sans">
            <span>Hasil Simulasi Kasir:</span>
            <span class="text-amber-400 font-bold">Input: Rp${totalBelanja.toLocaleString("id-ID")}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-300">Potongan Diskon:</span>
            <span class="font-bold ${endEnv.potongan > 0 ? 'text-emerald-400' : 'text-slate-400'}">Rp${Number(endEnv.potongan || 0).toLocaleString("id-ID")}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-300">Status Kupon:</span>
            <span class="font-bold ${endEnv.status_kupon === 'Dapat 1 kupon' ? 'text-amber-400' : 'text-slate-400'}">${endEnv.status_kupon}</span>
          </div>
          <div class="flex justify-between pt-1 border-t border-slate-800 text-sm">
            <span class="font-bold text-white font-sans">Total Akhir Kasir:</span>
            <span class="font-bold text-blue-400">Rp${Number(endEnv.total_akhir || 0).toLocaleString("id-ID")}</span>
          </div>
        </div>
      `;
    }

    if (window.App.audio) {
      if (endEnv.potongan > 0 || endEnv.status_kupon === "Dapat 1 kupon") {
        window.App.audio.playCashChime();
      } else {
        window.App.audio.playCrossingBell();
      }
    }
  }

  // 5. AKTIVITAS 3: PENGUJIAN ALGORITMA
  function renderActivity3() {
    renderPredictionTable();
    updateStaleWarningUI();
    renderLiveStage();
  }

  function renderPredictionTable() {
    const tbody = document.getElementById("testScenarioTableBody");
    if (!tbody) return;

    const scenarios = window.App.config?.themes?.kantin?.scenarios || [];

    let html = "";
    scenarios.forEach((sc, idx) => {
      const pred = lksState.predictions[sc.id] || {
        cek_diskon: "",
        cek_kupon: "",
        potongan: "",
        status_kupon: "",
        total_akhir: ""
      };

      const testRes = lksState.isStale ? null : lksState.testResults[sc.id];
      const isTested = Boolean(testRes);
      const expected = sc.expectedOutputs[0];
      const predictionFields = ["cek_diskon", "cek_kupon", "potongan", "status_kupon"];
      const predictionComplete = predictionFields.every(field => pred[field] !== undefined && pred[field] !== "");
      const predictionCorrect = predictionComplete &&
        pred.cek_diskon === expected.cek_diskon &&
        pred.cek_kupon === expected.cek_kupon &&
        Number(pred.potongan) === expected.potongan &&
        pred.status_kupon === expected.status_kupon;
      const isPassed = Boolean(isTested && testRes.passed && predictionCorrect);
      const belanjaVal = sc.ticks[0].total_belanja;

      html += `
        <tr class="hover:bg-slate-50/80 transition cursor-pointer ${lksState.activeScenarioId === sc.id ? 'bg-blue-50/50 ring-1 ring-blue-300' : ''}"
            onclick="window.App.pageLatihan.selectScenario('${sc.id}')">
          <!-- Kolom 1: Skenario & Input -->
          <td class="p-3 text-xs font-semibold text-slate-800 border-b border-slate-200">
            <div class="font-bold text-slate-900">${sc.name}</div>
            <div class="font-mono text-blue-700 font-bold mt-0.5">Rp${belanjaVal.toLocaleString("id-ID")}</div>
            <div class="text-[10px] text-slate-400 font-normal mt-0.5">${sc.description}</div>
          </td>

          <!-- Kolom 2: Prediksi Siswa -->
          <td class="p-2 border-b border-slate-200" onclick="event.stopPropagation()">
            <div class="space-y-1 text-xs">
              <!-- Cek Diskon -->
              <div class="flex items-center space-x-1">
                <span class="text-[10px] text-slate-400 w-16">Diskon:</span>
                <select class="px-1 py-0.5 border border-slate-300 rounded text-[11px] font-mono"
                        onchange="window.App.pageLatihan.updatePrediction('${sc.id}', 'cek_diskon', this.value)">
                  <option value="">-</option>
                  <option value="True" ${pred.cek_diskon === "True" ? 'selected' : ''}>True</option>
                  <option value="False" ${pred.cek_diskon === "False" ? 'selected' : ''}>False</option>
                </select>
                <!-- Cek Kupon -->
                <span class="text-[10px] text-slate-400 w-12 text-right">Kupon:</span>
                <select class="px-1 py-0.5 border border-slate-300 rounded text-[11px] font-mono"
                        onchange="window.App.pageLatihan.updatePrediction('${sc.id}', 'cek_kupon', this.value)">
                  <option value="">-</option>
                  <option value="True" ${pred.cek_kupon === "True" ? 'selected' : ''}>True</option>
                  <option value="False" ${pred.cek_kupon === "False" ? 'selected' : ''}>False</option>
                </select>
              </div>

              <!-- Nilai Potongan -->
              <div class="flex items-center space-x-1">
                <span class="text-[10px] text-slate-400 w-16">Potongan:</span>
                <select class="px-1 py-0.5 border border-slate-300 rounded text-[11px] font-mono flex-1"
                        onchange="window.App.pageLatihan.updatePrediction('${sc.id}', 'potongan', this.value)">
                  <option value="">-</option>
                  <option value="0" ${String(pred.potongan) === "0" ? 'selected' : ''}>Rp0</option>
                  <option value="2000" ${String(pred.potongan) === "2000" ? 'selected' : ''}>Rp2.000</option>
                </select>
              </div>

              <!-- Status Kupon -->
              <div class="flex items-center space-x-1">
                <span class="text-[10px] text-slate-400 w-16">Status Kupon:</span>
                <select class="px-1 py-0.5 border border-slate-300 rounded text-[11px] font-mono flex-1"
                        onchange="window.App.pageLatihan.updatePrediction('${sc.id}', 'status_kupon', this.value)">
                  <option value="">-</option>
                  <option value="Tidak dapat" ${pred.status_kupon === "Tidak dapat" ? 'selected' : ''}>Tidak dapat</option>
                  <option value="Dapat 1 kupon" ${pred.status_kupon === "Dapat 1 kupon" ? 'selected' : ''}>Dapat 1 kupon</option>
                </select>
              </div>
            </div>
          </td>

          <!-- Kolom 3: Hasil Algoritma Siswa -->
          <td class="p-3 text-xs font-mono border-b border-slate-200">
            ${lksState.testValidationError && !lksState.isStale ? `
              <span class="text-amber-700 font-sans text-xs">Program belum valid. Lengkapi blok Aktivitas 2.</span>
            ` : isTested ? `
              <div class="space-y-1">
                <div>Potongan: <strong class="${testRes.actualOutput?.potongan === expected.potongan ? 'text-emerald-700' : 'text-rose-600'}">Rp${Number(testRes.actualOutput?.potongan || 0).toLocaleString("id-ID")}</strong></div>
                <div>Kupon: <strong class="${testRes.actualOutput?.status_kupon === expected.status_kupon ? 'text-emerald-700' : 'text-rose-600'}">${testRes.actualOutput?.status_kupon}</strong></div>
                <div>Total Akhir: <strong class="text-blue-700">Rp${Number(testRes.actualOutput?.total_akhir || 0).toLocaleString("id-ID")}</strong></div>
              </div>
            ` : '<span class="text-slate-400 italic font-sans text-xs">Belum diuji</span>'}
          </td>

          <!-- Kolom 4: Kunci Acuan LKS -->
          <td class="p-3 text-xs font-mono border-b border-slate-200 bg-slate-50/50">
            <div class="space-y-0.5 text-slate-600">
              <div>Potongan: Rp${expected.potongan.toLocaleString("id-ID")}</div>
              <div>Kupon: "${expected.status_kupon}"</div>
              <div>Akhir: Rp${expected.total_akhir.toLocaleString("id-ID")}</div>
            </div>
          </td>

          <!-- Kolom 5: Status Validasi -->
          <td class="p-3 text-center border-b border-slate-200">
            ${!predictionComplete ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">BELUM LENGKAP</span>
            ` : lksState.testValidationError && !lksState.isStale ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">PERBAIKI ALGORITMA</span>
            ` : !isTested ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">BELUM DIUJI</span>
            ` : `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${isPassed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}">
                <i data-lucide="${isPassed ? 'check' : 'x'}" class="w-3.5 h-3.5 mr-1"></i>
                <span>${isPassed ? 'LULUS' : 'GAGAL'}</span>
              </span>
            `}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    updateScenarioTestButtons();
  }

  function updateScenarioTestButtons() {
    const scenarios = window.App.config?.themes?.kantin?.scenarios || [];
    const allPredictionsComplete = scenarios.length > 0 && scenarios.every(sc => {
      const pred = lksState.predictions[sc.id];
      return pred && ["cek_diskon", "cek_kupon", "potongan", "status_kupon"]
        .every(field => pred[field] !== undefined && pred[field] !== "");
    });

    document.querySelectorAll("[data-run-scenario-tests]").forEach(button => {
      button.disabled = !allPredictionsComplete;
      button.title = allPredictionsComplete ? "Jalankan pengujian semua skenario" : "Lengkapi prediksi pada semua skenario A–F terlebih dahulu.";
      button.classList.toggle("opacity-50", !allPredictionsComplete);
      button.classList.toggle("cursor-not-allowed", !allPredictionsComplete);
    });
  }

  function updatePrediction(scId, field, val) {
    if (!lksState.predictions[scId]) {
      lksState.predictions[scId] = {};
    }
    lksState.predictions[scId][field] = val;
    saveState();
    renderPredictionTable();
  }

  function selectScenario(scId) {
    lksState.activeScenarioId = scId;
    renderPredictionTable();
    renderLiveStage();
  }

  function renderLiveStage() {
    const scId = lksState.activeScenarioId || "Skenario A";
    const scenarios = window.App.config?.themes?.kantin?.scenarios || [];
    const sc = scenarios.find(s => s.id === scId) || scenarios[0];
    const testRes = lksState.isStale ? null : lksState.testResults[scId];

    const belanjaVal = sc.ticks[0].total_belanja;
    const expected = sc.expectedOutputs[0];

    const actualOutput = testRes?.actualOutput || {
      potongan: expected.potongan,
      status_kupon: expected.status_kupon,
      total_akhir: expected.total_akhir
    };

    if (window.App.stageKantin) {
      window.App.stageKantin.render("kantinStageLiveContainer", {
        scenarioId: sc.id.replace("Skenario ", ""),
        total_belanja: belanjaVal,
        potongan: actualOutput.potongan,
        status_kupon: actualOutput.status_kupon,
        total_akhir: actualOutput.total_akhir,
        expected: expected,
        failureExplanation: testRes?.failureExplanation || "",
        isTested: Boolean(testRes)
      });
    }
  }

  function runAllScenarioTests() {
    const program = window.App.blocks ? window.App.blocks.getProgram("kantin") : [];
    const scenarios = window.App.config?.themes?.kantin?.scenarios || [];

    if (!window.App.engine) return;

    const allPredictionsComplete = scenarios.every(sc => {
      const pred = lksState.predictions[sc.id];
      return pred && ["cek_diskon", "cek_kupon", "potongan", "status_kupon"]
        .every(field => pred[field] !== undefined && pred[field] !== "");
    });
    if (!allPredictionsComplete) {
      if (window.App.common) window.App.common.showToast("Lengkapi prediksi pada semua skenario A–F sebelum menjalankan pengujian.", "warning", 4000);
      return;
    }

    const validation = window.App.engine.validateProgram(program, window.App.config.themes.kantin);
    if (!validation.isValid) {
      lksState.testResults = {};
      lksState.testValidationError = true;
      lksState.isStale = false;
      saveState();
      renderPredictionTable();
      updateStaleWarningUI();
      renderLiveStage();
      const firstError = validation.errors[0]?.message || "Program belum lengkap.";
      if (window.App.common) window.App.common.showToast(`${firstError} Lengkapi algoritma pada Aktivitas 2.`, "warning", 5000);
      return;
    }

    lksState.testResults = {};
    lksState.testValidationError = false;
    let passedCount = 0;

    scenarios.forEach(sc => {
      const outcome = window.App.engine.runScenarioTest("kantin", program, sc);
      const tickOutcome = outcome.tickResults?.[0];

      lksState.testResults[sc.id] = {
        passed: outcome.passed,
        actualOutput: tickOutcome?.output || {},
        failureExplanation: outcome.summary || ""
      };

      if (outcome.passed) passedCount++;
    });

    lksState.isStale = false;
    saveState();

    renderPredictionTable();
    updateStaleWarningUI();
    renderLiveStage();

    // Suara umpan balik
    if (window.App.audio) {
      window.App.audio.playReceiptPrinter();
      setTimeout(() => {
        if (passedCount === scenarios.length) {
          window.App.audio.playSuccessChime();
        } else {
          window.App.audio.playBuzzer();
        }
      }, 300);
    }

    if (window.App.common) {
      window.App.common.showToast(
        passedCount === scenarios.length ?
          "Luar biasa! 100% Skenario Pengujian Lulus Sempurna!" :
          `${passedCount} dari ${scenarios.length} skenario lulus. Periksa skenario yang bersilang merah.`,
        passedCount === scenarios.length ? "success" : "warning",
        4000
      );
    }
  }

  function autofillPredictionsFromAlgorithm() {
    const scenarios = window.App.config?.themes?.kantin?.scenarios || [];
    scenarios.forEach(sc => {
      const exp = sc.expectedOutputs[0];
      lksState.predictions[sc.id] = {
        cek_diskon: exp.cek_diskon,
        cek_kupon: exp.cek_kupon,
        potongan: exp.potongan,
        status_kupon: exp.status_kupon,
        total_akhir: exp.total_akhir
      };
    });
    saveState();
    renderPredictionTable();
    if (window.App.common) window.App.common.showToast("Seluruh kolom prediksi diisi otomatis sesuai kunci logika.", "info");
  }

  function updateStaleWarningUI() {
    const warningEl = document.getElementById("staleTestWarning");
    if (!warningEl) return;
    if (lksState.isStale) {
      warningEl.classList.remove("hidden");
    } else {
      warningEl.classList.add("hidden");
    }
  }

  // 6. EVALUASI KRITERIA & REKAP
  function checkAllCriteria() {
    if (!window.App.criteria) return;

    const currentProgram = window.App.blocks ? window.App.blocks.getProgram("kantin") : [];

    const evalData = {
      understandingAnswers: lksState.understandingAnswers,
      slots: lksState.slots,
      declarations: lksState.declarations,
      program: currentProgram,
      predictions: lksState.predictions,
      testResults: lksState.testResults
    };

    const outcome = window.App.criteria.evaluateAll(evalData);
    window.App.criteria.renderPanel("criteriaListContainer");

    // Perbarui badge total di header kriteria
    const badgeEl = document.getElementById("criteriaAchievedBadge");
    if (badgeEl) {
      badgeEl.textContent = `${outcome.achieved} / ${outcome.total} Tercapai`;
    }

    // Audio responsif
    if (window.App.audio) {
      if (outcome.allCompleted) {
        window.App.audio.playSuccessChime();
      } else {
        window.App.audio.playCashChime();
      }
    }

    if (window.App.common) {
      window.App.common.showToast(
        outcome.allCompleted ?
          "Selamat! Seluruh kriteria LKS (A1.1 - A3.4) berhasil tercapai 100%!" :
          `Pemeriksaan Selesai: ${outcome.achieved} dari ${outcome.total} kriteria telah tercapai.`,
        outcome.allCompleted ? "success" : "info",
        3500
      );
    }
  }

  function renderRecap() {
    const identBox = document.getElementById("recapIdentityBox");
    const id = lksState.identity;
    if (identBox) {
      const members = [id.member1, id.member2, id.member3, id.member4, id.member5].filter(Boolean);
      identBox.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div><span class="text-slate-500">Nama Kelompok:</span> <strong class="text-slate-900">${id.groupName || '-'}</strong></div>
          <div><span class="text-slate-500">Kelas:</span> <strong class="text-slate-900">${id.groupClass || '-'}</strong></div>
          <div class="sm:col-span-2">
            <span class="text-slate-500">Anggota Kelompok:</span>
            <strong class="text-slate-900">${members.length > 0 ? members.join(", ") : '-'}</strong>
          </div>
        </div>
      `;
    }

    // Rekap Kriteria
    const critBox = document.getElementById("recapCriteriaSummary");
    if (critBox && window.App.criteria) {
      const critState = window.App.criteria.getState();
      const critList = window.App.config?.lks?.criteriaList || [];
      const stats = window.App.criteria.getStats();

      let html = `
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
          <span class="font-bold text-xs text-slate-800">Capaian Kriteria LKS:</span>
          <span class="px-2 py-0.5 rounded-full font-bold font-mono text-xs ${stats.percentage === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
            ${stats.achieved} / ${stats.total} (${stats.percentage}%)
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[11px]">
      `;

      critList.forEach(c => {
        const st = critState[c.id]?.status || "untested";
        const isDone = st === "completed";
        html += `
          <div class="p-2 rounded-lg border flex items-center space-x-1.5 ${isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'}">
            <i data-lucide="${isDone ? 'check-circle' : 'circle-dashed'}" class="w-3.5 h-3.5 ${isDone ? 'text-emerald-600' : 'text-slate-400'} flex-shrink-0"></i>
            <span class="font-mono font-bold">${c.id}</span>
          </div>
        `;
      });

      html += `</div>`;
      critBox.innerHTML = html;
    }

    // Rekap Pseudocode
    const pseudoBox = document.getElementById("recapPseudocodeOutput");
    const mainPseudo = document.getElementById("pseudocodeOutput");
    if (pseudoBox && mainPseudo) {
      pseudoBox.innerHTML = mainPseudo.innerHTML;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function copyRecapSummary() {
    const id = lksState.identity;
    const stats = window.App.criteria ? window.App.criteria.getStats() : { achieved: 0, total: 12 };
    const members = [id.member1, id.member2, id.member3, id.member4, id.member5].filter(Boolean).join(", ");
    const pseudoText = document.getElementById("pseudocodeOutput")?.innerText || "";

    const summaryText = `
=== LEMBAR HASIL BELAJAR LKS DIGITAL KANTIN SEKOLAH ===
Materi: Percabangan If-Then & If-Then-Else (Informatika Fase E)
Kelompok: ${id.groupName || '-'} | Kelas: ${id.groupClass || '-'}
Anggota: ${members || '-'}
Capaian Kriteria: ${stats.achieved} / ${stats.total} Tercapai

--- PSEUDOCODE FINAL ---
${pseudoText}

Catatan: Aktivitas 4 (Penarikan Kesimpulan) dikerjakan langsung di lembar LKS kertas bersama kelompok.
    `.trim();

    navigator.clipboard.writeText(summaryText).then(() => {
      if (window.App.common) window.App.common.showToast("Ringkasan hasil belajar berhasil disalin!", "success");
    });
  }

  function printRecap() {
    window.print();
  }

  // 7. INISIALISASI HALAMAN LATIHAN
  function init() {
    loadState();
    initIdentityForm();

    if (window.App.criteria) {
      window.App.criteria.init();
      window.App.criteria.renderPanel("criteriaListContainer");
    }

    goToStep(lksState.currentStep || 0);

    // Event tombol periksa kriteria
    const btnCheck = document.getElementById("btnCheckCriteria");
    if (btnCheck) {
      btnCheck.addEventListener("click", checkAllCriteria);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  return {
    init: init,
    goToStep: goToStep,
    selectUnderstandingOption: selectUnderstandingOption,
    onCardClick: onCardClick,
    placeCardIntoSlot: placeCardIntoSlot,
    clearSlot: clearSlot,
    resetActivity1Slots: resetActivity1Slots,
    copyPseudocode: copyPseudocode,
    executeQuickTest: executeQuickTest,
    updatePrediction: updatePrediction,
    selectScenario: selectScenario,
    runAllScenarioTests: runAllScenarioTests,
    autofillPredictions: autofillPredictionsFromAlgorithm,
    checkAllCriteria: checkAllCriteria,
    copyRecapSummary: copyRecapSummary,
    printRecap: printRecap
  };
})();

// Bootstrap otomatis saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  if (window.App.common) {
    window.App.common.init();
  }
  if (window.App.pageLatihan) {
    window.App.pageLatihan.init();
  }
});
