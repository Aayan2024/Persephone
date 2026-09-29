import type { Automaton, SimResult, SimStep } from './types';

const EPSILON = 'ε';

interface PDAConfig {
  stateId: string;
  inputPos: number;
  stack: string[];
}

export function simulatePDA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const startState = automaton.states.find(s => s.isStart);

  if (!startState) {
    return { accepted: false, steps: [], reason: 'No start state defined.' };
  }

  // BFS over configurations to handle non-determinism
  let configs: PDAConfig[] = [{ stateId: startState.id, inputPos: 0, stack: ['Z'] }]; // Z = initial stack symbol

  steps.push({
    stateId: startState.id,
    inputPos: 0,
    stack: ['Z'],
    description: `Start in ${startState.label}, stack: [Z]`,
    status: 'running',
  });

  const maxSteps = 1000;
  let stepCount = 0;

  while (configs.length > 0 && stepCount < maxSteps) {
    const nextConfigs: PDAConfig[] = [];

    for (const config of configs) {
      const state = automaton.states.find(s => s.id === config.stateId)!;
      const inputSym = config.inputPos < input.length ? input[config.inputPos] : EPSILON;
      const topOfStack = config.stack[config.stack.length - 1] ?? EPSILON;

      // Check if accepted (end of input + accept state)
      if (config.inputPos === input.length && state.isAccept) {
        steps.push({
          stateId: config.stateId,
          inputPos: config.inputPos,
          stack: [...config.stack],
          description: `Accepted — state ${state.label}, input consumed, stack: [${config.stack.join(',')}]`,
          status: 'accepted',
        });
        return { accepted: true, steps, reason: `Accepted by state ${state.label}` };
      }

      // Find applicable transitions
      const applicable = automaton.transitions.filter(t => {
        if (t.from !== config.stateId) return false;
        if (!t.pdaRules) return false;
        return t.pdaRules.some(r => {
          const inputMatch = r.input === EPSILON || r.input === inputSym;
          const stackMatch = r.pop === EPSILON || r.pop === topOfStack;
          return inputMatch && stackMatch;
        });
      });

      for (const trans of applicable) {
        for (const rule of (trans.pdaRules ?? [])) {
          const inputMatch = rule.input === EPSILON || rule.input === inputSym;
          const stackMatch = rule.pop === EPSILON || rule.pop === topOfStack;
          if (!inputMatch || !stackMatch) continue;

          const newStack = [...config.stack];
          if (rule.pop !== EPSILON) newStack.pop();
          if (rule.push !== EPSILON) {
            // push can be multi-char like "AB" meaning push B then A
            [...rule.push].reverse().forEach(ch => newStack.push(ch));
          }

          const newPos = rule.input === EPSILON ? config.inputPos : config.inputPos + 1;
          const nextState = automaton.states.find(s => s.id === trans.to)!;

          const desc = `δ(${state.label}, ${rule.input === EPSILON ? 'ε' : rule.input}, ${rule.pop === EPSILON ? 'ε' : rule.pop}) → (${nextState.label}, ${rule.push === EPSILON ? 'ε' : rule.push})`;

          steps.push({
            stateId: trans.to,
            inputPos: newPos,
            stack: [...newStack],
            transitionId: trans.id,
            description: desc,
            status: 'running',
          });

          nextConfigs.push({ stateId: trans.to, inputPos: newPos, stack: newStack });
        }
      }
    }

    configs = nextConfigs;
    stepCount++;
  }

  steps.push({
    stateId: configs[0]?.stateId ?? '',
    inputPos: input.length,
    stack: configs[0]?.stack ?? [],
    description: 'Rejected — no accepting configuration reached',
    status: 'rejected',
  });

  return { accepted: false, steps, reason: 'Rejected — no accepting configuration reached' };
}
