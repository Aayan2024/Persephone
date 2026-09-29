export type MachineType = 'DFA' | 'NFA' | 'PDA' | 'TM';

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
  // DFA/NFA: symbols like ['a','b'] or ['ε']
  // PDA: [{ input, pop, push }]
  // TM: [{ read, write, move: 'L'|'R' }]
  symbols: string[];        // for DFA/NFA
  pdaRules?: PDARule[];     // for PDA
  tmRules?: TMRule[];       // for TM
}

export interface PDARule {
  input: string;   // symbol to read (ε for no read)
  pop: string;     // symbol to pop from stack (ε for no pop)
  push: string;    // symbol to push (ε for no push)
}

export interface TMRule {
  read: string;    // symbol to read
  write: string;   // symbol to write
  move: 'L' | 'R' | 'S'; // direction
}

export interface Automaton {
  id: string;
  name: string;
  type: MachineType;
  states: State[];
  transitions: Transition[];
  alphabet: string[];
  stackAlphabet?: string[];  // PDA
  tapeAlphabet?: string[];   // TM
  blankSymbol?: string;      // TM
}

// Simulation
export interface SimStep {
  stateId: string;
  inputPos: number;
  stack?: string[];        // PDA
  tape?: string[];         // TM
  tapeHead?: number;       // TM
  transitionId?: string;
  description: string;
  status: 'running' | 'accepted' | 'rejected' | 'dead';
  // NFA: multiple active states
  activeStates?: string[];
}

export interface SimResult {
  accepted: boolean;
  steps: SimStep[];
  reason: string;
}

// Canvas interaction
export type Tool = 'select' | 'state' | 'transition' | 'delete';

export interface CanvasState {
  tool: Tool;
  selectedStateId: string | null;
  transitionFromId: string | null;  // first click when drawing a transition
  pan: { x: number; y: number };
  zoom: number;
}
