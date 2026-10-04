import { useState } from 'react';
import type { Automaton } from '../engines/types';
import { acceptsDFA } from '../engines/dfa';
import { acceptsNFA } from '../engines/nfa';
import { simulatePDA } from '../engines/pda';
import { simulateTM } from '../engines/tm';

interface Props {
  automaton: Automaton;
  onClose: () => void;
}

interface BatchResult {
  input: string;
  accepted: boolean;
}

function runOne(automaton: Automaton, input: string): boolean {
  if (automaton.type === 'DFA') return acceptsDFA(automaton, input);
  if (automaton.type === 'NFA') return acceptsNFA(automaton, input);
  if (automaton.type === 'PDA') return simulatePDA(automaton, input).accepted;
  return simulateTM(automaton, input).accepted;
}

export default function BatchRun({ automaton, onClose }: Props) {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [ran, setRan] = useState(false);

  function handleRun() {
    const lines = inputText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const res: BatchResult[] = lines.map(input => ({
      input,
      accepted: runOne(automaton, input),
    }));
    setResults(res);
    setRan(true);
  }

  function handleClear() {
    setInputText('');
    setResults([]);
    setRan(false);
  }

  const accepted = results.filter(r => r.accepted).length;
  const rejected = results.filter(r => !r.accepted).length;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        boxShadow: '4px 4px 20px var(--shadow)',
        width: 540,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* Title bar */}
        <div style={{
          background: 'var(--accent)', color: 'var(--accent-fg)',
          padding: '4px 10px', fontSize: 12, fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <span>Multiple Run — {automaton.type}</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--accent-fg)',
              fontSize: 14, padding: '0 4px', minHeight: 'unset', lineHeight: 1,
            }}
          >✕</button>
        </div>

        <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          Enter one input string per line. Each string is tested against the {automaton.type}.
        </div>

        {/* Input area */}
        <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={'BL.SC.U4AIE24101\naab\n0101\n...'}
            style={{
              width: '100%',
              height: 120,
              fontFamily: 'monospace',
              fontSize: 12,
              background: 'var(--bg-canvas)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderLeftColor: 'var(--inset-border)',
              borderTopColor: 'var(--inset-border)',
              padding: '6px 8px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{
          padding: '0 12px 10px', display: 'flex', gap: 6, flexShrink: 0,
        }}>
          <button
            onClick={handleRun}
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', padding: '3px 16px' }}
          >
            ▶ Run All
          </button>
          <button onClick={handleClear}>Clear</button>
          <button onClick={onClose} style={{ marginLeft: 'auto' }}>Close</button>
        </div>

        {/* Results */}
        {ran && (
          <>
            {/* Summary */}
            <div style={{
              padding: '4px 12px 6px',
              borderTop: '1px solid var(--border)',
              fontSize: 11,
              display: 'flex', gap: 16,
              flexShrink: 0,
              background: 'var(--bg)',
            }}>
              <span>Total: <strong>{results.length}</strong></span>
              <span style={{ color: 'var(--accepted-stroke)' }}>Accepted: <strong>{accepted}</strong></span>
              <span style={{ color: 'var(--dead-stroke)' }}>Rejected: <strong>{rejected}</strong></span>
            </div>

            {/* Table */}
            <div style={{ overflowY: 'auto', flex: 1, borderTop: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', position: 'sticky', top: 0 }}>
                    <th style={{
                      textAlign: 'left', padding: '5px 12px',
                      borderBottom: '1px solid var(--border)',
                      fontWeight: 600, fontSize: 11, color: 'var(--text-muted)',
                      width: '60%',
                    }}>Input</th>
                    <th style={{
                      textAlign: 'center', padding: '5px 12px',
                      borderBottom: '1px solid var(--border)',
                      fontWeight: 600, fontSize: 11, color: 'var(--text-muted)',
                    }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                    >
                      <td style={{
                        padding: '5px 12px',
                        fontFamily: 'monospace',
                        color: 'var(--text)',
                        wordBreak: 'break-all',
                      }}>
                        {r.input || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>ε (empty)</span>}
                      </td>
                      <td style={{
                        padding: '5px 12px', textAlign: 'center',
                        fontWeight: 600, fontSize: 11,
                        color: r.accepted ? 'var(--accepted-stroke)' : 'var(--dead-stroke)',
                      }}>
                        {r.accepted ? '✓ Accepted' : '✕ Rejected'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
