
const colors = {
    disabled:   '#DDD',
    enabled:    '#2A2',
    unselected: '#EEE',
    selected:   '#AAF',
    correct:    '#080',
    incorrect:  '#800',
    default:    '#000'
}

const availableTables = [2,3,4,5,6,7,8,9]

window.onload = () =>
{
    const setupArea = document.getElementById('setupArea') as HTMLDivElement
    const toggleButtonsArea = document.getElementById('toggleButtons') as HTMLDivElement
    const startButton = document.getElementById('startButton') as HTMLButtonElement
    
    if (!(setupArea && toggleButtonsArea && startButton)) {
        throw new Error("HTML element not found!")
    }

    const selectedTables = new Set<number>()

    availableTables.forEach(num => {
        toggleButtonsArea.appendChild(toggleButton(num.toString(), toggled => {
            (toggled) ? selectedTables.add(num) :
                        selectedTables.delete(num);
            setStartButtonEnabled(selectedTables.size > 0)
        }))
    })

    function setStartButtonEnabled(enabled: boolean) {
        startButton.style.backgroundColor = enabled ? colors.enabled : colors.disabled;
        startButton.onclick = enabled ? start : null;
    }

    function start() {
        const numbers = Array.from(selectedTables.values())
        setStartButtonEnabled(false)
        setupArea.style.display = 'none'
        new MultiplicationTablesQuestionnaire(numbers);
    }
}

function toggleButton(titleText: string, callback: (boolean) => void): HTMLElement {
    const button = document.createElement('div')
    button.style.backgroundColor = colors.unselected
    button.textContent = titleText
    let toggled = false
    button.onclick = () => {
        toggled = !toggled
        button.style.backgroundColor = (toggled) ? colors.selected : colors.unselected
        callback(toggled)
    }
    return button
}

interface IMultiplication {
    a: number,
    b: number
}

class MultiplicationTablesQuestionnaire
{
    questionArea: HTMLDivElement
    infoPara: HTMLParagraphElement
    questionPara: HTMLParagraphElement
    answerInput: HTMLInputElement
    answerButton: HTMLButtonElement
    resultPara: HTMLParagraphElement
    reloadButton: HTMLButtonElement
    
    questions: Array<IMultiplication> = []
    currentIndex: number = 0

    answerCount: number = 0
    failed: Set<IMultiplication> = new Set();

    constructor(selectedTables: number[])
    {
        this.questionArea = document.getElementById('questionArea') as HTMLDivElement
        this.infoPara = document.getElementById('info') as HTMLParagraphElement
        this.questionPara = document.getElementById('question') as HTMLParagraphElement
        this.answerInput = document.getElementById('answerInput') as HTMLInputElement
        this.answerButton = document.getElementById('answerButton') as HTMLButtonElement
        this.resultPara = document.getElementById('result') as HTMLParagraphElement
        this.reloadButton = document.getElementById('reload') as HTMLButtonElement
    
        if (!(this.infoPara && this.questionPara && this.resultPara && this.answerInput && this.answerButton && this.questionArea)) {
            throw new Error("HTML Element not found!")
        }

        selectedTables.forEach(a =>
            availableTables.forEach(b =>
                this.questions.push((Math.random() > 0.5) ? {a, b} : {a: b, b: a})))
        
        this.shuffleArray(this.questions)
        
        this.showQuestion()
        this.enableAnswerHandling()
        
        this.questionArea.style.display = 'block'
    }

    get currentQuestion() { return this.questions[this.currentIndex] }

    nextQuestion() {
        if (this.currentIndex >= this.questions.length - 1) {
            this.finish()
        } else {
            this.currentIndex++
            this.showQuestion()
        }
    }

    shuffleArray(array: Array<any>) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]
        }
    }

    showQuestion() {
        this.infoPara.textContent = `laskutehtävä ${this.currentIndex+1}/${this.questions.length}:`
        
        const {a, b} = this.currentQuestion
        this.questionPara.textContent = `${a} × ${b} =`
        this.questionPara.style.color = colors.default
        
        this.answerInput.value = ''
    }

    enableAnswerHandling() {
        this.answerButton.onclick = this.handleAnswer
        this.answerInput.onkeyup = ev => (ev.key == 'Enter') && this.handleAnswer();
    }

    handleAnswer = () => {
        if (isNaN(+this.answerInput.value)) return;
        const userAnswer = parseInt(this.answerInput.value)
        const {a, b} = this.currentQuestion
        const correctAnswer = (userAnswer == a * b)
        const feedback = correctAnswer ? 'OIKEIN!' : 'VÄÄRIN'
        this.questionPara.textContent += ' ' + userAnswer.toString() + '  ' + feedback
        this.questionPara.style.color = correctAnswer ? colors.correct : colors.incorrect
        this.answerCount++
        
        setTimeout(() => {
            if (correctAnswer) {
                this.nextQuestion()                 
            } else {
                this.failed.add(this.currentQuestion);
                this.showQuestion()
            }
        }, 2000)
    }

    finish() {
        this.resultPara.textContent = `Sait oikein ${this.questions.length - this.failed.size}/${this.questions.length}. ${(this.failed.size == 0) ? 'Hienoa!': ''}`
        this.reloadButton.style.display = 'block';
        this.reloadButton.onclick = () => {
            location.reload();
            return false;
        }
    }
}



