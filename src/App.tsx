import { useEffect, useRef } from 'react';
import MenuBar from './components/MenuBar';
import { useStore } from './store';
import { MachineType, Automaton } from './engines/types';

export default function App() {
  const {
    state,
    currentStep,
    addState,
    setMachineType,
    loadAutomaton,
    clear,
    setInput,
    runSimulation,
    stepForward,
    stepBack,
    resetSimulation,
    toggleTheme,
  } = useStore();

  const isDarkMode = state.theme === 'dark';

  // Apply dark class to root element so CSS variables cascade correctly
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSelectType = (type: MachineType) => {
    setMachineType(type);
  };

  const handleNew = () => {
    if (window.confirm('Create a new machine? Unsaved changes will be lost.')) {
      clear();
    }
  };

  const handleLoadState = (loadedData: Automaton) => {
    loadAutomaton(loadedData);
  };

  const getCurrentState = (): Automaton => {
    return state.automaton;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only add state on direct canvas click, not on child elements
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      addState(x, y);
    }
  };

  const hasStates = state.automaton.states.length > 0;

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>

      <MenuBar
        currentType={state.automaton.type}
        onSelectType={handleSelectType}
        onNew={handleNew}
        onLoadState={handleLoadState}
        getCurrentState={getCurrentState}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
        onRunSimulation={runSimulation}
        onStepSimulation={stepForward}
        onResetSimulation={resetSimulation}
      />

      <div className="workspace-layout">

        {/* Left sidebar */}
        <aside className="sidebar-panel">
          <h3>Simulation Controls</h3>

          <div className="control-group">
            <label htmlFor="test-input">Input String:</label>
            <input
              id="test-input"
              type="text"
              value={state.inputString}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 10110"
            />
          </div>

          <div className="button-group">
            <button className="primary-btn" onClick={runSimulation}>▶ Run</button>
            <button onClick={stepBack} disabled={state.simStepIndex <= 0}>⏮ Back</button>
            <button onClick={stepForward}>⏭ Step</button>
            <button onClick={resetSimulation}>🔄 Reset</button>
          </div>

          {currentStep && (
            <div
              className="simulation-status"
              data-status={currentStep.status}
            >
              <h4>Step {state.simStepIndex + 1} / {state.simResult?.steps.length}</h4>
              <p><strong>Status:</strong> {currentStep.status}</p>
              <p><strong>Info:</strong> {currentStep.description}</p>
            </div>
          )}

          <hr />

          <div className="machine-info">
            <h4>Machine Details</h4>
            <p><strong>Name:</strong> {state.automaton.name}</p>
            <p><strong>Type:</strong> {state.automaton.type}</p>
            <p><strong>States:</strong> {state.automaton.states.length}</p>
            <p><strong>Transitions:</strong> {state.automaton.transitions.length}</p>
            <p><strong>Alphabet:</strong> Σ = {'{'}{ state.automaton.alphabet.join(', ') || '∅' }{'}'}</p>
          </div>
        </aside>

        {/* Canvas */}
        <main
          className={`canvas-container${hasStates ? ' has-states' : ''}`}
          id="persephone-canvas"
          onClick={handleCanvasClick}
        >
          <div className="canvas-watermark">
            <h2>{state.automaton.type} Canvas</h2>
            <p>Click to add a state</p>
          </div>

          {/* Render states as positioned divs */}
          {state.automaton.states.map(s => {
            const isHighlighted = currentStep?.stateId === s.id || currentStep?.activeStates?.includes(s.id);
            const isFinal = currentStep?.status === 'accepted' && isHighlighted;
            const isDead = currentStep?.status === 'dead' && isHighlighted;

            return (
              <div
                key={s.id}
                className={[
                  'state-node',
                  s.isStart ? 'is-start' : '',
                  s.isAccept ? 'is-accept' : '',
                  isHighlighted && !isFinal && !isDead ? 'highlighted' : '',
                  isFinal ? 'accepted' : '',
                  isDead ? 'dead' : '',
                ].filter(Boolean).join(' ')}
                style={{ left: s.x, top: s.y }}
                title={s.label}
              >
                {s.label}
              </div>
            );
          })}
        </main>

      </div>
    </div>
  );
}
