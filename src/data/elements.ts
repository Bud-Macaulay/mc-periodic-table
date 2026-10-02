import {
  AtomicNumberToSymbol,
  PeriodicTable,
  elementGroups,
  elementBlocks,
  elementCategories,
  elementGroupBlocks,
  elementPhases,
  electronConfigurations,
  electronConfigSemantics,
  electronegativity as upstreamElectronegativity,
  elementAbundances,
  ionizationEnergies,
  electronAffinities,
  atomicRadii,
  covalentRadii as upstreamCovalentRadii,
  densities,
  meltingPoints,
  boilingPoints,
  molarHeats,
  discoveryYears,
  discoverers,
} from "matsci-parse/periodictable";

/**
 * Element data arrays indexed by atomic number (index 0 = placeholder),
 * converted from matsci-parse (the source of truth) via {@link zArray}.
 */

function zArray<T>(
  map: Readonly<Record<string, T>>,
  placeholder: T | null,
): (T | null)[] {
  const out: (T | null)[] = [placeholder];

  for (let z = 1; z <= 118; z++) {
    const sym = AtomicNumberToSymbol.get(z);
    out.push(sym === undefined ? placeholder : (map[sym] ?? null));
  }

  return out;
}

// Element symbols
export const symbols: string[] = [""];
for (let z = 1; z <= 118; z++) {
  symbols.push(AtomicNumberToSymbol.get(z) ?? "");
}

// Element names
export const names: string[] = [""];
for (let z = 1; z <= 118; z++) {
  names.push(PeriodicTable[z]?.name ?? "");
}

// Atomic masses (u)
export const masses: number[] = [0];
for (let z = 1; z <= 118; z++) {
  masses.push(PeriodicTable[z]?.mass ?? 0);
}

// Earth's crust abundance in mg/kg (ppm)
// Source: Wolfram Research ElementData via periodictable.com
// null indicates unknown or not applicable
export const abundance = zArray(elementAbundances, null);

// Element classification category (e.g. 'transition metal', 'noble gas', 'alkali metal')
export const category = zArray(elementCategories, null);

// Element group block classification from PubChem (e.g. 'Nonmetal', 'Transition metal', 'Noble gas')
export const groupBlock = zArray(elementGroupBlocks, null);

// Standard state / phase at STP (Solid, Liquid, Gas)
export const phase = zArray(elementPhases, null);

// Group number (1-18)
export const group = zArray(elementGroups, null);

// Electron block (s, p, d, f)
export const block = zArray(elementBlocks, null);

// Full electron configuration string
export const electronConfig = zArray(electronConfigurations, null);

// Electron configuration in noble gas shorthand notation
export const electronConfigSemantic = zArray(electronConfigSemantics, null);

// Electronegativity on Pauling scale
export const electronegativity = zArray(upstreamElectronegativity, null);

// First ionization energy (eV)
export const ionizationEnergy = zArray(ionizationEnergies, null);

// Electron affinity (eV)
export const electronAffinity = zArray(electronAffinities, null);

// Van der Waals atomic radius (pm)
export const atomicRadius = zArray(atomicRadii, null);

// from https://en.wikipedia.org/wiki/Covalent_radius
// Unknown values are null
export const covalentRadii: (number | null)[] = zArray(
  upstreamCovalentRadii,
  null,
);

// Density at STP (g/cm³)
export const density = zArray(densities, null);

// Melting point (K)
export const meltingPoint = zArray(meltingPoints, null);

// Boiling point (K)
export const boilingPoint = zArray(boilingPoints, null);

// Molar heat capacity (J/(mol·K))
export const molarHeat = zArray(molarHeats, null);

// Year the element was discovered (null for ancient elements)
export const yearDiscovered = zArray(discoveryYears, null);

// Person(s) who discovered the element
export const discoveredBy = zArray(discoverers, null);
