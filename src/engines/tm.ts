import type { Automaton, SimResult, SimStep } from './types';

const BLANK = '_';
const MAX_STEPS = 10000;

export function simulateTM(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return { accepted: false, steps: [], reason: 'No start state defined.' };
  }

  // Initialize tape: input padded with blanks
  const tape: string[] = input.length > 0 ? [...input] : [BLANK];
  let head = 0;
  let currentId = startState.id;
  let stepCount = 0;

  steps.push({
    stateId: currentId,
    inputPos: head,
    tape: [...tape],
    tapeHead: head,
    description: `Start in ${startState.label}, head at position 0`,
    status: 'running',
  });

  while (stepCount < MAX_STEPS) {
    const state = automaton.states.find(s => s.id === currentId)!;

    // Accept/reject states
    if (state.isAccept) {
      steps.push({
        stateId: currentId,
        inputPos: head,
        tape: [...tape],
        tapeHead: head,
        description: `Accepted — halted in accept state ${state.label}`,
        status: 'accepted',
      });
      return { accepted: true, steps, reason: `Accepted by state ${state.label}` };
    }

    // Extend tape if needed
    while (head >= tape.length) tape.push(BLANK);
    if (head < 0) { tape.unshift(BLANK); head = 0; }

    const readSym = tape[head];

    // Find applicable transition
    const trans = automaton.transitions.find(t => {
      if (t.from !== currentId) return false;
      if (!t.tmRules) return false;
      return t.tmRules.some(r => r.read === readSym || r.read === '_');
    });

    if (!trans || !trans.tmRules) {
      steps.push({
        stateId: currentId,
        inputPos: head,
        tape: [...tape],
        tapeHead: head,
        description: `Rejected — no transition from ${state.label} on '${readSym}'`,
        status: 'rejected',
      });
      return { accepted: false, steps, reason: `Rejected — halted in non-accept state ${state.label}` };
    }

    const rule = trans.tmRules.find(r => r.read === readSym || r.read === '_')!;
    const nextState = automaton.states.find(s => s.id === trans.to)!;

    tape[head] = rule.write;
    const oldHead = head;
    if (rule.move === 'R') head++;
    else if (rule.move === 'L') head--;

    if (head < 0) { tape.unshift(BLANK); head = 0; }
    while (head >= tape.length) tape.push(BLANK);

    steps.push({
      stateId: trans.to,
      inputPos: head,
      tape: [...tape],
      tapeHead: head,
      transitionId: trans.id,
      description: `δ(${state.label}, ${readSym}) → (${nextState.label}, write '${rule.write}', move ${rule.move}) [pos ${oldHead} → ${head}]`,
      status: 'running',
    });

    currentId = trans.to;
    stepCount++;
  }

  return {
    accepted: false,
    steps,
    reason: `Halted after ${MAX_STEPS} steps — possible infinite loop`,
  };
}
