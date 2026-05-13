import layout from "./layout";
import styles from "./style.css?inline";

import { palette, colorIndices } from "../data/defaultColors";

import { rgbToHex, hexToRgb, mix, StateStyle, ColorTransform } from "./colors";

const DEFAULT_STATE_STYLE: Required<StateStyle> = {
  base: "#ffffff", // if for some reason the style is missing.
  transforms: {
    0: [], // do nothing.
    1: [{ type: "mix", color: "#06c100", amount: 0.75 }],
    2: [{ type: "mix", color: "#ff0000", amount: 0.6 }],
  },
};

// defined slots inside the cell as strings.
type CellSlot = "topLeft" | "topCenter" | "topRight" | "center" | "bottom";

// loading of a flat array that maps to [0,118] # index 0 should be blank
type DataSource =
  | Array<string | number>
  | ((atomic: number) => string | number);

type CellInteractionMode = "normal" | "noHighlight" | "noInteractive";

export class PeriodicTable extends HTMLElement {
  private state = new Map<number, number>();
  private cells = new Map<number, HTMLElement>();
  private scheduled = false;

  private _fields?: Partial<Record<CellSlot, DataSource>>;

  private _stateCount = 3; // default, on and off.

  private cellModes = new Map<number, CellInteractionMode>();
  private noInteractiveCells = new Set<number>();
  private noHighlightCells = new Set<number>();

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

  setCellInteraction(ids: number[], mode: CellInteractionMode) {
    for (const id of ids) {
      this.cellModes.set(id, mode);

      const cell = this.cells.get(id);
      if (!cell) continue;

      this.applyCellMode(id, cell);
    }
  }

  private applyCellMode(id: number, el: HTMLElement) {
    const mode = this.cellModes.get(id) ?? "normal";

    el.classList.toggle(
      "no-highlight",
      mode === "noHighlight" || mode === "noInteractive",
    );

    el.classList.toggle("no-interaction", mode === "noInteractive");
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
    this.updateFields();
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

    const mode = this.cellModes.get(id) ?? "normal";

    if (mode === "noInteractive") return;

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
    if (overrides && key in overrides) {
      return overrides[key];
    }

    const paletteIndex = colorIndices[atomic];

    if (paletteIndex !== undefined && palette[paletteIndex]) {
      return palette[paletteIndex];
    }

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

  private updateFields() {
    for (const [atomic, el] of this.cells.entries()) {
      const topLeft = el.querySelector(".top-left");
      const topCenter = el.querySelector(".top-center");
      const topRight = el.querySelector(".top-right");
      const center = el.querySelector(".center");
      const bottom = el.querySelector(".bottom");

      if (topLeft) {
        topLeft.textContent = this.getFieldValue("topLeft", atomic);
      }

      if (topCenter) {
        topCenter.textContent = this.getFieldValue("topCenter", atomic);
      }

      if (topRight) {
        topRight.textContent = this.getFieldValue("topRight", atomic);
      }

      if (center) {
        center.textContent = this.getFieldValue("center", atomic);
      }

      if (bottom) {
        bottom.textContent = this.getFieldValue("bottom", atomic);
      }
    }
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

    const data = layout as [number, number][];
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

      this.applyCellMode(atomic, el);
    });
  }
}

customElements.define("periodic-table", PeriodicTable);
