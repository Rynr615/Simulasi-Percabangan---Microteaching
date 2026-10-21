/* ==========================================================================
   js/stage-kantin.js - Visualisasi Panggung Sistem Kasir Kantin Sekolah (F1)
   Antarmuka kasir digital: daftar belanja, cetak struk pembayaran dinamis,
   tiket kupon undian, dan diagnosis perbedaan hasil perhitungan.
   ========================================================================== */

window.App = window.App || {};

window.App.stageKantin = (function () {
  function formatRupiah(num) {
    const val = Number(num || 0);
    return "Rp" + val.toLocaleString("id-ID");
  }

  function render(containerId, state = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalBelanja = Number(state.total_belanja || 0);
    const potongan = Number(state.potongan || 0);
    const statusKupon = state.status_kupon || "Tidak dapat";
    const totalAkhir = Number(state.total_akhir !== undefined ? state.total_akhir : Math.max(0, totalBelanja - potongan));
    const hasCoupon = (statusKupon === "Dapat 1 kupon");
    const hasDiscount = (potongan > 0);

    // Bandingkan dengan nilai ekspektasi (jika dalam mode uji skenario)
    const expected = state.expected || null;
    const isMismatch = expected && (
      (expected.potongan !== undefined && expected.potongan !== potongan) ||
      (expected.status_kupon !== undefined && expected.status_kupon !== statusKupon) ||
      (expected.total_akhir !== undefined && expected.total_akhir !== totalAkhir)
    );

    const html = `
      <div class="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg text-slate-100 p-4 select-none">
        <!-- Header Mesin Kasir Digital SMA Negeri 1 Bandung -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <i data-lucide="store" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
                <span>POS Kantin Kejujuran Sekolah</span>
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </h4>
              <p class="text-xs text-slate-400">SMA Negeri 1 Bandung &bull; Kasir Digital Terpadu</p>
            </div>
          </div>
          <div class="text-right">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-blue-300 border border-slate-700">
              TRX-${state.scenarioId || '001'}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <!-- Kolom Kiri: Layar Input & Daftar Item Belanja (5 Kolom) -->
          <div class="md:col-span-5 bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Keranjang Belanja Siswa:</span>
                <i data-lucide="shopping-cart" class="w-4 h-4 text-slate-400"></i>
              </div>
              
              <!-- Simulasi Daftar Barang yang Dibeli Siswa -->
              <div class="space-y-1.5 text-xs text-slate-300 font-sans mb-3">
                <div class="flex justify-between py-1 border-b border-slate-700/50">
                  <span>Nasi Bento Komplit</span>
                  <span class="font-mono text-slate-200">Rp15.000</span>
                </div>
                ${totalBelanja >= 20000 ? `
                  <div class="flex justify-between py-1 border-b border-slate-700/50">
                    <span>Jus Jeruk Segar</span>
                    <span class="font-mono text-slate-200">Rp5.000</span>
                  </div>
                ` : ''}
                ${totalBelanja >= 30000 ? `
                  <div class="flex justify-between py-1 border-b border-slate-700/50">
                    <span>Paket Snack & Roti</span>
                    <span class="font-mono text-slate-200">Rp10.000</span>
                  </div>
                ` : ''}
                ${totalBelanja > 30000 ? `
                  <div class="flex justify-between py-1 border-b border-slate-700/50">
                    <span>Minuman Buah Tambahan</span>
                    <span class="font-mono text-slate-200">${formatRupiah(totalBelanja - 30000)}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Display Nilai Masukan Kasir -->
            <div class="bg-slate-900 rounded-lg p-2.5 border border-slate-700">
              <span class="block text-slate-400 text-[11px] font-sans">Variabel Masukan (total_belanja):</span>
              <div class="text-xl font-bold font-mono text-amber-400 tracking-wider">
                ${formatRupiah(totalBelanja)}
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Lembar Struk Kasir & Tiket Kupon (7 Kolom) -->
          <div class="md:col-span-7 flex flex-col items-center">
            <!-- Slot Printer Kasir -->
            <div class="w-full max-w-sm h-3 bg-slate-950 rounded-full border border-slate-700 mb-[-6px] z-10 shadow-inner"></div>

            <!-- Kertas Struk Tercetak Keluar -->
            <div class="w-full max-w-sm bg-white text-slate-900 rounded-lg shadow-xl p-4 font-mono text-xs receipt-enter border border-slate-300 relative">
              <div class="text-center pb-2 border-b-2 border-dashed border-slate-300">
                <h5 class="font-bold text-sm tracking-wide text-slate-800">STRUK KANTIN SEKOLAH</h5>
                <p class="text-[11px] text-slate-500">Kupon & Diskon Pelajar Aktif</p>
              </div>

              <!-- Rincian Biaya -->
              <div class="py-2.5 space-y-1.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-slate-600">Total Belanja:</span>
                  <span class="font-semibold">${formatRupiah(totalBelanja)}</span>
                </div>

                <!-- Baris Potongan Diskon -->
                <div class="flex justify-between items-center ${hasDiscount ? 'text-emerald-700 font-semibold' : 'text-slate-500'}">
                  <span class="flex items-center space-x-1">
                    <span>Diskon Pelajar:</span>
                    ${hasDiscount ? '<i data-lucide="badge-percent" class="inline w-3.5 h-3.5 text-emerald-600"></i>' : ''}
                  </span>
                  <span>- ${formatRupiah(potongan)}</span>
                </div>

                ${(expected && expected.potongan !== undefined && expected.potongan !== potongan) ? `
                  <div class="text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Seharusnya: ${formatRupiah(expected.potongan)}
                  </div>
                ` : ''}

                <!-- Garis Pembatas Akhir -->
                <div class="border-t border-dashed border-slate-300 my-1 pt-1.5 flex justify-between text-sm font-bold text-slate-900">
                  <span>TOTAL AKHIR:</span>
                  <span class="text-blue-700">${formatRupiah(totalAkhir)}</span>
                </div>
              </div>

              <!-- Tiket Kupon Undian Berhadiah -->
              <div class="pt-2 border-t-2 border-dashed border-slate-300">
                ${hasCoupon ? `
                  <div class="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 p-2.5 rounded-md shadow-sm coupon-badge flex items-center justify-between border border-amber-600">
                    <div class="flex items-center space-x-2">
                      <i data-lucide="ticket" class="w-5 h-5 text-amber-900"></i>
                      <div>
                        <div class="font-bold text-xs uppercase tracking-wider">Kupon Undian</div>
                        <div class="text-[10px] text-amber-900">Selamat! Belanja ≥ Rp30.000</div>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 bg-amber-900 text-amber-100 rounded text-[10px] font-bold">1 LEMBAR</span>
                  </div>
                ` : `
                  <div class="bg-slate-100 text-slate-400 p-2 rounded text-center text-[11px] border border-slate-200">
                    <i data-lucide="ticket" class="inline w-3.5 h-3.5 mr-1 text-slate-400"></i>
                    Belanja min. Rp30.000 untuk dapat kupon undian
                  </div>
                `}

                ${(expected && expected.status_kupon !== undefined && expected.status_kupon !== statusKupon) ? `
                  <div class="text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-1">
                    Status Kupon Seharusnya: "${expected.status_kupon}"
                  </div>
                ` : ''}
              </div>

              <!-- Stempel Footer Struk -->
              <div class="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200 mt-2">
                Terima kasih atas kejujuran Anda!
              </div>
            </div>
          </div>
        </div>

        <!-- Umpan Balik Diagnostik Cepat Logika -->
        ${isMismatch ? `
          <div class="mt-3 p-3 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-xs sm:text-sm flex items-start space-x-2.5">
            <i data-lucide="circle-x" class="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5"></i>
            <div>
              <strong class="text-rose-300 font-semibold block">Perhitungan Tidak Sesuai Syarat LKS:</strong>
              <p class="text-slate-300 mt-0.5">
                ${state.failureExplanation || 'Periksa kembali kondisi percabangan dan nilai penugasan variabel.'}
              </p>
            </div>
          </div>
        ` : (state.isTested ? `
          <div class="mt-3 p-2.5 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center space-x-2">
            <i data-lucide="circle-check" class="w-4 h-4 text-emerald-400 flex-shrink-0"></i>
            <span>Logika kasir untuk transaksi ini berjalan sempurna sesuai aturan promo kantin!</span>
          </div>
        ` : '')}
      </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  return {
    render: render
  };
})();
