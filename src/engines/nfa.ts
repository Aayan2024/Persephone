import type { Automaton, SimResult, SimStep } from './types';
import { greedyTokenize, symbolMatches, isEpsilon, EPSILON } from './symbols';

function epsilonClosure(stateIds: Set<string>, automaton: Automaton): Set<string> {
  const closure = new Set(stateIds);
  const stack = [...stateIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const t of automaton.transitions) {
      if (t.from === id && t.symbols.some(s => isEpsilon(s)) && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return closure;
}

function move(stateIds: Set<string>, token: string, automaton: Automaton): Set<string> {
  const result = new Set<string>();
  for (const id of stateIds) {
    for (const t of automaton.transitions) {
      if (t.from === id && t.symbols.some(sym => !isEpsilon(sym) && symbolMatches(sym, token))) {
        result.add(t.to);
      }
    }
  }
  return result;
}

function stateLabels(ids: Set<string>, automaton: Automaton): string {
  return '{' + [...ids]
    .map(id => automaton.states.find(s => s.id === id)?.label ?? id)
    .sort().join(', ') + '}';
}

export function simulateNFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const tokens = greedyTokenize(input, automaton);
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return { accepted: false, steps: [], reason: 'No start state defined.' };

  let current = epsilonClosure(new Set([startState.id]), automaton);
  steps.push({
    stateId: startState.id, activeStates: [...current], inputPos: 0,
    description: `Start — ε-closure = ${stateLabels(current, automaton)}${tokens.length ? `  |  tokens: [${tokens.join(', ')}]` : ''}`,
    status: 'running',
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const moved = move(current, token, automaton);
    const next = epsilonClosure(moved, automaton);

    if (next.size === 0) {
      steps.push({
        stateId: '', activeStates: [], inputPos: i + 1,
        description: `No transitions on '${token}' from ${stateLabels(current, automaton)} — rejected`,
        status: 'dead',
      });
      return { accepted: false, steps, reason: `Dead — no active states after '${token}'` };
    }

    steps.push({
      stateId: [...next][0], activeStates: [...next], inputPos: i + 1,
      description: `Read '${token}': move → ${stateLabels(moved, automaton)}, ε-closure → ${stateLabels(next, automaton)}`,
      status: 'running',
    });
    current = next;
  }

  const accepted = [...current].some(id => automaton.states.find(s => s.id === id)?.isAccept);
  const acceptingIds = [...current].filter(id => automaton.states.find(s => s.id === id)?.isAccept);

  steps.push({
    stateId: acceptingIds[0] ?? [...current][0], activeStates: [...current],
    inputPos: tokens.length,
    description: accepted
      ? `Accepted — accept states: ${stateLabels(new Set(acceptingIds), automaton)}`
      : `Rejected — no active state is an accept state`,
    status: accepted ? 'accepted' : 'rejected',
  });

  return { accepted, steps, reason: accepted ? 'Accepted' : 'Rejected' };
}

export function acceptsNFA(automaton: Automaton, input: string): boolean {
  return simulateNFA(automaton, input).accepted;
}

// NFA → DFA subset construction
export function nfaToDFA(automaton: Automaton): Automaton {
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return automaton;

  // Collect non-epsilon alphabet symbols (expand ranges)
  const alphabet = new Set<string>();
  automaton.transitions.forEach(t =>
    t.symbols.forEach(sym => { if (!isEpsilon(sym)) alphabet.add(sym); })
  );

  function uid() { return Math.random().toString(36).slice(2, 7); }
  function key(ids: Set<string>) { return [...ids].sort().join(','); }

  const startClosure = epsilonClosure(new Set([startState.id]), automaton);
  const queue: Set<string>[] = [startClosure];
  const visited = new Map<string, string>(); // key → new state id
  const newStates: import('./types').State[] = [];
  const newTransitions: import('./types').Transition[] = [];
  let idxX = 0, idxY = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const k = key(current);
    if (visited.has(k)) continue;

    const newId = uid();
    visited.set(k, newId);

    const label = [...current]
      .map(id => automaton.states.find(s => s.id === id)?.label ?? id)
      .sort().join('');

    const isStart = k === key(startClosure);
    const isAccept = [...current].some(id => automaton.states.find(s => s.id === id)?.isAccept);

    newStates.push({
      id: newId, label: `{${label}}`,
      x: 150 + (idxX++ % 4) * 180,
      y: 150 + idxY * 140,
      isStart, isAccept,
    });
    if (idxX % 4 === 0) idxY++;

    for (const sym of alphabet) {
      const moved = move(current, sym, automaton);
      if (moved.size === 0) continue;
      const next = epsilonClosure(moved, automaton);
      const nextKey = key(next);
      if (!visited.has(nextKey)) queue.push(next);
      newTransitions.push({
        id: uid(), from: newId, to: nextKey, symbols: [sym],
      });
    }
  }

  // Resolve transition `to` from key to actual id
  const resolved = newTransitions.map(t => ({
    ...t,
    to: visited.get(t.to) ?? t.to,
  }));

  const allSyms = [...alphabet];
  return {
    ...automaton,
    id: uid(), name: automaton.name + ' (DFA)',
    type: 'DFA',
    states: newStates,
    transitions: resolved,
    alphabet: allSyms,
  };
}
