import React, { useState } from 'react';
import { MachineType, Automaton } from '../engines/types';
import { exportToJSON, exportToSVG, importFromJSON } from '../fileio';

interface MenuBarProps {
  currentType: MachineType;
  onSelectType: (type: MachineType) => void;
  onNew: () => void;
  onLoadState: (loadedData: Automaton) => void;
  getCurrentState: () => Automaton;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRunSimulation?: () => void;
  onStepSimulation?: () => void;
  onResetSimulation?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  currentType,
  onSelectType,
  onNew,
  onLoadState,
  getCurrentState,
  isDarkMode,
  onToggleDarkMode,
  onRunSimulation,
  onStepSimulation,
  onResetSimulation,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const closeMenus = () => setActiveMenu(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      onLoadState(data);
    } catch {
      alert('Failed to load file. Ensure it is a valid JSON configuration.');
    }
    closeMenus();
  };

  const handleExportSVG = () => {
    exportToSVG('persephone-canvas'); // Line 52 MUST only have ONE argument inside the parentheses
    closeMenus();
  };

  const handleExportSVG = () => {
  // Pass the current automaton object from your state/store instead of the canvas string ID
    exportToSVG('persephone-canvas'); // or pass theme from state if available
    closeMenus();
  };

  return (
    <header className="menubar-container" onMouseLeave={closeMenus}>
      <div className="brand-title">
        <span className="brand-logo">🌌</span> Persephone
      </div>

      <nav className="menu-nav">
        {/* FILE MENU */}
        <div className="menu-item">
          <button
            className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
            onClick={() => toggleMenu('file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="dropdown-menu">
              <button onClick={() => { onNew(); closeMenus(); }}>New Machine</button>
              <label className="dropdown-label">
                Open File...
                <input type="file" accept=".json,.jff" onChange={handleImport} hidden />
              </label>
              <hr />
              <button onClick={handleExportJSON}>Save as JSON</button>
              <button onClick={handleExportSVG}>Export to SVG</button>
            </div>
          )}
        </div>

        {/* TYPE SELECTOR MENU */}
        <div className="menu-item">
          <button
            className={`menu-btn ${activeMenu === 'type' ? 'active' : ''}`}
            onClick={() => toggleMenu('type')}
          >
            Machine: <strong>{currentType}</strong>
          </button>
          {activeMenu === 'type' && (
            <div className="dropdown-menu">
              {(['DFA', 'NFA', 'PDA', 'TM'] as MachineType[]).map((type) => (
                <button
                  key={type}
                  className={currentType === type ? 'selected' : ''}
                  onClick={() => {
                    onSelectType(type);
                    closeMenus();
                  }}
                >
                  {type === 'DFA' && 'Deterministic Finite Automaton (DFA)'}
                  {type === 'NFA' && 'Nondeterministic Finite Automaton (NFA)'}
                  {type === 'PDA' && 'Pushdown Automaton (PDA)'}
                  {type === 'TM' && 'Turing Machine (TM)'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SIMULATION MENU */}
        <div className="menu-item">
          <button
            className={`menu-btn ${activeMenu === 'simulate' ? 'active' : ''}`}
            onClick={() => toggleMenu('simulate')}
          >
            Simulate
          </button>
          {activeMenu === 'simulate' && (
            <div className="dropdown-menu">
              <button onClick={() => { onRunSimulation?.(); closeMenus(); }}>▶ Fast Run</button>
              <button onClick={() => { onStepSimulation?.(); closeMenus(); }}>⏭ Step Forward</button>
              <button onClick={() => { onResetSimulation?.(); closeMenus(); }}>🔄 Reset State</button>
            </div>
          )}
        </div>
      </nav>

      {/* RIGHT SIDE CONTROLS */}
      <div className="menu-controls">
        <button className="theme-toggle-btn" onClick={onToggleDarkMode} title="Toggle Dark/Light Mode">
          {isDarkMode ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  );
};

export default MenuBar;
