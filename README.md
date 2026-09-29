# Persephone

> **P**latform for **E**ducational **R**esearch and **S**imulation of **E**xecutable **P**ushdown, **H**altable, **O**r **N**ondeterministic **E**ngines.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)

**Persephone** is a modern, zero-install, web-native alternative to JFLAP. Built with TypeScript and React, it provides an intuitive canvas for constructing, simulating, and visualizing formal languages, finite automata, pushdown automata, and Turing machines directly in the browser.

---

## 💡 Why Persephone over JFLAP?

| Feature | JFLAP | Persephone |
| :--- | :--- | :--- |
| **Runtime** | Java Desktop (`.jar` dependency) | **100% Web-Native** (Runs in any browser) |
| **Sharing** | Manual XML file exports (`.jff`) | **Instant URL Permalinks** & JSON export |
| **UI / UX** | Legacy Java Swing (1990s style) | Modern Figma-like Canvas, Dark Mode, Gesture support |
| **Visualization** | Disconnected tree popups for NFAs | **In-place animated step-by-step path tracing** |
| **Export Options** | Low-res pixelated PNGs | **Vector SVG** & **TikZ / LaTeX** export for homework |

---

## 🛠️ Tech Stack

* **Frontend Framework:** React + Vite
* **Language:** TypeScript
* **State Management:** Custom Reducer / React Store
* **Core Engines:** `@persephone/engine` (DFA, NFA with $\epsilon$-closure, PDA, Turing Machine)

---

## 📁 Repository Structure

```text
persephone/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── store.ts
    ├── fileio.ts
    ├── components/
    │   └── MenuBar.tsx
    └── engine/
        ├── types.ts      # Core automata interfaces
        ├── dfa.ts        # DFA simulation engine
        ├── nfa.ts        # NFA engine with epsilon closures
        ├── pda.ts        # Pushdown automata stack logic
        └── tm.ts         # Multi-tape Turing machine engine
