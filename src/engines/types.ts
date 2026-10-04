// FA = general Finite Automaton (non-deterministic by default, like JFLAP's default mode)
export type MachineType = 'FA' | 'DFA' | 'NFA' | 'PDA' | 'TM';

export interface State {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  symbols: string[];       // DFA/NFA/FA: e.g. ['a','b','0-9'] — each is a symbol or range
  pdaRules?: PDARule[];    // PDA
  tmRules?: TMRule[];      // TM
}

export interface PDARule {
  input: string;   // symbol to read (ε for no read)
  pop: string;     // symbol to pop from stack (ε for no pop)
  push: string;    // symbol to push (ε for no push)
}

export interface TMRule {
  read: string;        // symbol to read
  write: string;       // symbol to write
  move: 'L' | 'R' | 'S';
}

export interface Automaton {
  id: string;
  name: string;
  type: MachineType;
  states: State[];
  transitions: Transition[];
  alphabet: string[];
  stackAlphabet?: string[];
  tapeAlphabet?: string[];
  blankSymbol?: string;
}

export interface SimStep {
  stateId: string;
  inputPos: number;
  stack?: string[];
  tape?: string[];
  tapeHead?: number;
  transitionId?: string;
  description: string;
  status: 'running' | 'accepted' | 'rejected' | 'dead';
  activeStates?: string[];   // NFA/FA: multiple active states
}

export interface SimResult {
  accepted: boolean;
  steps: SimStep[];
  reason: string;
}

export type Tool = 'select' | 'state' | 'transition' | 'delete';
