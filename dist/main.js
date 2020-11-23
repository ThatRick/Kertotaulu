const colors = {
    disabled: '#DDD',
    enabled: '#2F2',
    unselected: '#EEE',
    selected: '#AAF',
    correct: '#080',
    incorrect: '#800',
    default: '#000'
};
const availableTables = [2, 3, 4, 5, 6, 7, 8, 9];
window.onload = () => {
    const selectedTables = new Set();
    const setupArea = document.getElementById('setupArea');
    if (!setupArea) {
        throw new Error("HTML element 'setupArea' not found!");
    }
    // Select tables area
    const selectTablesArea = document.createElement('div');
    selectTablesArea.className = 'selectButtonArea';
    setupArea.appendChild(selectTablesArea);
    // Make start button
    const startButton = document.createElement('button');
    startButton.className = 'startButton';
    startButton.textContent = 'Aloita';
    function start() {
        const numbers = Array.from(selectedTables.values());
        disableStartButton();
        setupArea.style.display = 'none';
        new MultiplicationTablesQuestionnaire(numbers);
    }
    function enableStartButton() {
        startButton.style.backgroundColor = colors.enabled;
        startButton.onclick = start;
    }
    function disableStartButton() {
        startButton.style.backgroundColor = colors.disabled;
        startButton.onclick = null;
    }
    // make toggle buttons
    availableTables.forEach(num => {
        selectTablesArea.appendChild(toggleButton(num.toString(), (toggled) => {
            (toggled) ? selectedTables.add(num) :
                selectedTables.delete(num);
            (selectedTables.size > 0) ? enableStartButton() :
                disableStartButton();
        }));
    });
    setupArea.appendChild(startButton);
};
function toggleButton(titleText, callback) {
    const button = document.createElement('div');
    button.style.backgroundColor = colors.unselected;
    button.className = 'selectButton';
    button.textContent = titleText;
    let toggled = false;
    button.onclick = () => {
        toggled = !toggled;
        button.style.backgroundColor = (toggled) ?
            colors.selected : colors.unselected;
        callback(toggled);
    };
    return button;
}
class MultiplicationTablesQuestionnaire {
    constructor(tables) {
        this.questions = [];
        this.currentIndex = 0;
        this.answerCount = 0;
        this.failed = new Set();
        this.handleAnswer = () => {
            if (isNaN(+this.answerInput.value))
                return;
            const userAnswer = parseInt(this.answerInput.value);
            const { a, b } = this.currentQuestion;
            const correctAnswer = (userAnswer == a * b);
            const feedback = correctAnswer ? 'OIKEIN!' : 'VÄÄRIN';
            this.questionPara.textContent += ' ' + userAnswer.toString() + '  ' + feedback;
            this.questionPara.style.color = correctAnswer ? colors.correct : colors.incorrect;
            setTimeout(() => {
                this.answerCount++;
                if (correctAnswer) {
                    this.nextQuestion();
                }
                else {
                    this.failed.add(this.currentQuestion);
                    this.askQuestion();
                }
            }, 2000);
        };
        this.questionArea = document.getElementById('questionArea');
        this.infoPara = document.getElementById('info');
        this.questionPara = document.getElementById('question');
        this.answerInput = document.getElementById('answerInput');
        this.answerButton = document.getElementById('answerButton');
        this.resultPara = document.getElementById('result');
        if (!(this.infoPara && this.questionPara && this.resultPara && this.answerInput && this.answerButton && this.questionArea)) {
            throw new Error("HTML Element not found!");
        }
        tables.forEach(a => availableTables.forEach(b => this.questions.push((Math.random() > 0.5) ? { a, b } : { a: b, b: a })));
        this.shuffleArray(this.questions);
        this.questionArea.style.display = 'block';
        this.enableAnswerHandling();
        this.askQuestion();
    }
    get currentQuestion() { return this.questions[this.currentIndex]; }
    nextQuestion() {
        if (this.currentIndex >= this.questions.length - 1) {
            this.finish();
        }
        else {
            this.currentIndex++;
            this.askQuestion();
        }
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    askQuestion() {
        this.infoPara.textContent = `laskutehtävä ${this.currentIndex + 1}/${this.questions.length}:`;
        const { a, b } = this.currentQuestion;
        this.questionPara.textContent = `${a} × ${b} =`;
        this.questionPara.style.color = colors.default;
        this.answerInput.value = '';
        this.answerInput.focus();
    }
    enableAnswerHandling() {
        this.answerButton.onclick = this.handleAnswer;
        this.answerInput.onkeyup = ev => (ev.key == 'Enter') && this.handleAnswer();
    }
    finish() {
        this.resultPara.textContent = `Sait oikein ${this.questions.length - this.failed.size}/${this.questions.length}. ${(this.failed.size == 0) ? 'Hienoa!' : ''}`;
    }
}
