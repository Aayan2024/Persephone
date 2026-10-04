import type { Automaton, SimResult, SimStep } from './types';
import { greedyTokenize, symbolMatches, isEpsilon } from './symbols';

interface PDAConfig { stateId: string; inputPos: number; stack: string[]; }

export function simulatePDA(automaton: Automaton, input: string): SimResult {
  const steps: SimStep[] = [];
  const tokens = greedyTokenize(input, automaton);
  const startState = automaton.states.find(s => s.isStart);
  if (!startState) return { accepted: false, steps: [], reason: 'No start state defined.' };

  let configs: PDAConfig[] = [{ stateId: startState.id, inputPos: 0, stack: ['Z'] }];
  steps.push({
    stateId: startState.id, inputPos: 0, stack: ['Z'],
    description: `Start in ${startState.label}, stack: [Z]${tokens.length ? `  |  tokens: [${tokens.join(', ')}]` : ''}`,
    status: 'running',
  });

  const maxSteps = 1000;
  let stepCount = 0;

  while (configs.length > 0 && stepCount < maxSteps) {
    const nextConfigs: PDAConfig[] = [];
    for (const config of configs) {
      const state = automaton.states.find(s => s.id === config.stateId)!;
      const inputToken = config.inputPos < tokens.length ? tokens[config.inputPos] : '';
      const topOfStack = config.stack[config.stack.length - 1] ?? '';

      if (config.inputPos === tokens.length && state.isAccept) {
        steps.push({
          stateId: config.stateId, inputPos: config.inputPos, stack: [...config.stack],
          description: `Accepted — state ${state.label}, input consumed`,
          status: 'accepted',
        });
        return { accepted: true, steps, reason: `Accepted by state ${state.label}` };
      }

      const applicable = automaton.transitions.filter(t => {
        if (t.from !== config.stateId || !t.pdaRules) return false;
        return t.pdaRules.some(r => {
          const inputMatch = isEpsilon(r.input) || (inputToken !== '' && symbolMatches(r.input, inputToken));
          const stackMatch = isEpsilon(r.pop) || r.pop === topOfStack;
          return inputMatch && stackMatch;
        });
      });

      for (const trans of applicable) {
        for (const rule of (trans.pdaRules ?? [])) {
          const inputMatch = isEpsilon(rule.input) || (inputToken !== '' && symbolMatches(rule.input, inputToken));
          const stackMatch = isEpsilon(rule.pop) || rule.pop === topOfStack;
          if (!inputMatch || !stackMatch) continue;

          const newStack = [...config.stack];
          if (!isEpsilon(rule.pop)) newStack.pop();
          if (!isEpsilon(rule.push)) [...rule.push].reverse().forEach(ch => newStack.push(ch));

          const newPos = isEpsilon(rule.input) ? config.inputPos : config.inputPos + 1;
          const nextState = automaton.states.find(s => s.id === trans.to)!;
          steps.push({
            stateId: trans.to, inputPos: newPos, stack: [...newStack], transitionId: trans.id,
            description: `δ(${state.label}, ${isEpsilon(rule.input) ? 'ε' : rule.input}, ${isEpsilon(rule.pop) ? 'ε' : rule.pop}) → (${nextState.label}, ${isEpsilon(rule.push) ? 'ε' : rule.push})`,
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
    stateId: configs[0]?.stateId ?? '', inputPos: tokens.length, stack: configs[0]?.stack ?? [],
    description: 'Rejected — no accepting configuration reached',
    status: 'rejected',
  });
  return { accepted: false, steps, reason: 'Rejected — no accepting configuration reached' };
}
