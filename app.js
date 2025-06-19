const state={
    user: null,
    selectedLanguage: null,
    selectedLevel: null,
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    timer: null,
    loading: false
};

const elements={
    splashScreen: document.getElementById('splash-screen'),
    authModal: document.getElementById('auth-modal'),
    mainContent: document.getElementById('main-content'),
    usernameInput: document.getElementById('username'),
    startButton: document.getElementById('start-btn'),
    usernameDisplay: document.getElementById('username-display'),
    logoutBtn: document.getElementById('logout-btn'),
    loadingSpinner: document.getElementById('loading-spinner'),

    languageSelection: document.getElementById('language-selection'),
    levelSelection: document.getElementById('level-selection'),
    backToLanguagesBtn: document.getElementById('back-to-languages'),

    quizSection: document.getElementById('quiz-section'),
    backToLevelsBtn: document.getElementById('back-to-levels'),
    quizHeaderTitle: document.getElementById('quiz-header-title'),
    timerDisplay: document.getElementById('timer'),
    currentQuestionDisplay: document.getElementById('current-question'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    nextQuestionBtn: document.getElementById('next-question'),
    submitQuizBtn: document.getElementById('submit-quiz'),

    resultsSection: document.getElementById('results-section'),
    scoreDisplay: document.getElementById('score-display'),
    performanceMessage: document.getElementById('performance-message'),
    restartQuizBtn: document.getElementById('restart-quiz'),
    nextLevelBtn: document.getElementById('quiz-next-level')
};

function showLoading() {
    showElement(elements.loadingSpinner);
    document.body.classList.add('blurred');
}

function hideLoading() {
    hideElement(elements.loadingSpinner);
    document.body.classList.remove('blurred');
}

function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

function clearChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function handleLogin() {
    const username=elements.usernameInput.value.trim();
    if (username) {
        state.user=username;
        elements.usernameDisplay.textContent=username;
        hideElement(elements.authModal);
        showElement(elements.mainContent);
        showElement(elements.languageSelection);
        hideElement(elements.splashScreen);
    }
}

function handleLogout() {
    state.user=null;
    state.selectedLanguage=null;
    state.selectedLevel=null;
    state.questions=[];
    state.currentQuestionIndex=0;
    state.userAnswers=[];

    hideElement(elements.mainContent);
    hideElement(elements.levelSelection);
    showElement(elements.authModal);
    elements.usernameInput.value='';
}

function setupLanguageSelection() {
    const languageCards=document.querySelectorAll('.language-card');
    languageCards.forEach(card => {
        card.addEventListener('click', () => {
            state.selectedLanguage=card.dataset.language;
            setupLevelSelection();
        });
    });
}

function getUnlockedLevels(language) {
    const unlockedLevels=JSON.parse(localStorage.getItem(`${state.user}_${language}_levels`)||'{"1": true}');
    return unlockedLevels;
}

function unlockNextLevel(language, level) {
    const unlockedLevels=getUnlockedLevels(language);
    unlockedLevels[level+1]=true;
    localStorage.setItem(`${state.user}_${language}_levels`, JSON.stringify(unlockedLevels));
}

function setupLevelSelection() {
    hideElement(elements.languageSelection);
    showElement(elements.levelSelection);

    elements.backToLanguagesBtn.onclick=() => {
        hideElement(elements.levelSelection);
        showElement(elements.languageSelection);
    };

    const levelGrid=elements.levelSelection.querySelector('.level-grid');
    clearChildren(levelGrid);

    const unlockedLevels=getUnlockedLevels(state.selectedLanguage);

    for (let i=1; i<=10; i++) {
        const levelCard=document.createElement('div');
        levelCard.classList.add('level-card');
        levelCard.textContent=`Level ${i}`;

        if (!unlockedLevels[i]) {
            levelCard.classList.add('locked');
        } else {
            levelCard.addEventListener('click', () => startQuiz(i));
        }

        levelGrid.appendChild(levelCard);
    }
}

function startQuiz(level) {
    state.selectedLevel=level;
    state.currentQuestionIndex=0;
    state.userAnswers=[];

    hideElement(elements.levelSelection);
    showElement(elements.quizSection);

    elements.backToLevelsBtn.onclick=() => {
        hideElement(elements.quizSection);
        showElement(elements.levelSelection);
    };

    fetchQuestions(state.selectedLanguage, state.selectedLevel);
}

async function fetchQuestions(language, level) {
    showLoading();
    state.loading=true;
    const res=await fetch("/start_quiz", {
        method: "POST",
        body: JSON.stringify({ language, level, username: state.user }),
        headers: {
            "Content-Type": "application/json"
        }
    });

    const data=await res.json();

    state.questions=data.questions;
    renderQuestion();
    startTimer();

    state.loading=false;
    hideLoading();
}

function renderQuestion() {
    const currentQuestion=state.questions[state.currentQuestionIndex];

    elements.questionText.textContent=currentQuestion.question;
    elements.currentQuestionDisplay.textContent=`Question: ${state.currentQuestionIndex+1}/${state.questions.length}`;

    clearChildren(elements.optionsContainer);

    currentQuestion.options.forEach((option, index) => {
        const optionBtn=document.createElement('button');
        optionBtn.classList.add('option-btn');
        optionBtn.textContent=option;
        optionBtn.addEventListener('click', () => selectOption(optionBtn, index));
        elements.optionsContainer.appendChild(optionBtn);
    });

    if (state.currentQuestionIndex===state.questions.length-1) {
        hideElement(elements.nextQuestionBtn);
        showElement(elements.submitQuizBtn);
    } else {
        showElement(elements.nextQuestionBtn);
        hideElement(elements.submitQuizBtn);
    }
}

function selectOption(selectedButton, optionIndex) {
    const optionButtons=elements.optionsContainer.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => btn.classList.remove('selected'));
    selectedButton.classList.add('selected');

    state.userAnswers[state.currentQuestionIndex]=optionIndex;
}

function nextQuestion() {
    if (state.currentQuestionIndex<state.questions.length-1) {
        state.currentQuestionIndex++;
        renderQuestion();
    }
}

function submitQuiz() {
    clearInterval(state.timer);

    const correctAnswers=state.questions.filter((q, index) =>
        state.userAnswers[index]===state.questions[index].options.indexOf(q.answer)
    ).length;

    const scorePercentage=(correctAnswers/state.questions.length)*100;

    if (scorePercentage>=60) {
        unlockNextLevel(state.selectedLanguage, state.selectedLevel);
    }

    hideElement(elements.quizSection);
    showElement(elements.resultsSection);

    elements.scoreDisplay.textContent=`Score: ${correctAnswers}/${state.questions.length} (${scorePercentage.toFixed(2)}%)`;

    elements.performanceMessage.textContent=
        scorePercentage>=80? 'Excellent work! 🏆':
            scorePercentage>=60? 'Good job! Keep practicing.':
                'Need more practice. Don\'t give up!';

    elements.restartQuizBtn.onclick=restartQuiz;

    if (scorePercentage>=60&&state.selectedLevel<10) {
        showElement(elements.nextLevelBtn);
        elements.nextLevelBtn.onclick=() => {
            setupLevelSelection();
            restartQuiz();
        };
    } else {
        hideElement(elements.nextLevelBtn);
    }
}

function restartQuiz() {
    state.questions=[];
    state.currentQuestionIndex=0;
    state.userAnswers=[];
    state.timer=null;
    hideElement(elements.resultsSection);
    showElement(elements.levelSelection);
}

function startTimer() {
    let timeLeft=600;

    state.timer=setInterval(() => {
        const minutes=Math.floor(timeLeft/60);
        const seconds=timeLeft%60;

        elements.timerDisplay.textContent=`Time: ${minutes}:${seconds<10? '0':''}${seconds}`;

        if (timeLeft<=0) {
            clearInterval(state.timer);
            submitQuiz();
        }

        timeLeft--;
    }, 1000);
}

function setupEventListeners() {
    elements.startButton.addEventListener('click', handleLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.nextQuestionBtn.addEventListener('click', nextQuestion);
    elements.submitQuizBtn.addEventListener('click', submitQuiz);

    setupLanguageSelection();
}

function initApp() {
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', initApp);