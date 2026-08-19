// js/aptitude-test.js
let APTITUDE_QUESTIONS = [];
let currentQ = 0;
let userAnswers = [];
let flagged = [];
let timerInterval;
let startTime;
let sessionToken = null;
let previousQuestionsText = [];

const STORAGE_KEY = "aptitude_history";

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) return;

    try {
        previousQuestionsText = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
        previousQuestionsText = [];
    }

    await loadQuestions();
});

async function loadQuestions() {
    const loadingState = document.getElementById("loadingState");
    const loadingStatus = document.getElementById("loadingStatus");
    const testUI = document.getElementById("testUI");

    if (loadingState) loadingState.style.display = "block";
    if (testUI) testUI.style.display = "none";

    const statuses = [
        "Analyzing your profile...",
        "Reviewing your skills...",
        "Crafting unique questions...",
        "Mixing difficulty levels...",
        "Almost ready..."
    ];

    let statusIdx = 0;
    const statusInterval = setInterval(() => {
        statusIdx = (statusIdx + 1) % statuses.length;
        if (loadingStatus) loadingStatus.textContent = statuses[statusIdx];
    }, 1500);

    try {
        const data = await api.post("/ai/aptitude/generate", {
            num_questions: 20,
            previous_questions: previousQuestionsText.slice(-100)
        });

        clearInterval(statusInterval);

        if (!data.questions || data.questions.length === 0) {
            throw new Error("No questions received from server");
        }

        APTITUDE_QUESTIONS = data.questions;
        sessionToken = data.session_token;
        userAnswers = new Array(APTITUDE_QUESTIONS.length).fill(null);
        flagged = new Array(APTITUDE_QUESTIONS.length).fill(false);

        const sessionLabel = document.getElementById("sessionLabel");
        const poweredByLabel = document.getElementById("poweredByLabel");
        if (sessionLabel) sessionLabel.textContent = `SESSION: ${data.career_focus.toUpperCase()} ASSESSMENT`;
        if (poweredByLabel) poweredByLabel.textContent = `⚡ ${data.powered_by} | Based on: ${(data.based_on_skills || []).join(", ") || "Profile"}`;

        if (loadingState) loadingState.style.display = "none";
        if (testUI) testUI.style.display = "block";

        const qTotal = document.getElementById("qTotal");
        const totalQuestions = document.getElementById("totalQuestions");
        if (qTotal) qTotal.textContent = APTITUDE_QUESTIONS.length;
        if (totalQuestions) totalQuestions.textContent = APTITUDE_QUESTIONS.length;

        renderNavGrid();
        renderQuestion();
        startTimer();
        startTime = Date.now();
        updateProgress();

        showToast(`Generated ${APTITUDE_QUESTIONS.length} fresh questions! 🎉`, "success");
    } catch (err) {
        clearInterval(statusInterval);
        console.error("Load questions error:", err);
        if (loadingState) {
            loadingState.innerHTML = `
                <div style="padding: 2rem;">
                    <h3 style="color: var(--danger);">❌ Failed to generate questions</h3>
                    <p class="text-muted">${err.message || "Please try again"}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">🔄 Retry</button>
                </div>
            `;
        }
        showToast("Failed to load questions", "error");
    }
}

function renderNavGrid() {
    const grid = document.getElementById("navGrid");
    if (!grid) return;
    grid.style.gridTemplateColumns = `repeat(${Math.min(APTITUDE_QUESTIONS.length, 20)}, 1fr)`;
    grid.innerHTML = APTITUDE_QUESTIONS.map((_, i) => `
        <button class="nav-btn ${userAnswers[i] !== null ? 'answered' : ''} ${i === currentQ ? 'current' : ''}"
            onclick="goToQ(${i})">${i + 1}</button>
    `).join("");
}

function renderQuestion() {
    const q = APTITUDE_QUESTIONS[currentQ];
    if (!q) return;

    const currentQEl = document.getElementById("currentQ");
    const qNumEl = document.getElementById("qNum");
    const questionText = document.getElementById("questionText");
    const questionMeta = document.getElementById("questionMeta");
    const optionsContainer = document.getElementById("optionsContainer");

    if (currentQEl) currentQEl.textContent = currentQ + 1;
    if (qNumEl) qNumEl.textContent = currentQ + 1;
    if (questionText) questionText.textContent = q.question;

    if (questionMeta) {
        questionMeta.innerHTML = `
            <span class="badge" style="font-size: 0.7rem;">${q.category || "General"}</span>
            <span class="badge badge-yellow" style="font-size: 0.7rem;">${q.difficulty || "Medium"}</span>
            ${flagged[currentQ] ? '<span class="badge" style="font-size: 0.7rem; background: var(--danger);">🚩 Flagged</span>' : ''}
        `;
    }

    if (optionsContainer) {
        optionsContainer.innerHTML = q.options.map((opt, i) => `
            <label class="option">
                <input type="radio" name="opt" value="${i}" ${userAnswers[currentQ] === i ? 'checked' : ''}
                    onchange="selectAnswer(${i})">
                <span><strong>${String.fromCharCode(65 + i)})</strong> ${opt}</span>
            </label>
        `).join("");
    }
}

function selectAnswer(idx) {
    if (currentQ >= 0 && currentQ < userAnswers.length) {
        userAnswers[currentQ] = idx;
        renderNavGrid();
        updateProgress();
    }
}

function goToQ(idx) {
    if (idx >= 0 && idx < APTITUDE_QUESTIONS.length) {
        currentQ = idx;
        renderQuestion();
        renderNavGrid();
    }
}

function prevQ() {
    if (currentQ > 0) goToQ(currentQ - 1);
}

function saveNext() {
    if (currentQ < APTITUDE_QUESTIONS.length - 1) {
        goToQ(currentQ + 1);
    } else {
        showToast("Last question! Click SUBMIT TEST below to finish.", "info");
    }
}

function flagQ() {
    if (currentQ >= 0 && currentQ < flagged.length) {
        flagged[currentQ] = !flagged[currentQ];
        renderQuestion();
        showToast(flagged[currentQ] ? "Question flagged" : "Flag removed", "info");
    }
}

function startTimer() {
    let timeLeft = 20 * 60;
    timerInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        const timerEl = document.getElementById("timer");
        if (timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

function updateProgress() {
    const answered = userAnswers.filter(a => a !== null).length;
    const answeredCount = document.getElementById("answeredCount");
    const submitWarning = document.getElementById("submitWarning");
    if (answeredCount) answeredCount.textContent = answered;
    if (submitWarning) {
        submitWarning.style.display = answered < APTITUDE_QUESTIONS.length ? "block" : "none";
    }
}

async function submitTest() {
    if (!sessionToken) {
        showToast("Session expired. Please reload the test.", "error");
        return;
    }

    const answered = userAnswers.filter(a => a !== null).length;
    const unanswered = APTITUDE_QUESTIONS.length - answered;

    if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered questions. Submit anyway? (They'll be marked as incorrect)`)) {
            return;
        }
    } else {
        if (!confirm("Submit your test? You won't be able to change answers after this.")) {
            return;
        }
    }

    clearInterval(timerInterval);

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "⏳ Submitting...";
    }

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    const testUI = document.getElementById("testUI");
    const resultScreen = document.getElementById("resultScreen");
    if (testUI) testUI.style.display = "none";
    if (resultScreen) resultScreen.style.display = "block";

    const scoreValue = document.getElementById("scoreValue");
    const performanceMessage = document.getElementById("performanceMessage");
    if (scoreValue) scoreValue.textContent = "...";
    if (performanceMessage) performanceMessage.textContent = "Calculating your score...";

    try {
        const result = await api.post("/ai/aptitude/submit", {
            session_token: sessionToken,
            user_answers: userAnswers,
            time_taken_seconds: timeTaken
        });

        saveToHistory(APTITUDE_QUESTIONS.map(q => q.question));
        showResult(result);
    } catch (err) {
        console.error("Submit error:", err);
        if (resultScreen) {
            resultScreen.innerHTML = `
                <div class="result-screen">
                    <h2 style="color: var(--danger);">❌ Submission Failed</h2>
                    <p class="text-muted">${err.message || "Unknown error"}</p>
                    <button class="btn btn-primary mt-3" onclick="submitTest()">🔄 Retry</button>
                    <button class="btn btn-outline-yellow mt-2" onclick="window.location.href='dashboard.html'">Go to Dashboard</button>
                </div>
            `;
        }
        showToast("Failed to submit", "error");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "✅ SUBMIT TEST";
        }
    }
}

function showResult(result) {
    const pct = result.overall_score || 0;
    const scoreValue = document.getElementById("scoreValue");
    const scoreCircle = document.getElementById("scoreCircle");
    const performanceMessage = document.getElementById("performanceMessage");
    const scoreDetails = document.getElementById("scoreDetails");
    const subScoresGrid = document.getElementById("subScoresGrid");

    if (scoreValue) scoreValue.textContent = pct + "%";
    if (scoreCircle) scoreCircle.style.setProperty("--pct", pct + "%");
    if (performanceMessage) performanceMessage.textContent = result.performance_message || "Test completed!";
    if (scoreDetails) {
        scoreDetails.textContent = `${result.correct}/${result.total} correct • ${formatTime(result.time_taken_seconds)}`;
    }

    if (subScoresGrid) {
        subScoresGrid.innerHTML = `
            <div class="card text-center"><div class="text-muted">Quantitative</div><h2 style="color: var(--accent-yellow);">${result.sub_scores.aptitude}%</h2></div>
            <div class="card text-center"><div class="text-muted">Logical</div><h2 style="color: var(--accent-yellow);">${result.sub_scores.logical}%</h2></div>
            <div class="card text-center"><div class="text-muted">Verbal</div><h2 style="color: var(--accent-yellow);">${result.sub_scores.communication}%</h2></div>
            <div class="card text-center"><div class="text-muted">Technical</div><h2 style="color: var(--accent-yellow);">${result.sub_scores.programming}%</h2></div>
        `;
    }
}

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
}

function saveToHistory(questions) {
    try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        history.push(...questions);
        const trimmed = history.slice(-200);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error("Failed to save history:", e);
    }
}

async function retakeTest() {
    const resultScreen = document.getElementById("resultScreen");
    if (resultScreen) resultScreen.style.display = "none";
    sessionToken = null;
    await loadQuestions();
}
