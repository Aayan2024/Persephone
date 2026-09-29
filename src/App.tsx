import React, { useReducer, useState, useEffect } from 'react';
import MenuBar from './components/MenuBar';
import { initialAutomatonState, automatonReducer } from './store';
import { AutomatonType } from './engine/types';

export default function App() {
  const [state, dispatch] = useReducer(automatonReducer, initialAutomatonState);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [testInput, setTestInput] = useState<string>('');

  // Sync dark mode class on body element
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Handlers for menu actions
  const handleSelectType = (type: AutomatonType) => {
    dispatch({ type: 'SET_TYPE', payload: type });
  };

  const handleNew = () => {
    if (window.confirm('Are you sure you want to create a new machine? Unsaved changes will be lost.')) {
      dispatch({ type: 'RESET' });
    }
  };

  const handleLoadState = (loadedData: any) => {
    dispatch({ type: 'LOAD_STATE', payload: loadedData });
  };

  const getCurrentState = () => {
    return state;
  };

  const handleRunSimulation = () => {
    dispatch({ type: 'RUN_SIMULATION', payload: testInput });
  };

  const handleStepSimulation = () => {
    dispatch({ type: 'STEP_SIMULATION' });
  };

  const handleResetSimulation = () => {
    dispatch({ type: 'RESET_SIMULATION' });
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Top Menu Bar */}
      <MenuBar
        currentType={state.type}
        onSelectType={handleSelectType}
        onNew={handleNew}
        onLoadState={handleLoadState}
        getCurrentState={getCurrentState}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onRunSimulation={handleRunSimulation}
        onStepSimulation={handleStepSimulation}
        onResetSimulation={handleResetSimulation}
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
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="e.g. 10110"
            />
          </div>

          <div className="button-group">
            <button className="primary-btn" onClick={handleRunSimulation}>
              ▶ Run
            </button>
            <button className="secondary-btn" onClick={handleStepSimulation}>
              ⏭ Step
            </button>
            <button className="outline-btn" onClick={handleResetSimulation}>
              🔄 Reset
            </button>
          </div>

          <hr />

          <div className="machine-info">
            <h4>Machine Details</h4>
            <p><strong>Type:</strong> {state.type}</p>
            <p><strong>States:</strong> {state.nodes?.length || 0}</p>
            <p><strong>Transitions:</strong> {state.edges?.length || 0}</p>
          </div>
        </aside>

        {/* Interactive Canvas Area */}
        <main className="canvas-container" id="persephone-canvas">
          <div className="canvas-watermark">
            <h2>{state.type} Canvas</h2>
            <p>Click to add states or drag transitions</p>
          </div>
          
          {/* Node and Edge renderers connect here */}
        </main>
      </div>
    </div>
  );
}
