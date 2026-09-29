import type { Automaton } from '../engine/types';

// ── Save / Load JSON ──────────────────────────

export function saveAutomaton(automaton: Automaton): void {
  const json = JSON.stringify(automaton, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${automaton.name.replace(/\s+/g, '_')}.prsph.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadAutomaton(file: File): Promise<Automaton> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string) as Automaton;
        // Basic validation
        if (!data.states || !data.transitions || !data.type) {
          reject(new Error('Invalid Persephone file format.'));
        } else {
          resolve(data);
        }
      } catch {
        reject(new Error('Failed to parse file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

// ── SVG Export ────────────────────────────────

const STATE_R = 28;

export function exportSVG(automaton: Automaton, theme: 'light' | 'dark'): void {
  const bg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const fg = theme === 'dark' ? '#e0e0e0' : '#111111';
  const edgeColor = theme === 'dark' ? '#888888' : '#444444';
  const labelColor = theme === 'dark' ? '#cccccc' : '#333333';

  // Compute bounding box
  const xs = automaton.states.map(s => s.x);
  const ys = automaton.states.map(s => s.y);
  const minX = Math.min(...xs) - 80;
  const minY = Math.min(...ys) - 80;
  const maxX = Math.max(...xs) + 80;
  const maxY = Math.max(...ys) + 80;
  const W = maxX - minX || 400;
  const H = maxY - minY || 300;

  const statesSVG = automaton.states.map(s => {
    const cx = s.x - minX;
    const cy = s.y - minY;
    const acceptRing = s.isAccept
      ? `<circle cx="${cx}" cy="${cy}" r="${STATE_R + 6}" fill="none" stroke="${fg}" stroke-width="1.5"/>`
      : '';
    const startArrow = s.isStart
      ? `<line x1="${cx - STATE_R - 24}" y1="${cy}" x2="${cx - STATE_R - 2}" y2="${cy}" stroke="${fg}" stroke-width="1.5" marker-end="url(#arrow)"/>`
      : '';
    return `
      ${startArrow}
      ${acceptRing}
      <circle cx="${cx}" cy="${cy}" r="${STATE_R}" fill="${bg}" stroke="${fg}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="13" fill="${fg}">${escapeXML(s.label)}</text>
    `;
  }).join('\n');

  const transMap = new Map<string, string[]>();
  automaton.transitions.forEach(t => {
    const key = `${t.from}__${t.to}`;
    const rev = `${t.to}__${t.from}`;
    const label = t.symbols.join(',');
    const entry = transMap.get(key) ?? [];
    entry.push(label);
    transMap.set(key, entry);
    // Mark if reverse exists
    if (!transMap.has(rev + '__curved')) {
      transMap.set(key + '__curved', [automaton.transitions.some(tr => tr.from === t.to && tr.to === t.from) ? 'yes' : 'no']);
    }
  });

  const edgesSVG = automaton.transitions.map(t => {
    const from = automaton.states.find(s => s.id === t.from)!;
    const to = automaton.states.find(s => s.id === t.to)!;
    if (!from || !to) return '';
    const label = t.symbols.join(',');

    const fx = from.x - minX, fy = from.y - minY;
    const tx = to.x - minX, ty = to.y - minY;

    if (t.from === t.to) {
      // Self loop
      return `
        <circle cx="${fx}" cy="${fy - STATE_R - 22}" r="20" fill="none" stroke="${edgeColor}" stroke-width="1.5"/>
        <text x="${fx}" y="${fy - STATE_R - 50}" text-anchor="middle" font-family="monospace" font-size="12" fill="${labelColor}">${escapeXML(label)}</text>
      `;
    }

    const hasReverse = automaton.transitions.some(tr => tr.from === t.to && tr.to === t.from);
    const dx = tx - fx, dy = ty - fy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist, uy = dy / dist;
    const nx = -uy, ny = ux;
    const curve = hasReverse ? 28 : 0;

    const sx = fx + ux * STATE_R, sy = fy + uy * STATE_R;
    const ex = tx - ux * STATE_R, ey = ty - uy * STATE_R;
    const cpx = (sx + ex) / 2 + nx * curve;
    const cpy = (sy + ey) / 2 + ny * curve;

    const midX = (sx + ex) / 2 + nx * (curve + 14);
    const midY = (sy + ey) / 2 + ny * (curve + 14);

    const d = curve
      ? `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`
      : `M ${sx} ${sy} L ${ex} ${ey}`;

    return `
      <path d="${d}" fill="none" stroke="${edgeColor}" stroke-width="1.5" marker-end="url(#arrow)"/>
      <text x="${midX}" y="${midY}" text-anchor="middle" font-family="monospace" font-size="12" fill="${labelColor}">${escapeXML(label)}</text>
    `;
  }).join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="${edgeColor}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  ${edgesSVG}
  ${statesSVG}
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${automaton.name.replace(/\s+/g, '_')}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Example automata ──────────────────────────

export function getExamples(): Record<string, Automaton> {
  return {
    'DFA: ends with b': {
      id: 'ex1',
      name: 'Ends with b',
      type: 'DFA',
      alphabet: ['a', 'b'],
      states: [
        { id: 's0', label: 'q0', x: 200, y: 300, isStart: true, isAccept: false },
        { id: 's1', label: 'q1', x: 500, y: 300, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 's0', to: 's0', symbols: ['a'] },
        { id: 't1', from: 's0', to: 's1', symbols: ['b'] },
        { id: 't2', from: 's1', to: 's0', symbols: ['a'] },
        { id: 't3', from: 's1', to: 's1', symbols: ['b'] },
      ],
    },
    'DFA: even number of a': {
      id: 'ex2',
      name: 'Even number of a',
      type: 'DFA',
      alphabet: ['a', 'b'],
      states: [
        { id: 's0', label: 'q0', x: 200, y: 300, isStart: true, isAccept: true },
        { id: 's1', label: 'q1', x: 500, y: 300, isStart: false, isAccept: false },
      ],
      transitions: [
        { id: 't0', from: 's0', to: 's1', symbols: ['a'] },
        { id: 't1', from: 's0', to: 's0', symbols: ['b'] },
        { id: 't2', from: 's1', to: 's0', symbols: ['a'] },
        { id: 't3', from: 's1', to: 's1', symbols: ['b'] },
      ],
    },
    'NFA: contains ab': {
      id: 'ex3',
      name: 'Contains ab',
      type: 'NFA',
      alphabet: ['a', 'b'],
      states: [
        { id: 's0', label: 'q0', x: 150, y: 300, isStart: true, isAccept: false },
        { id: 's1', label: 'q1', x: 400, y: 300, isStart: false, isAccept: false },
        { id: 's2', label: 'q2', x: 650, y: 300, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 's0', to: 's0', symbols: ['a', 'b'] },
        { id: 't1', from: 's0', to: 's1', symbols: ['a'] },
        { id: 't2', from: 's1', to: 's2', symbols: ['b'] },
        { id: 't3', from: 's2', to: 's2', symbols: ['a', 'b'] },
      ],
    },
  };
}
