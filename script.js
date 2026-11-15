/* =========================================================
   Диёр — личный план похудения
   Калькулятор, программа тренировок, таймер, дневник веса.
   ========================================================= */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var nf = function (n, d) {
    return Number(n).toLocaleString("ru-RU", {
      minimumFractionDigits: d || 0,
      maximumFractionDigits: d || 0
    });
  };

  /* ---------- Мобильное меню ---------- */
  var burger = $("#burger");
  var nav = $("#nav");

  function closeMenu() {
    if (!nav || !burger) return;
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeMenu();
    });
  }

  /* ---------- Тень шапки ---------- */
  var header = $(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 6);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Год ---------- */
  var year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* =========================================================
     Калькулятор
     ========================================================= */
  var calcForm = $("#calcForm");
  var results = $("#results");
  var resultsGrid = $("#resultsGrid");
  var resultsSummary = $("#resultsSummary");
  var resultsNote = $("#resultsNote");
  var calcError = $("#calcError");
  var calcKey = "diyora-calc-v1";

  var ACTIVITY_LABELS = {
    "1.2": "сидячий образ жизни",
    "1.375": "лёгкая активность",
    "1.55": "средняя активность",
    "1.725": "высокая активность"
  };

  function bmiCategory(bmi) {
    if (bmi < 18.5) return { name: "недостаточный вес", key: "low" };
    if (bmi < 25) return { name: "норма", key: "normal" };
    if (bmi < 30) return { name: "избыточный вес", key: "high" };
    return { name: "ожирение", key: "obese" };
  }

  function levelForBmi(bmi) {
    if (bmi >= 30) return "easy";
    if (bmi >= 25) return "medium";
    return "active";
  }

  function readCalcInputs() {
    var gender = calcForm.querySelector('input[name="gender"]:checked').value;
    return {
      gender: gender,
      age: parseFloat($("#age").value),
      height: parseFloat($("#height").value),
      weight: parseFloat($("#weight").value),
      activity: parseFloat($("#activity").value),
      pace: parseFloat($("#pace").value)
    };
  }

  function validateCalc(v) {
    var problems = [];

    if (!v.age && v.age !== 0) problems.push(["#age", "Укажи возраст"]);
    else if (v.age < 14 || v.age > 90) problems.push(["#age", "Возраст — от 14 до 90 лет"]);

    if (!v.height && v.height !== 0) problems.push(["#height", "Укажи рост"]);
    else if (v.height < 120 || v.height > 220) problems.push(["#height", "Рост — от 120 до 220 см"]);

    if (!v.weight && v.weight !== 0) problems.push(["#weight", "Укажи вес"]);
    else if (v.weight < 30 || v.weight > 250) problems.push(["#weight", "Вес — от 30 до 250 кг"]);

    $$("#calcForm input").forEach(function (input) { input.classList.remove("invalid"); });

    if (problems.length) {
      problems.forEach(function (p) { $(p[0]).classList.add("invalid"); });
      calcError.textContent = problems[0][1];
      return false;
    }

    calcError.textContent = "";
    return true;
  }

  function saveCalc(v) {
    try {
      localStorage.setItem(calcKey, JSON.stringify(v));
    } catch (err) { /* приватный режим */ }
  }

  function restoreCalc() {
    var raw;
    try { raw = localStorage.getItem(calcKey); } catch (err) { return; }
    if (!raw) return;

    try {
      var v = JSON.parse(raw);
      if (!v || !v.weight) return;

      var radio = calcForm.querySelector('input[name="gender"][value="' + (v.gender === "m" ? "m" : "f") + '"]');
      if (radio) radio.checked = true;
      if (v.age) $("#age").value = v.age;
      if (v.height) $("#height").value = v.height;
      if (v.weight) $("#weight").value = v.weight;
      if (v.activity) $("#activity").value = String(v.activity);
      if (v.pace) $("#pace").value = String(v.pace);
    } catch (err) { /* игнорируем битые данные */ }
  }

  function compute(v) {
    var m2 = Math.pow(v.height / 100, 2);
    var bmi = v.weight / m2;
    var cat = bmiCategory(bmi);

    var bmr = 10 * v.weight + 6.25 * v.height - 5 * v.age + (v.gender === "m" ? 5 : -161);
    var tdee = bmr * v.activity;

    var minCal = v.gender === "m" ? 1500 : 1200;
    var rawTarget = tdee * (1 - v.pace);
    var floored = rawTarget < minCal;
    var target = Math.round(Math.max(rawTarget, minCal) / 10) * 10;
    var deficit = Math.max(0, Math.round(tdee - target));

    var weeklyLoss = (deficit * 7) / 7700;

    var protein = Math.round(v.weight * 1.6);
    var fat = Math.round(v.weight * 0.9);
    var carbs = Math.round((target - protein * 4 - fat * 9) / 4);
    if (carbs < 60) {
      carbs = 60;
      fat = Math.max(30, Math.round((target - protein * 4 - carbs * 4) / 9));
    }

    return {
      bmi: bmi,
      category: cat,
      normalMin: 18.5 * m2,
      normalMax: 24.9 * m2,
      bmr: bmr,
      tdee: tdee,
      target: target,
      deficit: deficit,
      floored: floored,
      weeklyLoss: weeklyLoss,
      protein: protein,
      fat: fat,
      carbs: carbs,
      water: (v.weight * 0.03)
    };
  }

  function resultCard(inner, extraClass) {
    var el = document.createElement("article");
    el.className = "result-card" + (extraClass ? " " + extraClass : "");
    el.innerHTML = inner;
    return el;
  }

  function renderResults(v, r) {
    var bmi = r.bmi;
    var marker = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));

    var weightLine;
    if (bmi > 24.9) {
      weightLine = "До нормы — " + nf(Math.max(0, v.weight - r.normalMax), 1) + " кг";
    } else if (bmi < 18.5) {
      weightLine = "До нормы — " + nf(Math.max(0, r.normalMin - v.weight), 1) + " кг";
    } else {
      weightLine = "Ты в пределах нормы";
    }

    var lossText = r.deficit > 0
      ? "Темп ≈ " + nf(r.weeklyLoss, 2) + " кг в неделю"
      : "Дефицит не нужен — достаточно удерживать вес";

    resultsGrid.innerHTML = "";

    resultsGrid.appendChild(resultCard(
      '<span class="result-label">Индекс массы тела</span>' +
      '<strong class="result-value">' + nf(bmi, 1) + ' <small>' + r.category.name + "</small></strong>" +
      '<div class="bmi-scale" aria-hidden="true"><span class="bmi-marker" style="left:' + marker.toFixed(1) + '%"></span></div>' +
      '<p class="result-sub">Норма веса: ' + nf(r.normalMin, 1) + "–" + nf(r.normalMax, 1) + " кг. " + weightLine + "</p>"
    ));

    resultsGrid.appendChild(resultCard(
      '<span class="result-label">Калории в день</span>' +
      '<strong class="result-value">' + nf(r.target) + ' <small>ккал</small></strong>' +
      '<p class="result-sub">Расход ≈ ' + nf(Math.round(r.tdee)) + " ккал · дефицит " + nf(r.deficit) + " ккал</p>" +
      '<p class="result-sub">' + lossText + "</p>",
      "accent"
    ));

    var pPct = Math.min(100, (r.protein * 4 / r.target) * 100);
    var fPct = Math.min(100, (r.fat * 9 / r.target) * 100);
    var cPct = Math.min(100, (r.carbs * 4 / r.target) * 100);

    resultsGrid.appendChild(resultCard(
      '<span class="result-label">БЖУ в день</span>' +
      '<div class="macros">' +
        macroRow("Белки", r.protein, pPct) +
        macroRow("Жиры", r.fat, fPct) +
        macroRow("Углеводы", r.carbs, cPct) +
      "</div>",
      "span-2"
    ));

    resultsGrid.appendChild(resultCard(
      '<span class="result-label">Вода</span>' +
      '<strong class="result-value">' + nf(r.water, 1) + ' <small>л</small></strong>' +
      '<p class="result-sub">Ориентир — 30 мл на кг веса. Часть объёма даёт еда, чай и супы.</p>'
    ));

    resultsSummary.textContent = "ИМТ " + nf(bmi, 1) + " · " + nf(r.target) +
      " ккал в день · белок " + nf(r.protein) + " г · вода " + nf(r.water, 1) + " л";

    var notes = [];
    if (r.floored) {
      notes.push("Расчётная норма оказалась ниже безопасного минимума, поэтому показана минимальная безопасная калорийность (" + nf(r.target) + " ккал).");
    }
    if (bmi < 18.5) {
      notes.push("ИМТ ниже нормы: худеть сейчас не стоит — лучше обсудить питание с врачом.");
    } else if (bmi >= 30) {
      notes.push("При таком ИМТ важна поддержка специалиста: начни с ходьбы и лёгких тренировок, без жёстких диет.");
    }
    if (v.age < 18) {
      notes.push("Расчёты рассчитаны на взрослых. В подростковом возрасте нормы другие — нужен врач.");
    }
    if (r.weeklyLoss > 1) {
      notes.push("Темп выше 1 кг в неделю обычно не полезен: выбирай более мягкий дефицит.");
    }
    resultsNote.textContent = notes.join(" ");

    results.hidden = false;

    // Уровень тренировок подбираем по ИМТ
    setLevel(levelForBmi(bmi), false);
  }

  function macroRow(name, grams, pct) {
    return '<div class="macro">' +
      '<span class="macro-name">' + name + "</span>" +
      '<span class="macro-bar"><i style="width:' + Math.max(6, pct).toFixed(1) + '%"></i></span>' +
      "<strong>" + nf(grams) + " г</strong>" +
      "</div>";
  }

  if (calcForm) {
    restoreCalc();

    $$("#calcForm input").forEach(function (input) {
      input.addEventListener("input", function () {
        input.classList.remove("invalid");
        calcError.textContent = "";
      });
    });

    calcForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = readCalcInputs();
      if (!validateCalc(v)) return;

      saveCalc(v);
      renderResults(v, compute(v));

      window.setTimeout(function () {
        results.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
  }

  /* =========================================================
     Программа тренировок
     ========================================================= */
  var PLANS = {
    easy: {
      name: "Лёгкий старт",
      desc: "Для новичка: 3 короткие тренировки и много ходьбы. Задача первых недель — привычка, а не рекорды.",
      days: [
        {
          day: "Пн", type: "Ходьба + сила", emoji: "🚶", mins: 25, kcal: 110,
          items: [["Прогулка в среднем темпе", "12 мин"], ["Приседания у стула", "2×10"], ["Отжимания от стены", "2×8"], ["Планка на коленях", "2×15 сек"], ["Растяжка", "4 мин"]]
        },
        {
          day: "Вт", type: "Отдых + растяжка", emoji: "🧘", mins: 15, kcal: 35, rest: true,
          items: [["Наклоны к ногам", "5 мин"], ["Кошка-корова", "10 раз"], ["Поза ребёнка", "1 мин"], ["Дыхание 4–6", "3 мин"]]
        },
        {
          day: "Ср", type: "Лёгкое кардио", emoji: "⏱️", mins: 25, kcal: 120,
          items: [["Ходьба на месте", "10 мин"], ["Шаги в сторону", "2×20"], ["Подъёмы колен", "2×15"], ["Джампинг-джек без прыжка", "2×15"], ["Растяжка", "4 мин"]]
        },
        {
          day: "Чт", type: "Отдых", emoji: "😴", mins: 0, kcal: 0, rest: true,
          items: [["Полный отдых", "день"], ["Сон 7–8 часов", "ночь"], ["Прогулка по желанию", "20 мин"]]
        },
        {
          day: "Пт", type: "Силовая лёгкая", emoji: "💪", mins: 25, kcal: 100,
          items: [["Приседания с опорой", "2×12"], ["Отжимания от стола", "2×8"], ["Ягодичный мостик", "2×12"], ["Планка на коленях", "2×20 сек"], ["Растяжка", "4 мин"]]
        },
        {
          day: "Сб", type: "Прогулка", emoji: "🌿", mins: 30, kcal: 140,
          items: [["Ходьба в комфортном темпе", "30 мин"], ["Лестница вместо лифта", "1 раз"], ["Растяжка", "3 мин"]]
        },
        {
          day: "Вс", type: "Отдых", emoji: "🛋️", mins: 0, kcal: 0, rest: true,
          items: [["Полный отдых", "день"], ["Лёгкая растяжка", "5 мин"], ["Подготовка еды на неделю", "20 мин"]]
        }
      ]
    },

    medium: {
      name: "Средний темп",
      desc: "Для тех, кто уже двигается регулярно: 4 тренировки в неделю и 6–8 тысяч шагов в день.",
      days: [
        {
          day: "Пн", type: "Кардио-интервалы", emoji: "🔥", mins: 30, kcal: 220,
          items: [["Разминка", "5 мин"], ["Джампинг-джек", "3×30 сек"], ["Бег на месте", "3×40 сек"], ["Высокие колени", "3×30 сек"], ["Заминка и растяжка", "5 мин"]]
        },
        {
          day: "Вт", type: "Низ тела", emoji: "🏋️", mins: 35, kcal: 240,
          items: [["Приседания", "3×15"], ["Выпады назад", "3×12 на ногу"], ["Ягодичный мостик", "3×15"], ["Подъёмы на носки", "3×20"], ["Растяжка", "5 мин"]]
        },
        {
          day: "Ср", type: "Ходьба", emoji: "🚶", mins: 40, kcal: 150, rest: true,
          items: [["Спокойная ходьба", "40 мин"], ["6–8 тысяч шагов", "за день"], ["Растяжка", "5 мин"]]
        },
        {
          day: "Чт", type: "Верх + кор", emoji: "💪", mins: 30, kcal: 200,
          items: [["Отжимания с колен", "3×10"], ["Тяга в наклоне с бутылками", "3×12"], ["Планка", "3×30 сек"], ["Скручивания", "3×15"], ["Лодочка", "3×12"]]
        },
        {
          day: "Пт", type: "Кардио", emoji: "🏃", mins: 30, kcal: 230,
          items: [["Быстрая ходьба", "20 мин"], ["Интервалы: 1 мин быстро / 2 мин спокойно", "5 кругов"], ["Растяжка", "5 мин"]]
        },
        {
          day: "Сб", type: "Активность", emoji: "🎾", mins: 45, kcal: 300, rest: true,
          items: [["Танцы, плавание или велосипед", "40–60 мин"], ["Прогулка с друзьями", "по желанию"]]
        },
        {
          day: "Вс", type: "Отдых", emoji: "😴", mins: 0, kcal: 0, rest: true,
          items: [["Полный отдых", "день"], ["Сон 7–8 часов", "ночь"], ["Лёгкая растяжка", "5 мин"]]
        }
      ]
    },

    active: {
      name: "Активный режим",
      desc: "Если база уже есть: 5 тренировок, интервалы и силовая. Следи за восстановлением и сном.",
      days: [
        {
          day: "Пн", type: "HIIT", emoji: "⚡", mins: 40, kcal: 330,
          items: [["Разминка", "5 мин"], ["Бёрпи", "4×12"], ["Джампинг-джек", "4×40 сек"], ["Высокие колени", "4×40 сек"], ["Планка", "3×45 сек"], ["Заминка", "5 мин"]]
        },
        {
          day: "Вт", type: "Низ тела", emoji: "🏋️", mins: 45, kcal: 320,
          items: [["Приседания с прыжком", "4×15"], ["Выпады с шагом", "4×12"], ["Румынская тяга", "4×12"], ["Болгарский сплит", "3×10"], ["Мостик на одной ноге", "3×12"]]
        },
        {
          day: "Ср", type: "Кардио", emoji: "🏃", mins: 35, kcal: 300,
          items: [["Бег или быстрая ходьба", "20 мин"], ["Интервалы 30 сек / 90 сек", "6 кругов"], ["Растяжка", "6 мин"]]
        },
        {
          day: "Чт", type: "Верх + кор", emoji: "💪", mins: 40, kcal: 260,
          items: [["Отжимания", "4×15"], ["Обратные отжимания от стула", "3×12"], ["Планка", "4×45 сек"], ["Велосипед", "3×20"], ["Супермен", "3×15"]]
        },
        {
          day: "Пт", type: "Табата", emoji: "🔥", mins: 25, kcal: 250,
          items: [["Табата 20/10", "8 раундов"], ["Приседания", "1-й блок"], ["Бёрпи", "2-й блок"], ["Скалолаз", "3-й блок"], ["Растяжка", "5 мин"]]
        },
        {
          day: "Сб", type: "Долгая активность", emoji: "🚴", mins: 60, kcal: 400, rest: true,
          items: [["Велосипед, плавание или поход", "60 мин"], ["Шаги 9–10 тысяч", "за день"]]
        },
        {
          day: "Вс", type: "Отдых", emoji: "😴", mins: 0, kcal: 0, rest: true,
          items: [["Полный отдых", "день"], ["Сон 8 часов", "ночь"], ["Массаж или растяжка", "15 мин"]]
        }
      ]
    }
  };

  var weekGrid = $("#weekGrid");
  var planDesc = $("#planDesc");
  var currentLevel = "easy";

  function renderWeek(level) {
    var plan = PLANS[level];
    if (!plan || !weekGrid) return;

    planDesc.textContent = plan.desc;
    weekGrid.innerHTML = "";

    plan.days.forEach(function (d, i) {
      var card = document.createElement("article");
      card.className = "day-card" + (d.rest ? " day-rest" : "");
      card.style.animationDelay = (i * 55) + "ms";

      var items = d.items.map(function (it) {
        return '<li class="ex-item"><span class="ex-name">' + it[0] + '</span><span class="ex-dose">' + it[1] + "</span></li>";
      }).join("");

      var meta = d.mins
        ? '<div class="day-meta"><span>⏱ ' + d.mins + " мин</span><span>🔥 ≈ " + d.kcal + " ккал</span></div>"
        : '<div class="day-meta"><span>🌙 восстановление</span></div>';

      card.innerHTML =
        '<div class="day-top">' +
          '<span class="day-name">' + d.day + "</span>" +
          '<span class="day-type">' + d.type + "</span>" +
          '<span class="day-emoji" aria-hidden="true">' + d.emoji + "</span>" +
        "</div>" +
        '<ul class="ex-list">' + items + "</ul>" +
        meta;

      weekGrid.appendChild(card);
    });
  }

  function setLevel(level, scroll) {
    if (!PLANS[level]) level = "medium";
    currentLevel = level;

    $$(".level-btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.level === level));
    });

    renderWeek(level);

    if (scroll && weekGrid) {
      weekGrid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  $$(".level-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLevel(btn.dataset.level, false);
    });
  });

  renderWeek(currentLevel);

  /* =========================================================
     Интервальный таймер
     ========================================================= */
  var MODES = {
    tabata: { work: 20, rest: 10, rounds: 8, prep: 5 },
    circle: { work: 40, rest: 20, rounds: 6, prep: 5 },
    cardio: { work: 45, rest: 15, rounds: 8, prep: 5 }
  };

  var timerCard = $("#timerCard");
  var timerPhase = $("#timerPhase");
  var timerTime = $("#timerTime");
  var timerRound = $("#timerRound");
  var timerRing = $("#timerRing");
  var timerStart = $("#timerStart");
  var timerReset = $("#timerReset");
  var timerSound = $("#timerSound");
  var CIRC = 2 * Math.PI * 52;

  var t = {
    mode: "tabata",
    phase: "idle",
    remaining: 0,
    round: 1,
    running: false,
    endAt: 0,
    interval: null,
    audio: null
  };

  function secondsInPhase(phase) {
    var m = MODES[t.mode];
    if (phase === "prep") return m.prep;
    if (phase === "work") return m.work;
    if (phase === "rest") return m.rest;
    return 0;
  }

  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function paintTimer() {
    var m = MODES[t.mode];
    var labels = { prep: "Приготовься", work: "Работай", rest: "Отдыхай", done: "Готово", idle: "Готовность" };
    timerPhase.textContent = labels[t.phase] || "Готовность";

    var total = secondsInPhase(t.phase) || 1;
    var left = t.phase === "done" ? 0 : t.remaining;
    timerTime.textContent = fmt(left);
    timerRound.textContent = t.phase === "done"
      ? "Все " + m.rounds + " раундов"
      : "Раунд " + t.round + " из " + m.rounds;

    var ratio = t.phase === "done" ? 0 : Math.max(0, Math.min(1, left / total));
    timerRing.style.strokeDasharray = CIRC.toFixed(1);
    timerRing.style.strokeDashoffset = (CIRC * (1 - ratio)).toFixed(1);

    timerCard.classList.toggle("is-rest", t.phase === "rest");
    timerCard.classList.toggle("is-done", t.phase === "done");

    timerStart.textContent = t.phase === "done" ? "Ещё раз" : (t.running ? "Пауза" : (t.phase === "idle" ? "Старт" : "Продолжить"));
  }

  function beep(freq, duration, volume) {
    if (!timerSound.checked) return;
    try {
      if (!t.audio) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        t.audio = new Ctx();
      }
      if (t.audio.state === "suspended") t.audio.resume();
      var osc = t.audio.createOscillator();
      var gain = t.audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume || 0.12;
      osc.connect(gain);
      gain.connect(t.audio.destination);
      osc.start();
      osc.stop(t.audio.currentTime + duration);
    } catch (err) { /* без звука */ }
  }

  function setPhase(phase) {
    t.phase = phase;
    t.remaining = secondsInPhase(phase);

    if (phase === "work") { t.endAt = performance.now() + t.remaining * 1000; beep(880, 0.12); }
    else if (phase === "rest") { t.endAt = performance.now() + t.remaining * 1000; beep(440, 0.12); }
    else if (phase === "prep") { t.endAt = performance.now() + t.remaining * 1000; }
    else if (phase === "done") { t.running = false; beep(660, 0.12); setTimeout(function () { beep(880, 0.25); }, 160); }

    paintTimer();
  }

  function nextPhase() {
    var m = MODES[t.mode];

    if (t.phase === "prep") { t.round = 1; setPhase("work"); return; }
    if (t.phase === "work") {
      if (t.round < m.rounds) setPhase("rest");
      else setPhase("done");
      return;
    }
    if (t.phase === "rest") { t.round += 1; setPhase("work"); return; }
  }

  function tick() {
    if (!t.running) return;
    var left = (t.endAt - performance.now()) / 1000;
    t.remaining = left;

    if (left <= 0) {
      nextPhase();
      return;
    }
    paintTimer();
  }

  function startInterval() {
    if (t.interval) return;
    t.interval = window.setInterval(tick, 100);
  }

  function startPause() {
    // завершённый таймер стартует заново
    if (t.phase === "done" || t.phase === "idle") {
      t.round = 1;
      t.running = true;
      setPhase("prep");
      startInterval();
      paintTimer();
      return;
    }

    if (t.running) {
      t.running = false;
      t.remaining = Math.max(0, (t.endAt - performance.now()) / 1000);
      paintTimer();
      return;
    }

    t.running = true;
    t.endAt = performance.now() + t.remaining * 1000;
    startInterval();
    paintTimer();
  }

  function resetTimer() {
    t.running = false;
    t.phase = "idle";
    t.round = 1;
    t.remaining = MODES[t.mode].work;
    if (t.interval) {
      window.clearInterval(t.interval);
      t.interval = null;
    }
    paintTimer();
  }

  $$(".mode-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$(".mode-btn").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      t.mode = btn.dataset.mode;
      resetTimer();
    });
  });

  if (timerStart) timerStart.addEventListener("click", startPause);
  if (timerReset) timerReset.addEventListener("click", resetTimer);
  if (timerCard) resetTimer();

  /* =========================================================
     Дневник веса
     ========================================================= */
  var diaryKey = "diyora-diary-v1";
  var diaryForm = $("#diaryForm");
  var diaryDate = $("#diaryDate");
  var diaryWeight = $("#diaryWeight");
  var diaryError = $("#diaryError");
  var diaryList = $("#diaryList");
  var chartWrap = $("#chartWrap");
  var diaryDelta = $("#diaryDelta");

  function loadDiary() {
    var raw;
    try { raw = localStorage.getItem(diaryKey); } catch (err) { return []; }
    if (!raw) return [];

    try {
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (x) {
        return x && typeof x.date === "string" && typeof x.weight === "number" && isFinite(x.weight);
      });
    } catch (err) {
      return [];
    }
  }

  function saveDiary(arr) {
    try {
      localStorage.setItem(diaryKey, JSON.stringify(arr));
    } catch (err) { /* приватный режим */ }
  }

  function sortDiary(arr) {
    return arr.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function shortDate(iso) {
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "." + parts[1];
  }

  function renderDiary() {
    if (!diaryList || !chartWrap || !diaryDelta) return;

    var entries = sortDiary(loadDiary());

    // Список (сначала новые)
    diaryList.innerHTML = "";
    entries.slice().reverse().slice(0, 12).forEach(function (entry) {
      var li = document.createElement("li");
      li.className = "diary-item";
      li.innerHTML =
        "<b>" + nf(entry.weight, 1) + " кг</b>" +
        "<small>" + shortDate(entry.date) + "</small>" +
        '<button class="diary-remove" type="button" aria-label="Удалить запись от ' + shortDate(entry.date) + '" data-date="' + entry.date + '">' +
          '<svg class="icon"><use href="#i-trash"></use></svg>' +
        "</button>";
      diaryList.appendChild(li);
    });

    // Дельта
    diaryDelta.textContent = "";
    diaryDelta.classList.remove("up");
    if (entries.length >= 2) {
      var diff = entries[entries.length - 1].weight - entries[0].weight;
      if (Math.abs(diff) < 0.05) {
        diaryDelta.textContent = "без изменений";
      } else {
        diaryDelta.textContent = (diff > 0 ? "+" : "−") + nf(Math.abs(diff), 1) + " кг";
        diaryDelta.classList.toggle("up", diff > 0);
      }
    }

    // График
    chartWrap.innerHTML = "";
    if (entries.length < 2) {
      var empty = document.createElement("div");
      empty.className = "chart-empty";
      empty.textContent = entries.length
        ? "Добавь ещё одну запись — и появится график."
        : "Пока нет записей. Сохрани первый вес, чтобы начать следить за динамикой.";
      chartWrap.appendChild(empty);
      return;
    }

    chartWrap.appendChild(buildChart(entries));
  }

  function buildChart(entries) {
    var NS = "http://www.w3.org/2000/svg";
    var W = 600, H = 220;
    var padL = 44, padR = 18, padT = 18, padB = 30;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;

    var weights = entries.map(function (e) { return e.weight; });
    var min = Math.min.apply(null, weights);
    var max = Math.max.apply(null, weights);
    var span = Math.max(1, max - min);
    min -= span * 0.15;
    max += span * 0.15;

    var times = entries.map(function (e) { return new Date(e.date + "T00:00:00").getTime(); });
    var tMin = Math.min.apply(null, times);
    var tMax = Math.max.apply(null, times);
    var tSpan = Math.max(1, tMax - tMin);

    function xOf(time) {
      if (tMax === tMin) return padL + innerW / 2;
      return padL + ((time - tMin) / tSpan) * innerW;
    }
    function yOf(w) {
      return padT + (1 - (w - min) / (max - min)) * innerH;
    }

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "График изменения веса: от " + nf(weights[0], 1) + " до " + nf(weights[weights.length - 1], 1) + " кг");

    var defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#ff9f45" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="#ff9f45" stop-opacity="0"/>' +
      "</linearGradient>";
    svg.appendChild(defs);

    // Сетка и подписи по оси Y
    for (var i = 0; i <= 3; i++) {
      var y = padT + (innerH / 3) * i;
      var val = max - ((max - min) / 3) * i;

      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", padL);
      line.setAttribute("x2", W - padR);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
      line.setAttribute("stroke", "rgba(42,29,24,0.08)");
      line.setAttribute("stroke-dasharray", "4 6");
      svg.appendChild(line);

      var label = document.createElementNS(NS, "text");
      label.setAttribute("x", padL - 8);
      label.setAttribute("y", y + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("font-size", "11");
      label.setAttribute("fill", "#8b7770");
      label.textContent = nf(val, 0);
      svg.appendChild(label);
    }

    // Точки и линия
    var pts = entries.map(function (e, idx) {
      return { x: xOf(times[idx]), y: yOf(e.weight), w: e.weight, date: e.date };
    });

    var linePath = pts.map(function (p, idx) {
      return (idx === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
    }).join(" ");

    var area = document.createElementNS(NS, "path");
    area.setAttribute("d", linePath + " L" + pts[pts.length - 1].x.toFixed(1) + " " + (H - padB) +
      " L" + pts[0].x.toFixed(1) + " " + (H - padB) + " Z");
    area.setAttribute("fill", "url(#areaGrad)");
    svg.appendChild(area);

    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", linePath);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#ff6b4a");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);

    pts.forEach(function (p, idx) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", p.x.toFixed(1));
      c.setAttribute("cy", p.y.toFixed(1));
      c.setAttribute("r", idx === pts.length - 1 ? "5" : "3.6");
      c.setAttribute("fill", "#fff");
      c.setAttribute("stroke", "#ff6b4a");
      c.setAttribute("stroke-width", "2.4");
      svg.appendChild(c);

      if (idx === 0 || idx === pts.length - 1 || pts.length <= 4) {
        var txt = document.createElementNS(NS, "text");
        txt.setAttribute("x", p.x);
        txt.setAttribute("y", p.y - 10);
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("font-size", "11");
        txt.setAttribute("font-weight", "700");
        txt.setAttribute("fill", "#2a1d18");
        txt.textContent = nf(p.w, 1);
        svg.appendChild(txt);
      }
    });

    // Подписи дат
    var d1 = document.createElementNS(NS, "text");
    d1.setAttribute("x", padL);
    d1.setAttribute("y", H - 8);
    d1.setAttribute("font-size", "11");
    d1.setAttribute("fill", "#8b7770");
    d1.textContent = shortDate(pts[0].date);
    svg.appendChild(d1);

    var d2 = document.createElementNS(NS, "text");
    d2.setAttribute("x", W - padR);
    d2.setAttribute("y", H - 8);
    d2.setAttribute("text-anchor", "end");
    d2.setAttribute("font-size", "11");
    d2.setAttribute("fill", "#8b7770");
    d2.textContent = shortDate(pts[pts.length - 1].date);
    svg.appendChild(d2);

    return svg;
  }

  if (diaryForm) {
    // значение по умолчанию — сегодня
    if (diaryDate && !diaryDate.value) {
      var today = new Date();
      var iso = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");
      diaryDate.value = iso;
    }

    diaryDate.addEventListener("change", function () { diaryError.textContent = ""; });
    diaryWeight.addEventListener("input", function () {
      diaryWeight.classList.remove("invalid");
      diaryError.textContent = "";
    });

    diaryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var date = diaryDate.value;
      var weight = parseFloat(diaryWeight.value);

      if (!date) {
        diaryError.textContent = "Выбери дату";
        diaryDate.focus();
        return;
      }
      if (!weight || weight < 30 || weight > 250) {
        diaryWeight.classList.add("invalid");
        diaryError.textContent = "Вес должен быть от 30 до 250 кг";
        diaryWeight.focus();
        return;
      }

      var entries = loadDiary();
      var existing = entries.filter(function (x) { return x.date === date; });

      entries = entries.filter(function (x) { return x.date !== date; });
      entries.push({ date: date, weight: Math.round(weight * 10) / 10 });
      saveDiary(entries);

      diaryError.textContent = "";
      diaryWeight.value = "";
      renderDiary();

      if (existing.length) {
        diaryDelta.textContent = "Запись за " + shortDate(date) + " обновлена";
        diaryDelta.classList.remove("up");
      }
    });

    if (diaryList) {
      diaryList.addEventListener("click", function (e) {
        var btn = e.target.closest(".diary-remove");
        if (!btn) return;
        var date = btn.dataset.date;
        saveDiary(loadDiary().filter(function (x) { return x.date !== date; }));
        renderDiary();
      });
    }

    renderDiary();
  }
})();
