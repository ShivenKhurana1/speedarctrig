// script.js - cleaned, deduplicated, robust version

// =======================================================
// CONFIG & DOM ELEMENTS
// =======================================================
const totalQuestions = 12;

// Arc Trig
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const submitBtn = document.getElementById("submit-btn");
const skipBtn = document.getElementById("skip-btn");
const answerInput = document.getElementById("answer");
const questionEl = document.getElementById("question");
const scoreEl = document.querySelector("#score span") || document.getElementById("score");
const answersContainer = document.getElementById("answers");
const quizContainer = document.getElementById("quiz-container");
const startScreen = document.getElementById("start-screen");
const resultScreen = document.getElementById("result-screen");
const finalScoreEl = document.getElementById("final-score");
const timeTakenEl = document.getElementById("time-taken");
const timerEl = document.getElementById("timer");

// Speed Trig
const speedStartBtn = document.getElementById("speed-start-btn");
const speedRestartBtn = document.getElementById("speed-restart-btn");
const speedSubmitBtn = document.getElementById("speed-submit-btn");
const speedSkipBtn = document.getElementById("speed-skip-btn");
const speedAnswerInput = document.getElementById("speed-answer");
const speedQuestionEl = document.getElementById("speed-question");
const speedScoreEl = document.querySelector("#speed-score span") || document.getElementById("speed-score");
const speedAnswersContainer = document.getElementById("speed-answers");
const speedQuizContainer = document.getElementById("speed-quiz-container");
const speedStartScreen = document.getElementById("speed-start-screen");
const speedResultScreen = document.getElementById("speed-result-screen");
const speedFinalScoreEl = document.getElementById("speed-final-score");
const speedTimeTakenEl = document.getElementById("speed-time-taken");
const speedTimerEl = document.getElementById("speed-timer");

// =======================================================
// STATE
// =======================================================
let currentQuestion = null;
let score = 0;
let questionCount = 0;
let timeLeft = 120;
let timer = null;
let startTime = null;

let speedCurrentQuestion = null;
let speedScore = 0;
let speedQuestionCount = 0;
let speedTimeLeft = 120;
let speedTimer = null;
let speedStartTime = null;

// =======================================================
// ANGLES & COMMON VALUES
// =======================================================
// This list intentionally includes the common angles used by the app.
// Use exact expressions (Math.PI etc.) to avoid floating-rounding mismatch.
const commonAngles = [
  { rad: 0, sin: 0, cos: 1, tan: 0 },
  { rad: Math.PI/6, sin: 0.5, cos: Math.sqrt(3)/2, tan: Math.sqrt(3)/3 },
  { rad: Math.PI/4, sin: Math.sqrt(2)/2, cos: Math.sqrt(2)/2, tan: 1 },
  { rad: Math.PI/3, sin: Math.sqrt(3)/2, cos: 0.5, tan: Math.sqrt(3) },
  { rad: Math.PI/2, sin: 1, cos: 0, tan: Infinity },
  { rad: 2*Math.PI/3, sin: Math.sqrt(3)/2, cos: -0.5, tan: -Math.sqrt(3) },
  { rad: 3*Math.PI/4, sin: Math.sqrt(2)/2, cos: -Math.sqrt(2)/2, tan: -1 },
  { rad: 5*Math.PI/6, sin: 0.5, cos: -Math.sqrt(3)/2, tan: -Math.sqrt(3)/3 },
  { rad: Math.PI, sin: 0, cos: -1, tan: 0 }
];

// =======================================================
// FORMATTING HELPERS
// =======================================================
function toFraction(decimal) {
  // continued fraction -> rational approx
  const tol = 1e-8;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = decimal;
  let maxIter = 50;
  while (maxIter-- > 0) {
    const a = Math.floor(b);
    const auxH = a*h1 + h2;
    h2 = h1; h1 = auxH;
    const auxK = a*k1 + k2;
    k2 = k1; k1 = auxK;
    const frac = h1 / k1;
    if (Math.abs(decimal - frac) < tol) break;
    b = 1/(b - a);
    if (!isFinite(b)) break;
  }
  if (k1 === 1) return `${h1}`;
  return `${h1}/${k1}`;
}

function formatRadians(rad) {
  if (!isFinite(rad)) return '∞';
  if (rad === 0) return '0';
  if (rad === Math.PI) return 'π';
  const frac = toFraction(rad / Math.PI);
  return frac === '1' ? 'π' : `${frac}π`;
}

function formatValue(v) {
  // display all common exact forms, avoid decimals
  if (!isFinite(v)) return '∞';
  if (Math.abs(v - 0) < 1e-10) return '0';
  if (Math.abs(v - 1) < 1e-10) return '1';
  if (Math.abs(v + 1) < 1e-10) return '-1';
  if (Math.abs(v - 2) < 1e-10) return '2';
  if (Math.abs(v + 2) < 1e-10) return '-2';
  
  const r2 = Math.SQRT2/2;
  const r3 = Math.sqrt(3)/2;
  const t3 = Math.sqrt(3)/3;
  const sqrt2 = Math.sqrt(2);
  const sqrt3 = Math.sqrt(3);
  
  if (Math.abs(v - 0.5) < 1e-10) return '1/2';
  if (Math.abs(v + 0.5) < 1e-10) return '-1/2';
  if (Math.abs(v - r2) < 1e-10) return '√2/2';
  if (Math.abs(v + r2) < 1e-10) return '-√2/2';
  if (Math.abs(v - r3) < 1e-10) return '√3/2';
  if (Math.abs(v + r3) < 1e-10) return '-√3/2';
  if (Math.abs(v - t3) < 1e-10) return '√3/3';
  if (Math.abs(v + t3) < 1e-10) return '-√3/3';
  if (Math.abs(v - sqrt2) < 1e-10) return '√2';
  if (Math.abs(v + sqrt2) < 1e-10) return '-√2';
  if (Math.abs(v - sqrt3) < 1e-10) return '√3';
  if (Math.abs(v + sqrt3) < 1e-10) return '-√3';
  if (Math.abs(v - 2/sqrt3) < 1e-10) return '2√3/3';
  if (Math.abs(v + 2/sqrt3) < 1e-10) return '-2√3/3';
  
  // Try to express as a simple fraction
  const frac = toFraction(v);
  return frac;
}

// =======================================================
// PARSE USER INPUTS (π / 'und' / ∞ / √ ...)
// =======================================================
function normalizeInfOrUndToken(s) {
  if (!s) return null;
  const x = s.trim().toLowerCase();
  if (['∞','inf','infty','infinity','undefined','und','undef'].includes(x)) return 'UND'; // sentinel
  return null;
}

function parseSqrtInput(text) {
  if (typeof text !== 'string') return NaN;
  let t = text.trim().toLowerCase();
  if (t === '') return NaN;
  
  // Replace sqrt notation with actual values
  // Handle patterns like: sqrt(2), sqrt2, sqrt(3), sqrt3, etc.
  t = t.replace(/sqrt\s*\(\s*2\s*\)/g, String(Math.sqrt(2)));
  t = t.replace(/sqrt\s*\(\s*3\s*\)/g, String(Math.sqrt(3)));
  t = t.replace(/sqrt2/g, String(Math.sqrt(2)));
  t = t.replace(/sqrt3/g, String(Math.sqrt(3)));
  
  // Replace √ symbols with actual values
  t = t.replace(/√2/g, String(Math.sqrt(2)));
  t = t.replace(/√3/g, String(Math.sqrt(3)));
  
  // Now evaluate as a simple mathematical expression
  // Handle fractions like "sqrt(2)/2" or "1/2"
  if (t.includes('/')) {
    const parts = t.split('/');
    if (parts.length === 2) {
      const n = parseFloat(parts[0]);
      const d = parseFloat(parts[1]);
      if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d;
    }
  }
  
  // Handle negative signs
  return parseFloat(t);
}

function parsePiInput(text) {
  if (typeof text !== 'string') return NaN;
  let t = text.trim();
  if (t === '') return NaN;
  // Accept user-supplied tokens for undefined/infinite answers
  const special = normalizeInfOrUndToken(t);
  if (special === 'UND') return Infinity;
  // Accept plain infinity symbols
  if (['∞','inf','infty','infinity'].includes(t.toLowerCase())) return Infinity;
  
  // Normalize "pi" to "π" so we can handle both forms
  t = t.replace(/pi/gi, 'π');
  
  // Accept numeric direct (no π)
  if (!t.includes('π')) {
    // allow common fraction forms like 1/2
    if (t.includes('/')) {
      const parts = t.split('/');
      if (parts.length === 2) {
        const n = parseFloat(parts[0]);
        const d = parseFloat(parts[1]);
        if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d;
      }
    }
    return parseFloat(t);
  }
  
  // contains π: accept patterns like 'π', '-π', '3π/4', 'π/2', '2π/3'
  t = t.replace(/\s+/g, '');
  
  // Handle patterns like '2π/3' (coefficient before π, then division)
  // First check if there's a slash after π
  const slashAfterPi = t.indexOf('/');
  if (slashAfterPi > 0 && t.indexOf('π') < slashAfterPi) {
    // Pattern like '2π/3' or 'π/2'
    const beforeSlash = t.substring(0, slashAfterPi); // '2π' or 'π'
    const afterSlash = t.substring(slashAfterPi + 1); // '3' or '2'
    
    // Remove π from the before part
    const coef = beforeSlash.replace('π', '');
    let numerator;
    if (coef === '' || coef === '+') numerator = 1;
    else if (coef === '-') numerator = -1;
    else numerator = parseFloat(coef);
    
    const denominator = parseFloat(afterSlash);
    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      return (numerator / denominator) * Math.PI;
    }
  }
  
  // Handle other patterns: 'π', '-π', '2π' etc (no slash after π)
  const before = t.replace('π','');
  if (before === '' || before === '+') return Math.PI;
  if (before === '-') return -Math.PI;
  
  // if it is a fraction like 'π/2' => π/2 (already handled above, but keep for safety)
  if (before.includes('/')) {
    const parts = before.split('/');
    if (parts.length === 2) {
      const n = parseFloat(parts[0]);
      const d = parseFloat(parts[1]);
      if (!isNaN(n) && !isNaN(d) && d !== 0) return (n/d) * Math.PI;
    }
  }
  
  // otherwise parse numeric multiplier like '2π' => 2 * π
  const n = parseFloat(before);
  return isNaN(n) ? NaN : n * Math.PI;
}

// =======================================================
// QUESTION GENERATORS
// =======================================================
function generateArcTrigQuestion() {
  // inverse trig: arcsin, arccos, arctan, arcsec, arccsc, arccot
  const funcs = ['arcsin','arccos','arctan','arcsec','arccsc','arccot'];
  
  let func, angle, val;
  let attempts = 0;
  const maxAttempts = 50;
  
  // Keep trying until we get a valid combination (no infinity arguments)
  do {
    func = funcs[Math.floor(Math.random()*funcs.length)];
    angle = commonAngles[Math.floor(Math.random()*commonAngles.length)];
    
    if (func === 'arcsin') val = angle.sin;
    else if (func === 'arccos') val = angle.cos;
    else if (func === 'arctan') val = angle.tan;
    else if (func === 'arcsec') val = (angle.cos === 0 ? Infinity : 1/angle.cos);
    else if (func === 'arccsc') val = (angle.sin === 0 ? Infinity : 1/angle.sin);
    else if (func === 'arccot') val = (angle.tan === 0 ? Infinity : 1/angle.tan);
    
    attempts++;
  } while (!isFinite(val) && attempts < maxAttempts);
  
  // Fallback to arcsin if we somehow still have infinity
  if (!isFinite(val)) {
    func = 'arcsin';
    val = angle.sin;
  }

  return {
    func,
    question: `${func}(${formatValue(val)})`,
    // correct angle in radians
    answerRad: angle.rad,
    displayAnswer: formatRadians(angle.rad),
    rawValue: val
  };
}

function generateSpeedQuestion() {
  const funcs = ['sin','cos','tan','csc','sec','cot'];
  
  let func, angle, val;
  let attempts = 0;
  const maxAttempts = 50;
  
  // Keep trying until we get a valid combination (no infinity answers)
  do {
    func = funcs[Math.floor(Math.random()*funcs.length)];
    angle = commonAngles[Math.floor(Math.random()*commonAngles.length)];
    
    if (func === 'sin') val = angle.sin;
    else if (func === 'cos') val = angle.cos;
    else if (func === 'tan') val = angle.tan;
    else if (func === 'csc') val = (angle.sin === 0 ? Infinity : 1/angle.sin);
    else if (func === 'sec') val = (angle.cos === 0 ? Infinity : 1/angle.cos);
    else if (func === 'cot') val = (angle.tan === 0 ? Infinity : 1/angle.tan);
    
    attempts++;
  } while (!isFinite(val) && attempts < maxAttempts);
  
  // Fallback to sin if we somehow still have infinity
  if (!isFinite(val)) {
    func = 'sin';
    val = angle.sin;
  }

  return {
    func,
    question: `${func}(${formatRadians(angle.rad)})`,
    answer: val,
    displayAnswer: formatValue(val)
  };
}

// =======================================================
// ARC TRIG FLOW
// =======================================================
function showArcQuestion() {
  currentQuestion = generateArcTrigQuestion();
  if (questionEl) questionEl.textContent = currentQuestion.question;
  if (answerInput) answerInput.value = '';
  if (answerInput) answerInput.focus();
}

function checkArcAnswer() {
  if (!currentQuestion) return;
  if (!answerInput) return;
  const raw = answerInput.value.trim();
  if (raw === '') return;

  const userSpecial = normalizeInfOrUndToken(raw);
  let userVal;
  if (userSpecial === 'UND') {
    // user typed 'und'/'undefined' etc. We'll treat this as Infinity sentinel.
    userVal = Infinity;
  } else {
    userVal = parsePiInput(raw);
  }

  // correct answer is currentQuestion.answerRad (a finite rad)
  const correct = currentQuestion.answerRad;
  let isCorrect = false;

  if (!isFinite(userVal) && !isFinite(correct)) {
    // both infinite/missing — accept
    isCorrect = true;
  } else if (isFinite(userVal) && isFinite(correct)) {
    // compare with tolerance (rad difference)
    isCorrect = Math.abs(userVal - correct) < 0.001;
  } else {
    isCorrect = false;
  }

  if (isCorrect) score++;

  // update UI safely
  if (scoreEl) scoreEl.textContent = `${score}/${totalQuestions}`;

  if (answersContainer) {
    const item = document.createElement('div');
    item.className = `answer-item ${isCorrect ? 'correct' : 'incorrect'}`;
    const userShown = raw || (userVal === Infinity ? 'und' : String(userVal));
    item.innerHTML = `
      <div class="font-semibold">${currentQuestion.question} = <span class="${isCorrect ? 'text-green-600' : 'text-red-600'}">${userShown}</span></div>
      ${!isCorrect ? `<div class="text-sm text-gray-600">Correct answer: ${currentQuestion.displayAnswer}</div>` : ''}
    `;
    answersContainer.prepend(item);
  }

  questionCount++;
  if (questionCount >= totalQuestions) {
    endQuiz();
    return;
  }
  showArcQuestion();
}

// =======================================================
// SPEED TRIG FLOW
// =======================================================
function showSpeedQuestion() {
  speedCurrentQuestion = generateSpeedQuestion();
  if (speedQuestionEl) speedQuestionEl.textContent = speedCurrentQuestion.question;
  if (speedAnswerInput) speedAnswerInput.value = '';
  if (speedAnswerInput) speedAnswerInput.focus();
}

function checkSpeedAnswer() {
  if (!speedCurrentQuestion) return;
  if (!speedAnswerInput) return;
  const raw = speedAnswerInput.value.trim();
  if (raw === '') return;

  const special = normalizeInfOrUndToken(raw);
  let userVal;
  if (special === 'UND') userVal = Infinity;
  else userVal = parseSqrtInput(raw);

  const correct = speedCurrentQuestion.answer;
  let isCorrect = false;

  if (!isFinite(correct) && !isFinite(userVal)) {
    isCorrect = true; // both infinite/undefined -> accept 'und'
  } else if (isFinite(correct) && isFinite(userVal)) {
    isCorrect = Math.abs(userVal - correct) < 0.01; // tolerance for decimals
  } else {
    isCorrect = false;
  }

  if (isCorrect) speedScore++;

  if (speedScoreEl) speedScoreEl.textContent = `${speedScore}/${totalQuestions}`;

  if (speedAnswersContainer) {
    const item = document.createElement('div');
    item.className = `answer-item ${isCorrect ? 'correct' : 'incorrect'}`;
    const userShown = raw || (userVal === Infinity ? 'und' : String(userVal));
    item.innerHTML = `
      <div class="font-semibold">${speedCurrentQuestion.question} = <span class="${isCorrect ? 'text-green-600' : 'text-red-600'}">${userShown}</span></div>
      ${!isCorrect ? `<div class="text-sm text-gray-600">Correct answer: ${speedCurrentQuestion.displayAnswer}</div>` : ''}
    `;
    speedAnswersContainer.prepend(item);
  }

  speedQuestionCount++;
  if (speedQuestionCount >= totalQuestions) {
    endSpeedQuiz();
    return;
  }
  showSpeedQuestion();
}

// =======================================================
// TIMERS & QUIZ CONTROL
// =======================================================
function updateArcTimer() {
  if (!timerEl) return;
  if (timeLeft <= 0) {
    clearInterval(timer);
    endQuiz();
    return;
  }
  timeLeft--;
  const m = Math.floor(timeLeft/60);
  const s = String(timeLeft % 60).padStart(2,'0');
  timerEl.textContent = `${m}:${s}`;
}

function updateSpeedTimer() {
  if (!speedTimerEl) return;
  if (speedTimeLeft <= 0) {
    clearInterval(speedTimer);
    endSpeedQuiz();
    return;
  }
  speedTimeLeft--;
  const m = Math.floor(speedTimeLeft/60);
  const s = String(speedTimeLeft % 60).padStart(2,'0');
  speedTimerEl.textContent = `${m}:${s}`;
}

function startQuiz() {
  // reset
  score = 0; questionCount = 0; timeLeft = 120;
  if (answersContainer) answersContainer.innerHTML = '';
  if (scoreEl) scoreEl.textContent = `0/${totalQuestions}`;

  // show/hide
  if (startScreen) startScreen.classList.add('hidden');
  if (quizContainer) quizContainer.classList.remove('hidden');
  if (resultScreen) resultScreen.classList.add('hidden');

  clearInterval(timer);
  timer = setInterval(updateArcTimer, 1000);
  startTime = new Date();

  showArcQuestion();
}

function endQuiz() {
  clearInterval(timer);
  if (quizContainer) quizContainer.classList.add('hidden');
  if (resultScreen) resultScreen.classList.remove('hidden');
  if (finalScoreEl) finalScoreEl.textContent = score;
  if (startTime && timeTakenEl) {
    const totalSec = Math.round((new Date() - startTime) / 1000);
    const m = Math.floor(totalSec/60);
    const s = totalSec % 60;
    timeTakenEl.textContent = `${m}m ${s}s`;
  }
}

function startSpeedQuiz() {
  speedScore = 0; speedQuestionCount = 0; speedTimeLeft = 120;
  if (speedAnswersContainer) speedAnswersContainer.innerHTML = '';
  if (speedScoreEl) speedScoreEl.textContent = `0/${totalQuestions}`;

  if (speedStartScreen) speedStartScreen.classList.add('hidden');
  if (speedQuizContainer) speedQuizContainer.classList.remove('hidden');
  if (speedResultScreen) speedResultScreen.classList.add('hidden');

  clearInterval(speedTimer);
  speedTimer = setInterval(updateSpeedTimer, 1000);
  speedStartTime = new Date();

  showSpeedQuestion();
}

function endSpeedQuiz() {
  clearInterval(speedTimer);
  if (speedQuizContainer) speedQuizContainer.classList.add('hidden');
  if (speedResultScreen) speedResultScreen.classList.remove('hidden');
  if (speedFinalScoreEl) speedFinalScoreEl.textContent = speedScore;
  if (speedStartTime && speedTimeTakenEl) {
    const totalSec = Math.round((new Date() - speedStartTime) / 1000);
    const m = Math.floor(totalSec/60);
    const s = totalSec % 60;
    speedTimeTakenEl.textContent = `${m}m ${s}s`;
  }
}

// =======================================================
// TAB SWITCHING
// =======================================================
function switchTab(tabName) {
  const btns = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  btns.forEach(b => {
    const id = b.getAttribute("data-tab");
    if (id === tabName) {
      b.classList.remove("text-gray-500");
      b.classList.add("text-indigo-600","border-b-2","border-indigo-600");
    } else {
      b.classList.add("text-gray-500");
      b.classList.remove("text-indigo-600","border-b-2","border-indigo-600");
    }
  });
  contents.forEach(c => c.style.display = c.id === `${tabName}-tab` ? "block" : "none");

  // ensure per-tab initial UI
  if (tabName === 'arc-trig') {
    if (startScreen) startScreen.classList.remove('hidden');
    if (quizContainer) quizContainer.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
  }
  if (tabName === 'speed-trig') {
    if (speedStartScreen) speedStartScreen.classList.remove('hidden');
    if (speedQuizContainer) speedQuizContainer.classList.add('hidden');
    if (speedResultScreen) speedResultScreen.classList.add('hidden');
  }
}

// =======================================================
// INIT & EVENT BINDINGS
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  // Tabs init
  const tabBtns = document.querySelectorAll(".tab-btn");
  if (tabBtns.length > 0) {
    const first = tabBtns[0].getAttribute("data-tab");
    tabBtns.forEach(b => b.addEventListener("click", () => switchTab(b.getAttribute("data-tab"))));
    switchTab(first);
  }

  // Arc trig listeners
  startBtn?.addEventListener("click", startQuiz);
  submitBtn?.addEventListener("click", checkArcAnswer);
  skipBtn?.addEventListener("click", () => {
    // treat skip as answering 'skipped' and progress the question count
    if (!currentQuestion) return;
    if (answersContainer) {
      const item = document.createElement('div');
      item.className = 'answer-item';
      item.innerHTML = `<div class="font-semibold">${currentQuestion.question} = <span class="text-yellow-600">Skipped</span></div>
                        <div class="text-sm text-gray-600">Answer: ${currentQuestion.displayAnswer}</div>`;
      answersContainer.prepend(item);
    }
    questionCount++;
    if (questionCount >= totalQuestions) return endQuiz();
    showArcQuestion();
  });
  restartBtn?.addEventListener("click", startQuiz);
  answerInput?.addEventListener("keypress", e => { if (e.key === "Enter") checkArcAnswer(); });

  // Speed trig listeners
  speedStartBtn?.addEventListener("click", startSpeedQuiz);
  speedSubmitBtn?.addEventListener("click", checkSpeedAnswer);
  speedSkipBtn?.addEventListener("click", () => {
    if (!speedCurrentQuestion) return;
    if (speedAnswersContainer) {
      const item = document.createElement('div');
      item.className = 'answer-item';
      item.innerHTML = `<div class="font-semibold">${speedCurrentQuestion.question} = <span class="text-yellow-600">Skipped</span></div>
                        <div class="text-sm text-gray-600">Answer: ${speedCurrentQuestion.displayAnswer}</div>`;
      speedAnswersContainer.prepend(item);
    }
    speedQuestionCount++;
    if (speedQuestionCount >= totalQuestions) return endSpeedQuiz();
    showSpeedQuestion();
  });
  speedRestartBtn?.addEventListener("click", startSpeedQuiz);
  speedAnswerInput?.addEventListener("keypress", e => { if (e.key === "Enter") checkSpeedAnswer(); });

  // Show start screens if present
  if (startScreen) startScreen.classList.remove('hidden');
  if (speedStartScreen) speedStartScreen.classList.remove('hidden');
});
