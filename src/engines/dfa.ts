import type { Automaton, SimResult, SimStep } from './types';

// Input is comma-separated tokens e.g. "BL,SC,U4AIE,24,101"
// Each token is matched as a whole atomic symbol against transition labels.
function tokenize(input: string): string[] {
  if (input.trim() === '') return [];
  return input.split(',').map(s => s.trim()).filter(Boolean);
}

export function simulateDFA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const tokens = tokenize(input);
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return { accepted: false, steps: [], reason: 'No start state defined.' };
  }

  let currentId = startState.id;

  steps.push({
    stateId: currentId,
    inputPos: 0,
    description: `Start in state ${startState.label}`,
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
        reason: `Dead state: no transition from ${current.label} on '${token}'`,
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
    accepted,
    steps,
    reason: accepted
      ? `Accepted by state ${finalState.label}`
      : `Rejected — ${finalState.label} is not an accept state`,
  };
}

export function validateDFA(automaton: Automaton): string[] {
  const errors: string[] = [];
  const startStates = automaton.states.filter(s => s.isStart);
  if (startStates.length === 0) errors.push('No start state defined.');
  if (startStates.length > 1) errors.push('DFA must have exactly one start state.');
  if (automaton.states.filter(s => s.isAccept).length === 0)
    errors.push('No accept states defined.');
  return errors;
}
