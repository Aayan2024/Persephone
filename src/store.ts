import { useReducer, useCallback } from 'react';
import type { Automaton, State, Transition, MachineType, SimResult, SimStep, PDARule, TMRule } from './engines/types';
import { simulateDFA } from './engines/dfa';
import { simulateNFA } from './engines/nfa';
import { simulatePDA } from './engines/pda';
import { simulateTM } from './engines/tm';

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── App State ─────────────────────────────────

export interface AppState {
  automaton: Automaton;
  simResult: SimResult | null;
  simStepIndex: number;
  isPlaying: boolean;
  inputString: string;
  selectedIds: Set<string>;
  theme: 'light' | 'dark';
}

function makeEmptyAutomaton(type: MachineType = 'DFA'): Automaton {
  return {
    id: uid(),
    name: 'Untitled',
    type,
    states: [],
    transitions: [],
    alphabet: [],
  };
}

const initial: AppState = {
  automaton: makeEmptyAutomaton('DFA'),
  simResult: null,
  simStepIndex: -1,
  isPlaying: false,
  inputString: '',
  selectedIds: new Set(),
  theme: 'light',
};

// ── Actions ───────────────────────────────────

export type Action =
  | { type: 'ADD_STATE'; x: number; y: number }
  | { type: 'MOVE_STATE'; id: string; x: number; y: number }
  | { type: 'DELETE_STATE'; id: string }
  | { type: 'SET_START'; id: string }
  | { type: 'TOGGLE_ACCEPT'; id: string }
  | { type: 'RENAME_STATE'; id: string; label: string }
  | { type: 'ADD_TRANSITION'; from: string; to: string; symbols: string[]; pdaRules?: PDARule[]; tmRules?: TMRule[] }
  | { type: 'UPDATE_TRANSITION'; id: string; symbols: string[]; pdaRules?: PDARule[]; tmRules?: TMRule[] }
  | { type: 'DELETE_TRANSITION'; id: string }
  | { type: 'SET_MACHINE_TYPE'; machineType: MachineType }
  | { type: 'SET_NAME'; name: string }
  | { type: 'LOAD_AUTOMATON'; automaton: Automaton }
  | { type: 'CLEAR' }
  | { type: 'SET_INPUT'; input: string }
  | { type: 'RUN_SIMULATION' }
  | { type: 'STEP_FORWARD' }
  | { type: 'STEP_BACK' }
  | { type: 'RESET_SIMULATION' }
  | { type: 'SELECT_STATE'; id: string; multi: boolean }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'AUTO_LAYOUT' };

// ── Reducer ───────────────────────────────────

function deriveAlphabet(transitions: Transition[]): string[] {
  const syms = new Set<string>();
  transitions.forEach(t => t.symbols.forEach(s => { if (s !== 'ε') syms.add(s); }));
  return [...syms].sort();
}

let stateCounter = 0;

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case 'ADD_STATE': {
      const id = uid();
      const label = 'q' + stateCounter++;
      const newState: State = {
        id, label,
        x: action.x, y: action.y,
        isStart: state.automaton.states.length === 0,
        isAccept: false,
      };
      const states = [...state.automaton.states, newState];
      return { ...state, automaton: { ...state.automaton, states } };
    }

    case 'MOVE_STATE': {
      const states = state.automaton.states.map(s =>
        s.id === action.id ? { ...s, x: action.x, y: action.y } : s
      );
      return { ...state, automaton: { ...state.automaton, states } };
    }

    case 'DELETE_STATE': {
      const states = state.automaton.states.filter(s => s.id !== action.id);
      const transitions = state.automaton.transitions.filter(
        t => t.from !== action.id && t.to !== action.id
      );
      return {
        ...state,
        automaton: { ...state.automaton, states, transitions, alphabet: deriveAlphabet(transitions) },
      };
    }

    case 'SET_START': {
      const states = state.automaton.states.map(s => ({ ...s, isStart: s.id === action.id }));
      return { ...state, automaton: { ...state.automaton, states } };
    }

    case 'TOGGLE_ACCEPT': {
      const states = state.automaton.states.map(s =>
        s.id === action.id ? { ...s, isAccept: !s.isAccept } : s
      );
      return { ...state, automaton: { ...state.automaton, states } };
    }

    case 'RENAME_STATE': {
      const states = state.automaton.states.map(s =>
        s.id === action.id ? { ...s, label: action.label } : s
      );
      return { ...state, automaton: { ...state.automaton, states } };
    }

    case 'ADD_TRANSITION': {
      const existing = state.automaton.transitions.find(
        t => t.from === action.from && t.to === action.to
      );
      let transitions: Transition[];
      if (existing) {
        const merged = [...new Set([...existing.symbols, ...action.symbols])];
        transitions = state.automaton.transitions.map(t =>
          t.id === existing.id
            ? { ...t, symbols: merged, pdaRules: action.pdaRules, tmRules: action.tmRules }
            : t
        );
      } else {
        const newTrans: Transition = {
          id: uid(),
          from: action.from,
          to: action.to,
          symbols: action.symbols,
          pdaRules: action.pdaRules,
          tmRules: action.tmRules,
        };
        transitions = [...state.automaton.transitions, newTrans];
      }
      const alphabet = deriveAlphabet(transitions);
      return { ...state, automaton: { ...state.automaton, transitions, alphabet } };
    }

    case 'UPDATE_TRANSITION': {
      const transitions = state.automaton.transitions.map(t =>
        t.id === action.id
          ? { ...t, symbols: action.symbols, pdaRules: action.pdaRules, tmRules: action.tmRules }
          : t
      );
      const alphabet = deriveAlphabet(transitions);
      return { ...state, automaton: { ...state.automaton, transitions, alphabet } };
    }

    case 'DELETE_TRANSITION': {
      const transitions = state.automaton.transitions.filter(t => t.id !== action.id);
      const alphabet = deriveAlphabet(transitions);
      return { ...state, automaton: { ...state.automaton, transitions, alphabet } };
    }

    case 'SET_MACHINE_TYPE': {
      return {
        ...state,
        automaton: { ...state.automaton, type: action.machineType },
        simResult: null,
        simStepIndex: -1,
      };
    }

    case 'SET_NAME': {
      return { ...state, automaton: { ...state.automaton, name: action.name } };
    }

    case 'LOAD_AUTOMATON': {
      stateCounter = action.automaton.states.length;
      return { ...state, automaton: action.automaton, simResult: null, simStepIndex: -1 };
    }

    case 'CLEAR': {
      stateCounter = 0;
      return { ...state, automaton: makeEmptyAutomaton(state.automaton.type), simResult: null, simStepIndex: -1 };
    }

    case 'SET_INPUT': {
      return { ...state, inputString: action.input, simResult: null, simStepIndex: -1 };
    }

    case 'RUN_SIMULATION': {
      const { automaton, inputString } = state;
      let result: SimResult;
      if (automaton.type === 'DFA') result = simulateDFA(automaton, inputString);
      else if (automaton.type === 'NFA') result = simulateNFA(automaton, inputString);
      else if (automaton.type === 'PDA') result = simulatePDA(automaton, inputString);
      else result = simulateTM(automaton, inputString);
      return { ...state, simResult: result, simStepIndex: 0 };
    }

    case 'STEP_FORWARD': {
      if (!state.simResult) {
        const next = reducer(state, { type: 'RUN_SIMULATION' });
        return { ...next, simStepIndex: 0 };
      }
      const max = state.simResult.steps.length - 1;
      return { ...state, simStepIndex: Math.min(state.simStepIndex + 1, max) };
    }

    case 'STEP_BACK': {
      return { ...state, simStepIndex: Math.max(state.simStepIndex - 1, 0) };
    }

    case 'RESET_SIMULATION': {
      return { ...state, simResult: null, simStepIndex: -1, isPlaying: false };
    }

    case 'SELECT_STATE': {
      if (action.multi) {
        const next = new Set(state.selectedIds);
        next.has(action.id) ? next.delete(action.id) : next.add(action.id);
        return { ...state, selectedIds: next };
      }
      return { ...state, selectedIds: new Set([action.id]) };
    }

    case 'CLEAR_SELECTION': {
      return { ...state, selectedIds: new Set() };
    }

    case 'TOGGLE_THEME': {
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    }

    case 'AUTO_LAYOUT': {
      const { states } = state.automaton;
      if (states.length === 0) return state;
      const cx = 500, cy = 350;
      const r = Math.min(300, 80 * states.length);
      const newStates = states.map((s, i) => {
        const angle = (i / states.length) * Math.PI * 2 - Math.PI / 2;
        return {
          ...s,
          x: Math.round(cx + r * Math.cos(angle)),
          y: Math.round(cy + r * Math.sin(angle)),
        };
      });
      return { ...state, automaton: { ...state.automaton, states: newStates } };
    }

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────

export function useStore() {
  const [state, dispatch] = useReducer(reducer, initial);

  const currentStep: SimStep | null =
    state.simResult && state.simStepIndex >= 0
      ? state.simResult.steps[state.simStepIndex] ?? null
      : null;

  const addState = useCallback((x: number, y: number) => dispatch({ type: 'ADD_STATE', x, y }), []);
  const moveState = useCallback((id: string, x: number, y: number) => dispatch({ type: 'MOVE_STATE', id, x, y }), []);
  const deleteState = useCallback((id: string) => dispatch({ type: 'DELETE_STATE', id }), []);
  const setStart = useCallback((id: string) => dispatch({ type: 'SET_START', id }), []);
  const toggleAccept = useCallback((id: string) => dispatch({ type: 'TOGGLE_ACCEPT', id }), []);
  const renameState = useCallback((id: string, label: string) => dispatch({ type: 'RENAME_STATE', id, label }), []);
  const addTransition = useCallback(
    (from: string, to: string, symbols: string[], pdaRules?: PDARule[], tmRules?: TMRule[]) =>
      dispatch({ type: 'ADD_TRANSITION', from, to, symbols, pdaRules, tmRules }),
    []
  );
  const updateTransition = useCallback(
    (id: string, symbols: string[], pdaRules?: PDARule[], tmRules?: TMRule[]) =>
      dispatch({ type: 'UPDATE_TRANSITION', id, symbols, pdaRules, tmRules }),
    []
  );
  const deleteTransition = useCallback((id: string) => dispatch({ type: 'DELETE_TRANSITION', id }), []);
  const setMachineType = useCallback((machineType: MachineType) => dispatch({ type: 'SET_MACHINE_TYPE', machineType }), []);
  const setName = useCallback((name: string) => dispatch({ type: 'SET_NAME', name }), []);
  const loadAutomaton = useCallback((automaton: Automaton) => dispatch({ type: 'LOAD_AUTOMATON', automaton }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const setInput = useCallback((input: string) => dispatch({ type: 'SET_INPUT', input }), []);
  const runSimulation = useCallback(() => dispatch({ type: 'RUN_SIMULATION' }), []);
  const stepForward = useCallback(() => dispatch({ type: 'STEP_FORWARD' }), []);
  const stepBack = useCallback(() => dispatch({ type: 'STEP_BACK' }), []);
  const resetSimulation = useCallback(() => dispatch({ type: 'RESET_SIMULATION' }), []);
  const selectState = useCallback((id: string, multi: boolean) => dispatch({ type: 'SELECT_STATE', id, multi }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
  const toggleTheme = useCallback(() => dispatch({ type: 'TOGGLE_THEME' }), []);
  const autoLayout = useCallback(() => dispatch({ type: 'AUTO_LAYOUT' }), []);

  return {
    state,
    currentStep,
    addState, moveState, deleteState, setStart, toggleAccept, renameState,
    addTransition, updateTransition, deleteTransition,
    setMachineType, setName, loadAutomaton, clear,
    setInput, runSimulation, stepForward, stepBack, resetSimulation,
    selectState, clearSelection, toggleTheme, autoLayout,
  };
}
