const colors = {
    disabled: '#DDD',
    enabled: '#2A2',
    unselected: '#EEE',
    selected: '#AAF',
    correct: '#080',
    incorrect: '#800',
    default: '#000'
};
const availableTables = [2, 3, 4, 5, 6, 7, 8, 9];
window.onload = () => {
    const setupArea = document.getElementById('setupArea');
    const toggleButtonsArea = document.getElementById('toggleButtons');
    const startButton = document.getElementById('startButton');
    if (!(setupArea && toggleButtonsArea && startButton)) {
        throw new Error("HTML element not found!");
    }
    const selectedTables = new Set();
    availableTables.forEach(num => {
        toggleButtonsArea.appendChild(toggleButton(num.toString(), toggled => {
            (toggled) ? selectedTables.add(num) :
                selectedTables.delete(num);
            setStartButtonEnabled(selectedTables.size > 0);
        }));
    });
    function setStartButtonEnabled(enabled) {
        startButton.style.backgroundColor = enabled ? colors.enabled : colors.disabled;
        startButton.onclick = enabled ? start : null;
    }
    function start() {
        const numbers = Array.from(selectedTables.values());
        setStartButtonEnabled(false);
        setupArea.style.display = 'none';
        new MultiplicationTablesQuestionnaire(numbers);
    }
};
function toggleButton(titleText, callback) {
    const button = document.createElement('div');
    button.style.backgroundColor = colors.unselected;
    button.textContent = titleText;
    let toggled = false;
    button.onclick = () => {
        toggled = !toggled;
        button.style.backgroundColor = (toggled) ? colors.selected : colors.unselected;
        callback(toggled);
    };
    return button;
}
class MultiplicationTablesQuestionnaire {
    constructor(selectedTables) {
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
            this.answerCount++;
            setTimeout(() => {
                if (correctAnswer) {
                    this.nextQuestion();
                }
                else {
                    this.failed.add(this.currentQuestion);
                    this.showQuestion();
                }
            }, 2000);
        };
        this.questionArea = document.getElementById('questionArea');
        this.infoPara = document.getElementById('info');
        this.questionPara = document.getElementById('question');
        this.answerInput = document.getElementById('answerInput');
        this.answerButton = document.getElementById('answerButton');
        this.resultPara = document.getElementById('result');
        this.reloadButton = document.getElementById('reload');
        if (!(this.infoPara && this.questionPara && this.resultPara && this.answerInput && this.answerButton && this.questionArea)) {
            throw new Error("HTML Element not found!");
        }
        selectedTables.forEach(a => availableTables.forEach(b => this.questions.push((Math.random() > 0.5) ? { a, b } : { a: b, b: a })));
        this.shuffleArray(this.questions);
        this.showQuestion();
        this.enableAnswerHandling();
        this.questionArea.style.display = 'block';
    }
    get currentQuestion() { return this.questions[this.currentIndex]; }
    nextQuestion() {
        if (this.currentIndex >= this.questions.length - 1) {
            this.finish();
        }
        else {
            this.currentIndex++;
            this.showQuestion();
        }
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    showQuestion() {
        this.infoPara.textContent = `laskutehtävä ${this.currentIndex + 1}/${this.questions.length}:`;
        const { a, b } = this.currentQuestion;
        this.questionPara.textContent = `${a} × ${b} =`;
        this.questionPara.style.color = colors.default;
        this.answerInput.value = '';
    }
    enableAnswerHandling() {
        this.answerButton.onclick = this.handleAnswer;
        this.answerInput.onkeyup = ev => (ev.key == 'Enter') && this.handleAnswer();
    }
    finish() {
        this.resultPara.textContent = `Sait oikein ${this.questions.length - this.failed.size}/${this.questions.length}. ${(this.failed.size == 0) ? 'Hienoa!' : ''}`;
        this.reloadButton.style.display = 'block';
        this.reloadButton.onclick = () => {
            location.reload();
            return false;
        };
    }
}
