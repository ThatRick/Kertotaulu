// app.ts
const colors = {
  // (ei pakollinen enää, mutta jätetty jos haluat myöhemmin)
} as const;

const availableTables = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type Mul = Readonly<{
  a : number;
  b : number;
}>;

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

document.addEventListener("DOMContentLoaded", () => {
  const setupArea = byId<HTMLDivElement>("setupArea");
  const toggles   = byId<HTMLDivElement>("toggleButtons");
  const startBtn  = byId<HTMLButtonElement>("startButton");

  const selected  = new Set<number>();

  toggles.innerHTML = availableTables
    .map(n => `<button class="toggle" type="button" data-n="${n}">${n}</button>`)
    .join("");

  toggles.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>("button[data-n]");
    if (!btn) return;

    const n    = Number(btn.dataset.n);
    const on   = btn.classList.toggle("is-on");

    on ? selected.add(n) : selected.delete(n);
    startBtn.disabled = selected.size === 0;
  });

  startBtn.disabled = true;
  startBtn.addEventListener("click", () => {
    setupArea.hidden = true;
    new Questionnaire([...selected].sort((a, b) => a - b));
  });
});

class Questionnaire {
  private ui = {
    questionArea : byId<HTMLDivElement>   ("questionArea"),
    info         : byId<HTMLSpanElement>  ("info"),
    timer        : byId<HTMLSpanElement>  ("timer"),
    question     : byId<HTMLParagraphElement>("question"),
    answerForm   : byId<HTMLFormElement>  ("answerForm"),
    answerInput  : byId<HTMLInputElement> ("answerInput"),
    answerBtn    : byId<HTMLButtonElement>("answerButton"),
    feedback     : byId<HTMLDivElement>   ("feedback"),
    reloadBtn    : byId<HTMLButtonElement>("reload"),
  } as const;

  private baseCount          = 0;
  private questions: Mul[]   = [];
  private index              = 0;

  private failed             = new Map<string, Mul>();

  private attempts           = 0;
  private totalMs            = 0;

  private startMs            = 0;
  private intervalId: number | null = null;

  private locked             = false;
  private flip               = false;

  constructor(private selectedTables: number[]) {
    // Data: aina valittu taulu = a, kerrotaan 2..10 = b
    for (const a of selectedTables) {
      for (const b of availableTables) {
        this.questions.push({ a, b });
      }
    }

    this.baseCount = this.questions.length;
    shuffle(this.questions);

    this.ui.answerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAnswer();
    });

    this.ui.reloadBtn.addEventListener("click", () => (location.reload(), false as any));

    this.ui.questionArea.hidden = false;
    this.show();
  }

  private get current() { return this.questions[this.index]; }

  private setTimer(ms: number) {
    this.ui.timer.textContent = String(Math.round(ms / 1000));
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

  private show() {
    this.locked = false;
    this.flip   = Math.random() < 0.5;

    const { a, b } = this.current;
    const left     = this.flip ? b : a;
    const right    = this.flip ? a : b;

    this.ui.info.textContent             = `laskutehtävä ${Math.min(this.index + 1, this.baseCount)}/${this.baseCount}:`;
    this.ui.question.textContent         = `${left} × ${right} =`;
    this.ui.question.dataset.state       = "";
    this.ui.answerInput.value            = "";
    this.ui.answerInput.focus();

    this.startTimer();
  }

  private next() {
    if (this.index >= this.questions.length - 1) return this.finish();
    this.index++;
    this.show();
  }

  private requeueCurrent() {
    // spaced repetition: työnnä muutaman kysymyksen päähän, ei heti perään
    const offset    = 3 + ((Math.random() * 3) | 0);         // 3..5
    const from      = this.index;
    const to        = Math.min(this.questions.length, from + offset);

    const [q]       = this.questions.splice(from, 1);
    this.questions.splice(to, 0, q);
    // index pysyy samassa: seuraava kysymys on nyt se joka tuli "tilalle"
  }

  private handleAnswer = () => {
    if (this.locked) return;

    const raw = this.ui.answerInput.value.trim();
    if (raw === "" || Number.isNaN(Number(raw))) return;

    this.locked = true;
    this.attempts++;

    const user        = Number(raw);
    const { a, b }    = this.current;
    const ok          = user === a * b;

    this.stopTimer();
    this.totalMs += (Date.now() - this.startMs);
    this.setTimer(this.totalMs);

    const left  = this.flip ? b : a;
    const right = this.flip ? a : b;

    this.ui.question.textContent   = `${left} × ${right} = ${user}  ${ok ? "OIKEIN!" : "VÄÄRIN"}`;
    this.ui.question.dataset.state = ok ? "ok" : "bad";

    if (!ok) this.failed.set(keyOf(this.current), this.current);

    window.setTimeout(() => {
      if (ok) {
        this.next();
      } else {
        this.requeueCurrent();
        this.show();
      }
    }, 900);
  };

  private finish() {
    this.stopTimer();

    const wrong             = this.failed.size;
    const correct           = this.baseCount - wrong;

    const avgPerQuestion    = (this.totalMs / this.baseCount) / 1000;
    const avgPerAttempt     = (this.totalMs / Math.max(1, this.attempts)) / 1000;
    const avgPerTable       = (this.totalMs / this.selectedTables.length) / 1000;

    const lines: string[] = [
      `Sait oikein ${correct}/${this.baseCount}. ${wrong === 0 ? "Hienoa!" : ""}`.trim(),
      `Aikaa: ${avgPerQuestion.toFixed(1)} s / tehtävä`,
      `Aikaa: ${avgPerAttempt.toFixed(1)} s / yritys`,
      `Aikaa: ${avgPerTable.toFixed(1)} s / valittu kertotaulu`,
    ];

    if (wrong) {
      lines.push("Näitä laskuja sinun kannattaa vielä harjoitella:");
      const failedSorted = [...this.failed.values()]
        .sort((x, y) => keyOf(x).localeCompare(keyOf(y)));

      for (const calc of failedSorted) {
        lines.push(`${calc.a} × ${calc.b} = ${calc.a * calc.b}`);
      }
    }

    this.ui.feedback.innerHTML = lines.map(t => `<p>${t}</p>`).join("");
    this.ui.reloadBtn.hidden   = false;

    // lukitse syöttö
    this.ui.answerInput.disabled = true;
    this.ui.answerBtn.disabled   = true;
  }
}
