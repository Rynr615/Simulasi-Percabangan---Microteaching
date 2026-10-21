/* ==========================================================================
   js/main.js - Bootstrap Aplikasi, Sinkronisasi Modul, & Keyboard Accessibility
   Titik awal eksekusi media pembelajaran, penataan fokus keyboard,
   dan inisialisasi awal seluruh modul di window.App.
   ========================================================================== */

window.App = window.App || {};

document.addEventListener("DOMContentLoaded", () => {
  try {
    // 1. Inisialisasi Sistem Blok & LocalStorage
    if (window.App.blocks) {
      window.App.blocks.init();
    }

    // 2. Inisialisasi Misi Pembelajaran
    if (window.App.missions) {
      window.App.missions.init();
    }

    // 3. Inisialisasi Antarmuka UI & Kontrol
    if (window.App.ui) {
      window.App.ui.init();
    }

    // 4. Inisialisasi Data Default Tema Pertama (Kereta Api)
    const initialTheme = "kereta";

    // Jika blok masih kosong pada awal buka, sediakan blok panduan awal (Acceptance Test 1)
    const currentBlocks = window.App.blocks.getProgram(initialTheme);
    if (!currentBlocks || currentBlocks.length === 0) {
      window.App.blocks.setProgram("kereta", [
        {
          id: "b_init_1",
          type: "IF_THEN",
          condition: { variable: "ada_kereta", operator: "==", value: "True" },
          thenActions: [{ targetVar: "status_sirine", value: "BUNYI" }]
        }
      ]);
    }

    // 5. Render Seluruh Komponen Awal
    window.App.blocks.setTheme(initialTheme);
    window.App.missions.renderMissionPanel();
    window.App.ui.renderStage({});

    // Pasang pintasan keyboard (Accessibility WCAG AA)
    wireKeyboardShortcuts();

    // Inisialisasi Seluruh Ikon Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }

    console.log("Media Pembelajaran Algoritma Percabangan SMA Fase E siap digunakan.");
  } catch (err) {
    console.error("Gagal memulai modul aplikasi:", err);
  }
});

// Penanganan Pintasan Keyboard (Tab, Enter, Esc, Space)
function wireKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // Tombol Escape: Tutup Modal yang Terbuka
    if (e.key === "Escape") {
      const modals = ["recapModal", "tutorialModal", "celebrationModal"];
      modals.forEach(mId => {
        const m = document.getElementById(mId);
        if (m && !m.classList.contains("hidden")) {
          m.classList.add("hidden");
        }
      });
    }

    // Pintasan Tombol Z dengan Ctrl/Cmd: Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        if (window.App.blocks && window.App.blocks.canRedo()) {
          e.preventDefault();
          window.App.blocks.redo();
          if (window.App.ui) window.App.ui.showToast("Redo: Aksi dikembalikan.");
        }
      } else {
        if (window.App.blocks && window.App.blocks.canUndo()) {
          e.preventDefault();
          window.App.blocks.undo();
          if (window.App.ui) window.App.ui.showToast("Undo: Aksi dibatalkan.");
        }
      }
    }
  });
}
