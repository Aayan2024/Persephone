import type { Automaton, SimResult, SimStep } from './types';

const EPSILON = 'ε';

function greedyTokenize(input: string, automaton: Automaton): string[] {
  const allSymbols = new Set<string>();
  automaton.transitions.forEach(t =>
    t.symbols.forEach(s => { if (s !== EPSILON) allSymbols.add(s); })
  );
  const symbols = [...allSymbols].sort((a, b) => b.length - a.length);

  const tokens: string[] = [];
  let pos = 0;
  while (pos < input.length) {
    let matched = false;
    for (const sym of symbols) {
      if (input.startsWith(sym, pos)) {
        tokens.push(sym);
        pos += sym.length;
        matched = true;
        break;
      }
    }
    if (!matched) { tokens.push(input.slice(pos)); break; }
  }
  return tokens;
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
  const tokens = greedyTokenize(input, automaton);
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return { accepted: false, steps: [], reason: 'No start state defined.' };

  let current = epsilonClosure(new Set([startState.id]), automaton);
  steps.push({
    stateId: startState.id, activeStates: [...current], inputPos: 0,
    description: `Start — ε-closure = ${stateLabels(current, automaton)}  |  tokens: [${tokens.join(', ')}]`,
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
      ? `Accepted — accept states active: ${stateLabels(new Set(acceptingIds), automaton)}`
      : `Rejected — no active state is an accept state`,
    status: accepted ? 'accepted' : 'rejected',
  });

  return { accepted, steps, reason: accepted ? 'Accepted' : 'Rejected' };
}

export function acceptsNFA(automaton: Automaton, input: string): boolean {
  const result = simulateNFA(automaton, input);
  return result.accepted;
}
