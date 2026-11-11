const SVG_NS = "http://www.w3.org/2000/svg";
const STORAGE_KEYS = {
  life: "rueda-vida-interactiva-v1",
  business: "rueda-emprendedora-interactiva-v1"
};
const ACTIVE_WHEEL_KEY = "rueda-interactiva-active-wheel";
const CENTER = 380;
const INNER_RADIUS = 34;
const RING_SIZE = 25.5;
const LEVELS = 10;

const lifeDefaultAreas = [
  "Salud", "Familia", "Dinero", "Amistades",
  "Crecimiento", "Ocio", "Amor", "Profesión"
];

const businessBlueprint = [
  ["Identidad y propósito", [
    "¿Tu marca transmite lo que quieres transmitir?",
    "¿Cómo crees que te percibe la gente?",
    "¿Sientes que tu negocio nace de tu esencia?"
  ]],
  ["Comunicación y visibilidad", [
    "¿Qué canal priorizas y estás satisfecha con él?",
    "¿Te gusta el contenido que compartes?",
    "¿Te muestras con la frecuencia que quieres?"
  ]],
  ["Comunidad y relaciones", [
    "¿Estás conforme con tus contactos profesionales?",
    "¿Tienes con quién compartir el camino?",
    "¿Cuidas la relación con tus clientas?"
  ]],
  ["Tiempo y foco", [
    "¿Estás conforme con el tiempo que inviertes en tu negocio?",
    "¿Sabes cada semana cuáles son tus prioridades?",
    "¿Llevas tus ideas hasta el final?"
  ]],
  ["Energía y disfrute", [
    "¿Tienes un equilibrio sano con tu tiempo libre?",
    "¿Respetas tus ritmos y tus momentos de pausa?",
    "¿Disfrutas del camino además del resultado?"
  ]],
  ["Ingresos", [
    "¿Estás satisfecha con tus ingresos actuales?",
    "¿Te sientes en paz con tus precios?",
    "¿Tus ingresos reflejan el valor de lo que das?"
  ]],
  ["Gestión del dinero", [
    "¿Sabes cuánto gasta y cuánto gana tu negocio cada mes?",
    "¿Administras tus costes con tranquilidad?",
    "¿Inviertes en lo que te hace crecer?"
  ]],
  ["Aprendizaje y crecimiento", [
    "¿Te das espacio para seguir aprendiendo?",
    "¿Aplicas lo que aprendes?",
    "¿Sientes que estás creciendo con tu proyecto?"
  ]]
];

const colors = [
  "#8f1746", "#e84955", "#f58d24", "#f5bf4f",
  "#65b898", "#3eafd0", "#13608b", "#8e297e",
  "#719c3b", "#5a55b6", "#ca5c9b", "#8b6848"
];

let activeWheel = localStorage.getItem(ACTIVE_WHEEL_KEY) === "business" ? "business" : "life";
let state = loadState(activeWheel);
let activeTool = "paint";
let selectedColor = state.selectedColor || colors[0];
let isPointerDown = false;
let strokeSnapshot = null;
let history = [];
let future = [];
let selectedArea = 0;

const cellsGroup = document.querySelector("#cells");
const labelsGroup = document.querySelector("#labels");
const palette = document.querySelector("#palette");
const areaList = document.querySelector("#areaList");
const wheel = document.querySelector("#lifeWheel");
const areaTabs = document.querySelector("#areaTabs");
const questionList = document.querySelector("#questionList");
const emptyQuestions = document.querySelector("#emptyQuestions");

function createDefaultState(mode) {
  if (mode === "business") {
    return {
      areas: businessBlueprint.map(([name]) => name),
      cells: Array(businessBlueprint.length * LEVELS).fill(null),
      questions: businessBlueprint.map(([name, questions]) => [
        ...questions.map(question => ({ question, answer: "" })),
        { question: `¿Qué quiero en ${name.toLowerCase()}?`, answer: "" },
        { question: `¿Qué no quiero en ${name.toLowerCase()}?`, answer: "" },
        { question: `¿Cuál es mi objetivo concreto en ${name.toLowerCase()}?`, answer: "" }
      ]),
      suggestionsSeeded: true,
      desireQuestionsSeeded: true,
      objectiveQuestionsSeeded: true,
      selectedColor: colors[0]
    };
  }
  return {
    areas: [...lifeDefaultAreas],
    cells: Array(lifeDefaultAreas.length * LEVELS).fill(null),
    questions: lifeDefaultAreas.map(lifeTemplateQuestions),
    suggestionsSeeded: true,
    desireQuestionsSeeded: true,
    objectiveQuestionsSeeded: true,
    selectedColor: colors[0]
  };
}

function loadState(mode) {
  const defaults = createDefaultState(mode);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS[mode]));
    const savedAreas = Array.isArray(saved?.areas) && saved.areas.length >= 3 && saved.areas.length <= 12
      ? saved.areas.map((name, index) => String(name || `Área ${index + 1}`).slice(0, 36))
      : [...defaults.areas];
    if (Array.isArray(saved?.cells) && saved.cells.length === savedAreas.length * LEVELS) {
      const savedQuestions = Array.isArray(saved.questions) && saved.questions.length === savedAreas.length
        ? saved.questions.map(items => Array.isArray(items) ? items : [])
        : Array.from({ length: savedAreas.length }, () => []);
      return {
        areas: savedAreas,
        cells: saved.cells,
        questions: savedQuestions,
        suggestionsSeeded: saved.suggestionsSeeded === true,
        desireQuestionsSeeded: saved.desireQuestionsSeeded === true,
        objectiveQuestionsSeeded: saved.objectiveQuestionsSeeded === true,
        selectedColor: saved.selectedColor || colors[0]
      };
    }
  } catch (_) {}
  return defaults;
}

function saveState() {
  state.selectedColor = selectedColor;
  localStorage.setItem(STORAGE_KEYS[activeWheel], JSON.stringify(state));
}

function polar(radius, degrees) {
  const angle = (degrees - 90) * Math.PI / 180;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function ringSectorPath(inner, outer, startAngle, endAngle) {
  const a = polar(outer, startAngle);
  const b = polar(outer, endAngle);
  const c = polar(inner, endAngle);
  const d = polar(inner, startAngle);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}

function buildWheel() {
  cellsGroup.replaceChildren();
  const sectorAngle = 360 / state.areas.length;
  for (let area = 0; area < state.areas.length; area++) {
    const start = area * sectorAngle - sectorAngle / 2;
    const end = start + sectorAngle;
    for (let level = 0; level < LEVELS; level++) {
      const index = area * LEVELS + level;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", ringSectorPath(INNER_RADIUS + level * RING_SIZE, INNER_RADIUS + (level + 1) * RING_SIZE, start, end));
      path.setAttribute("class", `wheel-cell level-${level + 1}`);
      path.dataset.index = index;
      path.dataset.area = area;
      path.dataset.level = level;
      path.setAttribute("fill", state.cells[index] || "#fffdfb");
      path.setAttribute("aria-label", `${state.areas[area]}, nivel ${level + 1}${state.cells[index] ? ", coloreado" : ""}`);
      cellsGroup.append(path);
    }
  }
  renderLabels();
}

function renderLabels() {
  labelsGroup.replaceChildren();
  const sectorAngle = 360 / state.areas.length;
  state.areas.forEach((name, area) => {
    const pos = polar(315, area * sectorAngle);
    const compact = state.areas.length > 9;
    const words = name.split(/\s+/);
    let lines = [name];
    if (!compact && name.length > 15 && words.length > 1) {
      let bestSplit = 1;
      let bestDifference = Infinity;
      for (let split = 1; split < words.length; split++) {
        const difference = Math.abs(words.slice(0, split).join(" ").length - words.slice(split).join(" ").length);
        if (difference < bestDifference) { bestDifference = difference; bestSplit = split; }
      }
      lines = [words.slice(0, bestSplit).join(" "), words.slice(bestSplit).join(" ")];
    }
    const longestLine = Math.max(...lines.map(line => line.length));
    const width = Math.max(compact ? 58 : 74, Math.min(compact ? 92 : 132, longestLine * (compact ? 6.8 : 7.5) + 22));
    const height = lines.length === 2 ? 46 : 32;
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", pos.x - width / 2);
    rect.setAttribute("y", pos.y - height / 2);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("rx", height / 2);
    rect.setAttribute("class", "area-label-bg");
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y + 5.5 - (lines.length - 1) * 8);
    text.setAttribute("class", "area-label");
    if (compact) text.style.fontSize = "12px";
    else if (lines.length === 2) text.style.fontSize = "13px";
    const maxLength = compact ? 11 : 18;
    lines.forEach((line, index) => {
      const tspan = document.createElementNS(SVG_NS, "tspan");
      tspan.setAttribute("x", pos.x);
      if (index > 0) tspan.setAttribute("dy", "16");
      tspan.textContent = line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
      text.append(tspan);
    });
    labelsGroup.append(rect, text);
  });
}

function buildPalette() {
  palette.replaceChildren();
  colors.forEach(color => {
    const button = document.createElement("button");
    button.className = `swatch${color === selectedColor ? " active" : ""}`;
    button.style.setProperty("--swatch", color);
    button.setAttribute("aria-label", `Elegir color ${color}`);
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", color === selectedColor);
    button.addEventListener("click", () => selectColor(color));
    palette.append(button);
  });
  document.documentElement.style.setProperty("--current-color", selectedColor);
}

function buildAreaList() {
  areaList.replaceChildren();
  state.areas.forEach((name, area) => {
    const row = document.createElement("div");
    row.className = "area-row";
    const dot = document.createElement("span");
    dot.className = "area-dot";
    dot.style.setProperty("--dot", dominantColor(area));
    const input = document.createElement("input");
    input.className = "area-name";
    input.value = name;
    input.maxLength = 36;
    input.setAttribute("aria-label", `Nombre del área ${area + 1}`);
    input.addEventListener("change", () => {
      const defaultName = createDefaultState(activeWheel).areas[area];
      state.areas[area] = input.value.trim() || defaultName || `Área ${area + 1}`;
      input.value = state.areas[area];
      renderLabels(); renderAreaTabs(); saveState();
    });
    const score = document.createElement("span");
    score.className = "area-score";
    score.textContent = `${areaScore(area)}/10`;
    const remove = document.createElement("button");
    remove.className = "remove-area";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Eliminar categoría";
    remove.setAttribute("aria-label", `Eliminar ${name}`);
    remove.disabled = state.areas.length <= 3;
    remove.addEventListener("click", () => removeArea(area));
    row.append(dot, input, score, remove);
    areaList.append(row);
  });
  const addButton = document.getElementById("addAreaButton");
  addButton.disabled = state.areas.length >= 12;
  addButton.textContent = state.areas.length >= 12 ? "Máximo de 12 categorías" : "＋ Añadir categoría";
}

function renderAreaTabs() {
  areaTabs.replaceChildren();
  state.areas.forEach((name, area) => {
    const button = document.createElement("button");
    button.className = "area-tab";
    button.type = "button";
    button.role = "tab";
    button.setAttribute("aria-selected", area === selectedArea);
    button.textContent = `${name} · ${state.questions[area].length}`;
    button.addEventListener("click", () => {
      selectedArea = area;
      renderAreaTabs();
      renderQuestions();
    });
    areaTabs.append(button);
  });
}

function autoSizeQuestionField(field) {
  field.style.height = "auto";
  const borderHeight = field.offsetHeight - field.clientHeight;
  field.style.height = `${Math.max(56, field.scrollHeight + borderHeight)}px`;
}

function renderQuestions() {
  const questions = state.questions[selectedArea];
  questionList.replaceChildren();
  emptyQuestions.classList.toggle("visible", questions.length === 0);
  questions.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "question-card";

    const questionField = document.createElement("div");
    questionField.className = "question-field";
    const questionLabel = document.createElement("label");
    questionLabel.htmlFor = `question-${selectedArea}-${index}`;
    questionLabel.textContent = "Pregunta";
    const questionInput = document.createElement("textarea");
    questionInput.id = questionLabel.htmlFor;
    questionInput.className = "question-input";
    questionInput.rows = 2;
    questionInput.value = item.question;
    questionInput.placeholder = "Escribe tu pregunta";
    questionInput.addEventListener("input", () => {
      item.question = questionInput.value;
      autoSizeQuestionField(questionInput);
      saveState();
    });
    questionField.append(questionLabel, questionInput);

    const answerField = document.createElement("div");
    answerField.className = "question-field";
    const answerLabel = document.createElement("label");
    answerLabel.htmlFor = `answer-${selectedArea}-${index}`;
    answerLabel.textContent = "Respuesta";
    const answerInput = document.createElement("textarea");
    answerInput.id = answerLabel.htmlFor;
    answerInput.className = "answer-input";
    answerInput.value = item.answer;
    answerInput.placeholder = "Escribe aquí tu reflexión…";
    answerInput.addEventListener("input", () => { item.answer = answerInput.value; saveState(); });
    answerField.append(answerLabel, answerInput);

    const remove = document.createElement("button");
    remove.className = "delete-question";
    remove.type = "button";
    remove.title = "Eliminar pregunta";
    remove.setAttribute("aria-label", "Eliminar esta pregunta");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      if ((item.question || item.answer) && !confirm("¿Eliminar esta pregunta y su respuesta?")) return;
      questions.splice(index, 1);
      saveState(); renderAreaTabs(); renderQuestions();
    });
    card.append(questionField, answerField, remove);
    questionList.append(card);
    requestAnimationFrame(() => autoSizeQuestionField(questionInput));
  });
}

function addQuestion() {
  state.questions[selectedArea].push({ question: "", answer: "" });
  saveState(); renderAreaTabs(); renderQuestions();
  requestAnimationFrame(() => questionList.lastElementChild?.querySelector(".question-input")?.focus());
}

let questionSaveStatusTimer;

function showQuestionSaveStatus(message) {
  const status = document.getElementById("questionSaveStatus");
  status.textContent = message;
  clearTimeout(questionSaveStatusTimer);
  questionSaveStatusTimer = setTimeout(() => { status.textContent = ""; }, 2600);
}

function saveQuestions() {
  saveState();
  showQuestionSaveStatus("✓ Preguntas guardadas en este dispositivo");
}

function restoreOriginalQuestions() {
  const defaults = createDefaultState(activeWheel);
  const templateByName = new Map(defaults.areas.map((name, index) => [name, defaults.questions[index]]));
  const exactOriginalNames = new Set(state.areas.filter(name => templateByName.has(name)));
  const templateForArea = (name, index) => {
    if (templateByName.has(name)) return templateByName.get(name);
    const originalNameAtIndex = defaults.areas[index];
    return originalNameAtIndex && !exactOriginalNames.has(originalNameAtIndex)
      ? defaults.questions[index]
      : null;
  };
  if (!state.areas.some((name, index) => templateForArea(name, index))) {
    showQuestionSaveStatus("No hay categorías originales que restablecer");
    return;
  }
  if (!confirm("¿Restablecer las preguntas originales de esta rueda? Se eliminarán las preguntas añadidas y las respuestas de sus categorías originales, pero se conservarán las puntuaciones.")) return;
  state.questions = state.areas.map((name, index) => {
    const template = templateForArea(name, index);
    return template ? template.map(item => ({ question: item.question, answer: "" })) : state.questions[index];
  });
  saveState();
  renderAreaTabs();
  renderQuestions();
  showQuestionSaveStatus("✓ Preguntas originales restablecidas");
}

function suggestedQuestionsFor(name) {
  const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const suggestions = {
    salud: [
      "¿Cuál es mi relación con la salud?",
      "¿Cuántas veces no escucho a mi cuerpo cuando me pide atención?",
      "¿Qué puedo mejorar con respecto a mi salud?"
    ],
    familia: [
      "¿Cuál es mi relación con mi familia?",
      "¿Cuántas veces no escucho lo que mi familia necesita o intenta decirme?",
      "¿Qué puedo mejorar con respecto a mi familia?"
    ],
    dinero: [
      "¿Cuál es mi relación con el dinero?",
      "¿Cuántas veces evito mirar o gestionar mis finanzas?",
      "¿Qué puedo mejorar con respecto a mi economía?"
    ],
    amistades: [
      "¿Cuál es mi relación con mis amistades?",
      "¿Cuántas veces no escucho o no estoy presente para mis amistades?",
      "¿Qué puedo mejorar con respecto a mis amistades?"
    ],
    crecimiento: [
      "¿Cuál es mi relación con mi crecimiento personal?",
      "¿Cuántas veces ignoro lo que necesito aprender o cambiar?",
      "¿Qué puedo mejorar para seguir creciendo?"
    ],
    ocio: [
      "¿Cuál es mi relación con el descanso y el ocio?",
      "¿Cuántas veces dejo de escuchar mi necesidad de parar y disfrutar?",
      "¿Qué puedo mejorar para dedicarme tiempo de calidad?"
    ],
    amor: [
      "¿Cuál es mi relación con el amor?",
      "¿Cuántas veces no escucho mis necesidades emocionales o las de la otra persona?",
      "¿Qué puedo mejorar con respecto al amor?"
    ],
    profesion: [
      "¿Cuál es mi relación con mi vida profesional?",
      "¿Cuántas veces no escucho lo que necesito en mi trabajo?",
      "¿Qué puedo mejorar con respecto a mi profesión?"
    ]
  };
  return suggestions[key] || [
    `¿Cuál es mi relación con ${name.toLowerCase()}?`,
    "¿Qué señales o necesidades no estoy escuchando en esta área?",
    `¿Qué puedo mejorar con respecto a ${name.toLowerCase()}?`
  ];
}

function normalizedAreaKey(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function desireContextFor(name) {
  const contexts = {
    salud: "para mi salud",
    familia: "en mi relación con mi familia",
    dinero: "en mi relación con el dinero",
    amistades: "en mis amistades",
    crecimiento: "en mi crecimiento personal",
    ocio: "en mi tiempo de ocio y descanso",
    amor: "en el amor",
    profesion: "en mi vida profesional"
  };
  return contexts[normalizedAreaKey(name)] || `en ${name.toLowerCase()}`;
}

function objectiveContextFor(name) {
  const contexts = {
    salud: "mi salud",
    familia: "mi relación con mi familia",
    dinero: "mi relación con el dinero",
    amistades: "mis amistades",
    crecimiento: "mi crecimiento personal",
    ocio: "mi tiempo de ocio y descanso",
    amor: "el amor",
    profesion: "mi vida profesional"
  };
  return contexts[normalizedAreaKey(name)] || name.toLowerCase();
}

function lifeTemplateQuestions(name) {
  return [
    ...suggestedQuestionsFor(name).map(question => ({ question, answer: "" })),
    { question: `¿Qué quiero ${desireContextFor(name)}?`, answer: "" },
    { question: `¿Qué no quiero ${desireContextFor(name)}?`, answer: "" },
    { question: `¿Cuál es mi objetivo concreto en ${objectiveContextFor(name)}?`, answer: "" }
  ];
}

function seedSuggestedQuestions() {
  if (activeWheel !== "life" || state.suggestionsSeeded) return;
  state.areas.forEach((name, area) => {
    if (state.questions[area].length === 0) {
      state.questions[area] = suggestedQuestionsFor(name).map(question => ({ question, answer: "" }));
    }
  });
  state.suggestionsSeeded = true;
  saveState();
}

function seedDesireQuestions() {
  if (activeWheel !== "life" || state.desireQuestionsSeeded || !state.questions.some(items => items.length > 0)) return;
  const contexts = {
    salud: "para mi salud",
    familia: "en mi relación con mi familia",
    dinero: "en mi relación con el dinero",
    amistades: "en mis amistades",
    crecimiento: "en mi crecimiento personal",
    ocio: "en mi tiempo de ocio y descanso",
    amor: "en el amor",
    profesion: "en mi vida profesional"
  };
  state.areas.forEach((name, area) => {
    const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const context = contexts[key] || `en ${name.toLowerCase()}`;
    state.questions[area].push(
      { question: `¿Qué quiero ${context}?`, answer: "" },
      { question: `¿Qué no quiero ${context}?`, answer: "" }
    );
  });
  state.desireQuestionsSeeded = true;
  saveState();
}

function seedObjectiveQuestions() {
  if (state.objectiveQuestionsSeeded || !state.questions.some(items => items.length > 0)) return;
  const contexts = {
    salud: "mi salud",
    familia: "mi relación con mi familia",
    dinero: "mi relación con el dinero",
    amistades: "mis amistades",
    crecimiento: "mi crecimiento personal",
    ocio: "mi tiempo de ocio y descanso",
    amor: "el amor",
    profesion: "mi vida profesional"
  };
  state.areas.forEach((name, area) => {
    const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const context = contexts[key] || name.toLowerCase();
    const alreadyExists = state.questions[area].some(item => /objetivo/i.test(item.question));
    if (!alreadyExists) state.questions[area].push({ question: `¿Cuál es mi objetivo concreto en ${context}?`, answer: "" });
  });
  state.objectiveQuestionsSeeded = true;
  saveState();
}

function addArea() {
  if (state.areas.length >= 12) return;
  state.areas.push(`Área ${state.areas.length + 1}`);
  state.cells.push(...Array(LEVELS).fill(null));
  state.questions.push([]);
  history = [];
  future = [];
  saveState();
  buildWheel(); buildAreaList(); renderAreaTabs(); renderQuestions(); updateUndoButtons();
  requestAnimationFrame(() => {
    const input = areaList.lastElementChild?.querySelector(".area-name");
    input?.focus();
    input?.select();
  });
}

function removeArea(area) {
  if (state.areas.length <= 3) return;
  const hasPaint = state.cells.slice(area * LEVELS, area * LEVELS + LEVELS).some(Boolean);
  const hasNotes = state.questions[area]?.some(item => item.question || item.answer);
  if ((hasPaint || hasNotes) && !confirm(`¿Eliminar “${state.areas[area]}” y todo su contenido?`)) return;
  state.areas.splice(area, 1);
  state.cells.splice(area * LEVELS, LEVELS);
  state.questions.splice(area, 1);
  if (selectedArea > area) selectedArea -= 1;
  if (selectedArea >= state.areas.length) selectedArea = state.areas.length - 1;
  history = [];
  future = [];
  saveState();
  buildWheel(); buildAreaList(); renderAreaTabs(); renderQuestions(); updateUndoButtons();
}

function dominantColor(area) {
  const painted = state.cells.slice(area * 10, area * 10 + 10).filter(Boolean);
  return painted.at(-1) || colors[area % colors.length];
}

function areaScore(area) {
  const segment = state.cells.slice(area * 10, area * 10 + 10);
  let score = 0;
  segment.forEach((value, index) => { if (value) score = index + 1; });
  return score;
}

function selectColor(color) {
  selectedColor = color;
  setTool("paint");
  buildPalette();
  saveState();
}

function setTool(tool) {
  activeTool = tool;
  ["paintButton", "mobilePaint"].forEach(id => document.getElementById(id).classList.toggle("active", tool === "paint"));
  ["eraseButton", "mobileErase"].forEach(id => document.getElementById(id).classList.toggle("active", tool === "erase"));
  document.getElementById("paintButton").setAttribute("aria-pressed", tool === "paint");
  document.getElementById("eraseButton").setAttribute("aria-pressed", tool === "erase");
}

function updateModeUI() {
  const isBusiness = activeWheel === "business";
  document.getElementById("lifeTab").classList.toggle("active", !isBusiness);
  document.getElementById("businessTab").classList.toggle("active", isBusiness);
  document.getElementById("lifeTab").setAttribute("aria-selected", String(!isBusiness));
  document.getElementById("businessTab").setAttribute("aria-selected", String(isBusiness));
  document.getElementById("pageTitle").textContent = isBusiness ? "Mi rueda emprendedora" : "Mi rueda de la vida";
  document.getElementById("pageSubtitle").textContent = isBusiness
    ? "Mira tu negocio completo y descubre dónde poner tu energía ahora."
    : "Colorea cada área desde el centro hasta reflejar cómo te sientes hoy.";
  document.getElementById("wheelTitle").textContent = isBusiness ? "Rueda emprendedora interactiva" : "Rueda de la vida interactiva";
  document.title = isBusiness ? "Mi rueda emprendedora | Entrecapa" : "Mi rueda de la vida | Entrecapa";
}

function switchWheel(mode) {
  if (mode === activeWheel) return;
  saveState();
  activeWheel = mode;
  localStorage.setItem(ACTIVE_WHEEL_KEY, activeWheel);
  state = loadState(activeWheel);
  selectedColor = state.selectedColor || colors[0];
  selectedArea = 0;
  history = [];
  future = [];
  setTool("paint");
  seedSuggestedQuestions();
  seedDesireQuestions();
  seedObjectiveQuestions();
  saveState();
  updateModeUI();
  buildWheel(); buildPalette(); buildAreaList(); renderAreaTabs(); renderQuestions(); updateUndoButtons();
}

function beginStroke() {
  if (!isPointerDown) {
    isPointerDown = true;
    strokeSnapshot = [...state.cells];
  }
}

function clearPreview() {
  document.querySelectorAll(".wheel-cell.preview").forEach(cell => cell.classList.remove("preview"));
}

function previewAreaLevel(cell) {
  clearPreview();
  if (activeTool !== "paint") return;
  const area = Number(cell.dataset.area);
  const targetLevel = Number(cell.dataset.level) + 1;
  for (let level = 0; level < targetLevel; level++) {
    const previewCell = document.querySelector(`.wheel-cell[data-area="${area}"][data-level="${level}"]`);
    previewCell?.style.setProperty("--preview-color", selectedColor);
    previewCell?.classList.add("preview");
  }
}

function paintCell(cell) {
  clearPreview();
  const area = Number(cell.dataset.area);
  const targetLevel = activeTool === "erase" ? 0 : Number(cell.dataset.level) + 1;
  let changed = false;
  for (let level = 0; level < LEVELS; level++) {
    const index = area * LEVELS + level;
    const next = level < targetLevel ? selectedColor : null;
    if (state.cells[index] === next) continue;
    changed = true;
    state.cells[index] = next;
    const areaCell = document.querySelector(`.wheel-cell[data-index="${index}"]`);
    areaCell?.setAttribute("fill", next || "#fffdfb");
    areaCell?.setAttribute("aria-label", `${state.areas[area]}, nivel ${level + 1}${next ? ", coloreado" : ""}`);
  }
  if (!changed) return;
  buildAreaList();
  saveState();
}

function endStroke() {
  if (!isPointerDown) return;
  isPointerDown = false;
  if (strokeSnapshot && JSON.stringify(strokeSnapshot) !== JSON.stringify(state.cells)) {
    history.push(strokeSnapshot);
    if (history.length > 50) history.shift();
    future = [];
  }
  strokeSnapshot = null;
  updateUndoButtons();
}

wheel.addEventListener("pointerdown", event => {
  const cell = event.target.closest(".wheel-cell");
  if (!cell) return;
  event.preventDefault();
  wheel.setPointerCapture?.(event.pointerId);
  beginStroke(); paintCell(cell);
});

wheel.addEventListener("pointermove", event => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const cell = element?.closest?.(".wheel-cell");
  if (!cell) return;
  if (isPointerDown) paintCell(cell);
  else if (event.pointerType === "mouse") previewAreaLevel(cell);
});

wheel.addEventListener("pointerup", endStroke);
wheel.addEventListener("pointercancel", endStroke);
wheel.addEventListener("pointerleave", () => { if (!isPointerDown) clearPreview(); });
window.addEventListener("pointerup", endStroke);

function restoreCells(snapshot) {
  state.cells = [...snapshot];
  document.querySelectorAll(".wheel-cell").forEach((cell, index) => cell.setAttribute("fill", state.cells[index] || "#fffdfb"));
  buildAreaList(); saveState(); updateUndoButtons();
}

function undo() {
  if (!history.length) return;
  future.push([...state.cells]);
  restoreCells(history.pop());
}

function redo() {
  if (!future.length) return;
  history.push([...state.cells]);
  restoreCells(future.pop());
}

function updateUndoButtons() {
  ["undoButton", "mobileUndo"].forEach(id => document.getElementById(id).disabled = !history.length);
  ["redoButton", "mobileRedo"].forEach(id => document.getElementById(id).disabled = !future.length);
}

function resetWheel() {
  const defaults = createDefaultState(activeWheel);
  const previousQuestions = new Map(state.areas.map((name, index) => [name, state.questions[index]]));
  const hasChanges = JSON.stringify(state.areas) !== JSON.stringify(defaults.areas)
    || state.cells.some(Boolean)
    || state.questions.some(items => items.some(item => item.answer));
  if (!hasChanges || !confirm("¿Restaurar las categorías iniciales y borrar puntuaciones y respuestas? Las preguntas se conservarán.")) return;
  state = defaults;
  state.questions = defaults.areas.map((name, index) => {
    const existing = previousQuestions.get(name);
    const source = existing?.length ? existing : defaults.questions[index];
    return source.map(item => ({ question: item.question, answer: "" }));
  });
  selectedArea = 0;
  selectedColor = colors[0];
  future = [];
  history = [];
  setTool("paint");
  saveState();
  buildWheel(); buildPalette(); buildAreaList(); renderAreaTabs(); renderQuestions(); updateUndoButtons();
}

function downloadImage() {
  const clone = wheel.cloneNode(true);
  clone.setAttribute("width", "1200");
  clone.setAttribute("height", "1200");
  const svgData = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fbf8f4"; ctx.fillRect(0, 0, 1200, 1200);
    ctx.drawImage(image, 0, 0, 1200, 1200);
    ctx.fillStyle = "#29252f";
    ctx.textAlign = "center";
    ctx.font = "700 42px Georgia";
    ctx.fillText(activeWheel === "business" ? "Mi rueda emprendedora" : "Mi rueda de la vida", 600, 55);
    const link = document.createElement("a");
    const fileName = activeWheel === "business" ? "mi-rueda-emprendedora" : "mi-rueda-de-la-vida";
    link.download = `${fileName}-${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
}

document.getElementById("paintButton").addEventListener("click", () => setTool("paint"));
document.getElementById("eraseButton").addEventListener("click", () => setTool("erase"));
document.getElementById("mobilePaint").addEventListener("click", () => setTool("paint"));
document.getElementById("mobileErase").addEventListener("click", () => setTool("erase"));
document.getElementById("undoButton").addEventListener("click", undo);
document.getElementById("redoButton").addEventListener("click", redo);
document.getElementById("mobileUndo").addEventListener("click", undo);
document.getElementById("mobileRedo").addEventListener("click", redo);
document.getElementById("resetButton").addEventListener("click", resetWheel);
document.getElementById("downloadButton").addEventListener("click", downloadImage);
document.getElementById("printButton").addEventListener("click", () => window.print());
document.getElementById("addQuestionButton").addEventListener("click", addQuestion);
document.getElementById("emptyAddButton").addEventListener("click", addQuestion);
document.getElementById("saveQuestionsButton").addEventListener("click", saveQuestions);
document.getElementById("restoreQuestionsButton").addEventListener("click", restoreOriginalQuestions);
document.getElementById("addAreaButton").addEventListener("click", addArea);
document.getElementById("lifeTab").addEventListener("click", () => switchWheel("life"));
document.getElementById("businessTab").addEventListener("click", () => switchWheel("business"));

const helpDialog = document.getElementById("helpDialog");
document.getElementById("helpButton").addEventListener("click", () => helpDialog.showModal());
document.getElementById("closeHelp").addEventListener("click", () => helpDialog.close());
document.getElementById("startButton").addEventListener("click", () => helpDialog.close());

window.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
});

seedSuggestedQuestions();
seedDesireQuestions();
seedObjectiveQuestions();
updateModeUI();
buildWheel();
buildPalette();
buildAreaList();
renderAreaTabs();
renderQuestions();
updateUndoButtons();
