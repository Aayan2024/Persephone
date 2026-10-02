import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Automaton, State, Transition, SimStep } from '../engines/types';

// ── Constants ─────────────────────────────────
const R = 28; // state radius

export type CanvasTool = 'select' | 'state' | 'transition' | 'delete';

interface Props {
  automaton: Automaton;
  tool: CanvasTool;
  currentStep: SimStep | null;
  onAddState: (x: number, y: number) => void;
  onMoveState: (id: string, x: number, y: number) => void;
  onDeleteState: (id: string) => void;
  onDeleteTransition: (id: string) => void;
  onSetStart: (id: string) => void;
  onToggleAccept: (id: string) => void;
  onRenameState: (id: string, label: string) => void;
  onAddTransition: (from: string, to: string, symbols: string[]) => void;
  onUpdateTransition: (id: string, symbols: string[]) => void;
}

interface CtxMenu {
  x: number;
  y: number;
  kind: 'state' | 'transition' | 'canvas';
  targetId: string;
}

interface TransModal {
  fromId: string;
  toId: string;
  existing?: Transition;
}

interface EditModal {
  transId: string;
  current: string;
  x: number;
  y: number;
}

export default function Canvas({
  automaton, tool, currentStep,
  onAddState, onMoveState, onDeleteState, onDeleteTransition,
  onSetStart, onToggleAccept, onRenameState,
  onAddTransition, onUpdateTransition,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [transFrom, setTransFrom] = useState<string | null>(null); // first state clicked for transition
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [transModal, setTransModal] = useState<TransModal | null>(null);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [transInput, setTransInput] = useState('');
  const [hoverState, setHoverState] = useState<string | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // ── SVG coordinate helper ──────────────────
  function svgXY(e: React.MouseEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function stateAt(x: number, y: number): State | undefined {
    return automaton.states.find(s => Math.hypot(s.x - x, s.y - y) <= R);
  }

  // ── Mouse down on SVG background ──────────
  function handleSVGMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setCtxMenu(null);
    const { x, y } = svgXY(e);
    const hit = stateAt(x, y);

    if (tool === 'state' && !hit) {
      onAddState(Math.round(x), Math.round(y));
      return;
    }
    if (tool === 'select' && !hit) {
      setTransFrom(null);
    }
    if (tool === 'transition' && !hit) {
      setTransFrom(null);
    }
  }

  // ── Mouse down on a state ──────────────────
  function handleStateMouseDown(e: React.MouseEvent, s: State) {
    e.stopPropagation();
    if (e.button !== 0) return;
    setCtxMenu(null);

    if (tool === 'delete') {
      onDeleteState(s.id);
      return;
    }
    if (tool === 'transition') {
      if (transFrom === null) {
        setTransFrom(s.id);
      } else {
        // Open modal to enter symbol
        const existing = automaton.transitions.find(t => t.from === transFrom && t.to === s.id);
        setTransModal({ fromId: transFrom, toId: s.id, existing });
        setTransInput(existing ? existing.symbols.join(',') : '');
        setTransFrom(null);
      }
      return;
    }
    if (tool === 'select') {
      setDragging({ id: s.id, ox: e.clientX - s.x, oy: e.clientY - s.y });
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const x = Math.round(e.clientX - dragging.ox);
    const y = Math.round(e.clientY - dragging.oy);
    onMoveState(dragging.id, x, y);
  }

  function handleMouseUp() {
    setDragging(null);
  }

  // ── Right-click context menus ──────────────
  function handleStateRightClick(e: React.MouseEvent, s: State) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, kind: 'state', targetId: s.id });
  }

  function handleTransRightClick(e: React.MouseEvent, t: Transition) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, kind: 'transition', targetId: t.id });
  }

  function handleSVGRightClick(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenu(null);
  }

  // ── Double click state → rename ────────────
  function handleStateDblClick(e: React.MouseEvent, s: State) {
    e.stopPropagation();
    const name = window.prompt('Rename state:', s.label);
    if (name && name.trim()) onRenameState(s.id, name.trim());
  }

  // ── Click transition label → edit ─────────
  function handleTransLabelClick(e: React.MouseEvent, t: Transition, lx: number, ly: number) {
    e.stopPropagation();
    setEditModal({ transId: t.id, current: t.symbols.join(','), x: lx, y: ly });
    setTransInput(t.symbols.join(','));
  }

  // ── Transition modal confirm ───────────────
  function confirmTransition() {
    if (!transModal) return;
    const syms = transInput.split(',').map(s => s.trim()).filter(Boolean);
    if (syms.length === 0) { cancelTransition(); return; }
    if (transModal.existing) {
      onUpdateTransition(transModal.existing.id, syms);
    } else {
      onAddTransition(transModal.fromId, transModal.toId, syms);
    }
    cancelTransition();
  }

  function cancelTransition() {
    setTransModal(null);
    setTransInput('');
  }

  // ── Edit modal confirm ─────────────────────
  function confirmEdit() {
    if (!editModal) return;
    const syms = transInput.split(',').map(s => s.trim()).filter(Boolean);
    if (syms.length > 0) onUpdateTransition(editModal.transId, syms);
    setEditModal(null);
    setTransInput('');
  }

  // ── Geometry helpers ───────────────────────
  function getTransitionPath(t: Transition): {
    d: string; lx: number; ly: number;
    arrowX: number; arrowY: number; arrowAngle: number;
  } {
    const from = automaton.states.find(s => s.id === t.from)!;
    const to = automaton.states.find(s => s.id === t.to)!;
    if (!from || !to) return { d: '', lx: 0, ly: 0, arrowX: 0, arrowY: 0, arrowAngle: 0 };

    // Self-loop
    if (t.from === t.to) {
      const lx = from.x;
      const ly = from.y - R - 30;
      return {
        d: `M ${from.x - 10} ${from.y - R} C ${from.x - 40} ${from.y - R - 60} ${from.x + 40} ${from.y - R - 60} ${from.x + 10} ${from.y - R}`,
        lx, ly: ly - 18,
        arrowX: from.x + 10, arrowY: from.y - R,
        arrowAngle: 60,
      };
    }

    const hasReverse = automaton.transitions.some(tr => tr.from === t.to && tr.to === t.from);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const nx = -uy, ny = ux;
    const curve = hasReverse ? 35 : 0;

    const sx = from.x + ux * R, sy = from.y + uy * R;
    const ex = to.x - ux * R, ey = to.y - uy * R;
    const cpx = (sx + ex) / 2 + nx * curve;
    const cpy = (sy + ey) / 2 + ny * curve;

    // Arrow angle at end point
    let arrowAngle: number;
    if (curve !== 0) {
      const taxX = ex - cpx, taxY = ey - cpy;
      arrowAngle = Math.atan2(taxY, taxX) * 180 / Math.PI;
    } else {
      arrowAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    }

    const lx = (sx + ex) / 2 + nx * (curve + 16);
    const ly = (sy + ey) / 2 + ny * (curve + 16);

    return {
      d: curve ? `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}` : `M ${sx} ${sy} L ${ex} ${ey}`,
      lx, ly,
      arrowX: ex, arrowY: ey,
      arrowAngle,
    };
  }

  // ── Simulation highlight helpers ──────────
  function isStateHighlighted(id: string) {
    if (!currentStep) return false;
    return currentStep.stateId === id || (currentStep.activeStates?.includes(id) ?? false);
  }

  function isTransHighlighted(id: string) {
    return currentStep?.transitionId === id;
  }

  function stateClass(s: State): string {
    const hl = isStateHighlighted(s.id);
    if (!hl) return '';
    if (currentStep?.status === 'accepted') return 'accepted';
    if (currentStep?.status === 'dead' || currentStep?.status === 'rejected') return 'dead';
    return 'highlighted';
  }

  // ── Render ─────────────────────────────────
  const isEmpty = automaton.states.length === 0;

  return (
    <div className="canvas-wrap" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {/* Transition-in-progress hint */}
      {transFrom && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          padding: '3px 12px', fontSize: 11, zIndex: 10, pointerEvents: 'none',
          color: 'var(--text-muted)',
        }}>
          Now click the destination state — press Esc to cancel
        </div>
      )}

      {/* Empty canvas hint */}
      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 8,
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <div style={{ fontSize: 20, color: 'var(--border)', fontWeight: 400 }}>
            {automaton.type} Canvas
          </div>
          <div style={{ fontSize: 12, color: 'var(--border)' }}>
            Select "Add State" then click the canvas
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        style={{
          width: '100%', height: '100%', display: 'block',
          cursor: tool === 'state' ? 'crosshair' : tool === 'delete' ? 'not-allowed' : 'default',
        }}
        onMouseDown={handleSVGMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleSVGRightClick}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)" />
          </marker>
          <marker id="arrow-hl" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--highlight-edge)" />
          </marker>
          <marker id="arrow-accept" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--accepted-stroke)" />
          </marker>
        </defs>

        {/* Dot grid */}
        <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="var(--border-light)" opacity="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Transitions */}
        {automaton.transitions.map(t => {
          const from = automaton.states.find(s => s.id === t.from);
          const to = automaton.states.find(s => s.id === t.to);
          if (!from || !to) return null;
          const { d, lx, ly } = getTransitionPath(t);
          const hl = isTransHighlighted(t.id);
          const hlState = isStateHighlighted(t.to);
          const accepted = hlState && currentStep?.status === 'accepted';
          const edgeColor = accepted ? 'var(--accepted-stroke)'
            : hl ? 'var(--highlight-edge)'
            : 'var(--edge-color)';
          const markerId = accepted ? 'arrow-accept' : hl ? 'arrow-hl' : 'arrow';

          return (
            <g key={t.id} onContextMenu={e => handleTransRightClick(e, t)}>
              {/* Wider invisible hit area */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: 'pointer' }}
                onClick={e => handleTransLabelClick(e, t, lx, ly)} />
              <path
                d={d} fill="none"
                stroke={edgeColor}
                strokeWidth={hl ? 2 : 1.5}
                markerEnd={`url(#${markerId})`}
              />
              {/* Label background */}
              <rect
                x={lx - 16} y={ly - 9} width={32} height={16} rx={3}
                fill="var(--bg-canvas)" stroke="var(--border)" strokeWidth={0.5}
                style={{ cursor: 'pointer' }}
                onClick={e => handleTransLabelClick(e, t, lx, ly)}
              />
              <text
                x={lx} y={ly}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={11} fontFamily="monospace"
                fill={hl ? edgeColor : 'var(--edge-label)'}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={e => handleTransLabelClick(e, t, lx, ly)}
              >
                {t.symbols.join(',')}
              </text>
            </g>
          );
        })}

        {/* States */}
        {automaton.states.map(s => {
          const cls = stateClass(s);
          const isTransSrc = transFrom === s.id;
          const isHover = hoverState === s.id;

          const fillColor = cls === 'accepted' ? 'var(--accepted-fill)'
            : cls === 'dead' ? 'var(--dead-fill)'
            : cls === 'highlighted' ? 'var(--highlight-state-fill)'
            : 'var(--state-fill)';

          const strokeColor = cls === 'accepted' ? 'var(--accepted-stroke)'
            : cls === 'dead' ? 'var(--dead-stroke)'
            : cls === 'highlighted' ? 'var(--highlight-state-stroke)'
            : isTransSrc ? 'var(--accent)'
            : isHover ? 'var(--accent)'
            : 'var(--state-stroke)';

          return (
            <g
              key={s.id}
              onMouseDown={e => handleStateMouseDown(e, s)}
              onContextMenu={e => handleStateRightClick(e, s)}
              onDoubleClick={e => handleStateDblClick(e, s)}
              onMouseEnter={() => setHoverState(s.id)}
              onMouseLeave={() => setHoverState(null)}
              style={{ cursor: tool === 'select' ? 'grab' : tool === 'delete' ? 'not-allowed' : 'pointer' }}
            >
              {/* Start arrow */}
              {s.isStart && (
                <g>
                  <line
                    x1={s.x - R - 26} y1={s.y}
                    x2={s.x - R - 2} y2={s.y}
                    stroke="var(--start-arrow)" strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                </g>
              )}
              {/* Accept outer ring */}
              {s.isAccept && (
                <circle cx={s.x} cy={s.y} r={R + 5}
                  fill="none" stroke={strokeColor} strokeWidth={1.5} />
              )}
              {/* Main circle */}
              <circle
                cx={s.x} cy={s.y} r={R}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isTransSrc ? 2.5 : 1.5}
              />
              {/* Label */}
              <text
                x={s.x} y={s.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={13} fontFamily="'Segoe UI', sans-serif" fontWeight="500"
                fill="var(--state-label)"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed', left: ctxMenu.x, top: ctxMenu.y,
            background: 'var(--dropdown-bg)', border: '1px solid var(--border)',
            boxShadow: '2px 2px 8px var(--shadow)',
            zIndex: 500, minWidth: 180, padding: '2px 0',
          }}
          onClick={e => e.stopPropagation()}
        >
          {ctxMenu.kind === 'state' && (() => {
            const s = automaton.states.find(st => st.id === ctxMenu.targetId)!;
            if (!s) return null;
            return (
              <>
                <CtxItem label="Set as Start State" onClick={() => { onSetStart(s.id); setCtxMenu(null); }} />
                <CtxItem label={s.isAccept ? 'Remove Accept State' : 'Set as Accept State'}
                  onClick={() => { onToggleAccept(s.id); setCtxMenu(null); }} />
                <CtxItem label="Rename…"
                  onClick={() => {
                    setCtxMenu(null);
                    const name = window.prompt('Rename state:', s.label);
                    if (name && name.trim()) onRenameState(s.id, name.trim());
                  }} />
                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                <CtxItem label="Delete State" danger
                  onClick={() => { onDeleteState(s.id); setCtxMenu(null); }} />
              </>
            );
          })()}

          {ctxMenu.kind === 'transition' && (() => {
            const t = automaton.transitions.find(tr => tr.id === ctxMenu.targetId)!;
            if (!t) return null;
            return (
              <>
                <CtxItem label="Edit Symbol(s)…"
                  onClick={() => {
                    setCtxMenu(null);
                    const { lx, ly } = getTransitionPath(t);
                    setEditModal({ transId: t.id, current: t.symbols.join(','), x: lx, y: ly });
                    setTransInput(t.symbols.join(','));
                  }} />
                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                <CtxItem label="Delete Transition" danger
                  onClick={() => { onDeleteTransition(t.id); setCtxMenu(null); }} />
              </>
            );
          })()}
        </div>
      )}

      {/* ── Transition symbol modal ── */}
      {transModal && (
        <Modal
          title={transModal.existing ? 'Edit Transition' : 'Add Transition'}
          onConfirm={confirmTransition}
          onCancel={cancelTransition}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            Enter symbol(s), comma-separated. Use ε for epsilon.
          </div>
          <input
            type="text"
            value={transInput}
            onChange={e => setTransInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmTransition(); if (e.key === 'Escape') cancelTransition(); }}
            placeholder="a,b or ε"
            autoFocus
            style={{ width: '100%' }}
          />
        </Modal>
      )}

      {/* ── Inline edit modal for transition label ── */}
      {editModal && (
        <Modal
          title="Edit Transition Symbol(s)"
          onConfirm={confirmEdit}
          onCancel={() => { setEditModal(null); setTransInput(''); }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            Comma-separated symbols. Use ε for epsilon.
          </div>
          <input
            type="text"
            value={transInput}
            onChange={e => setTransInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmEdit();
              if (e.key === 'Escape') { setEditModal(null); setTransInput(''); }
            }}
            placeholder="a,b or ε"
            autoFocus
            style={{ width: '100%' }}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────

function CtxItem({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '4px 20px', fontSize: 12, cursor: 'pointer',
        background: hover ? (danger ? '#cc0000' : 'var(--accent)') : 'transparent',
        color: hover ? (danger ? '#fff' : 'var(--accent-fg)') : danger ? 'var(--dead-stroke)' : 'var(--text)',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
}

function Modal({ title, children, onConfirm, onCancel }: {
  title: string; children: React.ReactNode;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}
      onClick={onCancel}
    >
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        boxShadow: '4px 4px 16px var(--shadow)', padding: '16px 20px',
        minWidth: 280,
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>{title}</div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
