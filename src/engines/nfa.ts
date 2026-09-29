import type { Automaton, SimResult, SimStep } from './types';

const EPSILON = 'ε';

function epsilonClosure(stateIds: Set<string>, automaton: Automaton): Set<string> {
  const closure = new Set(stateIds);
  const stack = [...stateIds];

  while (stack.length > 0) {
    const id = stack.pop()!;
    const epsTrans = automaton.transitions.filter(
      t => t.from === id && t.symbols.includes(EPSILON)
    );
    for (const t of epsTrans) {
      if (!closure.has(t.to)) {
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
    const matches = automaton.transitions.filter(
      t => t.from === id && t.symbols.includes(symbol)
    );
    for (const t of matches) result.add(t.to);
  }
  return result;
}

function stateLabels(ids: Set<string>, automaton: Automaton): string {
  return (
    '{' +
    [...ids]
      .map(id => automaton.states.find(s => s.id === id)?.label ?? id)
      .sort()
      .join(', ') +
    '}'
  );
}

export function simulateNFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
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

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const moved = move(current, ch, automaton);
    const next = epsilonClosure(moved, automaton);

    if (next.size === 0) {
      steps.push({
        stateId: '',
        activeStates: [],
        inputPos: i + 1,
        description: `No transitions on '${ch}' from ${stateLabels(current, automaton)} — rejected`,
        status: 'dead',
      });
      return { accepted: false, steps, reason: `Dead — no active states after reading '${ch}'` };
    }

    steps.push({
      stateId: [...next][0],
      activeStates: [...next],
      inputPos: i + 1,
      description: `Read '${ch}': move → ${stateLabels(moved, automaton)}, ε-closure → ${stateLabels(next, automaton)}`,
      status: 'running',
    });

    current = next;
  }

  const accepted = [...current].some(id => automaton.states.find(s => s.id === id)?.isAccept);
  const acceptingIds = [...current].filter(id => automaton.states.find(s => s.id === id)?.isAccept);

  steps.push({
    stateId: acceptingIds[0] ?? [...current][0],
    activeStates: [...current],
    inputPos: input.length,
    description: accepted
      ? `Accepted — active accept states: ${stateLabels(new Set(acceptingIds), automaton)}`
      : `Rejected — no active state is an accept state`,
    status: accepted ? 'accepted' : 'rejected',
  });

  return { accepted, steps, reason: accepted ? 'Accepted' : 'Rejected' };
}

export function nfaToDfa(automaton: Automaton): Automaton {
  // Subset construction
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return automaton;

  const startClosure = epsilonClosure(new Set([startState.id]), automaton);

  // Each DFA state is a set of NFA state IDs
  const dfaStateMap = new Map<string, Set<string>>(); // key -> NFA state set
  const queue: Set<string>[] = [startClosure];
  const visited = new Set<string>();

  const key = (ids: Set<string>) => [...ids].sort().join(',');

  const newStates: import('./types').State[] = [];
  const newTransitions: import('./types').Transition[] = [];
  let idCounter = 0;
  const stateIdMap = new Map<string, string>(); // key -> new state id

  while (queue.length > 0) {
    const current = queue.shift()!;
    const k = key(current);
    if (visited.has(k)) continue;
    visited.add(k);

    const newId = 'dfa_' + idCounter++;
    stateIdMap.set(k, newId);
    dfaStateMap.set(k, current);

    const label = [...current]
      .map(id => automaton.states.find(s => s.id === id)?.label ?? id)
      .sort()
      .join('');

    const isStart = k === key(startClosure);
    const isAccept = [...current].some(id => automaton.states.find(s => s.id === id)?.isAccept);

    newStates.push({ id: newId, label: `{${label}}`, x: 0, y: 0, isStart, isAccept });

    for (const sym of automaton.alphabet.filter(a => a !== EPSILON)) {
      const moved = move(current, sym, automaton);
      const next = epsilonClosure(moved, automaton);
      if (next.size === 0) continue;

      const nextKey = key(next);
      if (!visited.has(nextKey)) queue.push(next);

      // We'll link transitions after all states are created
      const transKey = `${k}__${sym}__${nextKey}`;
      newTransitions.push({
        id: transKey,
        from: newId,  // placeholder — will be re-keyed below
        to: nextKey,  // placeholder key, resolved after
        symbols: [sym],
      });
    }
  }

  // Resolve transition `to` keys to actual new IDs
  const resolved = newTransitions.map(t => ({
    ...t,
    to: stateIdMap.get(t.to) ?? t.to,
  }));

  return {
    ...automaton,
    id: automaton.id + '_dfa',
    name: automaton.name + ' (DFA)',
    type: 'DFA',
    states: newStates,
    transitions: resolved,
  };
}
