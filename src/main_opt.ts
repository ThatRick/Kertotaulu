const colors = {
  disabled:   "#DDD",
  enabled:    "#2A2",
  unselected: "#EEE",
  selected:   "#AAF",
  correct:    "#080",
  incorrect:  "#800",
  default:    "#000",
} as const;

const availableTables = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type Mul = Readonly<{ a: number; b: number }>;

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const shuffle = <T>(arr: T[]) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const keyOf = ({ a, b }: Mul) => `${a}×${b}`;

window.onload = () => {
  const setupArea         = byId<HTMLDivElement>("setupArea");
  const toggleButtonsArea = byId<HTMLDivElement>("toggleButtons");
  const startButton       = byId<HTMLButtonElement>("startButton");

  const selectedTables = new Set<number>();

  // Render toggle buttons as <button> so disabled/keyboard is sane
  toggleButtonsArea.innerHTML = availableTables
    .map(n => `<button type="button" data-n="${n}">${n}</button>`)
    .join("");

  // Apply initial style (matches old UI)
  Array.from(toggleButtonsArea.children).forEach(ch => {
    const el = ch as HTMLElement;
    el.style.backgroundColor = colors.unselected;
  });

  const setStartEnabled = (enabled: boolean) => {
    startButton.disabled = !enabled;
    startButton.style.backgroundColor = enabled ? colors.enabled : colors.disabled;
  };

  setStartEnabled(false);

  // Event delegation + closest()
  toggleButtonsArea.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>("[data-n]");
    if (!btn || !toggleButtonsArea.contains(btn)) return;

    const n = Number(btn.getAttribute("data-n"));
    const toggled = !btn.classList.contains("is-on");

    btn.classList.toggle("is-on", toggled);
    btn.style.backgroundColor = toggled ? colors.selected : colors.unselected;

    toggled ? selectedTables.add(n) : selectedTables.delete(n);
    setStartEnabled(selectedTables.size > 0);
  });

  startButton.onclick = () => {
    if (selectedTables.size === 0) return;

    setStartEnabled(false);
    setupArea.style.display = "none";

    new MultiplicationTablesQuestionnaire(
      Array.from(selectedTables).sort((a, b) => a - b)
    );
  };
};

class MultiplicationTablesQuestionnaire {
  private ui = {
    questionArea : byId<HTMLDivElement>("questionArea"),
    infoSpan     : byId<HTMLSpanElement>("info"),
    timerSpan    : byId<HTMLSpanElement>("timer"),
    questionPara : byId<HTMLParagraphElement>("question"),
    answerInput  : byId<HTMLInputElement>("answerInput"),
    answerButton : byId<HTMLButtonElement>("answerButton"),
    feedbackArea : byId<HTMLDivElement>("feedback"),
    reloadButton : byId<HTMLButtonElement>("reload"),
  } as const;

  private questions: Mul[] = [];
  private index = 0;

  private failed = new Map<string, Mul>();

  private attempts = 0;
  private totalMs = 0;

  private startMs = 0;
  private intervalId: number | null = null;

  private locked = false;
  private flip = false;

  constructor(private selectedTables: number[]) {
    // Data: a always comes from selected tables, b is 2..10
    for (const a of selectedTables) {
      for (const b of availableTables) {
        this.questions.push({ a, b });
      }
    }

    shuffle(this.questions);

    // Show UI area
    this.ui.questionArea.style.display = "block";
    this.ui.reloadButton.style.display = "none";

    // Bind handlers
    this.ui.answerButton.onclick = () => this.handleAnswer();
    this.ui.answerInput.onkeydown = (ev) => {
      if (ev.key === "Enter") this.handleAnswer();
    };

    this.showQuestion();
  }

  private get current() { return this.questions[this.index]; }

  private setTimer(ms: number) {
    this.ui.timerSpan.textContent = (ms / 1000).toFixed(0);
  }

  private stopTimer() {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private startTimer() {
    this.stopTimer();
    this.startMs = Date.now();

    this.intervalId = window.setInterval(() => {
      this.setTimer(this.totalMs + (Date.now() - this.startMs));
    }, 200);
  }

  private showQuestion() {
    this.locked = false;
    this.flip = Math.random() < 0.5;

    const { a, b } = this.current;
    const left  = this.flip ? b : a;
    const right = this.flip ? a : b;

    this.ui.infoSpan.textContent = `laskutehtävä ${this.index + 1}/${this.questions.length}:`;
    this.ui.questionPara.textContent = `${left} × ${right} =`;
    this.ui.questionPara.style.color = colors.default;

    this.ui.answerInput.value = "";
    this.ui.answerInput.focus();

    this.startTimer();
  }

  private nextQuestion() {
    if (this.index >= this.questions.length - 1) {
      this.finish();
    } else {
      this.index++;
      this.showQuestion();
    }
  }

  private requeueCurrent() {
    // spaced repetition: move current question 3..5 positions ahead
    const offset = 3 + ((Math.random() * 3) | 0); // 3..5
    const from = this.index;
    const to = Math.min(this.questions.length, from + offset);

    const [q] = this.questions.splice(from, 1);
    this.questions.splice(to, 0, q);
    // keep index same; next question is now the one that slid into this slot
  }

  private handleAnswer() {
    if (this.locked) return;

    const raw = this.ui.answerInput.value.trim();
    if (raw === "" || Number.isNaN(Number(raw))) return;

    this.locked = true;
    this.attempts++;

    const user = Number(raw);
    const { a, b } = this.current;

    const ok = user === a * b;

    this.stopTimer();
    this.totalMs += (Date.now() - this.startMs);
    this.setTimer(this.totalMs);

    const left  = this.flip ? b : a;
    const right = this.flip ? a : b;

    this.ui.questionPara.textContent = `${left} × ${right} = ${user}  ${ok ? "OIKEIN!" : "VÄÄRIN"}`;
    this.ui.questionPara.style.color = ok ? colors.correct : colors.incorrect;

    if (!ok) this.failed.set(keyOf(this.current), this.current);

    window.setTimeout(() => {
      if (ok) {
        this.nextQuestion();
      } else {
        this.requeueCurrent();
        this.showQuestion();
      }
    }, 900);
  }

  private finish() {
    this.stopTimer();

    const total = this.questions.length;
    const wrong = this.failed.size;
    const correct = total - wrong;

    const avgPerQuestion = (this.totalMs / total) / 1000;
    const avgPerAttempt  = (this.totalMs / Math.max(1, this.attempts)) / 1000;
    const avgPerTable    = (this.totalMs / this.selectedTables.length) / 1000;

    const lines: string[] = [
      `Sait oikein ${correct}/${total}. ${wrong === 0 ? "Hienoa!" : ""}`.trim(),
      `Aikaa keskimäärin ${avgPerQuestion.toFixed(1)} s / tehtävä`,
      `Aikaa keskimäärin ${avgPerAttempt.toFixed(1)} s / yritys`,
      `Aikaa keskimäärin ${avgPerTable.toFixed(1)} s / valittu kertotaulu`,
    ];

    if (wrong > 0) {
      lines.push("Näitä laskuja sinun kannattaa vielä harjoitella:");

      const failedSorted = [...this.failed.values()]
        .sort((x, y) => keyOf(x).localeCompare(keyOf(y)));

      for (const calc of failedSorted) {
        lines.push(`${calc.a} × ${calc.b} = ${calc.a * calc.b}`);
      }
    }

    // render
    this.ui.feedbackArea.innerHTML = "";
    for (const line of lines) {
      const p = document.createElement("p");
      p.textContent = line;
      this.ui.feedbackArea.appendChild(p);
    }

    this.ui.reloadButton.style.display = "block";
    this.ui.reloadButton.onclick = () => (location.reload(), false as any);

    // lock inputs
    this.ui.answerInput.disabled = true;
    this.ui.answerButton.disabled = true;
  }
}
