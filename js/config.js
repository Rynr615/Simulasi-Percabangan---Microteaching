/* ==========================================================================
   js/config.js - Konfigurasi Data Tema, Variabel, Skenario, dan Misi
   Semua materi dan parameter bersifat data-driven (dapat ditambah tema baru)
   ========================================================================== */

window.App = window.App || {};

window.App.config = {
  // Pengaturan Global Aplikasi
  appTitle: "Simulasi Percabangan Algoritma",
  subtitle: "Informatika Fase E (Kelas X SMA) - If-Then & If-Then-Else",
  maxBlocks: 4,

  // Konfigurasi Tema Utama
  themes: {
    kereta: {
      id: "kereta",
      name: "Perlintasan Kereta",
      icon: "train-front",
      systemName: "PalangKereta",
      description: "Kendali palang pintu perlintasan dan sirine peringatan dini.",
      variables: [
        {
          name: "ada_kereta",
          type: "boolean",
          isInput: true,
          defaultValue: false,
          persistent: false,
          description: "Sensor keberadaan kereta di dekat perlintasan (True / False)"
        },
        {
          name: "status_sirine",
          type: "string",
          isInput: false,
          defaultValue: "MATI",
          persistent: false, // Reset tiap tick (peringatan sesaat)
          options: ["MATI", "BUNYI"],
          description: "Status suara sirine peringatan"
        },
        {
          name: "status_palang",
          type: "string",
          isInput: false,
          defaultValue: "NAIK",
          persistent: true, // Persisten antar tick
          options: ["NAIK", "TURUN"],
          description: "Posisi fisik palang pintu jalan"
        }
      ],
      conditionOptions: {
        variables: ["ada_kereta"],
        operators: ["==", "!="],
        values: ["True", "False"]
      },
      availableActions: [
        { targetVar: "status_sirine", value: "BUNYI", label: 'status_sirine ← "BUNYI"' },
        { targetVar: "status_sirine", value: "MATI", label: 'status_sirine ← "MATI"' },
        { targetVar: "status_palang", value: "TURUN", label: 'status_palang ← "TURUN"' },
        { targetVar: "status_palang", value: "NAIK", label: 'status_palang ← "NAIK"' }
      ],
      lockedBlocks: [],
      scenarios: [
        {
          id: "S1",
          name: "S1: Tidak ada kereta",
          description: "Sensor tidak mendeteksi kereta di lintasan.",
          ticks: [
            { ada_kereta: false }
          ],
          expectedOutputs: [
            { status_sirine: "MATI", status_palang: "NAIK" }
          ]
        },
        {
          id: "S2",
          name: "S2: Ada kereta",
          description: "Kereta tiba di perlintasan.",
          ticks: [
            { ada_kereta: true }
          ],
          expectedOutputs: [
            { status_sirine: "BUNYI", status_palang: "TURUN" }
          ]
        },
        {
          id: "S3",
          name: "S3: Kereta lewat (Siklus Penuh)",
          description: "Kereta mendekat, melintas, lalu pergi meninggalkan perlintasan.",
          ticks: [
            { ada_kereta: false },
            { ada_kereta: false },
            { ada_kereta: true },
            { ada_kereta: true },
            { ada_kereta: true },
            { ada_kereta: false },
            { ada_kereta: false },
            { ada_kereta: false }
          ],
          expectedOutputs: [
            { status_sirine: "MATI", status_palang: "NAIK" },
            { status_sirine: "MATI", status_palang: "NAIK" },
            { status_sirine: "BUNYI", status_palang: "TURUN" },
            { status_sirine: "BUNYI", status_palang: "TURUN" },
            { status_sirine: "BUNYI", status_palang: "TURUN" },
            { status_sirine: "MATI", status_palang: "NAIK" },
            { status_sirine: "MATI", status_palang: "NAIK" },
            { status_sirine: "MATI", status_palang: "NAIK" }
          ]
        }
      ]
    },

    kantin: {
      id: "kantin",
      name: "Kantin Sekolah",
      icon: "store",
      systemName: "KantinSekolah",
      description: "Kasir digital promo diskon Rp2.000 dan undian kupon berhadiah.",
      variables: [
        {
          name: "total_belanja",
          type: "integer",
          isInput: true,
          defaultValue: 0,
          persistent: false,
          description: "Total harga transaksi yang diketik kasir (Rupiah)"
        },
        {
          name: "potongan",
          type: "integer",
          isInput: false,
          defaultValue: 0,
          persistent: false,
          description: "Besaran potongan harga diskon (Rupiah)"
        },
        {
          name: "status_kupon",
          type: "string",
          isInput: false,
          defaultValue: "Tidak dapat",
          persistent: false,
          options: ["Tidak dapat", "Dapat 1 kupon"],
          description: "Status pencetakan kupon undian belanja"
        },
        {
          name: "total_akhir",
          type: "integer",
          isInput: false,
          defaultValue: 0,
          persistent: false,
          description: "Jumlah pembayaran akhir yang harus dibayar siswa"
        }
      ],
      conditionOptions: {
        variables: ["total_belanja"],
        operators: [">=", ">", "<=", "<", "=="],
        values: [20000, 30000, 15000, 19500, 23500]
      },
      availableActions: [
        { targetVar: "potongan", value: 2000, label: "potongan ← 2000", isEditableNumber: true },
        { targetVar: "potongan", value: 0, label: "potongan ← 0" },
        { targetVar: "status_kupon", value: "Dapat 1 kupon", label: 'status_kupon ← "Dapat 1 kupon"' },
        { targetVar: "status_kupon", value: "Tidak dapat", label: 'status_kupon ← "Tidak dapat"' }
      ],
      lockedBlocks: [
        {
          id: "locked_kalkulasi_total",
          type: "ASSIGNMENT",
          targetVar: "total_akhir",
          expression: "total_belanja - potongan",
          label: "total_akhir ← total_belanja - potongan",
          locked: true,
          description: "Perhitungan otomatis pembayaran akhir kasir"
        }
      ],
      scenarios: [
        {
          id: "Skenario A",
          name: "Skenario A (Rp15.000)",
          description: "Transaksi di bawah syarat diskon dan di bawah syarat kupon.",
          ticks: [{ total_belanja: 15000 }],
          expectedOutputs: [{
            potongan: 0,
            status_kupon: "Tidak dapat",
            total_akhir: 15000,
            cek_diskon: "False",
            cek_kupon: "False"
          }]
        },
        {
          id: "Skenario B",
          name: "Skenario B (Rp20.000)",
          description: "Tepat di batas ambang diskon Rp20.000.",
          ticks: [{ total_belanja: 20000 }],
          expectedOutputs: [{
            potongan: 2000,
            status_kupon: "Tidak dapat",
            total_akhir: 18000,
            cek_diskon: "True",
            cek_kupon: "False"
          }]
        },
        {
          id: "Skenario C",
          name: "Skenario C (Rp23.500)",
          description: "Transaksi melebihi batas diskon namun belum mencapai kupon.",
          ticks: [{ total_belanja: 23500 }],
          expectedOutputs: [{
            potongan: 2000,
            status_kupon: "Tidak dapat",
            total_akhir: 21500,
            cek_diskon: "True",
            cek_kupon: "False"
          }]
        },
        {
          id: "Skenario D",
          name: "Skenario D (Rp19.500)",
          description: "Sedikit di bawah syarat diskon Rp20.000.",
          ticks: [{ total_belanja: 19500 }],
          expectedOutputs: [{
            potongan: 0,
            status_kupon: "Tidak dapat",
            total_akhir: 19500,
            cek_diskon: "False",
            cek_kupon: "False"
          }]
        },
        {
          id: "Skenario E",
          name: "Skenario E (Rp30.000)",
          description: "Tepat di batas syarat kupon undian Rp30.000 (mendapat diskon juga).",
          ticks: [{ total_belanja: 30000 }],
          expectedOutputs: [{
            potongan: 2000,
            status_kupon: "Dapat 1 kupon",
            total_akhir: 28000,
            cek_diskon: "True",
            cek_kupon: "True"
          }]
        },
        {
          id: "Skenario F",
          name: "Skenario F (Rp42.500)",
          description: "Transaksi bernilai tinggi, berhak diskon dan kupon undian.",
          ticks: [{ total_belanja: 42500 }],
          expectedOutputs: [{
            potongan: 2000,
            status_kupon: "Dapat 1 kupon",
            total_akhir: 40500,
            cek_diskon: "True",
            cek_kupon: "True"
          }]
        }
      ]
    }
  },

  // Daftar Misi Pembelajaran Bertahap (T1)
  missions: [
    {
      id: "M1",
      theme: "kereta",
      title: "Misi 1: Sirine Kereta Api (If-Then)",
      objective: "Buat sirine hanya berbunyi saat ada kereta melintas.",
      badge: "Dasar If-Then",
      targetBranchType: "IF_THEN",
      criteria: [
        "Gunakan struktur If-Then dengan kondisi ada_kereta == True",
        "Atur status_sirine ← 'BUNYI' pada cabang MAKA",
        "Lulus uji Skenario S1 dan S2"
      ],
      hints: [
        "Apakah sirine perlu aksi pengganti saat tidak ada kereta? (Perhatikan: status_sirine otomatis reset tiap saat).",
        "Gunakan blok 'JIKA ... MAKA' (If-Then) dengan kondisi ada_kereta == True.",
        "Solusi kerangka: JIKA ada_kereta == True MAKA status_sirine ← 'BUNYI' ENDIF."
      ]
    },
    {
      id: "M2",
      theme: "kereta",
      title: "Misi 2: Palang Pintu Otomatis (If-Then-Else)",
      objective: "Palang harus turun saat ada kereta dan kembali naik saat kereta pergi.",
      badge: "If-Then-Else",
      targetBranchType: "IF_THEN_ELSE",
      criteria: [
        "Gunakan struktur If-Then-Else",
        "Kondisi ada_kereta == True: palang TURUN di cabang MAKA, dan NAIK di cabang SELAIN ITU",
        "Lulus uji penuh Skenario S3 (Kereta Lewat)"
      ],
      hints: [
        "Karena posisi palang bersifat persisten, apa yang terjadi jika tidak ada perintah untuk menaikkannya kembali?",
        "Gunakan struktur 'JIKA ... MAKA ... SELAIN ITU' (If-Then-Else).",
        "Solusi kerangka: JIKA ada_kereta == True MAKA status_palang ← 'TURUN' SELAIN ITU status_palang ← 'NAIK' ENDIF."
      ]
    },
    {
      id: "M3",
      theme: "kereta",
      title: "Misi 3: Perbaiki Palang Macet (Investigasi Bug)",
      objective: "Temukan mengapa mobil menumpuk pada program yang ada dan perbaiki kodenya.",
      badge: "Penyelidikan Bug",
      initialBug: "kereta_missing_else",
      criteria: [
        "Pada blok palang, gunakan kondisi ada_kereta == True.",
        "Di cabang MAKA, atur status_palang menjadi TURUN.",
        "Tambahkan cabang SELAIN ITU dan atur status_palang menjadi NAIK.",
        "Uji Skenario S3: palang turun saat kereta datang, lalu naik setelah kereta lewat; tidak ada mobil yang tertahan."
      ],
      hints: [
        "Perhatikan simulasi: Mengapa mobil menumpuk saat kereta sudah lewat?",
        "Periksa apakah ada cabang 'SELAIN ITU' yang bertugas menaikkan palang kembali.",
        "Ubah blok menjadi If-Then-Else dengan cabang SELAIN ITU berisi status_palang ← 'NAIK'."
      ]
    },
    {
      id: "M4",
      theme: "kereta",
      title: "Misi 4: Pemilihan Struktur yang Tepat",
      objective: "Bedakan kapan harus memakai If-Then dan kapan If-Then-Else.",
      badge: "Analisis Logika",
      criteria: [
        "Gabungkan logika sirine (If-Then) dan palang pintu (If-Then-Else)",
        "Kedua sistem bekerja harmonis dalam 1 program",
        "Lulus seluruh skenario kereta S1, S2, dan S3"
      ],
      hints: [
        "Sirine cukup memakai If-Then karena bernilai peringatan sesaat.",
        "Palang pintu memerlukan If-Then-Else karena memiliki dua status fisik (TURUN dan NAIK).",
        "Susun 2 blok: Blok 1 untuk sirine, Blok 2 untuk palang pintu."
      ]
    },
    {
      id: "M5",
      theme: "kantin",
      title: "Misi 5: Kupon Hadiah Kantin (If-Then)",
      objective: "Cetak kupon hanya jika belanja mencapai Rp30.000 atau lebih.",
      badge: "Studi Kasus LKS",
      targetBranchType: "IF_THEN",
      criteria: [
        "Gunakan If-Then dengan syarat total_belanja >= 30000",
        "Beri aksi status_kupon ← 'Dapat 1 kupon' di cabang MAKA",
        "Lulus uji untuk Skenario E dan F"
      ],
      hints: [
        "Siswa yang belanja di bawah Rp30.000 tidak mendapat kupon, tanpa perlu aksi pengganti.",
        "Gunakan operator '>=' agar pembelian tepat Rp30.000 juga mendapatkan kupon.",
        "Solusi kerangka: JIKA total_belanja >= 30000 MAKA status_kupon ← 'Dapat 1 kupon' ENDIF."
      ]
    },
    {
      id: "M6",
      theme: "kantin",
      title: "Misi 6: Diskon Promo Pelajar (If-Then-Else)",
      objective: "Berikan diskon Rp2.000 jika belanja >= Rp20.000, selain itu potongan Rp0.",
      badge: "Diskon Kantin",
      criteria: [
        "Kondisi total_belanja >= 20000",
        "Cabang MAKA memberi potongan 2000",
        "Cabang SELAIN ITU memberi potongan 0 (atau terinisialisasi 0)",
        "Lulus uji Skenario A, B, C, D"
      ],
      hints: [
        "Periksa skenario B (Rp20.000). Apakah belanja tepat 20.000 berhak dapat diskon?",
        "Gunakan operator '>=' dan pastikan jika tidak memenuhi syarat potongan adalah 0.",
        "Solusi: JIKA total_belanja >= 20000 MAKA potongan ← 2000 SELAIN ITU potongan ← 0 ENDIF."
      ]
    },
    {
      id: "M7",
      theme: "kantin",
      title: "Misi 7: Kasir Digital Mandiri Lengkap",
      objective: "Integrasikan promo diskon dan kupon hadiah ke dalam satu sistem terpadu.",
      badge: "Sistem Terintegrasi",
      criteria: [
        "Menyusun logika diskon Rp20.000 dan kupon Rp30.000 secara bersamaan",
        "Perhitungan total_akhir otomatis terverifikasi",
        "Lulus 100% pada semua Skenario A hingga F di LKS"
      ],
      hints: [
        "Ada dua aturan independen: diskon belanja dan kupon undian.",
        "Gunakan dua blok percabangan berurutan di workspace.",
        "Blok 1 mengatur potongan (>= 20000), Blok 2 mengatur kupon (>= 30000)."
      ]
    }
  ],

  // Pustaka Program untuk Mode Guru (T5)
  teacherPresets: {
    solutions: {
      kereta: [
        {
          id: "sol_kereta_lengkap",
          title: "Solusi Lengkap Kereta (Sirine + Palang)",
          blocks: [
            {
              id: "b_sol_k1",
              type: "IF_THEN",
              condition: { variable: "ada_kereta", operator: "==", value: "True" },
              thenActions: [{ targetVar: "status_sirine", value: "BUNYI" }]
            },
            {
              id: "b_sol_k2",
              type: "IF_THEN_ELSE",
              condition: { variable: "ada_kereta", operator: "==", value: "True" },
              thenActions: [{ targetVar: "status_palang", value: "TURUN" }],
              elseActions: [{ targetVar: "status_palang", value: "NAIK" }]
            }
          ]
        }
      ],
      kantin: [
        {
          id: "sol_kantin_lengkap",
          title: "Solusi Lengkap Kantin (Diskon + Kupon)",
          blocks: [
            {
              id: "b_sol_c1",
              type: "IF_THEN_ELSE",
              condition: { variable: "total_belanja", operator: ">=", value: 20000 },
              thenActions: [{ targetVar: "potongan", value: 2000 }],
              elseActions: [{ targetVar: "potongan", value: 0 }]
            },
            {
              id: "b_sol_c2",
              type: "IF_THEN",
              condition: { variable: "total_belanja", operator: ">=", value: 30000 },
              thenActions: [{ targetVar: "status_kupon", value: "Dapat 1 kupon" }]
            }
          ]
        }
      ]
    },
    bugs: {
      kereta: [
        {
          id: "bug_k_missing_else",
          title: "Bug 1: Palang Tanpa Cabang ELSE",
          description: "Palang turun saat kereta ada, tapi tidak pernah naik lagi setelah kereta pergi.",
          blocks: [
            {
              id: "b_bug_k1",
              type: "IF_THEN",
              condition: { variable: "ada_kereta", operator: "==", value: "True" },
              thenActions: [{ targetVar: "status_palang", value: "TURUN" }]
            }
          ]
        },
        {
          id: "bug_k_inverted",
          title: "Bug 2: Logika Terbalik (Bahaya)",
          description: "Palang naik saat ada kereta dan turun saat sepi.",
          blocks: [
            {
              id: "b_bug_k2",
              type: "IF_THEN_ELSE",
              condition: { variable: "ada_kereta", operator: "==", value: "True" },
              thenActions: [{ targetVar: "status_palang", value: "NAIK" }],
              elseActions: [{ targetVar: "status_palang", value: "TURUN" }]
            }
          ]
        }
      ],
      kantin: [
        {
          id: "bug_c_wrong_operator",
          title: "Bug 1: Operator > bukan >=",
          description: "Pelanja Rp20.000 tidak mendapat diskon karena 20000 > 20000 bernilai False.",
          blocks: [
            {
              id: "b_bug_c1",
              type: "IF_THEN_ELSE",
              condition: { variable: "total_belanja", operator: ">", value: 20000 },
              thenActions: [{ targetVar: "potongan", value: 2000 }],
              elseActions: [{ targetVar: "potongan", value: 0 }]
            }
          ]
        },
        {
          id: "bug_c_inverted_branch",
          title: "Bug 2: Cabang MAKA dan SELAIN ITU Tertukar",
          description: "Belanja murah mendapat diskon, belanja mahal malah tidak dapat diskon.",
          blocks: [
            {
              id: "b_bug_c2",
              type: "IF_THEN_ELSE",
              condition: { variable: "total_belanja", operator: ">=", value: 20000 },
              thenActions: [{ targetVar: "potongan", value: 0 }],
              elseActions: [{ targetVar: "potongan", value: 2000 }]
            }
          ]
        }
      ]
    }
  },

  // Konfigurasi Khusus Halaman Latihan LKS Digital "Sistem Kantin Sekolah"
  lks: {
    // 1. Cek Pemahaman Interaktif (A1.1) - Urutan tampil: Q1 benar=D (posisi 4), Q2 benar=A (posisi 1), Q3 benar=B (posisi 2)
    understandingQuestions: [
      {
        id: "q1",
        question: "Mengapa sistem promo kupon undian cukup menggunakan struktur percabangan If-Then satu arah?",
        displayOrder: ["A", "B", "C", "D"],
        options: [
          { id: "A", text: "Karena kupon undian wajib diberikan kepada semua pembeli tanpa syarat belanja.", isCorrect: false },
          { id: "B", text: "Karena nilai variabel statusKupon harus diganti menjadi angka 0 secara paksa.", isCorrect: false },
          { id: "C", text: "Karena struktur If-Then lebih cepat diproses oleh komputer dibanding If-Then-Else.", isCorrect: false },
          { id: "D", text: "Karena jika belanja < Rp30.000 kasir tidak perlu melakukan aksi khusus.", isCorrect: true }
        ],
        explanation: "Tepat! Pada If-Then, aksi penugasan statusKupon hanya dijalankan jika syarat belanja >= 30000 terpenuhi (True). Jika False, program langsung lanjut tanpa memerlukan aksi alternatif (Else)."
      },
      {
        id: "q2",
        question: "Mengapa aturan diskon belanja kantin memerlukan struktur If-Then-Else dua arah?",
        displayOrder: ["A", "B", "C", "D"],
        options: [
          { id: "A", text: "Agar pembeli yang belanja di bawah Rp20.000 dipastikan potongannya Rp0", isCorrect: true },
          { id: "B", text: "Karena diskon hanya boleh dihitung jika kasir menekan tombol dua kali berturut-turut.", isCorrect: false },
          { id: "C", text: "Karena jika tidak menggunakan Else, program komputer akan mengalami error dan berhenti mendadak.", isCorrect: false },
          { id: "D", text: "Agar potongan otomatis dinaikkan menjadi Rp4.000 pada cabang alternatif.", isCorrect: false }
        ],
        explanation: "Tepat! Nilai potongan bersifat dinamis. Cabang Else (SELAIN ITU) wajib mengembalikan potongan ← 0 agar transaksi yang tidak berhak diskon tidak tertukar atau salah hitung."
      },
      {
        id: "q3",
        question: "Siswa berhak mendapat diskon Rp2.000 jika belanja 'minimal Rp20.000'. Manakah kondisi logika yang tepat?",
        displayOrder: ["A", "B", "C", "D"],
        options: [
          { id: "A", text: "totalBelanja > 20000", isCorrect: false },
          { id: "B", text: "totalBelanja >= 20000", isCorrect: true },
          { id: "C", text: "totalBelanja == 20000", isCorrect: false },
          { id: "D", text: "totalBelanja <= 20000", isCorrect: false }
        ],
        explanation: "Tepat! Kata 'minimal Rp20.000' berarti tepat Rp20.000 sudah berhak. Jika menggunakan '>', pembeli dengan belanja tepat Rp20.000 akan rugi karena bernilai False."
      }
    ],

    // 2. Bank Kartu untuk Tabel Analisis Masalah (A1.2 - A1.4)
    cardBank: [
      // Kategori: Kondisi Logika
      { id: "c_cond_diskon_correct", category: "condition", text: "totalBelanja >= 20000", label: "totalBelanja >= 20000", isDistractor: false, targetSlot: "slot_a1_diskon_cond" },
      { id: "c_cond_kupon_correct", category: "condition", text: "totalBelanja >= 30000", label: "totalBelanja >= 30000", isDistractor: false, targetSlot: "slot_a1_kupon_cond" },
      { id: "c_cond_diskon_wrong1", category: "condition", text: "totalBelanja > 20000", label: "totalBelanja > 20000", isDistractor: true, feedback: "Pengecoh: Operator '>' menyebabkan transaksi tepat Rp20.000 bernilai False sehingga tidak mendapat diskon!" },
      { id: "c_cond_kupon_wrong1", category: "condition", text: "totalBelanja > 30000", label: "totalBelanja > 30000", isDistractor: true, feedback: "Pengecoh: Operator '>' menyebabkan pembeli tepat Rp30.000 tidak mendapat kupon!" },
      { id: "c_cond_diskon_wrong2", category: "condition", text: "totalBelanja == 20000", label: "totalBelanja == 20000", isDistractor: true, feedback: "Pengecoh: Operator '==' hanya berlaku jika belanja persis Rp20.000. Belanja Rp25.000 justru tidak akan dapat diskon!" },

      // Kategori: Aksi Penugasan Variabel
      { id: "c_act_diskon_then", category: "action", text: "potongan ← 2000", label: "potongan ← 2000", isDistractor: false, targetSlot: "slot_a1_diskon_then" },
      { id: "c_act_diskon_else", category: "action", text: "potongan ← 0", label: "potongan ← 0", isDistractor: false, targetSlot: "slot_a1_diskon_else" },
      { id: "c_act_kupon_then", category: "action", text: 'statusKupon ← "Dapat 1 kupon"', label: 'statusKupon ← "Dapat 1 kupon"', isDistractor: false, targetSlot: "slot_a1_kupon_then" },
      { id: "c_act_kupon_else", category: "action", text: "(Tidak ada aksi)", label: "(Tidak ada aksi)", isDistractor: false, targetSlot: "slot_a1_kupon_else" },
      { id: "c_act_wrong_kupon", category: "action", text: 'statusKupon ← "Tidak dapat"', label: 'statusKupon ← "Tidak dapat"', isDistractor: true, feedback: "Pengecoh: Pada If-Then satu arah kupon, jika tidak memenuhi syarat maka tidak memerlukan aksi (dibiarkan sesuai nilai awal)." },
      { id: "c_act_wrong_nominal", category: "action", text: "potongan ← 20000", label: "potongan ← 20000", isDistractor: true, feedback: "Pengecoh: Potongan diskon adalah Rp2.000, bukan Rp20.000 (20.000 adalah batas syarat minimal belanja)!" },

      // Kategori: Jenis Struktur Percabangan
      { id: "c_struct_ifthen", category: "structure", text: "If-Then", label: "If-Then (1 Jalur)", isDistractor: false, targetSlot: "slot_a1_kupon_struct" },
      { id: "c_struct_ifthenelse", category: "structure", text: "If-Then-Else", label: "If-Then-Else (2 Jalur)", isDistractor: false, targetSlot: "slot_a1_diskon_struct" }
    ],

    // 3. Deklarasi Variabel (A2.1)
    declarations: [
      { name: "totalBelanja", expectedType: "integer", description: "Nominal total belanja sebelum diskon (Rupiah)", options: ["integer", "string", "boolean"] },
      { name: "potongan", expectedType: "integer", description: "Besar potongan harga diskon pelajar (Rupiah)", options: ["integer", "string", "boolean"] },
      { name: "statusKupon", expectedType: "string", description: "Keterangan penerimaan kupon undian kantin", options: ["string", "integer", "boolean"] },
      { name: "totalAkhir", expectedType: "integer", description: "Jumlah pembayaran bersih yang dibayar siswa", options: ["integer", "string", "boolean"] }
    ],

    // 4. Daftar Kriteria Penyelesaian LKS (A1.1 s/d A3.4)
    criteriaList: [
      {
        id: "A1.1",
        title: "Cek Pemahaman Logika Percabangan",
        activity: "Aktivitas 1",
        description: "Menjawab 3 pertanyaan pilihan ganda terkait karakteristik If-Then, If-Then-Else, dan operator perbandingan.",
        hints: {
          level1: "Ingat kembali perbedaan mendasar: If-Then hanya memiliki 1 cabang (Maka), sedangkan If-Then-Else memiliki 2 cabang (Maka dan Selain Itu).",
          level2: "Perhatikan kata 'minimal Rp20.000'. Apakah Rp20.000 sudah berhak dapat diskon? Gunakan operator yang menyertakan tanda sama dengan (>=).",
          level3: "Kunci Jawaban: Q1 = D (If-Then cukup 1 arah), Q2 = A (Else reset potongan ← 0), Q3 = B (totalBelanja >= 20000)."
        }
      },
      {
        id: "A1.2",
        title: "Analisis Logika Kupon Undian (Tabel 1)",
        activity: "Aktivitas 1",
        description: "Menyusun kondisi, aksi jika True, aksi jika False, dan jenis struktur pada Tabel 1 (Kupon Undian).",
        hints: {
          level1: "Kupon hanya dicetak jika belanja mencapai batas tertentu. Berapa batas belanja untuk mendapatkan kupon undian?",
          level2: "Kupon menggunakan struktur If-Then. Syaratnya: totalBelanja >= 30000, aksi jika True: statusKupon ← 'Dapat 1 kupon', aksi jika False: (Tidak ada aksi).",
          level3: "Kunci Tabel 1: Kondisi: totalBelanja >= 30000 | Aksi True: statusKupon ← 'Dapat 1 kupon' | Aksi False: (Tidak ada aksi) | Struktur: If-Then."
        }
      },
      {
        id: "A1.3",
        title: "Analisis Logika Diskon Pelajar (Tabel 2)",
        activity: "Aktivitas 1",
        description: "Menyusun kondisi, aksi cabang Maka, dan aksi cabang Selain Itu pada Tabel 2 (Diskon Pelajar).",
        hints: {
          level1: "Berapa syarat minimal belanja untuk berhak diskon? Apa nilai potongan jika belanja tidak mencapai syarat tersebut?",
          level2: "Diskon memerlukan dua cabang: jika belanja >= 20000 potongan 2000, jika tidak potongan 0. Jenisnya If-Then-Else.",
          level3: "Kunci Tabel 2: Kondisi: totalBelanja >= 20000 | Aksi True: potongan ← 2000 | Aksi False: potongan ← 0 | Struktur: If-Then-Else."
        }
      },
      {
        id: "A1.4",
        title: "Ketepatan Kartu & Penghindaran Pengecoh",
        activity: "Aktivitas 1",
        description: "Menyelesaikan seluruh slot analisis tanpa menggunakan kartu pengecoh (seperti operator > tanpa = atau nilai Rp20.000).",
        hints: {
          level1: "Hindari kartu bertanda '>' tanpa '=' karena akan menggugurkan pembeli dengan nominal pas tepat di batas ambang.",
          level2: "Pastikan kartu potongan bernilai 2000, bukan 20000 (20000 adalah batas minimal belanja, bukan jumlah diskon).",
          level3: "Pastikan seluruh slot di Tabel 1 dan Tabel 2 telah terkunci hijau."
        }
      },
      {
        id: "A2.1",
        title: "Nama Sistem & Deklarasi Tipe Data",
        activity: "Aktivitas 2",
        description: "Mengisi Nama Sistem 'KantinSekolah' serta memilih tipe data yang benar untuk keempat variabel di formulir deklarasi.",
        hints: {
          level1: "Nominal harga uang adalah bilangan bulat. Keterangan teks seperti status kupon adalah string.",
          level2: "totalBelanja, potongan, dan totalAkhir bertipe 'integer', sedangkan statusKupon bertipe 'string'.",
          level3: "Nama Sistem: KantinSekolah. Tipe data: totalBelanja (integer), potongan (integer), statusKupon (string), totalAkhir (integer)."
        }
      },
      {
        id: "A2.2",
        title: "Penyusunan Blok Percabangan Diskon",
        activity: "Aktivitas 2",
        description: "Menyusun blok If-Then-Else dengan kondisi total_belanja >= 20000, potongan ← 2000 di MAKA, dan potongan ← 0 di SELAIN ITU.",
        hints: {
          level1: "Gunakan blok 'JIKA-MAKA-SELAIN ITU' (If-Then-Else) dari palet blok.",
          level2: "Kondisi: total_belanja >= 20000. Cabang MAKA: potongan ← 2000. Cabang SELAIN ITU: potongan ← 0.",
          level3: "Solusi Blok Diskon: JIKA total_belanja >= 20000 MAKA potongan ← 2000 SELAIN ITU potongan ← 0 ENDIF."
        }
      },
      {
        id: "A2.3",
        title: "Penyusunan Blok Percabangan Kupon",
        activity: "Aktivitas 2",
        description: "Menyusun blok If-Then dengan kondisi total_belanja >= 30000 dan aksi status_kupon ← 'Dapat 1 kupon' di cabang MAKA.",
        hints: {
          level1: "Gunakan blok satu jalur 'JIKA ... MAKA' (If-Then) dari palet blok.",
          level2: "Kondisi: total_belanja >= 30000. Cabang MAKA: status_kupon ← 'Dapat 1 kupon'.",
          level3: "Solusi Blok Kupon: JIKA total_belanja >= 30000 MAKA status_kupon ← 'Dapat 1 kupon' ENDIF."
        }
      },
      {
        id: "A2.4",
        title: "Formula Perhitungan Total Akhir Terkunci",
        activity: "Aktivitas 2",
        description: "Memastikan formula total_akhir ← total_belanja - potongan terpasang di akhir algoritma.",
        hints: {
          level1: "Formula ini menghitung jumlah yang harus dibayar siswa setelah dipotong diskon.",
          level2: "Formula penutup ini telah disediakan secara permanen di akhir workspace agar hasil kasir selalu akurat.",
          level3: "Formula total_akhir ← total_belanja - potongan otomatis aktif di sistem."
        }
      },
      {
        id: "A3.1",
        title: "Prediksi Skenario Diskon (Skenario A - D)",
        activity: "Aktivitas 3",
        description: "Mengisi seluruh sel prediksi untuk Skenario A, B, C, dan D pada tabel pengujian sebelum eksekusi.",
        hints: {
          level1: "Periksa apakah nominal belanja mencapai Rp20.000 untuk menentukan apakah diskon bernilai True atau False.",
          level2: "A (15k): Diskon False, pot 0, kupon False, akhir 15000. B (20k): Diskon True, pot 2000, kupon False, akhir 18000.",
          level3: "C (23.5k): pot 2000, akhir 21500. D (19.5k): pot 0, akhir 19500."
        }
      },
      {
        id: "A3.2",
        title: "Prediksi Skenario Kupon (Skenario E - F)",
        activity: "Aktivitas 3",
        description: "Mengisi seluruh sel prediksi untuk Skenario E (Rp30.000) dan F (Rp42.500) pada tabel pengujian.",
        hints: {
          level1: "Belanja Rp30.000 ke atas berhak mendapatkan diskon Rp2.000 dan kupon undian sekaligus.",
          level2: "Pada Skenario E dan F, Cek Diskon = True, Cek Kupon = True, Potongan = 2000, Status Kupon = 'Dapat 1 kupon'.",
          level3: "E (30k): pot 2000, kupon 'Dapat 1 kupon', akhir 28000. F (42.5k): pot 2000, kupon 'Dapat 1 kupon', akhir 40500."
        }
      },
      {
        id: "A3.3",
        title: "Verifikasi Panggung Kasir Nilai Batas",
        activity: "Aktivitas 3",
        description: "Menjalankan pengujian dan mengamati cetak struk pembayaran serta kupon pada nilai batas kritis (Rp20.000 & Rp30.000).",
        hints: {
          level1: "Klik tombol 'Jalankan Pengujian' dan amati visual struk kasir pada Skenario B dan Skenario E.",
          level2: "Pastikan baris diskon tercetak pada Skenario B, dan kupon undian berwarna emas tercetak pada Skenario E.",
          level3: "Jika kondisi menggunakan '>=', kedua skenario batas ini akan diverifikasi berhasil."
        }
      },
      {
        id: "A3.4",
        title: "Kelulusan Penuh 100% Seluruh Skenario (A - F)",
        activity: "Aktivitas 3",
        description: "Mencapai hasil uji algoritma 100% lulus untuk seluruh Skenario A sampai F tanpa ada perbedaan perhitungan.",
        hints: {
          level1: "Jika terdapat baris bersilang merah, periksa kembali blok percabangan pada Aktivitas 2.",
          level2: "Pastikan urutan blok: Blok 1 Diskon (If-Then-Else), Blok 2 Kupon (If-Then), diikuti perhitungan total akhir.",
          level3: "Selamat! Semua skenario berhasil dilewati dengan hasil yang benar sesuai ketentuan LKS."
        }
      }
    ]
  }
};
