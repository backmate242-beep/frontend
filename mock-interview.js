// js/mock-interview.js
let currentSession = null;
let currentQuestion = null;
let sessionData = {
    questions: [],
    currentIndex: 0,
    answers: [],
    career: 'Software Engineer'
};

async function startMockInterview() {
    const career = document.getElementById('careerSelect')?.value || 'Software Engineer';
    const numQuestions = parseInt(document.getElementById('numQuestions')?.value || 10);
    
    showToast('🤖 AI is preparing your interview questions...', 'info');
    
    try {
        const response = await api.post('/mock-interview/start', {
            career_name: career,
            num_questions: numQuestions,
            difficulty: 'Medium'
        });
        
        currentSession = response.session_id;
        sessionData.questions = response.questions;
        sessionData.currentIndex = 0;
        sessionData.answers = [];
        sessionData.career = response.career_name;
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('interviewScreen').style.display = 'block';
        
        showCurrentQuestion();
        showToast(`Interview started! ${response.total_questions} questions ready.`, 'success');
    } catch (err) {
        showToast(err.message || 'Failed to start interview', 'error');
    }
}

function showCurrentQuestion() {
    if (sessionData.currentIndex >= sessionData.questions.length) {
        finishInterview();
        return;
    }
    
    currentQuestion = sessionData.questions[sessionData.currentIndex];
    
    document.getElementById('questionNumber').textContent = sessionData.currentIndex + 1;
    document.getElementById('totalQuestions').textContent = sessionData.questions.length;
    document.getElementById('questionText').textContent = currentQuestion.question;
    document.getElementById('questionCategory').textContent = currentQuestion.category;
    document.getElementById('questionDifficulty').textContent = currentQuestion.difficulty;
    document.getElementById('questionHint').textContent = currentQuestion.hint || 'Take your time and give a thoughtful answer.';
    document.getElementById('answerText').value = '';
    document.getElementById('feedbackSection').style.display = 'none';
    
    // Update progress
    const progress = ((sessionData.currentIndex + 1) / sessionData.questions.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

async function submitAnswer() {
    const answer = document.getElementById('answerText').value.trim();
    
    if (!answer || answer.length < 10) {
        showToast('Please provide at least 10 characters in your answer.', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Evaluating...';
    
    try {
        const response = await api.post('/mock-interview/submit-answer', {
            session_id: currentSession,
            question_id: currentQuestion.question_id,
            answer: answer
        });
        
        displayFeedback(response);
        sessionData.answers.push(response);
        
    } catch (err) {
        showToast(err.message || 'Failed to submit answer', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📤 Submit Answer';
    }
}

function displayFeedback(response) {
    document.getElementById('feedbackSection').style.display = 'block';
    document.getElementById('scoreCircle').textContent = response.score;
    document.getElementById('feedbackText').textContent = response.feedback;
    
    const strengthsList = document.getElementById('strengthsList');
    strengthsList.innerHTML = response.strengths.map(s => `<li>✅ ${s}</li>`).join('');
    
    const improvementsList = document.getElementById('improvementsList');
    improvementsList.innerHTML = response.improvements.map(i => `<li>💡 ${i}</li>`).join('');
    
    if (response.sample_answer) {
        document.getElementById('sampleAnswerSection').style.display = 'block';
        document.getElementById('sampleAnswerText').textContent = response.sample_answer;
    }
    
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'inline-block';
    
    document.getElementById('feedbackSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextQuestion() {
    sessionData.currentIndex++;
    if (sessionData.currentIndex >= sessionData.questions.length) {
        finishInterview();
    } else {
        showCurrentQuestion();
        document.getElementById('submitBtn').style.display = 'inline-block';
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').innerHTML = '📤 Submit Answer';
        document.getElementById('answerText').focus();
    }
}

async function finishInterview() {
    try {
        const result = await api.post('/mock-interview/result', {
            session_id: currentSession
        });
        
        showResults(result);
    } catch (err) {
        showToast('Failed to get results', 'error');
    }
}

function showResults(result) {
    document.getElementById('interviewScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    
    document.getElementById('finalScore').textContent = result.average_score.toFixed(0);
    document.getElementById('finalScoreCircle').style.setProperty('--pct', result.average_score + '%');
    document.getElementById('overallFeedback').textContent = result.overall_feedback;
    
    const categoryGrid = document.getElementById('categoryGrid');
    categoryGrid.innerHTML = Object.entries(result.category_breakdown).map(([cat, data]) => `
        <div class="card text-center">
            <div class="text-muted">${cat}</div>
            <h3 style="color: var(--accent-yellow);">${data.average}%</h3>
        </div>
    `).join('');
    
    const recList = document.getElementById('recommendationsList');
    recList.innerHTML = result.recommendations.map(r => `<li>${r}</li>`).join('');
}

async function startNewSession() {
    if (currentSession) {
        try {
            await api.post('/mock-interview/end', { session_id: currentSession });
        } catch (e) {}
    }
    
    document.getElementById('resultsScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
    currentSession = null;
    sessionData = { questions: [], currentIndex: 0, answers: [], career: 'Software Engineer' };
}

// Initialize
if (requireAuth()) {
    console.log('Mock Interview page loaded');
}
