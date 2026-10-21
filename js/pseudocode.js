/* ==========================================================================
   js/pseudocode.js - Generator Pseudocode Real-Time & Sinkronisasi Blok
   Menghasilkan pseudocode baku tiga bagian (NAMA SISTEM, DEKLARASI, ALGORITMA)
   dengan penomoran baris, pewarnaan sintaks, salin clipboard, dan interaksi.
   ========================================================================== */

window.App = window.App || {};

window.App.pseudocode = (function () {
  let lineToBlockMap = []; // Memetakan nomor baris pseudocode ke blockId

  // Format nilai data untuk tampilan pseudocode
  function formatValue(val) {
    if (val === undefined || val === null || val === "") {
      return '<span class="text-rose-600 border border-rose-300 border-dashed rounded px-1 text-xs">&lt;nilai&gt;</span>';
    }
    if (typeof val === "boolean" || val === "True" || val === "False") {
      return `<span class="text-purple-600 font-bold">${val}</span>`;
    }
    if (typeof val === "number" || (!isNaN(val) && typeof val === "string" && val.trim() !== "")) {
      return `<span class="text-amber-600 font-bold">${val}</span>`;
    }
    return `<span class="text-emerald-600 font-medium">"${val}"</span>`;
  }

  // Format kondisi: contoh IF ada_kereta == True THEN
  function formatCondition(cond) {
    if (!cond || !cond.variable || !cond.operator || cond.value === undefined || cond.value === "") {
      return '<span class="text-rose-600 border border-rose-300 border-dashed rounded px-1.5 py-0.5 text-xs font-semibold">&lt;kondisi belum lengkap&gt;</span>';
    }
    const valDisplay = formatValue(cond.value);
    return `<span class="text-slate-800 font-medium">${cond.variable}</span> <span class="text-blue-500 font-bold">${cond.operator}</span> ${valDisplay}`;
  }

  // Format aksi penugasan: contoh status_palang ← "TURUN"
  function formatAction(act) {
    if (!act || !act.targetVar) {
      return '<span class="text-rose-600 border border-rose-300 border-dashed rounded px-1 text-xs">&lt;aksi belum lengkap&gt;</span>';
    }
    const valDisplay = formatValue(act.value);
    return `<span class="text-slate-800 font-medium">${act.targetVar}</span> <span class="text-slate-500 font-bold">←</span> ${valDisplay}`;
  }

  // Hasilkan baris-baris terstruktur dari program dan tema
  function generateLines(themeConfig, program) {
    const lines = [];
    lineToBlockMap = [];

    function addLine(rawText, htmlContent, blockId = null, indent = 0) {
      const lineNum = lines.length + 1;
      lines.push({
        lineNumber: lineNum,
        rawText: "  ".repeat(indent) + rawText,
        htmlContent: htmlContent,
        blockId: blockId,
        indent: indent
      });
      lineToBlockMap[lineNum] = blockId;
    }

    // Bagian 1: NAMA SISTEM
    addLine(
      `ALGORITMA ${themeConfig.systemName}`,
      `<span class="text-blue-700 font-bold">ALGORITMA</span> <span class="text-slate-900 font-bold">${themeConfig.systemName}</span>`,
      null,
      0
    );

    // Bagian 2: DEKLARASI
    addLine(
      "DEKLARASI",
      '<span class="text-blue-700 font-bold">DEKLARASI</span>',
      null,
      0
    );

    themeConfig.variables.forEach(v => {
      addLine(
        `  ${v.name} : ${v.type}`,
        `<span class="text-slate-700 font-medium">${v.name}</span> <span class="text-slate-400">:</span> <span class="text-indigo-600 italic font-mono">${v.type}</span>`,
        null,
        1
      );
    });

    // Bagian 3: ALGORITMA
    addLine(
      "ALGORITMA",
      '<span class="text-blue-700 font-bold">ALGORITMA</span>',
      null,
      0
    );

    if (!program || program.length === 0) {
      addLine(
        "  // Belum ada instruksi percabangan",
        '<span class="text-slate-400 italic">// Tarik atau tambahkan blok percabangan di workspace</span>',
        null,
        1
      );
    } else {
      program.forEach((block) => {
        if (block.type === "IF_THEN") {
          addLine(
            `  IF ${block.condition?.variable || "<kondisi>"} THEN`,
            `<span class="text-blue-600 font-bold">IF</span> ${formatCondition(block.condition)} <span class="text-blue-600 font-bold">THEN</span>`,
            block.id,
            1
          );

          if (!block.thenActions || block.thenActions.length === 0) {
            addLine(
              "    <aksi>",
              '<span class="text-rose-600 border border-rose-300 border-dashed rounded px-1.5 py-0.5 text-xs">&lt;aksi MAKA kosong&gt;</span>',
              block.id,
              2
            );
          } else {
            block.thenActions.forEach(act => {
              addLine(
                `    ${act.targetVar} ← ${act.value}`,
                formatAction(act),
                block.id,
                2
              );
            });
          }

          addLine(
            "  ENDIF",
            '<span class="text-blue-600 font-bold">ENDIF</span>',
            block.id,
            1
          );
        } else if (block.type === "IF_THEN_ELSE") {
          addLine(
            `  IF ${block.condition?.variable || "<kondisi>"} THEN`,
            `<span class="text-blue-600 font-bold">IF</span> ${formatCondition(block.condition)} <span class="text-blue-600 font-bold">THEN</span>`,
            block.id,
            1
          );

          if (!block.thenActions || block.thenActions.length === 0) {
            addLine(
              "    <aksi>",
              '<span class="text-rose-600 border border-rose-300 border-dashed rounded px-1.5 py-0.5 text-xs">&lt;aksi MAKA kosong&gt;</span>',
              block.id,
              2
            );
          } else {
            block.thenActions.forEach(act => {
              addLine(
                `    ${act.targetVar} ← ${act.value}`,
                formatAction(act),
                block.id,
                2
              );
            });
          }

          addLine(
            "  ELSE",
            '<span class="text-blue-600 font-bold">ELSE</span>',
            block.id,
            1
          );

          if (!block.elseActions || block.elseActions.length === 0) {
            addLine(
              "    <aksi>",
              '<span class="text-rose-600 border border-rose-300 border-dashed rounded px-1.5 py-0.5 text-xs">&lt;aksi SELAIN ITU kosong&gt;</span>',
              block.id,
              2
            );
          } else {
            block.elseActions.forEach(act => {
              addLine(
                `    ${act.targetVar} ← ${act.value}`,
                formatAction(act),
                block.id,
                2
              );
            });
          }

          addLine(
            "  ENDIF",
            '<span class="text-blue-600 font-bold">ENDIF</span>',
            block.id,
            1
          );
        }
      });
    }

    // Blok Terkunci Otomatis (misal pada tema kantin)
    if (themeConfig.lockedBlocks && themeConfig.lockedBlocks.length > 0) {
      themeConfig.lockedBlocks.forEach(locked => {
        addLine(
          `  ${locked.targetVar} ← ${locked.expression}`,
          `<span class="text-slate-600 font-medium">${locked.targetVar}</span> <span class="text-slate-400 font-bold">←</span> <span class="text-indigo-600 font-mono">${locked.expression}</span> <span class="text-xs text-slate-400 font-sans ml-1 bg-slate-100 px-1 py-0.5 rounded border border-slate-200"><i data-lucide="lock" class="inline w-3 h-3 text-slate-400 mr-0.5"></i>terkunci</span>`,
          locked.id,
          1
        );
      });
    }

    return lines;
  }

  // Render pseudocode ke elemen wadah HTML
  function render(containerId, themeKey, program, activeBlockId = null, lineHighlight = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const themeConfig = window.App.config.themes[themeKey];
    const lines = generateLines(themeConfig, program);

    let html = `
      <div class="relative bg-slate-900 text-slate-100 rounded-xl overflow-hidden font-mono text-xs sm:text-sm border border-slate-700 shadow-md">
        <!-- Bar Toolbar Atas Pseudocode -->
        <div class="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700 select-none">
          <div class="flex items-center space-x-2">
            <span class="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span class="ml-2 font-sans font-semibold text-xs text-slate-300">Format Pseudocode LKS</span>
          </div>
          <button id="btnCopyPseudocode" class="flex items-center space-x-1 px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition focus:ring-2 focus:ring-blue-500" title="Salin pseudocode ke clipboard">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span class="font-sans">Salin</span>
          </button>
        </div>

        <!-- Area Kode Baris demi Baris -->
        <div class="p-3 overflow-x-auto max-h-[460px] divide-y divide-transparent">
    `;

    lines.forEach((line) => {
      const isBlockActive = activeBlockId && line.blockId === activeBlockId;
      const isLineDirectlyHighlighted = lineHighlight && lineHighlight === line.lineNumber;
      const highlightClass = isLineDirectlyHighlighted
        ? "bg-amber-500/25 border-l-4 border-amber-400 pl-1"
        : (isBlockActive ? "bg-blue-900/35 border-l-4 border-blue-400 pl-1" : "hover:bg-slate-800/60 pl-2");

      const indentSpaces = "&nbsp;".repeat(line.indent * 4);

      html += `
        <div class="group flex items-start py-0.5 leading-relaxed cursor-pointer transition rounded ${highlightClass}" data-line="${line.lineNumber}" data-block-id="${line.blockId || ''}">
          <span class="w-7 text-right pr-3 text-slate-500 select-none font-mono text-xs opacity-70 group-hover:opacity-100">${line.lineNumber}</span>
          <span class="flex-1 whitespace-pre">${indentSpaces}${line.htmlContent}</span>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Pasang tombol salin
    const btnCopy = document.getElementById("btnCopyPseudocode");
    if (btnCopy) {
      btnCopy.addEventListener("click", () => {
        copyToClipboard(lines);
      });
    }

    // Pasang event klik sinkron dua arah (klik baris menyorot blok)
    container.querySelectorAll("[data-block-id]").forEach(el => {
      el.addEventListener("click", () => {
        const blkId = el.getAttribute("data-block-id");
        if (blkId && window.App.blocks) {
          window.App.blocks.highlightBlock(blkId);
        }
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Fungsi Salin Teks Murni ke Clipboard
  function copyToClipboard(lines) {
    const rawCode = lines.map(l => l.rawText).join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rawCode).then(() => {
        showToast("Pseudocode berhasil disalin ke clipboard!");
      }).catch(() => {
        fallbackCopyText(rawCode);
      });
    } else {
      fallbackCopyText(rawCode);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      showToast("Pseudocode berhasil disalin ke clipboard!");
    } catch (err) {
      showToast("Gagal menyalin teks.");
    }
    document.body.removeChild(textArea);
  }

  function showToast(message) {
    if (window.App.ui && window.App.ui.showToast) {
      window.App.ui.showToast(message);
    } else {
      alert(message);
    }
  }

  return {
    generateLines: generateLines,
    render: render
  };
})();
