import layout from "./layout.json";
import styles from "./style.css?inline";

import defaultColors from "../data/defaultColors";

import { rgbToHex, hexToRgb, mix, StateStyle, ColorTransform } from "./colors";

const MAX_STATE = 3;

const DEFAULT_STATE_STYLE: Required<StateStyle> = {
  base: "#ffffff", // if for some reason the style is missing.
  transforms: {
    0: [], // do nothing.

    1: [{ type: "mix", color: "#06c100", amount: 0.75 }],
    2: [{ type: "mix", color: "#ff0000", amount: 0.6 }],
    3: [{ type: "darken", amount: 0.2 }],
    4: [{ type: "lighten", amount: 0.25 }],
  },
};

type CellSlot = "topLeft" | "topCenter" | "topRight" | "center" | "bottom";

type DataSource =
  | Array<string | number>
  | ((atomic: number) => string | number);

export class PeriodicTable extends HTMLElement {
  private state = new Map<number, number>();
  private cells = new Map<number, HTMLElement>();
  private scheduled = false;

  private _fields?: Partial<Record<CellSlot, DataSource>>;

  private _stateCount = 3; // default, on and off.

  private nonInteractiveCells = new Set<number>();

  get stateCount() {
    return this._stateCount;
  }

  set stateCount(v: number) {
    this._stateCount = Math.max(1, v);

    for (const [id, value] of this.state) {
      if (value >= this._stateCount) {
        this.state.set(id, 0);
      }
    }

    this.render();
  }

  private _stateStyle?: StateStyle;

  private get resolvedStateStyle(): Required<StateStyle> {
    return {
      base: this._stateStyle?.base ?? DEFAULT_STATE_STYLE.base,
      transforms: {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        ...DEFAULT_STATE_STYLE.transforms,
        ...this._stateStyle?.transforms,
      },
    };
  }

  setCellInteraction(ids: number[], interactive: boolean) {
    for (const id of ids) {
      if (interactive) {
        this.nonInteractiveCells.delete(id);
      } else {
        this.nonInteractiveCells.add(id);
      }

      const cell = this.cells.get(id);
      if (!cell) continue;

      cell.classList.toggle("no-interaction", !interactive);
    }
  }

  set stateStyle(v: StateStyle | undefined) {
    this._stateStyle = v;
    this.render();
  }

  get fields() {
    return this._fields;
  }

  set fields(value) {
    this._fields = value;

    if (this.shadowRoot) {
      this.render();
    }
  }

  connectedCallback() {
    this.attachShadow({ mode: "open" });

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(styles);

    // attach stylesheet to shadow root
    this.shadowRoot!.adoptedStyleSheets = [sheet];

    this.render();
    this.shadowRoot!.addEventListener("click", this.onClick);
  }

  disconnectedCallback() {
    this.shadowRoot?.removeEventListener("click", this.onClick);
  }

  getState() {
    return Object.fromEntries(this.state);
  }

  get fBlockOffsetPx(): number {
    return Number(this.getAttribute("f-block-offset-px") ?? 0);
  }

  set fBlockOffsetPx(v: number) {
    this.setAttribute("f-block-offset-px", String(v));
    if (this.shadowRoot) this.render();
  }

  private getFieldValue(slot: CellSlot, atomic: number): string {
    const source = this.fields?.[slot];

    if (!source) return "";

    if (typeof source === "function") {
      return String(source(atomic) ?? "");
    }

    return String(source[atomic] ?? "");
  }

  onChange?: (state: Record<number, number>) => void;

  private onClick = (e: Event) => {
    const path = e.composedPath() as HTMLElement[];

    const el = path.find(
      (n) => n instanceof HTMLElement && n.dataset?.atomic,
    ) as HTMLElement | undefined;

    if (!el) return;

    const id = Number(el.dataset.atomic);

    if (this.nonInteractiveCells.has(id)) return;

    this.toggle(id);
  };

  private applyTransforms(base: string, transforms: ColorTransform[] = []) {
    let color = hexToRgb(base ?? "#ffffff");

    for (const t of transforms) {
      if (t.type === "mix") {
        color = mix(color, hexToRgb(t.color), t.amount);
      }

      if (t.type === "lighten") {
        color = mix(color, { r: 255, g: 255, b: 255 }, t.amount);
      }

      if (t.type === "darken") {
        color = mix(color, { r: 0, g: 0, b: 0 }, t.amount);
      }
    }

    return rgbToHex(color);
  }

  private getBaseColor(atomic: number): string {
    const key = String(atomic);

    const overrides = this.stateStyle?.baseByAtomic;
    if (overrides && key in overrides) return overrides[key];

    if (key in defaultColors) return defaultColors[key];

    return this.resolvedStateStyle.base;
  }

  private toggle(id: number) {
    const next = ((this.state.get(id) ?? 0) + 1) % this.stateCount;

    this.state.set(id, next);

    const cell = this.cells.get(id);
    if (!cell) return;

    cell.setAttribute("data-state", String(next));

    const base = this.getBaseColor(id);

    // state 0 = pure base color
    if (next === 0) {
      cell.style.background = base;
    } else {
      const transforms = this.resolvedStateStyle.transforms[next] ?? [];

      cell.style.background = this.applyTransforms(base, transforms);
    }

    this.scheduleNotify();
  }

  private scheduleNotify() {
    if (this.scheduled) return;

    this.scheduled = true;

    requestAnimationFrame(() => {
      this.scheduled = false;

      const snapshot = this.getState();

      this.onChange?.(snapshot);

      this.dispatchEvent(new CustomEvent("change", { detail: snapshot }));
    });
  }

  private renderCell(atomic: number) {
    return `
    <div class="slot top-left">
      ${this.getFieldValue("topLeft", atomic)}
    </div>

    <div class="slot top-center">
      ${this.getFieldValue("topCenter", atomic)}
    </div>

    <div class="slot top-right">
      ${this.getFieldValue("topRight", atomic)}
    </div>

    <div class="slot center">
      ${this.getFieldValue("center", atomic)}
    </div>

    <div class="slot bottom">
      ${this.getFieldValue("bottom", atomic)}
    </div>
  `;
  }

  private render() {
    const root = this.shadowRoot!;
    this.cells.clear();

    root.innerHTML = `
    <div id="grid"></div>
  `;

    const grid = root.querySelector("#grid")!;

    const data = layout as [number, number, number][];
    const fBlockRows = new Set([8, 9]);

    data.forEach(([row, col], index) => {
      const atomic = index + 1;
      const el = document.createElement("div");

      const base = this.getBaseColor(atomic);

      el.className = "cell";
      el.style.background = base;

      el.dataset.atomic = String(atomic);

      el.style.gridRow = String(row);
      el.style.gridColumn = String(col);

      const isFBlock = fBlockRows.has(row);
      if (isFBlock) {
        el.classList.add("f-block-row");
      }

      el.setAttribute("data-state", "0");
      el.innerHTML = this.renderCell(atomic);

      this.cells.set(atomic, el);
      grid.appendChild(el);

      if (this.nonInteractiveCells.has(atomic)) {
        el.classList.add("no-interaction");
      }
    });
  }
}

customElements.define("periodic-table", PeriodicTable);
