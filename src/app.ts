import './style.css';
import { type CarveStep, Maze } from './lib/grid';
import { GENERATORS, getGenerator } from './lib/generators';
import { makePRNG } from './lib/rng';
import { analyze, solve, type SolveResult } from './lib/solve';
import {
  clampSize,
  decodeConfig,
  encodeConfig,
  MAX_SEED,
  MAX_SIZE,
  type MazeConfig,
  MIN_SIZE,
} from './lib/share';
import { loadString, saveString } from './lib/storage';
import { icon } from './icons';

const UNIT = 10;

type Attrs = Record<string, string | number | boolean | null | undefined>;
interface ElOptions {
  class?: string;
  text?: string;
  html?: string;
  attrs?: Attrs;
  on?: Partial<Record<string, EventListener>>;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: ElOptions = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.html !== undefined) node.innerHTML = opts.html;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) {
      if (v !== null && v !== undefined && v !== false)
        node.setAttribute(k, v === true ? '' : String(v));
    }
  }
  if (opts.on) for (const [k, v] of Object.entries(opts.on)) if (v) node.addEventListener(k, v);
  for (const c of children) node.append(c);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined && v !== false)
      node.setAttribute(k, v === true ? '' : String(v));
  }
  return node;
}

const randomSeed = (): number => Math.floor(Math.random() * (MAX_SEED + 1));

export function mountApp(root: HTMLElement): void {
  const state = {
    config: initialConfig(),
    steps: [] as CarveStep[],
    maze: new Maze(1, 1),
    progress: 0,
    playing: false,
    showSolution: false,
    solution: null as SolveResult | null,
    speed: 35,
  };
  let raf = 0;
  let lastTime = 0;
  let acc = 0;

  // ---- SVG盤面 ----

  const boardHost = h('div', { class: 'board-host' });
  let wallsPath = svg('path', { class: 'walls' });
  let headRect = svg('rect', { class: 'head', width: UNIT, height: UNIT, opacity: 0 });
  let solutionLine = svg('polyline', {
    class: 'solution',
    points: '',
    fill: 'none',
    pathLength: 1,
  });

  function buildBoard(): void {
    const w = state.config.width;
    const hh = state.config.height;
    const board = svg('svg', {
      viewBox: `-2 -2 ${w * UNIT + 4} ${hh * UNIT + 4}`,
      class: 'maze',
      role: 'img',
      'aria-label': `${w}かける${hh}の迷路`,
      preserveAspectRatio: 'xMidYMid meet',
    });
    const bg = svg('rect', {
      x: 0,
      y: 0,
      width: w * UNIT,
      height: hh * UNIT,
      class: 'maze-bg',
      rx: 2,
    });
    headRect = svg('rect', { class: 'head', width: UNIT, height: UNIT, opacity: 0 });
    const start = svg('rect', {
      x: 2,
      y: 2,
      width: UNIT - 4,
      height: UNIT - 4,
      rx: 2,
      class: 'marker start',
    });
    const goal = svg('rect', {
      x: (w - 1) * UNIT + 2,
      y: (hh - 1) * UNIT + 2,
      width: UNIT - 4,
      height: UNIT - 4,
      rx: 2,
      class: 'marker goal',
    });
    wallsPath = svg('path', { class: 'walls' });
    solutionLine = svg('polyline', { class: 'solution', points: '', fill: 'none', pathLength: 1 });
    board.append(bg, headRect, start, goal, wallsPath, solutionLine);
    boardHost.replaceChildren(board);
  }

  function wallsD(): string {
    const w = state.config.width;
    const hh = state.config.height;
    let d = `M0 0H${w * UNIT}V${hh * UNIT}H0Z`;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        if (y > 0 && state.maze.hasWall(x, y, 1)) d += `M${x * UNIT} ${y * UNIT}h${UNIT}`;
        if (x > 0 && state.maze.hasWall(x, y, 8)) d += `M${x * UNIT} ${y * UNIT}v${UNIT}`;
      }
    }
    return d;
  }

  function renderMaze(): void {
    wallsPath.setAttribute('d', wallsD());
    if (state.playing && state.progress > 0 && state.progress < state.steps.length) {
      const s = state.steps[state.progress - 1]!;
      headRect.setAttribute('x', String(s.x * UNIT));
      headRect.setAttribute('y', String(s.y * UNIT));
      headRect.setAttribute('opacity', '1');
    } else {
      headRect.setAttribute('opacity', '0');
    }
  }

  function renderSolution(): void {
    if (state.showSolution && state.solution) {
      const points = state.solution.path
        .map((c) => `${c.x * UNIT + UNIT / 2},${c.y * UNIT + UNIT / 2}`)
        .join(' ');
      solutionLine.setAttribute('points', points);
      solutionLine.classList.add('is-shown');
    } else {
      solutionLine.classList.remove('is-shown');
      solutionLine.setAttribute('points', '');
    }
  }

  // ---- 生成と再生 ----

  function regenerate(autoplay = true): void {
    stop();
    const gen = getGenerator(state.config.algorithm) ?? GENERATORS[0]!;
    state.steps = gen.run(state.config.width, state.config.height, makePRNG(state.config.seed));
    state.maze = new Maze(state.config.width, state.config.height);
    state.progress = 0;
    state.solution = null;
    persist();
    buildBoard();
    renderMaze();
    renderSolution();
    clearStats();
    if (autoplay) play();
    else syncControls();
  }

  function stepsPerSecond(): number {
    const t = state.speed / 100;
    return Math.round(t * t * 1800) + 8;
  }

  function play(): void {
    if (state.progress >= state.steps.length) return;
    state.playing = true;
    lastTime = performance.now();
    acc = 0;
    syncControls();
    raf = requestAnimationFrame(tick);
  }

  function stop(): void {
    state.playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    syncControls();
  }

  function tick(now: number): void {
    acc += ((now - lastTime) / 1000) * stepsPerSecond();
    lastTime = now;
    let add = Math.floor(acc);
    acc -= add;
    while (add-- > 0 && state.progress < state.steps.length) {
      state.maze.applyStep(state.steps[state.progress]!);
      state.progress += 1;
    }
    renderMaze();
    if (state.progress >= state.steps.length) {
      finish();
      return;
    }
    if (state.playing) raf = requestAnimationFrame(tick);
  }

  function stepOnce(): void {
    stop();
    if (state.progress >= state.steps.length) return;
    state.maze.applyStep(state.steps[state.progress]!);
    state.progress += 1;
    renderMaze();
    if (state.progress >= state.steps.length) finish();
  }

  function finish(): void {
    state.playing = false;
    renderMaze();
    updateStats();
    if (state.showSolution) {
      state.solution = solve(state.maze);
      renderSolution();
    }
    syncControls();
  }

  function restart(): void {
    stop();
    state.maze = new Maze(state.config.width, state.config.height);
    state.progress = 0;
    state.solution = null;
    renderMaze();
    renderSolution();
    clearStats();
    play();
  }

  function toggleSolution(on: boolean): void {
    state.showSolution = on;
    if (on && state.progress >= state.steps.length) state.solution = solve(state.maze);
    renderSolution();
  }

  // ---- コントロールとパネル ----

  const playBtn = h('button', { class: 'play', attrs: { type: 'button' } });
  const algoSelect = h('select', {
    class: 'field',
    attrs: { 'aria-label': 'アルゴリズム' },
  }) as HTMLSelectElement;
  const algoDesc = h('p', { class: 'algo-desc' });
  const sizeRange = h('input', {
    class: 'range',
    attrs: { type: 'range', min: MIN_SIZE, max: MAX_SIZE, step: 1, 'aria-label': '大きさ' },
  }) as HTMLInputElement;
  const sizeValue = h('span', { class: 'value' });
  const speedRange = h('input', {
    class: 'range',
    attrs: { type: 'range', min: 1, max: 100, step: 1, 'aria-label': '速さ' },
  }) as HTMLInputElement;
  const solutionToggle = h('button', {
    class: 'toggle',
    attrs: { type: 'button' },
    html: `${icon('route')}<span>解答</span>`,
  });
  const shareStatus = h('span', {
    class: 'share-status',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  const statsList = h('dl', { class: 'stats' });

  function buildControls(): HTMLElement {
    for (const gen of GENERATORS) {
      const opt = h('option', { text: gen.name, attrs: { value: gen.id } });
      if (gen.id === state.config.algorithm) opt.selected = true;
      algoSelect.append(opt);
    }
    algoSelect.addEventListener('change', () => {
      state.config = { ...state.config, algorithm: algoSelect.value };
      updateDesc();
      regenerate();
    });

    sizeRange.value = String(state.config.width);
    sizeValue.textContent = `${state.config.width} × ${state.config.height}`;
    sizeRange.addEventListener('input', () => {
      const n = clampSize(Number(sizeRange.value));
      sizeValue.textContent = `${n} × ${n}`;
    });
    sizeRange.addEventListener('change', () => {
      const n = clampSize(Number(sizeRange.value));
      state.config = { ...state.config, width: n, height: n };
      regenerate();
    });

    speedRange.value = String(state.speed);
    speedRange.addEventListener('input', () => {
      state.speed = Number(speedRange.value);
    });

    playBtn.addEventListener('click', () => (state.playing ? stop() : play()));
    solutionToggle.addEventListener('click', () => {
      const next = !state.showSolution;
      solutionToggle.setAttribute('aria-pressed', String(next));
      solutionToggle.classList.toggle('is-active', next);
      toggleSolution(next);
    });

    const stepBtn = iconButton('step', 'ステップ', stepOnce);
    const restartBtn = iconButton('reset', '最初から', restart);
    const newBtn = h('button', {
      class: 'ghost',
      attrs: { type: 'button' },
      html: `${icon('dice')}<span>別の迷路</span>`,
      on: {
        click: () => {
          state.config = { ...state.config, seed: randomSeed() };
          regenerate();
        },
      },
    });
    const shareBtn = h('button', {
      class: 'ghost',
      attrs: { type: 'button' },
      html: `${icon('link')}<span>リンクをコピー</span>`,
      on: { click: copyLink },
    });

    updateDesc();

    return h('section', { class: 'controls panel' }, [
      h('div', { class: 'control-grid' }, [
        labeled('アルゴリズム', algoSelect),
        labeled('大きさ', withValue(sizeRange, sizeValue)),
        labeled('速さ', speedRange),
      ]),
      algoDesc,
      h('div', { class: 'transport' }, [playBtn, stepBtn, restartBtn, newBtn, solutionToggle]),
      h('div', { class: 'control-foot' }, [h('div', { class: 'share' }, [shareBtn, shareStatus])]),
      h('div', { class: 'stats-block' }, [h('h2', { text: '指標' }), statsList]),
    ]);
  }

  function updateDesc(): void {
    algoDesc.textContent = getGenerator(state.config.algorithm)?.description ?? '';
  }

  function clearStats(): void {
    statsList.replaceChildren(
      h('p', { class: 'stats-empty', text: '生成が終わると指標が出ます。' }),
    );
  }

  function updateStats(): void {
    const s = analyze(state.maze);
    const rows: Array<[string, string]> = [
      ['セル数', String(s.cells)],
      ['通路', String(s.passages)],
      ['行き止まり', String(s.deadEnds)],
      ['行き止まり率', `${Math.round(s.deadEndRatio * 100)}%`],
      ['最短手数', String(Math.max(0, s.solutionLength - 1))],
    ];
    statsList.replaceChildren(
      ...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]),
    );
  }

  function syncControls(): void {
    playBtn.innerHTML = state.playing
      ? `${icon('pause')}<span>一時停止</span>`
      : `${icon('play')}<span>生成</span>`;
    playBtn.setAttribute('aria-pressed', String(state.playing));
    const done = state.progress >= state.steps.length;
    playBtn.disabled = done && !state.playing;
  }

  async function copyLink(): Promise<void> {
    const url = `${location.origin}${location.pathname}#c=${encodeConfig(state.config)}`;
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = 'コピーしました';
    } catch {
      shareStatus.textContent = url;
    }
    window.setTimeout(() => {
      shareStatus.textContent = '';
    }, 2600);
  }

  function persist(): void {
    const encoded = encodeConfig(state.config);
    saveString(encoded);
    history.replaceState(null, '', `#c=${encoded}`);
  }

  function labeled(label: string, control: Node): HTMLDivElement {
    return h('div', { class: 'labeled' }, [
      h('span', { class: 'labeled-text', text: label }),
      control,
    ]);
  }

  function withValue(range: HTMLElement, value: HTMLElement): HTMLDivElement {
    return h('div', { class: 'range-row' }, [range, value]);
  }

  function iconButton(
    name: Parameters<typeof icon>[0],
    label: string,
    onClick: () => void,
  ): HTMLButtonElement {
    return h('button', {
      class: 'icon-btn',
      html: icon(name),
      attrs: { type: 'button', 'aria-label': label, title: label },
      on: { click: onClick },
    });
  }

  // ---- 組み立て ----

  const header = h('header', { class: 'site-header' }, [
    h('div', { class: 'brand' }, [
      h('span', { class: 'brand-mark', html: brandMark() }),
      h('div', {}, [
        h('span', { class: 'brand-name', text: 'meiro' }),
        h('span', { class: 'brand-tag', text: '迷路生成アルゴリズムの見比べ' }),
      ]),
    ]),
  ]);

  root.replaceChildren(
    header,
    h('main', { class: 'layout' }, [
      h('section', { class: 'panel panel-board' }, [boardHost]),
      buildControls(),
    ]),
  );

  regenerate();

  window.addEventListener('hashchange', () => {
    const shared = decodeConfig(location.hash);
    if (shared) {
      state.config = shared;
      algoSelect.value = shared.algorithm;
      sizeRange.value = String(shared.width);
      sizeValue.textContent = `${shared.width} × ${shared.height}`;
      updateDesc();
      regenerate();
    }
  });
}

function initialConfig(): MazeConfig {
  const fromHash = decodeConfig(location.hash);
  if (fromHash) return fromHash;
  const saved = loadString();
  if (saved) {
    const decoded = decodeConfig(saved);
    if (decoded) return decoded;
  }
  return { algorithm: 'backtracker', width: 20, height: 20, seed: randomSeed() };
}

function brandMark(): string {
  return (
    `<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="M5 5h10v8h-6v8h12" /><path d="M27 5v6h-6" /><path d="M19 27v-8h8" />` +
    `</svg>`
  );
}
