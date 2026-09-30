import { useEffect } from 'react';
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

  // Sync dark mode class on body element
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Handlers for menu actions
  const handleSelectType = (type: MachineType) => {
    setMachineType(type);
  };

  const handleNew = () => {
    if (window.confirm('Are you sure you want to create a new machine? Unsaved changes will be lost.')) {
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
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      addState(x, y);
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Top Menu Bar */}
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

      {/* Main Workspace Area */}
      <div className="workspace-layout">
        {/* Left Toolbar / Control Panel */}
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
            <button className="primary-btn" onClick={runSimulation}>
              ▶ Run
            </button>
            <button className="secondary-btn" onClick={stepBack} disabled={state.simStepIndex <= 0}>
              ⏮ Back
            </button>
            <button className="secondary-btn" onClick={stepForward}>
              ⏭ Step
            </button>
            <button className="outline-btn" onClick={resetSimulation}>
              🔄 Reset
            </button>
          </div>

          {currentStep && (
            <div className="simulation-status">
              <h4>Current Step ({state.simStepIndex + 1}/{state.simResult?.steps.length})</h4>
              <p><strong>Status:</strong> {currentStep.status}</p>
              <p><strong>Description:</strong> {currentStep.description}</p>
            </div>
          )}

          <hr />

          <div className="machine-info">
            <h4>Machine Details</h4>
            <p><strong>Name:</strong> {state.automaton.name}</p>
            <p><strong>Type:</strong> {state.automaton.type}</p>
            <p><strong>States:</strong> {state.automaton.states.length}</p>
            <p><strong>Transitions:</strong> {state.automaton.transitions.length}</p>
            <p><strong>Alphabet:</strong> Σ = {'{'}{state.automaton.alphabet.join(', ')}{'}'}</p>
          </div>
        </aside>

        {/* Interactive Canvas Area */}
        <main className="canvas-container" id="persephone-canvas" onClick={handleCanvasClick}>
          <div className="canvas-watermark">
            <h2>{state.automaton.type} Canvas</h2>
            <p>Click empty space to add a new state</p>
          </div>

          {/* Node and Edge renderers connect here */}
        </main>
      </div>
    </div>
  );
}
