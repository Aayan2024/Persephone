import type { Automaton, SimResult, SimStep } from './types';

// Greedy tokenizer: at each position, try to match the longest transition symbol
// from the current state. No delimiter needed — symbols are matched greedily.
function greedyTokenize(input: string, automaton: Automaton): string[] | null {
  const allSymbols = new Set<string>();
  automaton.transitions.forEach(t => t.symbols.forEach(s => allSymbols.add(s)));
  const symbols = [...allSymbols].sort((a, b) => b.length - a.length); // longest first

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
    if (!matched) {
      // No symbol matched at this position — treat remaining as one unknown token
      tokens.push(input.slice(pos));
      break;
    }
  }

  return tokens;
}

export function simulateDFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return { accepted: false, steps: [], reason: 'No start state defined.' };
  }

  const tokens = greedyTokenize(input, automaton);
  if (!tokens) {
    return { accepted: false, steps: [], reason: 'Could not tokenize input.' };
  }

  let currentId = startState.id;

  steps.push({
    stateId: currentId,
    inputPos: 0,
    description: `Start in state ${startState.label}  |  tokens: [${tokens.join(', ')}]`,
    status: 'running',
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const current = automaton.states.find(s => s.id === currentId)!;
    const transition = automaton.transitions.find(
      t => t.from === currentId && t.symbols.includes(token)
    );

    if (!transition) {
      steps.push({
        stateId: currentId,
        inputPos: i + 1,
        description: `No transition from ${current.label} on '${token}' — rejected`,
        status: 'dead',
      });
      return {
        accepted: false, steps,
        reason: `Dead: no transition from ${current.label} on '${token}'`,
      };
    }

    const nextState = automaton.states.find(s => s.id === transition.to)!;
    steps.push({
      stateId: transition.to,
      inputPos: i + 1,
      transitionId: transition.id,
      description: `δ(${current.label}, ${token}) → ${nextState.label}`,
      status: 'running',
    });
    currentId = transition.to;
  }

  const finalState = automaton.states.find(s => s.id === currentId)!;
  const accepted = finalState.isAccept;

  steps.push({
    stateId: currentId,
    inputPos: tokens.length,
    description: accepted
      ? `Accepted — ended in accept state ${finalState.label}`
      : `Rejected — ${finalState.label} is not an accept state`,
    status: accepted ? 'accepted' : 'rejected',
  });

  return {
    accepted, steps,
    reason: accepted
      ? `Accepted by state ${finalState.label}`
      : `Rejected — ${finalState.label} is not an accept state`,
  };
}

// Fast accept/reject with no step recording — used for batch runs
export function acceptsDFA(automaton: Automaton, input: string): boolean {
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return false;

  const tokens = greedyTokenize(input, automaton);
  if (!tokens) return false;

  let currentId = startState.id;
  for (const token of tokens) {
    const transition = automaton.transitions.find(
      t => t.from === currentId && t.symbols.includes(token)
    );
    if (!transition) return false;
    currentId = transition.to;
  }

  return automaton.states.find(s => s.id === currentId)?.isAccept ?? false;
}

export function validateDFA(automaton: Automaton): string[] {
  const errors: string[] = [];
  if (!automaton.states.find(s => s.isStart)) errors.push('No start state defined.');
  if (!automaton.states.find(s => s.isAccept)) errors.push('No accept states defined.');
  return errors;
}
