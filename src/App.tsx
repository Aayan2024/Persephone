import { useEffect, useState } from 'react';
import MenuBar from './components/MenuBar';
import Canvas, { CanvasTool } from './components/Canvas';
import BatchRun from './components/BatchRun';
import { useStore } from './store';
import { MachineType, Automaton } from './engines/types';

const TOOLS: { id: CanvasTool; label: string; key: string; icon: string }[] = [
  { id: 'select',     label: 'Select / Move',  key: 'V', icon: '↖' },
  { id: 'state',      label: 'Add State',       key: 'S', icon: '○' },
  { id: 'transition', label: 'Add Transition',  key: 'T', icon: '→' },
  { id: 'delete',     label: 'Delete',          key: 'X', icon: '✕' },
];

export default function App() {
  const {
    state, currentStep,
    addState, moveState, deleteState,
    setStart, toggleAccept, renameState,
    addTransition, updateTransition, deleteTransition,
    setMachineType, loadAutomaton, clear,
    setInput, runSimulation, stepForward, stepBack, resetSimulation,
    toggleTheme, autoLayout,
  } = useStore();

  const [tool, setTool] = useState<CanvasTool>('select');
  const [showBatch, setShowBatch] = useState(false);
  const isDarkMode = state.theme === 'dark';

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    isDarkMode ? root.classList.add('dark') : root.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const t = TOOLS.find(t => t.key === e.key.toUpperCase());
      if (t) setTool(t.id);
      if (e.key === 'Escape') setTool('select');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const getCurrentState = (): Automaton => state.automaton;
  const hasStates = state.automaton.states.length > 0;

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>

      <MenuBar
        currentType={state.automaton.type}
        onSelectType={(t: MachineType) => setMachineType(t)}
        onNew={() => { if (window.confirm('Create new machine? Unsaved changes will be lost.')) clear(); }}
        onLoadState={loadAutomaton}
        getCurrentState={getCurrentState}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
        onRunSimulation={runSimulation}
        onStepSimulation={stepForward}
        onResetSimulation={resetSimulation}
        onBatchRun={() => setShowBatch(true)}
      />

      <div className="workspace-layout">

        <aside className="sidebar-panel">

          <h3>Tools</h3>
          <div className="tool-group">
            {TOOLS.map(t => (
              <button
                key={t.id}
                className={`tool-btn${tool === t.id ? ' active' : ''}`}
                onClick={() => setTool(t.id)}
                title={`${t.label} (${t.key})`}
              >
                <span className="tool-icon">{t.icon}</span>
                <span className="tool-label">{t.label}</span>
                <span className="tool-key">{t.key}</span>
              </button>
            ))}
          </div>

          <hr />

          <h3>Simulation</h3>
          <div className="control-group">
            <label htmlFor="test-input">Input String:</label>
            <input
              id="test-input"
              type="text"
              value={state.inputString}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSimulation(); }}
              placeholder="e.g. BL.SC.U4AIE24101"
            />
          </div>
          <div className="button-group">
            <button className="primary-btn" onClick={runSimulation}>▶ Run</button>
            <button onClick={stepBack} disabled={state.simStepIndex <= 0}>⏮ Back</button>
            <button onClick={stepForward}>⏭ Step</button>
            <button onClick={resetSimulation}>↺ Reset</button>
          </div>
          <div style={{ padding: '0 8px 8px' }}>
            <button
              style={{ width: '100%', textAlign: 'left', padding: '4px 8px', fontSize: 11 }}
              onClick={() => setShowBatch(true)}
            >
              ⊞ Multiple Run…
            </button>
          </div>

          {currentStep && (
            <div className="simulation-status" data-status={currentStep.status}>
              <div className="sim-step-header">
                Step {state.simStepIndex + 1} / {state.simResult?.steps.length}
              </div>
              <div className="sim-status-badge" data-status={currentStep.status}>
                {currentStep.status.toUpperCase()}
              </div>
              <div className="sim-description">{currentStep.description}</div>
            </div>
          )}

          <hr />

          <h3>Canvas</h3>
          <div className="tool-group">
            <button className="tool-btn" onClick={autoLayout} disabled={!hasStates}>
              <span className="tool-icon">⊞</span>
              <span className="tool-label">Auto Layout</span>
            </button>
            <button className="tool-btn" onClick={() => { if (window.confirm('Clear all?')) clear(); }}>
              <span className="tool-icon">⬚</span>
              <span className="tool-label">Clear All</span>
            </button>
          </div>

          <hr />

          <h3>Machine Info</h3>
          <div className="machine-info">
            <div className="info-row"><span>Name</span><span>{state.automaton.name}</span></div>
            <div className="info-row"><span>Type</span><span>{state.automaton.type}</span></div>
            <div className="info-row"><span>States</span><span>{state.automaton.states.length}</span></div>
            <div className="info-row"><span>Transitions</span><span>{state.automaton.transitions.length}</span></div>
            <div className="info-row">
              <span>Alphabet Σ</span>
              <span>{state.automaton.alphabet.length ? state.automaton.alphabet.join(', ') : '∅'}</span>
            </div>
          </div>

        </aside>

        <Canvas
          automaton={state.automaton}
          tool={tool}
          currentStep={currentStep}
          onAddState={addState}
          onMoveState={moveState}
          onDeleteState={deleteState}
          onDeleteTransition={deleteTransition}
          onSetStart={setStart}
          onToggleAccept={toggleAccept}
          onRenameState={renameState}
          onAddTransition={addTransition}
          onUpdateTransition={updateTransition}
        />

      </div>

      {showBatch && (
        <BatchRun
          automaton={state.automaton}
          onClose={() => setShowBatch(false)}
        />
      )}

    </div>
  );
}
