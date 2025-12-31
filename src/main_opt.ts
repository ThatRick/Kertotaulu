const availableTables = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type Mul      = Readonly<{ a: number; b: number }>;
type AppState = "SETUP" | "ASKING" | "FEEDBACK" | "FINISHED";

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HTML element not found: #${id}`);
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
  const ui = {
    setupArea   : byId<HTMLDivElement>("setupArea"),
    togglesArea : byId<HTMLDivElement>("toggleButtons"),
    startButton : byId<HTMLButtonElement>("startButton"),

    questionArea: byId<HTMLDivElement>("questionArea"),
    infoSpan    : byId<HTMLSpanElement>("info"),
    timerSpan   : byId<HTMLSpanElement>("timer"),
    questionPara: byId<HTMLParagraphElement>("question"),
    answerInput : byId<HTMLInputElement>("answerInput"),
    answerButton: byId<HTMLButtonElement>("answerButton"),
    feedbackArea: byId<HTMLDivElement>("feedback"),
    reloadButton: byId<HTMLButtonElement>("reload"),
  } as const;

  const selectedTables = new Set<number>();

  ui.togglesArea.innerHTML = availableTables
    .map(n => `<div class="toggle" data-n="${n}">${n}</div>`)
    .join("");

  ui.startButton.disabled = true;

  ui.togglesArea.addEventListener("click", (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>(".toggle[data-n]");
    if (!el || !ui.togglesArea.contains(el)) return;

    const n  = Number(el.dataset.n);
    const on = !el.classList.contains("is-selected");

    el.classList.toggle("is-selected", on);
    on ? selectedTables.add(n) : selectedTables.delete(n);

    ui.startButton.disabled = selectedTables.size === 0;
  });

  ui.startButton.addEventListener("click", () => {
    if (!selectedTables.size) return;
    ui.startButton.disabled = true;
    ui.setupArea.style.display = "none";
    new MultiplicationTablesApp(ui, [...selectedTables].sort((a, b) => a - b));
  });
};

class MultiplicationTablesApp {
  private state: AppState = "SETUP";

  private questions: Mul[] = [];
  private index = 0;

  private baseTotal = 0;
  private remaining = new Set<string>();

  private failed = new Map<string, Mul>();
  private attempts = 0;

  private totalMs = 0;
  private startMs = 0;
  private intervalId: number | null = null;

  private locked = false;
  private flip = false;

  constructor(
    private ui: {
      questionArea: HTMLDivElement;
      infoSpan: HTMLSpanElement;
      timerSpan: HTMLSpanElement;
      questionPara: HTMLParagraphElement;
      answerInput: HTMLInputElement;
      answerButton: HTMLButtonElement;
      feedbackArea: HTMLDivElement;
      reloadButton: HTMLButtonElement;
    },
    private selectedTables: number[]
  ) {
    this.questions = this.buildQuestions(selectedTables);
    shuffle(this.questions);

    this.baseTotal = this.questions.length;
    this.remaining = new Set(this.questions.map(keyOf));

    this.ui.questionArea.style.display = "block";
    this.ui.reloadButton.style.display = "none";

    this.ui.answerButton.onclick = () => this.submitAnswer();
    this.ui.answerInput.onkeydown = (e) => (e.key === "Enter") && this.submitAnswer();
    this.ui.reloadButton.onclick = () => (location.reload(), false as any);

    this.transition("ASKING");
  }

  private buildQuestions(selected: number[]) {
    const qs: Mul[] = [];
    for (const a of selected) {
      for (const b of availableTables) {
        qs.push({ a, b }); // a = chosen table, b = 2..10
      }
    }
    return qs;
  }

  private get current() { return this.questions[this.index]; }

  private transition(next: AppState, payload?: { ok?: boolean; user?: number }) {
    this.state = next;

    if (next === "ASKING")   return this.showQuestion();
    if (next === "FEEDBACK") return this.showFeedback(payload?.ok ?? false, payload?.user ?? 0);
    if (next === "FINISHED") return this.finish();
  }

  private setQuestionState(kind: "default" | "correct" | "incorrect") {
    const q = this.ui.questionPara;
    q.classList.remove("is-default", "is-correct", "is-incorrect");
    q.classList.add(`is-${kind}`);
  }

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

    const done = this.baseTotal - this.remaining.size;
    this.ui.infoSpan.textContent =
      `laskutehtävä ${this.index + 1}/${this.questions.length} (valmiina ${done}/${this.baseTotal}):`;


    this.ui.questionPara.textContent = `${left} × ${right} =`;
    this.setQuestionState("default");

    this.ui.answerInput.value = "";
    this.ui.answerInput.disabled = false;
    this.ui.answerButton.disabled = false;

    this.ui.answerInput.focus();
    this.startTimer();
  }

  private submitAnswer() {
    if (this.state !== "ASKING" || this.locked) return;

    const raw = this.ui.answerInput.value.trim();
    if (!raw) return;

    const user = Number(raw);
    if (!Number.isFinite(user) || !Number.isInteger(user)) return;

    this.locked = true;
    this.attempts++;

    const { a, b } = this.current;
    const ok = user === a * b;

    this.stopTimer();
    this.totalMs += (Date.now() - this.startMs);
    this.setTimer(this.totalMs);

    if (ok)  this.remaining.delete(keyOf(this.current));
    if (!ok) this.failed.set(keyOf(this.current), this.current);

    this.ui.answerInput.disabled = true;
    this.ui.answerButton.disabled = true;

    this.transition("FEEDBACK", { ok, user });
  }

  private showFeedback(ok: boolean, user: number) {
    const { a, b } = this.current;
    const left  = this.flip ? b : a;
    const right = this.flip ? a : b;

    this.ui.questionPara.textContent =
      `${left} × ${right} = ${user}  ${ok ? "OIKEIN!" : "VÄÄRIN"}`;
    this.setQuestionState(ok ? "correct" : "incorrect");

    window.setTimeout(() => {
      if (ok) this.advanceIndex();
      else    this.requeueCurrent();

      this.transition(this.remaining.size === 0 ? "FINISHED" : "ASKING");
    }, 1200);
  }

  private advanceIndex() {
    this.index = (this.index + 1) % this.questions.length;
  }

  private requeueCurrent() {
    // spaced repetition: move current question 3..5 positions ahead
    // bias toward middle so it won't "stick" at the end
    const offset = 3 + ((Math.random() * 3) | 0); // 3..5
    const from = this.index;

    const len = this.questions.length;
    const maxTo = len - 1;

    // Prefer not to push to the very end; keep a little air.
    const preferredTo = Math.min(maxTo - 1, from + offset);
    const jitter = ((Math.random() * 3) | 0) - 1; // -1..+1
    const to = Math.max(0, Math.min(maxTo - 1, preferredTo + jitter));

    const [q] = this.questions.splice(from, 1);
    this.questions.splice(to, 0, q);
    // index stays; another question slides into the current slot
  }

  private finish() {
    this.stopTimer();

    const total = this.baseTotal;
    const wrongEver = this.failed.size;

    const avgPerQuestion = (this.totalMs / total) / 1000;
    const avgPerAttempt  = (this.totalMs / Math.max(1, this.attempts)) / 1000;
    const avgPerTable    = (this.totalMs / this.selectedTables.length) / 1000;

    const lines: string[] = [
      `Sait kaikki ${total} laskua lopulta oikein. ${wrongEver === 0 ? "Hienoa!" : ""}`.trim(),
      ...(wrongEver ? [`Mokkasit ${wrongEver} eri laskua matkan varrella.`] : []),
      `Aikaa ${avgPerQuestion.toFixed(1)} s / tehtävä`,
      `Aikaa ${avgPerAttempt.toFixed(1)} s / yritys`,
      `Aikaa ${avgPerTable.toFixed(1)} s / valittu kertotaulu`,
    ];

    if (wrongEver) {
      lines.push("Näitä laskuja sinun kannattaa vielä harjoitella:");
      const failedSorted = [...this.failed.values()]
        .sort((x, y) => keyOf(x).localeCompare(keyOf(y)));

      for (const calc of failedSorted) {
        lines.push(`${calc.a} × ${calc.b} = ${calc.a * calc.b}`);
      }
    }

    this.ui.feedbackArea.innerHTML = lines.map(t => `<p>${t}</p>`).join("");
    this.ui.reloadButton.style.display = "block";
  }
}
