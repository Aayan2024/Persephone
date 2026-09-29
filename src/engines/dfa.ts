import type { Automaton, SimResult, SimStep } from './types';

export function simulateDFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return {
      accepted: false,
      steps: [],
      reason: 'No start state defined.',
    };
  }

  let currentId = startState.id;

  steps.push({
    stateId: currentId,
    inputPos: 0,
    description: `Start in state ${startState.label}`,
    status: 'running',
  });

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const current = automaton.states.find(s => s.id === currentId)!;
    const transition = automaton.transitions.find(
      t => t.from === currentId && t.symbols.includes(ch)
    );

    if (!transition) {
      steps.push({
        stateId: currentId,
        inputPos: i + 1,
        description: `No transition from ${current.label} on '${ch}' — rejected`,
        status: 'dead',
      });
      return { accepted: false, steps, reason: `Dead state: no transition from ${current.label} on '${ch}'` };
    }

    const nextState = automaton.states.find(s => s.id === transition.to)!;
    steps.push({
      stateId: transition.to,
      inputPos: i + 1,
      transitionId: transition.id,
      description: `δ(${current.label}, ${ch}) → ${nextState.label}`,
      status: 'running',
    });
    currentId = transition.to;
  }

  const finalState = automaton.states.find(s => s.id === currentId)!;
  const accepted = finalState.isAccept;

  steps.push({
    stateId: currentId,
    inputPos: input.length,
    description: accepted
      ? `Accepted — ended in accept state ${finalState.label}`
      : `Rejected — ${finalState.label} is not an accept state`,
    status: accepted ? 'accepted' : 'rejected',
  });

  return {
    accepted,
    steps,
    reason: accepted
      ? `String accepted by state ${finalState.label}`
      : `String rejected — final state ${finalState.label} is not an accept state`,
  };
}

export function validateDFA(automaton: Automaton): string[] {
  const errors: string[] = [];
  const startStates = automaton.states.filter(s => s.isStart);

  if (startStates.length === 0) errors.push('No start state defined.');
  if (startStates.length > 1) errors.push('DFA must have exactly one start state.');
  if (automaton.states.filter(s => s.isAccept).length === 0)
    errors.push('No accept states defined.');

  // Check each state has exactly one transition per alphabet symbol
  for (const state of automaton.states) {
    for (const sym of automaton.alphabet) {
      const matches = automaton.transitions.filter(
        t => t.from === state.id && t.symbols.includes(sym)
      );
      if (matches.length === 0)
        errors.push(`State ${state.label}: missing transition on '${sym}'`);
      if (matches.length > 1)
        errors.push(`State ${state.label}: multiple transitions on '${sym}' (not deterministic)`);
    }
  }

  return errors;
}
