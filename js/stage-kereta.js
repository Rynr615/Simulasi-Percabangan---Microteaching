/* ==========================================================================
   js/stage-kereta.js - Visualisasi Panggung Perlintasan Kereta Api (F1)
   SVG Inline interaktif dengan animasi kereta melintas, pergerakan halus
   palang pintu, lampu sirine berkedip, antrean mobil, serta deteksi bahaya.
   ========================================================================== */

window.App = window.App || {};

window.App.stageKereta = (function () {
  let stuckCarsCount = 0;

  // Render SVG Panggung Perlintasan Kereta Api
  function render(containerId, state = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const adaKereta = Boolean(state.ada_kereta);
    const statusSirine = state.status_sirine || "MATI";
    const statusPalang = state.status_palang || "NAIK";
    const isBarrierDown = (statusPalang === "TURUN");
    const isSirenOn = (statusSirine === "BUNYI");

    // Deteksi bahaya (palang terbuka saat ada kereta)
    const isDanger = adaKereta && !isBarrierDown;

    // Deteksi macet (kereta sudah tidak ada tapi palang tetap tertutup)
    const isStuck = !adaKereta && isBarrierDown && (state.isFinishedOrStuck || state.stuckCount > 0);
    if (isStuck && state.tickIndex >= 5) {
      stuckCarsCount = (state.stuckCount !== undefined) ? state.stuckCount : Math.min(stuckCarsCount + 1, 5);
    } else if (!isBarrierDown) {
      stuckCarsCount = 0;
    }

    const html = `
      <div class="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg select-none">
        <!-- SVG Panggung Perlintasan (Viewbox 800 x 440) -->
        <svg viewBox="0 0 800 440" class="w-full h-auto block" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Pola Aspal Jalan -->
            <pattern id="roadPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#334155" />
            </pattern>
            <!-- Garis Putus-Putus Tengah Jalan -->
            <pattern id="roadStripes" width="60" height="10" patternUnits="userSpaceOnUse">
              <rect x="0" y="3" width="30" height="4" fill="#F8FAFC" opacity="0.8" />
            </pattern>
            <!-- Bantalan Rel Kereta -->
            <pattern id="railTies" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="4" width="20" height="6" fill="#78350F" opacity="0.9" rx="1" />
            </pattern>
            <!-- Garis Belang Palang Merah Putih -->
            <pattern id="barrierStripes" width="24" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="#DC2626" />
              <rect x="12" width="12" height="12" fill="#FFFFFF" />
            </pattern>
            <!-- Efek Kilau Lampu Merah -->
            <radialGradient id="glowRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#EF4444" stop-opacity="1" />
              <stop offset="60%" stop-color="#DC2626" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#991B1B" stop-opacity="0" />
            </radialGradient>
          </defs>

          <!-- Latar Rumput / Lingkungan Sekitar -->
          <rect width="800" height="440" fill="#14532D" opacity="0.85" />
          
          <!-- Halaman dan Pepohonan Dekoratif -->
          <g opacity="0.7">
            <circle cx="90" cy="80" r="36" fill="#166534" />
            <circle cx="700" cy="90" r="42" fill="#166534" />
            <circle cx="120" cy="370" r="38" fill="#166534" />
            <circle cx="680" cy="360" r="35" fill="#166534" />
          </g>

          <!-- Jalan Raya Aspal Horizontal (Y: 160 -> 280, Lebar: 120px) -->
          <rect x="0" y="160" width="800" height="120" fill="url(#roadPattern)" />
          <rect x="0" y="218" width="800" height="4" fill="url(#roadStripes)" />
          
          <!-- Garis Batas Bahu Jalan Putih -->
          <line x1="0" y1="162" x2="800" y2="162" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="12 6" opacity="0.5" />
          <line x1="0" y1="278" x2="800" y2="278" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="12 6" opacity="0.5" />

          <!-- Bantalan Kereta Api Vertikal (X: 360 -> 440, Lebar: 80px) -->
          <rect x="360" y="0" width="80" height="440" fill="#475569" />
          <rect x="360" y="0" width="80" height="440" fill="url(#railTies)" />
          
          <!-- Dua Batang Besi Rel Kereta Vertikal -->
          <line x1="380" y1="0" x2="380" y2="440" stroke="#CBD5E1" stroke-width="5" />
          <line x1="420" y1="0" x2="420" y2="440" stroke="#CBD5E1" stroke-width="5" />
          <line x1="380" y1="0" x2="380" y2="440" stroke="#94A3B8" stroke-width="2" />
          <line x1="420" y1="0" x2="420" y2="440" stroke="#94A3B8" stroke-width="2" />

          <!-- Kereta Api (Muncul & Bergerak jika ada_kereta == True) -->
          ${adaKereta ? `
            <g class="transition-all duration-700 ease-in-out" transform="translate(370, 110)">
              <!-- Gerbong Kereta Utama -->
              <rect x="0" y="0" width="60" height="220" rx="14" fill="#0284C7" stroke="#0369A1" stroke-width="3" />
              <!-- Atap Lokomotif -->
              <rect x="6" y="8" width="48" height="36" rx="6" fill="#0F172A" opacity="0.8" />
              <rect x="10" y="14" width="40" height="14" rx="3" fill="#38BDF8" opacity="0.9" />
              <!-- Kaca Depan Kereta -->
              <circle cx="20" cy="18" r="4" fill="#FEF08A" />
              <circle cx="40" cy="18" r="4" fill="#FEF08A" />
              <!-- Kaca-Kaca Jendela Samping -->
              <rect x="8" y="60" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="34" y="60" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="8" y="100" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="34" y="100" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="8" y="140" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="34" y="140" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="8" y="180" width="18" height="24" rx="3" fill="#E0F2FE" />
              <rect x="34" y="180" width="18" height="24" rx="3" fill="#E0F2FE" />
            </g>
          ` : `
            <!-- Rel Kosong / Lampu Sensor Hijau Tipis -->
            <rect x="375" y="170" width="50" height="100" fill="#10B981" opacity="0.08" rx="4" />
          `}

          <!-- Garis Kuning Kotak Aman Penyeberangan (Yellow Box) -->
          <rect x="340" y="160" width="120" height="120" fill="none" stroke="#FBBF24" stroke-width="2" stroke-dasharray="6 4" opacity="0.6" />

          <!-- Mobil-Mobil di Jalan (Antrean Sisi Kiri & Kanan) -->
          <!-- Mobil Sisi Kiri (Arah ke Kanan) -->
          <g transform="translate(${isBarrierDown ? (210 - stuckCarsCount * 8) : 180}, 228)">
            <!-- Mobil 1 Depan (Biru) -->
            <rect x="0" y="0" width="65" height="34" rx="6" fill="#3B82F6" stroke="#1D4ED8" stroke-width="2" />
            <rect x="14" y="5" width="26" height="24" rx="3" fill="#DBEAFE" />
            <circle cx="58" cy="8" r="3" fill="#FEF08A" />
            <circle cx="58" cy="26" r="3" fill="#FEF08A" />
          </g>

          <!-- Antrean Mobil Tambahan jika Palang Tertutup Lama (Macet) -->
          ${(isBarrierDown || stuckCarsCount > 0) ? `
            <g transform="translate(130, 228)" class="${stuckCarsCount > 1 ? 'car-shaking' : ''}">
              <!-- Mobil 2 (Merah) -->
              <rect x="0" y="0" width="60" height="34" rx="6" fill="#EF4444" stroke="#B91C1C" stroke-width="2" />
              <rect x="12" y="5" width="24" height="24" rx="3" fill="#FEE2E2" />
            </g>
            ${stuckCarsCount >= 2 ? `
              <g transform="translate(55, 228)" class="car-shaking">
                <!-- Mobil 3 (Kuning) -->
                <rect x="0" y="0" width="60" height="34" rx="6" fill="#F59E0B" stroke="#B45309" stroke-width="2" />
                <rect x="12" y="5" width="24" height="24" rx="3" fill="#FEF3C7" />
              </g>
            ` : ''}
          ` : `
            <!-- Mobil Lancar Melintas jika Palang Terbuka -->
            <g transform="translate(540, 228)">
              <rect x="0" y="0" width="60" height="34" rx="6" fill="#10B981" stroke="#047857" stroke-width="2" />
              <rect x="12" y="5" width="24" height="24" rx="3" fill="#D1FAE5" />
            </g>
          `}

          <!-- Mobil Sisi Kanan (Arah ke Kiri) -->
          <g transform="translate(${isBarrierDown ? 485 : 560}, 176)">
            <rect x="0" y="0" width="65" height="34" rx="6" fill="#8B5CF6" stroke="#6D28D9" stroke-width="2" />
            <rect x="25" y="5" width="26" height="24" rx="3" fill="#EDE9FE" />
            <circle cx="6" cy="8" r="3" fill="#FEF08A" />
            <circle cx="6" cy="26" r="3" fill="#FEF08A" />
          </g>

          <!-- Tiang Palang & Lampu Sirine Sisi Barat (Kiri Rel) -->
          <g transform="translate(325, 280)">
            <!-- Pondasi Tiang -->
            <rect x="-10" y="-8" width="24" height="20" fill="#334155" rx="3" />
            <!-- Tiang Besi -->
            <rect x="-4" y="-70" width="8" height="70" fill="#94A3B8" />

            <!-- Rumah Sirine & Lampu Merah Kembar -->
            <rect x="-24" y="-95" width="48" height="26" rx="5" fill="#0F172A" stroke="#475569" stroke-width="2" />
            <circle cx="-12" cy="-82" r="7" fill="${isSirenOn ? '#EF4444' : '#7F1D1D'}" class="${isSirenOn ? 'siren-active' : ''}" />
            <circle cx="12" cy="-82" r="7" fill="${isSirenOn ? '#EF4444' : '#7F1D1D'}" class="${isSirenOn ? 'siren-active' : ''}" />
            
            ${isSirenOn ? `
              <!-- Efek Pancaran Cahaya Sirine -->
              <circle cx="-12" cy="-82" r="18" fill="url(#glowRed)" />
              <circle cx="12" cy="-82" r="18" fill="url(#glowRed)" />
            ` : ''}

            <!-- Lengan Palang Pintu Barat (Panjang 110px) -->
            <g class="barrier-arm ${isBarrierDown ? 'barrier-down' : 'barrier-up'}" transform="translate(0, -30)">
              <!-- Poros Engsel -->
              <circle cx="0" cy="0" r="9" fill="#1E293B" stroke="#F8FAFC" stroke-width="2" />
              <!-- Bilah Palang Garis Merah-Putih -->
              <rect x="-100" y="-6" width="100" height="12" fill="url(#barrierStripes)" stroke="#0F172A" stroke-width="1.5" rx="2" />
              <!-- Lampu Ujung Palang -->
              <circle cx="-95" cy="0" r="4" fill="${isBarrierDown ? '#EF4444' : '#94A3B8'}" />
            </g>
          </g>

          <!-- Tiang Palang Sisi Timur (Kanan Rel) -->
          <g transform="translate(475, 160)">
            <rect x="-14" y="-12" width="24" height="20" fill="#334155" rx="3" />
            <rect x="-4" y="0" width="8" height="70" fill="#94A3B8" />

            <!-- Rumah Sirine Timur -->
            <rect x="-24" y="65" width="48" height="26" rx="5" fill="#0F172A" stroke="#475569" stroke-width="2" />
            <circle cx="-12" cy="78" r="7" fill="${isSirenOn ? '#EF4444' : '#7F1D1D'}" class="${isSirenOn ? 'siren-active' : ''}" />
            <circle cx="12" cy="78" r="7" fill="${isSirenOn ? '#EF4444' : '#7F1D1D'}" class="${isSirenOn ? 'siren-active' : ''}" />
            ${isSirenOn ? `
              <circle cx="-12" cy="78" r="18" fill="url(#glowRed)" />
              <circle cx="12" cy="78" r="18" fill="url(#glowRed)" />
            ` : ''}

            <!-- Lengan Palang Pintu Timur -->
            <g class="barrier-arm ${isBarrierDown ? 'barrier-down' : 'barrier-up'}" transform="translate(0, 30)">
              <circle cx="0" cy="0" r="9" fill="#1E293B" stroke="#F8FAFC" stroke-width="2" />
              <rect x="0" y="-6" width="100" height="12" fill="url(#barrierStripes)" stroke="#0F172A" stroke-width="1.5" rx="2" />
              <circle cx="95" cy="0" r="4" fill="${isBarrierDown ? '#EF4444' : '#94A3B8'}" />
            </g>
          </g>

          <!-- Label Indikator Visual Langsung pada Kanvas -->
          <g transform="translate(16, 26)">
            <rect width="210" height="66" rx="8" fill="#0F172A" opacity="0.85" stroke="#334155" />
            <text x="14" y="24" fill="#94A3B8" font-size="12" font-family="Space Grotesk">Sensor (ada_kereta):</text>
            <text x="146" y="24" fill="${adaKereta ? '#EF4444' : '#10B981'}" font-weight="bold" font-size="13" font-family="JetBrains Mono">${adaKereta ? 'True' : 'False'}</text>
            <text x="14" y="48" fill="#94A3B8" font-size="12" font-family="Space Grotesk">Palang: <tspan fill="${isBarrierDown ? '#F59E0B' : '#10B981'}" font-weight="bold" font-family="JetBrains Mono">${statusPalang}</tspan></text>
            <text x="120" y="48" fill="#94A3B8" font-size="12" font-family="Space Grotesk">Sirine: <tspan fill="${isSirenOn ? '#EF4444' : '#64748B'}" font-weight="bold" font-family="JetBrains Mono">${statusSirine}</tspan></text>
          </g>
        </svg>

        <!-- Overlay Bahaya: Palang NAIK saat Kereta Lewat (Acceptance Test 3) -->
        ${isDanger ? `
          <div class="absolute inset-0 bg-rose-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center z-30 transition-all">
            <div class="max-w-md bg-rose-900 border-2 border-rose-500 rounded-2xl p-5 shadow-2xl text-white">
              <div class="w-14 h-14 bg-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-rose-400/50">
                <i data-lucide="triangle-alert" class="w-8 h-8 text-amber-200"></i>
              </div>
              <h4 class="text-lg font-bold tracking-tight text-white mb-1">PERINGATAN BAHAYA PERLINTASAN!</h4>
              <p class="text-xs sm:text-sm text-rose-100 mb-3">
                Sensor mendeteksi <strong>ada_kereta == True</strong>, tetapi status palang tetap <strong>NAIK</strong>! Kendaraan berisiko masuk ke lintasan kereta.
              </p>
              <div class="bg-rose-950/70 rounded-xl p-3 text-xs text-rose-200 text-left border border-rose-800">
                <strong class="text-amber-300 block mb-1">Pemeriksaan Logika:</strong>
                Apakah cabang pada blok percabangan Anda tertukar atau lupa menurunkan palang saat kondisi bernilai True?
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Panel Peringatan Mobil Menumpuk / Palang Macet (Acceptance Test 2) -->
        ${(stuckCarsCount > 0 && !adaKereta) ? `
          <div class="p-3 bg-amber-950/90 border-t border-amber-600/70 text-amber-200 flex items-start space-x-3 text-xs sm:text-sm">
            <div class="p-2 bg-amber-500/20 rounded-lg text-amber-400 flex-shrink-0">
              <i data-lucide="car" class="w-5 h-5"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <strong class="text-amber-300 font-semibold">Ada Masalah: Palang Tidak Pernah Naik!</strong>
                <span class="px-2 py-0.5 bg-amber-900 text-amber-200 rounded-full text-xs font-mono font-bold">${stuckCarsCount} mobil tertahan</span>
              </div>
              <p class="text-slate-300 mt-1">
                Kereta sudah selesai melintas, namun palang pintu tetap berstatus TURUN. Bagaimana jika kondisinya tidak terpenuhi? Periksa cabang <strong>SELAIN ITU (Else)</strong> untuk menaikkan palang kembali.
              </p>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function resetState() {
    stuckCarsCount = 0;
  }

  return {
    render: render,
    resetState: resetState
  };
})();
