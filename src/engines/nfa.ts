import type { Automaton, SimResult, SimStep } from './types';

const EPSILON = 'ε';

function tokenize(input: string): string[] {
  if (input.trim() === '') return [];
  return input.split(',').map(s => s.trim()).filter(Boolean);
}

function epsilonClosure(stateIds: Set<string>, automaton: Automaton): Set<string> {
  const closure = new Set(stateIds);
  const stack = [...stateIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const t of automaton.transitions) {
      if (t.from === id && t.symbols.includes(EPSILON) && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return closure;
}

function move(stateIds: Set<string>, symbol: string, automaton: Automaton): Set<string> {
  const result = new Set<string>();
  for (const id of stateIds) {
    for (const t of automaton.transitions) {
      if (t.from === id && t.symbols.includes(symbol)) result.add(t.to);
    }
  }
  return result;
}

function stateLabels(ids: Set<string>, automaton: Automaton): string {
  return '{' + [...ids].map(id => automaton.states.find(s => s.id === id)?.label ?? id).sort().join(', ') + '}';
}

export function simulateNFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const tokens = tokenize(input);
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return { accepted: false, steps: [], reason: 'No start state defined.' };
  }

  let current = epsilonClosure(new Set([startState.id]), automaton);

  steps.push({
    stateId: startState.id,
    activeStates: [...current],
    inputPos: 0,
    description: `Start — ε-closure = ${stateLabels(current, automaton)}`,
    status: 'running',
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const moved = move(current, token, automaton);
    const next = epsilonClosure(moved, automaton);

    if (next.size === 0) {
      steps.push({
        stateId: '',
        activeStates: [],
        inputPos: i + 1,
        description: `No transitions on '${token}' from ${stateLabels(current, automaton)} — rejected`,
        status: 'dead',
      });
      return { accepted: false, steps, reason: `Dead — no active states after reading '${token}'` };
    }

    steps.push({
      stateId: [...next][0],
      activeStates: [...next],
      inputPos: i + 1,
      description: `Read '${token}': move → ${stateLabels(moved, automaton)}, ε-closure → ${stateLabels(next, automaton)}`,
      status: 'running',
    });

    current = next;
  }

  const accepted = [...current].some(id => automaton.states.find(s => s.id === id)?.isAccept);
  const acceptingIds = [...current].filter(id => automaton.states.find(s => s.id === id)?.isAccept);

  steps.push({
    stateId: acceptingIds[0] ?? [...current][0],
    activeStates: [...current],
    inputPos: tokens.length,
    description: accepted
      ? `Accepted — active accept states: ${stateLabels(new Set(acceptingIds), automaton)}`
      : `Rejected — no active state is an accept state`,
    status: accepted ? 'accepted' : 'rejected',
  });

  return { accepted, steps, reason: accepted ? 'Accepted' : 'Rejected' };
}
