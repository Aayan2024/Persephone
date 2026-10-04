import type { Automaton, SimResult, SimStep } from './types';
import { greedyTokenize, symbolMatches } from './symbols';

const BLANK = '_';
const MAX_STEPS = 10000;

export function simulateTM(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return { accepted: false, steps: [], reason: 'No start state defined.' };

  const tokens = input.trim() === '' ? [BLANK] : greedyTokenize(input, automaton);
  const tape: string[] = [...tokens];
  let head = 0;
  let currentId = startState.id;
  let stepCount = 0;

  steps.push({
    stateId: currentId, inputPos: head, tape: [...tape], tapeHead: head,
    description: `Start in ${startState.label}, head at 0, tape: [${tape.join('|')}]`,
    status: 'running',
  });

  while (stepCount < MAX_STEPS) {
    const state = automaton.states.find(s => s.id === currentId)!;

    if (state.isAccept) {
      steps.push({
        stateId: currentId, inputPos: head, tape: [...tape], tapeHead: head,
        description: `Accepted — halted in accept state ${state.label}`,
        status: 'accepted',
      });
      return { accepted: true, steps, reason: `Accepted by state ${state.label}` };
    }

    while (head >= tape.length) tape.push(BLANK);
    if (head < 0) { tape.unshift(BLANK); head = 0; }

    const readSym = tape[head];
    const trans = automaton.transitions.find(t => {
      if (t.from !== currentId || !t.tmRules) return false;
      return t.tmRules.some(r => symbolMatches(r.read, readSym) || r.read === BLANK);
    });

    if (!trans || !trans.tmRules) {
      steps.push({
        stateId: currentId, inputPos: head, tape: [...tape], tapeHead: head,
        description: `Rejected — no transition from ${state.label} on '${readSym}'`,
        status: 'rejected',
      });
      return { accepted: false, steps, reason: `Rejected — halted in non-accept state ${state.label}` };
    }

    const rule = trans.tmRules.find(r => symbolMatches(r.read, readSym) || r.read === BLANK)!;
    const nextState = automaton.states.find(s => s.id === trans.to)!;
    tape[head] = rule.write;
    const oldHead = head;
    if (rule.move === 'R') head++;
    else if (rule.move === 'L') head--;
    if (head < 0) { tape.unshift(BLANK); head = 0; }
    while (head >= tape.length) tape.push(BLANK);

    steps.push({
      stateId: trans.to, inputPos: head, tape: [...tape], tapeHead: head, transitionId: trans.id,
      description: `δ(${state.label}, ${readSym}) → (${nextState.label}, write '${rule.write}', ${rule.move}) [pos ${oldHead}→${head}]`,
      status: 'running',
    });
    currentId = trans.to;
    stepCount++;
  }

  return { accepted: false, steps, reason: `Halted after ${MAX_STEPS} steps — possible infinite loop` };
}
