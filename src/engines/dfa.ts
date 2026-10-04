import type { Automaton, SimResult, SimStep } from './types';
import { greedyTokenize, symbolMatches, isEpsilon } from './symbols';

export function simulateDFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return { accepted: false, steps: [], reason: 'No start state defined.' };
  }

  const tokens = greedyTokenize(input, automaton);

  let currentId = startState.id;
  steps.push({
    stateId: currentId,
    inputPos: 0,
    description: `Start in state ${startState.label}${tokens.length ? `  |  tokens: [${tokens.join(', ')}]` : '  |  empty input'}`,
    status: 'running',
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const current = automaton.states.find(s => s.id === currentId)!;

    // Find matching transition — check each symbol with symbolMatches
    const transition = automaton.transitions.find(
      t => t.from === currentId && t.symbols.some(sym => !isEpsilon(sym) && symbolMatches(sym, token))
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
    const matchedSym = transition.symbols.find(sym => symbolMatches(sym, token))!;
    steps.push({
      stateId: transition.to,
      inputPos: i + 1,
      transitionId: transition.id,
      description: `δ(${current.label}, ${token}${matchedSym !== token ? ` via ${matchedSym}` : ''}) → ${nextState.label}`,
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

export function acceptsDFA(automaton: Automaton, input: string): boolean {
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return false;
  const tokens = greedyTokenize(input, automaton);
  let currentId = startState.id;
  for (const token of tokens) {
    const transition = automaton.transitions.find(
      t => t.from === currentId && t.symbols.some(sym => !isEpsilon(sym) && symbolMatches(sym, token))
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
