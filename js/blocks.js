/* ==========================================================================
   js/blocks.js - Manajemen Workspace Blok, Palet, Drag & Drop (Pointer Events)
   Mendukung Pointer Events API (layar sentuh + mouse), mode Ketuk-untuk-Tempat,
   riwayat Undo/Redo (30+ langkah), validasi nested-if, dan persistensi memori.
   ========================================================================== */

window.App = window.App || {};

window.App.blocks = (function () {
  // Struktur Penyimpanan Blok per Tema
  const workspaceState = {
    kereta: [],
    kantin: []
  };

  // Stack Riwayat Undo / Redo (Minimal 30 langkah)
  const historyStacks = {
    kereta: { undo: [], redo: [] },
    kantin: { undo: [], redo: [] }
  };

  let currentTheme = "kereta";
  let selectedPaletteItem = null; // Untuk mode ketuk-untuk-menempatkan
  let activeHighlightBlockId = null;

  // Pointer Drag State
  let dragData = null;
  let ghostEl = null;

  function generateId(prefix = "blk") {
    return prefix + "_" + Math.random().toString(36).substr(2, 9);
  }

  // 1. Simpan Status Riwayat Undo
  function pushHistory() {
    const stack = historyStacks[currentTheme];
    const currentBlocks = JSON.parse(JSON.stringify(workspaceState[currentTheme]));
    stack.undo.push(currentBlocks);
    if (stack.undo.length > 50) stack.undo.shift();
    stack.redo = []; // Kosongkan redo saat ada aksi baru
    persistToLocalStorage();
  }

  function undo() {
    const stack = historyStacks[currentTheme];
    if (stack.undo.length === 0) return false;
    const current = JSON.parse(JSON.stringify(workspaceState[currentTheme]));
    stack.redo.push(current);
    workspaceState[currentTheme] = stack.undo.pop();
    persistToLocalStorage();
    renderWorkspace();
    triggerChange();
    return true;
  }

  function redo() {
    const stack = historyStacks[currentTheme];
    if (stack.redo.length === 0) return false;
    const current = JSON.parse(JSON.stringify(workspaceState[currentTheme]));
    stack.undo.push(current);
    workspaceState[currentTheme] = stack.redo.pop();
    persistToLocalStorage();
    renderWorkspace();
    triggerChange();
    return true;
  }

  function canUndo() {
    return historyStacks[currentTheme].undo.length > 0;
  }

  function canRedo() {
    return historyStacks[currentTheme].redo.length > 0;
  }

  // 2. Persistensi LocalStorage Aman (Try/Catch)
  function persistToLocalStorage() {
    try {
      localStorage.setItem("App_workspaceState", JSON.stringify(workspaceState));
    } catch (e) {
      // Abaikan jika kuota penuh atau penyimpanan dinonaktifkan browser
    }
  }

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem("App_workspaceState");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.kereta && Array.isArray(parsed.kereta)) workspaceState.kereta = parsed.kereta;
        if (parsed.kantin && Array.isArray(parsed.kantin)) workspaceState.kantin = parsed.kantin;
      }
    } catch (e) {}
  }

  // 3. Konfigurasi Tema Aktif
  function setTheme(themeKey) {
    currentTheme = themeKey;
    selectedPaletteItem = null;
    renderPalette();
    renderWorkspace();
    triggerChange();
  }

  function getProgram(themeKey = null) {
    return workspaceState[themeKey || currentTheme] || [];
  }

  function setProgram(themeKey, blocks) {
    pushHistory();
    workspaceState[themeKey] = JSON.parse(JSON.stringify(blocks));
    if (themeKey === currentTheme) {
      renderWorkspace();
      triggerChange();
    }
  }

  function clearWorkspace() {
    pushHistory();
    workspaceState[currentTheme] = [];
    renderWorkspace();
    triggerChange();
  }

  // 4. Tambah Blok ke Workspace
  function addBlock(blockType) {
    const themeConfig = window.App.config.themes[currentTheme];
    const currentList = workspaceState[currentTheme];

    if (currentList.length >= window.App.config.maxBlocks) {
      if (window.App.ui) window.App.ui.showToast(`Maksimal ${window.App.config.maxBlocks} blok percabangan untuk fokus pembelajaran.`);
      return;
    }

    pushHistory();

    const defaultVar = themeConfig.conditionOptions.variables[0];
    const defaultOp = themeConfig.conditionOptions.operators[0];
    const defaultVal = themeConfig.conditionOptions.values[0];

    // Default aksi pertama dari daftar aksi tema
    const defaultAct = themeConfig.availableActions[0];

    const newBlock = {
      id: generateId("blk"),
      type: blockType,
      condition: {
        variable: defaultVar,
        operator: defaultOp,
        value: defaultVal
      },
      thenActions: [{
        targetVar: defaultAct.targetVar,
        value: defaultAct.value
      }]
    };

    if (blockType === "IF_THEN_ELSE") {
      const secondAct = themeConfig.availableActions[1] || defaultAct;
      newBlock.elseActions = [{
        targetVar: secondAct.targetVar,
        value: secondAct.value
      }];
    }

    workspaceState[currentTheme].push(newBlock);
    renderWorkspace();
    triggerChange();
  }

  function removeBlock(blockId) {
    pushHistory();
    workspaceState[currentTheme] = workspaceState[currentTheme].filter(b => b.id !== blockId);
    renderWorkspace();
    triggerChange();
  }

  // 5. Render Palet Blok Pilihan
  function renderPalette() {
    const container = document.getElementById("blockPaletteList");
    if (!container) return;

    const themeConfig = window.App.config.themes[currentTheme];

    let html = `
      <!-- Kategori 1: Struktur Percabangan -->
      <div class="mb-4">
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
          <i data-lucide="git-branch" class="w-3.5 h-3.5 text-blue-600"></i>
          <span>Struktur Percabangan</span>
        </div>
        <div class="space-y-2.5">
          <!-- Template If-Then -->
          <div class="palette-item group relative bg-blue-600 hover:bg-blue-700 active:scale-98 text-white p-2.5 rounded-xl border border-blue-500 shadow-sm cursor-grab select-none transition ${selectedPaletteItem?.type === 'IF_THEN' ? 'ring-2 ring-amber-400' : ''}" data-type="IF_THEN">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs tracking-wide flex items-center space-x-1.5">
                <i data-lucide="puzzle" class="w-4 h-4"></i>
                <span>JIKA ... MAKA (If-Then)</span>
              </span>
              <span class="text-[10px] bg-blue-800/80 px-2 py-0.5 rounded-full font-mono">1 Jalur</span>
            </div>
            <div class="text-[11px] text-blue-100 mt-1 opacity-90 leading-tight">
              Aksi dijalankan HANYA jika syarat kondisi bernilai True.
            </div>
          </div>

          <!-- Template If-Then-Else -->
          <div class="palette-item group relative bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white p-2.5 rounded-xl border border-indigo-500 shadow-sm cursor-grab select-none transition ${selectedPaletteItem?.type === 'IF_THEN_ELSE' ? 'ring-2 ring-amber-400' : ''}" data-type="IF_THEN_ELSE">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs tracking-wide flex items-center space-x-1.5">
                <i data-lucide="git-branch" class="w-4 h-4"></i>
                <span>JIKA-MAKA-SELAIN ITU</span>
              </span>
              <span class="text-[10px] bg-indigo-800/80 px-2 py-0.5 rounded-full font-mono">2 Jalur</span>
            </div>
            <div class="text-[11px] text-indigo-100 mt-1 opacity-90 leading-tight">
              Menyediakan jalur alternatif jika syarat bernilai False.
            </div>
          </div>
        </div>
      </div>

      <!-- Kategori 2: Aksi & Penugasan Cepat -->
      <div>
        <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
          <i data-lucide="list-checks" class="w-3.5 h-3.5 text-emerald-600"></i>
          <span>Pilihan Aksi (${themeConfig.name})</span>
        </div>
        <div class="space-y-1.5">
    `;

    themeConfig.availableActions.forEach((act, idx) => {
      html += `
        <div class="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-mono select-none flex items-center justify-between">
          <span class="font-semibold">${act.label}</span>
          <span class="text-[10px] text-emerald-700 font-sans">Aksi #${idx + 1}</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <!-- Petunjuk Singkat Penggunaan -->
      <div class="mt-4 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600">
        <div class="flex items-center space-x-1.5 font-bold text-slate-700 mb-1">
          <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-500"></i>
          <span>Cara Menempatkan Blok</span>
        </div>
        <p>Seret blok ke workspace di tengah, atau <strong>ketuk blok</strong> lalu ketuk area tujuan.</p>
      </div>
    `;

    container.innerHTML = html;

    // Pasang Event Pointer pada Item Palet
    container.querySelectorAll(".palette-item").forEach(item => {
      const type = item.getAttribute("data-type");

      // Mode Ketuk-untuk-menempatkan
      item.addEventListener("click", () => {
        if (selectedPaletteItem && selectedPaletteItem.type === type) {
          selectedPaletteItem = null;
        } else {
          selectedPaletteItem = { type: type };
          addBlock(type); // Langsung tambahkan jika diklik untuk kecepatan siswa
        }
        renderPalette();
      });

      // Pointer Drag Start
      item.addEventListener("pointerdown", (e) => {
        startPointerDrag(e, { fromPalette: true, blockType: type });
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 6. Render Workspace Penyusunan Blok
  function renderWorkspace() {
    const container = document.getElementById("blockWorkspaceList");
    if (!container) return;

    const themeConfig = window.App.config.themes[currentTheme];
    const program = workspaceState[currentTheme];

    // Perbarui Tombol Undo/Redo
    const btnUndo = document.getElementById("btnUndo");
    const btnRedo = document.getElementById("btnRedo");
    if (btnUndo) btnUndo.disabled = !canUndo();
    if (btnRedo) btnRedo.disabled = !canRedo();

    // Blok Deklarasi Otomatis (Terkunci) di Bagian Paling Atas
    let html = `
      <!-- Header NAMA SISTEM & DEKLARASI (Terkunci Otomatis) -->
      <div class="p-3 bg-slate-100 border border-dashed border-slate-300 rounded-xl mb-3 text-xs text-slate-700 select-none">
        <div class="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-200">
          <span class="font-bold flex items-center space-x-1.5 text-blue-700">
            <i data-lucide="lock" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>SISTEM: ${themeConfig.systemName} (Deklarasi)</span>
          </span>
          <span class="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-mono">Terkunci</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
          ${themeConfig.variables.map(v => `
            <div class="flex items-center space-x-1 bg-white p-1 rounded border border-slate-200">
              <span class="font-semibold text-slate-800">${v.name}</span>
              <span class="text-slate-400">:</span>
              <span class="text-indigo-600">${v.type}</span>
              ${v.isInput ? '<span class="ml-auto text-[9px] bg-amber-100 text-amber-800 px-1 rounded">Input</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (!program || program.length === 0) {
      html += `
        <div id="workspaceEmptyState" class="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white/70 select-none drop-zone">
          <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-200">
            <i data-lucide="puzzle" class="w-6 h-6"></i>
          </div>
          <h4 class="font-bold text-sm text-slate-800 mb-1">Area Algoritma Masih Kosong</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mb-3">
            Tarik blok percabangan dari palet kiri atau klik untuk menambahkan instruksi pertama Anda.
          </p>
          <div class="flex justify-center space-x-2">
            <button class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition" onclick="window.App.blocks.addBlock('IF_THEN')">
              + Tambah If-Then
            </button>
            <button class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition" onclick="window.App.blocks.addBlock('IF_THEN_ELSE')">
              + Tambah If-Then-Else
            </button>
          </div>
        </div>
      `;
    } else {
      html += `<div class="space-y-3" id="workspaceBlocksContainer">`;

      program.forEach((block, index) => {
        const isIfThen = (block.type === "IF_THEN");
        const isHighlighted = (activeHighlightBlockId === block.id);

        html += `
          <div class="block-card relative bg-white rounded-2xl border-2 ${isHighlighted ? 'border-amber-400 shadow-md ring-2 ring-amber-300' : 'border-slate-200 shadow-sm'} overflow-hidden transition-all duration-200" id="card_${block.id}" data-block-id="${block.id}">
            <!-- Header Blok (IF / JIKA) -->
            <div class="${isIfThen ? 'bg-blue-600' : 'bg-indigo-600'} text-white p-3 flex items-center justify-between select-none">
              <div class="flex items-center space-x-2">
                <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold font-mono">
                  ${index + 1}
                </span>
                <span class="font-bold text-xs uppercase tracking-wider font-mono">
                  ${isIfThen ? 'JIKA (IF-THEN)' : 'JIKA (IF-THEN-ELSE)'}
                </span>
              </div>
              <div class="flex items-center space-x-1">
                <!-- Status Eksekusi Badge (Diisi dinamis saat simulasi) -->
                <span class="exec-badge hidden px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase" id="badge_${block.id}"></span>
                <button class="btn-delete-block p-1 hover:bg-white/20 rounded-md transition text-white/80 hover:text-white" title="Hapus Blok" data-block-id="${block.id}">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <!-- Konten Editor Blok -->
            <div class="p-3 space-y-3 bg-slate-50/60">
              <!-- Baris Slot Kondisi (Amber) -->
              <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-2.5">
                <div class="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <i data-lucide="eye" class="w-3.5 h-3.5 text-amber-600"></i>
                  <span>Syarat Kondisi:</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  <span class="font-bold text-slate-700">JIKA</span>

                  <!-- Dropdown Variabel -->
                  <select class="cond-var bg-white border border-amber-300 rounded-md px-2 py-1 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500" data-block-id="${block.id}">
                    ${themeConfig.conditionOptions.variables.map(v => `
                      <option value="${v}" ${block.condition.variable === v ? 'selected' : ''}>${v}</option>
                    `).join('')}
                  </select>

                  <!-- Dropdown Operator -->
                  <select class="cond-op bg-white border border-amber-300 rounded-md px-2 py-1 text-blue-700 font-bold focus:ring-2 focus:ring-blue-500" data-block-id="${block.id}">
                    ${themeConfig.conditionOptions.operators.map(op => `
                      <option value="${op}" ${block.condition.operator === op ? 'selected' : ''}>${op}</option>
                    `).join('')}
                  </select>

                  <!-- Nilai Pembanding -->
                  ${renderConditionValueInput(themeConfig, block)}
                </div>
              </div>

              <!-- Cabang 1: MAKA (THEN) Emerald -->
              <div class="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-2.5">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                    <i data-lucide="circle-check" class="w-3.5 h-3.5 text-emerald-600"></i>
                    <span>MAKA (Jalur jika kondisi bernilai True):</span>
                  </span>
                  <span class="then-status-badge hidden text-[10px] font-bold px-1.5 py-0.2 rounded font-mono"></span>
                </div>
                
                <div class="space-y-1.5" id="then_actions_${block.id}">
                  ${renderActionRow(themeConfig, block, "then", block.thenActions[0])}
                </div>
              </div>

              <!-- Cabang 2: SELAIN ITU (ELSE) Jika If-Then-Else -->
              ${!isIfThen ? `
                <div class="bg-indigo-50/80 border-2 border-indigo-300 rounded-xl p-2.5">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center space-x-1">
                      <i data-lucide="git-branch" class="w-3.5 h-3.5 text-indigo-600"></i>
                      <span>SELAIN ITU (Jalur alternatif jika bernilai False):</span>
                    </span>
                    <span class="else-status-badge hidden text-[10px] font-bold px-1.5 py-0.2 rounded font-mono"></span>
                  </div>
                  
                  <div class="space-y-1.5" id="else_actions_${block.id}">
                    ${renderActionRow(themeConfig, block, "else", block.elseActions ? block.elseActions[0] : null)}
                  </div>
                </div>
              ` : ''}

              <!-- Penutup ENDIF -->
              <div class="text-right text-[11px] font-mono text-slate-400 font-semibold pr-2">
                ENDIF
              </div>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    // Blok Terkunci Khusus (Contoh total_akhir pada Kantin)
    if (themeConfig.lockedBlocks && themeConfig.lockedBlocks.length > 0) {
      themeConfig.lockedBlocks.forEach(locked => {
        html += `
          <div class="mt-3 p-3 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-mono select-none flex items-center justify-between text-slate-700">
            <div class="flex items-center space-x-2">
              <i data-lucide="lock" class="w-4 h-4 text-slate-400"></i>
              <span class="font-bold">${locked.label}</span>
            </div>
            <span class="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-sans">Perhitungan Terkunci</span>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    // Pasang Event Handlers untuk Komponen Workspace
    wireWorkspaceEvents(container, themeConfig);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Render Input Nilai Kondisi
  function renderConditionValueInput(themeConfig, block) {
    const varMeta = themeConfig.variables.find(v => v.name === block.condition.variable);
    const options = themeConfig.conditionOptions.values;

    if (varMeta && varMeta.type === "boolean") {
      return `
        <select class="cond-val bg-white border border-amber-300 rounded-md px-2 py-1 text-purple-700 font-bold focus:ring-2 focus:ring-blue-500" data-block-id="${block.id}">
          <option value="True" ${String(block.condition.value) === "True" ? 'selected' : ''}>True</option>
          <option value="False" ${String(block.condition.value) === "False" ? 'selected' : ''}>False</option>
        </select>
      `;
    }

    return `
      <select class="cond-val bg-white border border-amber-300 rounded-md px-2 py-1 text-amber-700 font-bold focus:ring-2 focus:ring-blue-500" data-block-id="${block.id}">
        ${options.map(opt => `
          <option value="${opt}" ${Number(block.condition.value) === Number(opt) ? 'selected' : ''}>${opt}</option>
        `).join('')}
      </select>
    `;
  }

  // Render Baris Aksi Penugasan
  function renderActionRow(themeConfig, block, branch, currentAction) {
    const actionKey = `${block.id}_${branch}`;
    const selectedTarget = currentAction ? currentAction.targetVar : themeConfig.availableActions[0].targetVar;
    const selectedVal = currentAction ? currentAction.value : themeConfig.availableActions[0].value;

    return `
      <div class="flex items-center space-x-2 text-xs font-mono bg-white p-2 rounded-lg border border-slate-200">
        <select class="action-target bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 font-semibold" data-block-id="${block.id}" data-branch="${branch}">
          ${themeConfig.availableActions.map(act => `
            <option value="${act.targetVar}::${act.value}" ${(act.targetVar === selectedTarget && String(act.value) === String(selectedVal)) ? 'selected' : ''}>
              ${act.label}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  // 7. Pengkabelan Event Perubahan Nilai Blok & Penghapusan
  function wireWorkspaceEvents(container, themeConfig) {
    // Tombol Hapus
    container.querySelectorAll(".btn-delete-block").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const blkId = btn.getAttribute("data-block-id");
        removeBlock(blkId);
      });
    });

    // Dropdown Variabel Kondisi
    container.querySelectorAll(".cond-var").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const blkId = sel.getAttribute("data-block-id");
        const blk = workspaceState[currentTheme].find(b => b.id === blkId);
        if (blk) {
          pushHistory();
          blk.condition.variable = e.target.value;
          renderWorkspace();
          triggerChange();
        }
      });
    });

    // Dropdown Operator Kondisi
    container.querySelectorAll(".cond-op").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const blkId = sel.getAttribute("data-block-id");
        const blk = workspaceState[currentTheme].find(b => b.id === blkId);
        if (blk) {
          pushHistory();
          blk.condition.operator = e.target.value;
          triggerChange();
        }
      });
    });

    // Nilai Pembanding Kondisi
    container.querySelectorAll(".cond-val").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const blkId = sel.getAttribute("data-block-id");
        const blk = workspaceState[currentTheme].find(b => b.id === blkId);
        if (blk) {
          pushHistory();
          blk.condition.value = e.target.value;
          triggerChange();
        }
      });
    });

    // Dropdown Target Aksi
    container.querySelectorAll(".action-target").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const blkId = sel.getAttribute("data-block-id");
        const branch = sel.getAttribute("data-branch");
        const blk = workspaceState[currentTheme].find(b => b.id === blkId);
        if (blk) {
          pushHistory();
          const [targetVar, valStr] = e.target.value.split("::");
          let parsedVal = valStr;
          if (!isNaN(valStr) && valStr.trim() !== "") parsedVal = Number(valStr);

          const newAction = { targetVar: targetVar, value: parsedVal };
          if (branch === "then") {
            blk.thenActions = [newAction];
          } else {
            blk.elseActions = [newAction];
          }
          triggerChange();
        }
      });
    });

    // Sorot Kartu saat Diklik (Dua Arah dengan Pseudocode)
    container.querySelectorAll(".block-card").forEach(card => {
      card.addEventListener("click", () => {
        const blkId = card.getAttribute("data-block-id");
        highlightBlock(blkId);
      });
    });
  }

  // 8. Pointer Drag and Drop API (Pointer Events)
  function startPointerDrag(e, meta) {
    dragData = meta;

    // Buat Elemen Ghost Visual
    ghostEl = document.createElement("div");
    ghostEl.className = "drag-ghost bg-blue-600 text-white px-4 py-2 rounded-xl font-bold font-mono text-xs shadow-2xl flex items-center space-x-2";
    ghostEl.innerHTML = `<i data-lucide="puzzle" class="w-4 h-4"></i><span>${meta.blockType === 'IF_THEN' ? 'JIKA-MAKA' : 'JIKA-MAKA-SELAIN ITU'}</span>`;
    document.body.appendChild(ghostEl);
    if (window.lucide) window.lucide.createIcons();

    updateGhostPos(e.clientX, e.clientY);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  }

  function updateGhostPos(x, y) {
    if (ghostEl) {
      ghostEl.style.left = `${x}px`;
      ghostEl.style.top = `${y}px`;
    }
  }

  function onPointerMove(e) {
    if (!dragData) return;
    updateGhostPos(e.clientX, e.clientY);

    // Deteksi jika kursor berada di dalam blok yang sudah ada (Validasi pencegahan Nested IF)
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const existingBlock = targetEl ? targetEl.closest(".block-card") : null;
    if (existingBlock) {
      // Tolak penempatan di dalam blok (Nested IF belum didukung di pertemuan ini)
      showNestedIfTooltip(e.clientX, e.clientY);
    } else {
      hideNestedIfTooltip();
    }
  }

  function onPointerUp(e) {
    if (dragData) {
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const isWorkspace = targetEl ? targetEl.closest("#blockWorkspace") : null;
      const isExistingBlock = targetEl ? targetEl.closest(".block-card") : null;

      if (isExistingBlock) {
        // Tampilkan tooltip penolakan Nested IF
        if (window.App.ui) {
          window.App.ui.showToast("Nested If dibahas pada pertemuan berikutnya.");
        }
      } else if (isWorkspace) {
        addBlock(dragData.blockType);
      }
    }
    cleanDrag();
  }

  function onPointerCancel() {
    cleanDrag();
  }

  function cleanDrag() {
    dragData = null;
    if (ghostEl && ghostEl.parentNode) {
      ghostEl.parentNode.removeChild(ghostEl);
    }
    ghostEl = null;
    hideNestedIfTooltip();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  }

  let nestedTooltipEl = null;
  function showNestedIfTooltip(x, y) {
    if (!nestedTooltipEl) {
      nestedTooltipEl = document.createElement("div");
      nestedTooltipEl.className = "fixed z-50 bg-rose-900 text-rose-100 text-[11px] font-sans font-semibold px-2.5 py-1 rounded-md shadow-lg border border-rose-600 pointer-events-none";
      nestedTooltipEl.textContent = "Nested If dibahas pada pertemuan berikutnya";
      document.body.appendChild(nestedTooltipEl);
    }
    nestedTooltipEl.style.left = `${x + 12}px`;
    nestedTooltipEl.style.top = `${y + 12}px`;
  }

  function hideNestedIfTooltip() {
    if (nestedTooltipEl && nestedTooltipEl.parentNode) {
      nestedTooltipEl.parentNode.removeChild(nestedTooltipEl);
      nestedTooltipEl = null;
    }
  }

  // 9. Sorotan Visual Blok Aktif (Dua Arah dengan Pseudocode)
  function highlightBlock(blockId) {
    activeHighlightBlockId = blockId;
    document.querySelectorAll(".block-card").forEach(c => {
      const id = c.getAttribute("data-block-id");
      if (id === blockId) {
        c.classList.add("border-amber-400", "ring-2", "ring-amber-300");
        c.classList.remove("border-slate-200");
      } else {
        c.classList.remove("border-amber-400", "ring-2", "ring-amber-300");
        c.classList.add("border-slate-200");
      }
    });

    if (window.App.pseudocode) {
      window.App.pseudocode.render("pseudocodeOutput", currentTheme, workspaceState[currentTheme], blockId);
    }
  }

  // 10. Update Status Visual Blok saat Langkah Simulasi Berjalan (F3)
  function setBlockExecutionStatus(blockId, status, details = {}) {
    const card = document.getElementById(`card_${blockId}`);
    const badge = document.getElementById(`badge_${blockId}`);
    if (!card || !badge) return;

    // Reset status sebelumnya
    card.classList.remove("evaluating-pulse", "opacity-60", "border-emerald-500", "border-slate-400");
    badge.className = "exec-badge px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase flex items-center space-x-1";

    if (status === "evaluating") {
      card.classList.add("evaluating-pulse");
      badge.classList.remove("hidden");
      badge.classList.add("bg-amber-400", "text-amber-950");
      badge.innerHTML = `<i data-lucide="eye" class="w-3 h-3"></i><span>EVALUASI: ${details.expr || ''}</span>`;
    } else if (status === "executed") {
      card.classList.add("border-emerald-500");
      badge.classList.remove("hidden");
      badge.classList.add("bg-emerald-500", "text-white");
      badge.innerHTML = `<i data-lucide="circle-check" class="w-3 h-3"></i><span>DIJALANKAN (${details.branch === 'then' ? 'MAKA' : 'SELAIN ITU'})</span>`;
    } else if (status === "skipped") {
      card.classList.add("opacity-60", "border-slate-400");
      badge.classList.remove("hidden");
      badge.classList.add("bg-slate-500", "text-white");
      badge.innerHTML = `<i data-lucide="skip-forward" class="w-3 h-3"></i><span>DILEWATI</span>`;
    } else {
      badge.classList.add("hidden");
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function resetAllBlockStatuses() {
    document.querySelectorAll(".block-card").forEach(c => {
      c.classList.remove("evaluating-pulse", "opacity-60", "border-emerald-500", "border-slate-400");
    });
    document.querySelectorAll(".exec-badge").forEach(b => {
      b.classList.add("hidden");
    });
  }

  // Notifikasi Perubahan ke Modul Lain
  function triggerChange() {
    const program = workspaceState[currentTheme];
    if (window.App.pseudocode) {
      window.App.pseudocode.render("pseudocodeOutput", currentTheme, program, activeHighlightBlockId);
    }
    if (window.App.ui && window.App.ui.onWorkspaceChanged) {
      window.App.ui.onWorkspaceChanged(currentTheme, program);
    }
  }

  return {
    init: function () {
      loadFromLocalStorage();
    },
    setTheme: setTheme,
    getProgram: getProgram,
    setProgram: setProgram,
    addBlock: addBlock,
    removeBlock: removeBlock,
    clearWorkspace: clearWorkspace,
    undo: undo,
    redo: redo,
    canUndo: canUndo,
    canRedo: canRedo,
    renderPalette: renderPalette,
    renderWorkspace: renderWorkspace,
    highlightBlock: highlightBlock,
    setBlockExecutionStatus: setBlockExecutionStatus,
    resetAllBlockStatuses: resetAllBlockStatuses
  };
})();
