/* ==========================================================================
   js/engine.js - Interpreter Logika Algoritma & Penguji Skenario Otomatis
   Fungsi murni untuk mengevaluasi blok percabangan, menghasilkan riwayat
   eksekusi (trace), serta memvalidasi kebenaran logika terhadap skenario.
   ========================================================================== */

window.App = window.App || {};

window.App.engine = (function () {
  // Nama variabel pada lembar Aktivitas 1/2 menggunakan camelCase,
  // sedangkan environment mesin kantin menggunakan snake_case.
  function normalizeVariableName(name) {
    return name === "statusKupon" ? "status_kupon" : name;
  }

  // 1. Evaluasi Ekspresi Kondisi
  function evaluateCondition(condition, env) {
    if (!condition || !condition.variable || !condition.operator) {
      return { result: false, exprString: "Kondisi belum lengkap", rawResult: false };
    }

    const varName = condition.variable;
    const actualVal = env[varName];
    const op = condition.operator;
    let targetVal = condition.value;

    // Normalisasi nilai target sesuai tipe data
    if (typeof actualVal === "boolean") {
      if (typeof targetVal === "string") {
        targetVal = targetVal.toLowerCase() === "true";
      } else {
        targetVal = Boolean(targetVal);
      }
    } else if (typeof actualVal === "number") {
      targetVal = Number(targetVal);
    }

    let isTrue = false;
    switch (op) {
      case "==":
        isTrue = (actualVal === targetVal);
        break;
      case "!=":
        isTrue = (actualVal !== targetVal);
        break;
      case ">":
        isTrue = (actualVal > targetVal);
        break;
      case "<":
        isTrue = (actualVal < targetVal);
        break;
      case ">=":
        isTrue = (actualVal >= targetVal);
        break;
      case "<=":
        isTrue = (actualVal <= targetVal);
        break;
      default:
        isTrue = false;
    }

    // Format string ekspresi bernilai: contoh "20000 >= 20000 -> True"
    const displayActual = (typeof actualVal === "boolean") ? (actualVal ? "True" : "False") : actualVal;
    const displayTarget = (typeof targetVal === "boolean") ? (targetVal ? "True" : "False") : targetVal;
    const resultText = isTrue ? "True" : "False";
    const exprString = `${displayActual} ${op} ${displayTarget} -> ${resultText}`;

    return {
      result: isTrue,
      exprString: exprString,
      rawActual: actualVal,
      rawTarget: targetVal,
      operator: op
    };
  }

  // 2. Validasi Struktur Program Siswa Sebelum Dijalankan
  function validateProgram(program, themeConfig) {
    const errors = [];

    if (!program || program.length === 0) {
      errors.push({
        blockId: null,
        message: "Area Algoritma masih kosong. Silakan seret atau pilih blok percabangan dari palet."
      });
      return { isValid: false, errors };
    }

    program.forEach((block, index) => {
      const blockNum = index + 1;
      if (!block.condition || !block.condition.variable || !block.condition.operator || block.condition.value === undefined || block.condition.value === "") {
        errors.push({
          blockId: block.id,
          message: `Blok #${blockNum} (JIKA): Bagian kondisi belum diisi lengkap.`
        });
      }

      if (!block.thenActions || block.thenActions.length === 0) {
        errors.push({
          blockId: block.id,
          message: `Blok #${blockNum} (JIKA): Cabang 'MAKA' masih kosong. Tempatkan minimal satu aksi.`
        });
      }

      if (block.type === "IF_THEN_ELSE") {
        if (!block.elseActions || block.elseActions.length === 0) {
          errors.push({
            blockId: block.id,
            message: `Blok #${blockNum} (JIKA-MAKA-SELAIN ITU): Cabang 'SELAIN ITU' masih kosong.`
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // 3. Inisialisasi Environment Sesuai Konfigurasi Variabel
  function createInitialEnvironment(themeConfig, initialInputs = {}, previousEnv = null) {
    const env = {};
    themeConfig.variables.forEach(v => {
      if (v.persistent && previousEnv && previousEnv[v.name] !== undefined) {
        env[v.name] = previousEnv[v.name];
      } else if (initialInputs[v.name] !== undefined) {
        env[v.name] = initialInputs[v.name];
      } else {
        env[v.name] = v.defaultValue;
      }
    });
    return env;
  }

  // 4. Eksekusi Satu Detak (Single Tick) Interpreter Murni
  function runTick(program, envInput, themeConfig) {
    const env = Object.assign({}, envInput);
    const trace = [];

    // Catat trace awal detak
    trace.push({
      type: "tick_start",
      envSnapshot: Object.assign({}, env),
      narrative: `Memulai pemrosesan dengan masukan: ${Object.entries(envInput).map(([k, v]) => `${k} = ${v}`).join(", ")}.`
    });

    // Jalankan setiap blok dalam program siswa
    for (const block of program) {
      if (block.type === "IF_THEN" || block.type === "IF_THEN_ELSE") {
        const evalRes = evaluateCondition(block.condition, env);
        trace.push({
          type: "eval",
          blockId: block.id,
          condExpr: evalRes.exprString,
          result: evalRes.result,
          variable: block.condition.variable,
          narrative: `Komputer memeriksa kondisi: ${evalRes.exprString}.`
        });

        if (evalRes.result) {
          // Masuk cabang THEN (MAKA)
          trace.push({
            type: "enter",
            blockId: block.id,
            branch: "then",
            narrative: "Kondisi bernilai True. Komputer menjalankan instruksi pada cabang MAKA."
          });

          if (block.thenActions) {
            for (const act of block.thenActions) {
              const targetVar = normalizeVariableName(act.targetVar);
              const oldVal = env[targetVar];
              env[targetVar] = act.value;
              trace.push({
                type: "action",
                blockId: block.id,
                branch: "then",
                targetVar: targetVar,
                oldValue: oldVal,
                newValue: act.value,
                narrative: `Menugaskan variabel ${act.targetVar} ← ${typeof act.value === 'string' ? `"${act.value}"` : act.value}.`
              });
            }
          }

          if (block.type === "IF_THEN_ELSE") {
            trace.push({
              type: "skip",
              blockId: block.id,
              branch: "else",
              narrative: "Cabang SELAIN ITU dilewati karena kondisi telah terpenuhi pada cabang MAKA."
            });
          }
        } else {
          // Kondisi False
          trace.push({
            type: "skip",
            blockId: block.id,
            branch: "then",
            narrative: "Kondisi bernilai False. Cabang MAKA diabaikan/dilewati."
          });

          if (block.type === "IF_THEN_ELSE") {
            trace.push({
              type: "enter",
              blockId: block.id,
              branch: "else",
              narrative: "Karena kondisi False, komputer beralih mengeksekusi instruksi pada cabang SELAIN ITU."
            });

            if (block.elseActions) {
              for (const act of block.elseActions) {
                const targetVar = normalizeVariableName(act.targetVar);
                const oldVal = env[targetVar];
                env[targetVar] = act.value;
                trace.push({
                  type: "action",
                  blockId: block.id,
                  branch: "else",
                  targetVar: targetVar,
                  oldValue: oldVal,
                  newValue: act.value,
                  narrative: `Menugaskan variabel ${act.targetVar} ← ${typeof act.value === 'string' ? `"${act.value}"` : act.value}.`
                });
              }
            }
          }
        }
      }
    }

    // Eksekusi blok terkunci otomatis (jika ada pada konfigurasi tema)
    if (themeConfig.lockedBlocks && themeConfig.lockedBlocks.length > 0) {
      themeConfig.lockedBlocks.forEach(locked => {
        if (locked.type === "ASSIGNMENT" && locked.targetVar === "total_akhir") {
          const oldTot = env.total_akhir;
          const bel = Number(env.total_belanja || 0);
          const pot = Number(env.potongan || 0);
          env.total_akhir = Math.max(0, bel - pot);
          trace.push({
            type: "action",
            blockId: locked.id,
            targetVar: "total_akhir",
            oldValue: oldTot,
            newValue: env.total_akhir,
            isLocked: true,
            narrative: `Sistem menghitung total_akhir: ${bel} - ${pot} = Rp${env.total_akhir.toLocaleString("id-ID")}.`
          });
        }
      });
    }

    return {
      newEnv: env,
      trace: trace
    };
  }

  // 5. Ekstraksi Evaluasi Kondisi untuk Kolom Tabel Pengujian
  function extractConditionCheck(program, targetVar, envInput) {
    if (!program || program.length === 0) return "-";
    for (const block of program) {
      let targetsVar = false;
      if (block.thenActions && block.thenActions.some(a => normalizeVariableName(a.targetVar) === normalizeVariableName(targetVar))) targetsVar = true;
      if (block.elseActions && block.elseActions.some(a => normalizeVariableName(a.targetVar) === normalizeVariableName(targetVar))) targetsVar = true;

      if (targetsVar && block.condition) {
        const res = evaluateCondition(block.condition, envInput);
        return res.result ? "True" : "False";
      }
    }
    return "-";
  }

  // 6. Penguji Seluruh Skenario Otomatis
  function runScenarioTest(themeKey, program, scenario) {
    const themeConfig = window.App.config.themes[themeKey];
    const validation = validateProgram(program, themeConfig);
    if (!validation.isValid) {
      return {
        passed: false,
        validationError: true,
        errors: validation.errors,
        tickResults: [],
        summary: "Program tidak valid atau belum lengkap."
      };
    }

    // Identifikasi variabel yang ditargetkan oleh program siswa (Prinsip Scaffolding Bertahap)
    const targetedVars = new Set();
    program.forEach(b => {
      if (b.thenActions) b.thenActions.forEach(a => targetedVars.add(normalizeVariableName(a.targetVar)));
      if (b.elseActions) b.elseActions.forEach(a => targetedVars.add(normalizeVariableName(a.targetVar)));
    });
    if (themeConfig.lockedBlocks) {
      themeConfig.lockedBlocks.forEach(l => {
        // Total akhir bergantung pada potongan. Jangan uji hasil kalkulasi
        // gabungan saat misi bertahap baru menguji kupon.
        if (l.targetVar !== "total_akhir" || targetedVars.has("potongan")) {
          targetedVars.add(l.targetVar);
        }
      });
    }

    let currentEnv = null;
    const tickResults = [];
    let allPassed = true;
    let failureReason = "";
    let failureExplanation = "";
    let stuckCarsCount = 0;
    let dangerWarning = false;

    // Menjalankan setiap detak (tick) berurutan
    scenario.ticks.forEach((tickInput, tickIdx) => {
      // Inisialisasi env untuk tick saat ini
      currentEnv = createInitialEnvironment(themeConfig, tickInput, currentEnv);
      const tickOutcome = runTick(program, currentEnv, themeConfig);
      currentEnv = tickOutcome.newEnv;

      const expected = scenario.expectedOutputs ? scenario.expectedOutputs[tickIdx] : null;
      let tickMatches = true;
      const discrepancies = {};

      if (expected) {
        Object.keys(expected).forEach(key => {
          if (key === "cek_diskon" || key === "cek_kupon") return;
          // Abaikan variabel yang belum ditargetkan pada misi bertahap saat ini
          if (!targetedVars.has(key)) return;

          if (currentEnv[key] !== expected[key]) {
            tickMatches = false;
            discrepancies[key] = {
              actual: currentEnv[key],
              expected: expected[key]
            };
          }
        });
      }

      if (!tickMatches) {
        allPassed = false;
      }

      // Deteksi Masalah Khusus Perlintasan Kereta (Acceptance Tests 1-3)
      if (themeKey === "kereta") {
        if (tickInput.ada_kereta && currentEnv.status_palang === "NAIK") {
          dangerWarning = true;
          if (!failureReason) {
            failureReason = "BAHAYA: Palang Terbuka saat Kereta Melintas!";
            failureExplanation = "Palang berada di posisi NAIK padahal sensor mendeteksi kereta. Hal ini berpotensi membahayakan kendaraan yang menyeberang.";
          }
        }
        if (!tickInput.ada_kereta && currentEnv.status_palang === "TURUN" && tickIdx >= 5) {
          stuckCarsCount += 1;
          if (!failureReason) {
            failureReason = "Palang tidak pernah naik";
            failureExplanation = "Kereta sudah selesai melintas namun palang tetap TURUN. Akibatnya kendaraan tertahan dan macet. Periksa apakah Anda lupa menambahkan cabang SELAIN ITU (Else) untuk menaikkan palang.";
          }
        }
      }

      // Deteksi Masalah Khusus Kantin (Acceptance Test 6: operator > bukan >=)
      if (themeKey === "kantin" && !tickMatches && !failureReason) {
        if (tickInput.total_belanja === 20000 && currentEnv.potongan === 0) {
          failureReason = "Syarat Batas Diskon Belum Tepat";
          failureExplanation = "Untuk belanja tepat Rp20.000, ekspresi 20000 > 20000 bernilai False sehingga diskon tidak diberikan. Gunakan operator '>=' (lebih besar atau sama dengan).";
        } else if (tickInput.total_belanja === 30000 && currentEnv.status_kupon === "Tidak dapat") {
          failureReason = "Syarat Batas Kupon Belum Tepat";
          failureExplanation = "Untuk belanja tepat Rp30.000, siswa berhak mendapatkan kupon undian. Periksa apakah kondisi Anda menggunakan '>=' 30000.";
        } else {
          failureReason = "Nilai Keluaran Tidak Sesuai Ketentuan";
          failureExplanation = "Periksa kembali nominal potongan atau kondisi percabangan yang dibuat.";
        }
      }

      // Ekstraksi nilai cek diskon / kupon untuk laporan tabel LKS
      const cekDiskon = extractConditionCheck(program, "potongan", tickInput);
      const cekKupon = extractConditionCheck(program, "status_kupon", tickInput);

      tickResults.push({
        tickIndex: tickIdx,
        input: tickInput,
        output: Object.assign({}, currentEnv),
        expected: expected,
        passed: tickMatches,
        discrepancies: discrepancies,
        trace: tickOutcome.trace,
        cekDiskon: cekDiskon,
        cekKupon: cekKupon
      });
    });

    return {
      passed: allPassed,
      validationError: false,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      tickResults: tickResults,
      finalEnv: currentEnv,
      failureReason: failureReason,
      failureExplanation: failureExplanation,
      stuckCarsCount: stuckCarsCount,
      dangerWarning: dangerWarning,
      summary: allPassed 
        ? "Seluruh kondisi dan aksi berjalan 100% tepat sesuai aturan!" 
        : (failureReason || "Terdapat hasil pengujian yang belum sesuai dengan kriteria yang diharapkan.")
    };
  }

  // 7. Pengujian Komprehensif Seluruh Skenario Tema Sekaligus
  function runAllScenarios(themeKey, program) {
    const themeConfig = window.App.config.themes[themeKey];
    const results = [];
    let overallPassed = true;

    for (const sc of themeConfig.scenarios) {
      const outcome = runScenarioTest(themeKey, program, sc);
      results.push(outcome);
      if (!outcome.passed) {
        overallPassed = false;
      }
    }

    return {
      overallPassed: overallPassed,
      scenarioResults: results
    };
  }

  return {
    evaluateCondition: evaluateCondition,
    validateProgram: validateProgram,
    createInitialEnvironment: createInitialEnvironment,
    runTick: runTick,
    extractConditionCheck: extractConditionCheck,
    runScenarioTest: runScenarioTest,
    runAllScenarios: runAllScenarios
  };
})();
