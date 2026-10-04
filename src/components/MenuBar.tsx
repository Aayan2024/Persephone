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
  onBatchRun?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  currentType, onSelectType, onNew, onLoadState, getCurrentState,
  isDarkMode, onToggleDarkMode,
  onRunSimulation, onStepSimulation, onResetSimulation, onBatchRun,
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

  const handleExportJSON = () => {
    exportToJSON(getCurrentState());
    closeMenus();
  };

  const handleExportSVG = () => {
    exportToSVG(getCurrentState(), isDarkMode ? 'dark' : 'light');
    closeMenus();
  };

  return (
    <header className="menubar-container" onMouseLeave={closeMenus}>
      <div className="brand-title">
        <span className="brand-logo">🌌</span> Persephone
      </div>

      <nav className="menu-nav">

        {/* FILE */}
        <div className="menu-item">
          <button className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
            onClick={() => toggleMenu('file')}>File</button>
          {activeMenu === 'file' && (
            <div className="dropdown-menu">
              <button onClick={() => { onNew(); closeMenus(); }}>New Machine</button>
              <label className="dropdown-label">
                Open File…
                <input type="file" accept=".json" onChange={handleImport} hidden />
              </label>
              <hr />
              <button onClick={handleExportJSON}>Save as JSON</button>
              <button onClick={handleExportSVG}>Export to SVG</button>
            </div>
          )}
        </div>

        {/* MACHINE TYPE */}
        <div className="menu-item">
          <button className={`menu-btn ${activeMenu === 'type' ? 'active' : ''}`}
            onClick={() => toggleMenu('type')}>
            Machine: <strong>{currentType}</strong>
          </button>
          {activeMenu === 'type' && (
            <div className="dropdown-menu">
              {(['DFA', 'NFA', 'PDA', 'TM'] as MachineType[]).map(type => (
                <button
                  key={type}
                  className={currentType === type ? 'selected' : ''}
                  onClick={() => { onSelectType(type); closeMenus(); }}
                >
                  {type === 'DFA' && 'Deterministic Finite Automaton'}
                  {type === 'NFA' && 'Nondeterministic Finite Automaton'}
                  {type === 'PDA' && 'Pushdown Automaton'}
                  {type === 'TM' && 'Turing Machine'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SIMULATE */}
        <div className="menu-item">
          <button className={`menu-btn ${activeMenu === 'simulate' ? 'active' : ''}`}
            onClick={() => toggleMenu('simulate')}>Simulate</button>
          {activeMenu === 'simulate' && (
            <div className="dropdown-menu">
              <button onClick={() => { onRunSimulation?.(); closeMenus(); }}>▶ Fast Run</button>
              <button onClick={() => { onStepSimulation?.(); closeMenus(); }}>⏭ Step Forward</button>
              <button onClick={() => { onResetSimulation?.(); closeMenus(); }}>↺ Reset</button>
              <hr />
              <button onClick={() => { onBatchRun?.(); closeMenus(); }}>⊞ Multiple Run…</button>
            </div>
          )}
        </div>

      </nav>

      <div className="menu-controls">
        <button className="theme-toggle-btn" onClick={onToggleDarkMode}>
          {isDarkMode ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </header>
  );
};

export default MenuBar;
