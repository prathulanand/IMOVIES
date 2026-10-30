import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Layers } from 'lucide-react';

const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export default function LayoutBuilder({ initialLayout, onSave, loading = false }) {
  const [rows, setRows] = useState(initialLayout?.rows || 8);
  const [cols, setCols] = useState(initialLayout?.cols || 12);
  const [selectedTool, setSelectedTool] = useState('REGULAR'); // REGULAR, PREMIUM, RECLINER, AISLE, BLOCKED

  // Initialize or rebuild cells grid
  const initializeCells = (numRows, numCols, existingCells = []) => {
    const existingMap = new Map();
    existingCells.forEach((c) => existingMap.set(`${c.row}-${c.col}`, c));

    const cells = [];
    for (let r = 1; r <= numRows; r++) {
      const rowChar = ROW_LETTERS[r - 1] || `R${r}`;
      for (let c = 1; c <= numCols; c++) {
        const key = `${r}-${c}`;
        if (existingMap.has(key)) {
          cells.push(existingMap.get(key));
        } else {
          cells.push({
            row: r,
            col: c,
            label: `${rowChar}${c}`,
            category: 'REGULAR',
            kind: 'SEAT',
          });
        }
      }
    }
    return cells;
  };

  const [cells, setCells] = useState(() =>
    initializeCells(rows, cols, initialLayout?.cells || [])
  );

  useEffect(() => {
    if (initialLayout) {
      const r = initialLayout.rows || 8;
      const c = initialLayout.cols || 12;
      setRows(r);
      setCols(c);
      setCells(initializeCells(r, c, initialLayout.cells || []));
    }
  }, [initialLayout]);

  const handleResize = (newRows, newCols) => {
    const r = Math.max(1, Math.min(20, newRows));
    const c = Math.max(1, Math.min(24, newCols));
    setRows(r);
    setCols(c);
    setCells((prev) => initializeCells(r, c, prev));
  };

  const handleCellClick = (row, col) => {
    setCells((prev) =>
      prev.map((cell) => {
        if (cell.row === row && cell.col === col) {
          const rowChar = ROW_LETTERS[row - 1] || `R${row}`;
          if (selectedTool === 'AISLE') {
            return { ...cell, label: '', category: 'NONE', kind: 'AISLE' };
          }
          if (selectedTool === 'BLOCKED') {
            return { ...cell, label: `${rowChar}${col}`, category: 'NONE', kind: 'BLOCKED' };
          }
          // Seat category
          return {
            ...cell,
            label: `${rowChar}${col}`,
            category: selectedTool,
            kind: 'SEAT',
          };
        }
        return cell;
      })
    );
  };

  const handleAssignRowCategory = (row, category) => {
    const rowChar = ROW_LETTERS[row - 1] || `R${row}`;
    setCells((prev) =>
      prev.map((cell) => {
        if (cell.row === row && cell.kind === 'SEAT') {
          return {
            ...cell,
            label: `${rowChar}${cell.col}`,
            category,
          };
        }
        return cell;
      })
    );
  };

  // Compute total bookable seats
  const totalSeats = cells.filter((c) => c.kind === 'SEAT').length;

  const handleSave = () => {
    onSave({
      rows,
      cols,
      cells,
      totalSeats,
    });
  };

  return (
    <div className="layout-builder d-flex flex-column gap-3">
      {/* Controls Bar */}
      <div className="p-3 rounded-3 bg-dark border border-secondary d-flex flex-wrap align-items-center justify-content-between gap-2 gap-sm-3">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-sm-3">
          <div className="d-flex align-items-center gap-2">
            <label className="text-secondary small fw-bold">Rows:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => handleResize(parseInt(e.target.value, 10) || 1, cols)}
              className="form-control form-control-sm bg-dark text-light border-secondary"
              style={{ width: '60px' }}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="text-secondary small fw-bold">Cols:</label>
            <input
              type="number"
              min="1"
              max="24"
              value={cols}
              onChange={(e) => handleResize(rows, parseInt(e.target.value, 10) || 1)}
              className="form-control form-control-sm bg-dark text-light border-secondary"
              style={{ width: '60px' }}
            />
          </div>
          <div className="badge bg-secondary bg-opacity-50 text-light py-1.5 px-2.5">
            Total Seats: <strong className="text-white">{totalSeats}</strong>
          </div>
        </div>

        {/* Tools Palette */}
        <div className="d-flex flex-wrap align-items-center gap-1.5 gap-sm-2">
          <span className="small text-secondary fw-semibold d-none d-sm-inline">Click Mode:</span>
          <button
            type="button"
            onClick={() => setSelectedTool('REGULAR')}
            className={`btn btn-sm ${selectedTool === 'REGULAR' ? 'btn-primary' : 'btn-outline-secondary'}`}
          >
            Regular
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('PREMIUM')}
            className={`btn btn-sm ${selectedTool === 'PREMIUM' ? 'btn-info' : 'btn-outline-secondary'}`}
          >
            Premium
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('RECLINER')}
            className={`btn btn-sm ${selectedTool === 'RECLINER' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
          >
            Recliner
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('AISLE')}
            className={`btn btn-sm ${selectedTool === 'AISLE' ? 'btn-light text-dark' : 'btn-outline-secondary'}`}
          >
            Aisle Gap
          </button>
          <button
            type="button"
            onClick={() => setSelectedTool('BLOCKED')}
            className={`btn btn-sm ${selectedTool === 'BLOCKED' ? 'btn-danger' : 'btn-outline-secondary'}`}
          >
            Blocked
          </button>
        </div>
      </div>

      {/* Screen Visualization */}
      <div className="w-100 text-center my-2">
        <div
          className="mx-auto"
          style={{
            height: '6px',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
            backgroundColor: 'rgba(168, 85, 247, 0.6)',
            boxShadow: '0 -2px 14px rgba(168, 85, 247, 0.65)',
            width: '70%',
          }}
        />
        <div className="text-secondary small fw-bold mt-1" style={{ fontSize: '10px', letterSpacing: '2px' }}>
          SCREEN
        </div>
      </div>

      {/* Interactive Grid */}
      <div className="d-md-none text-secondary small text-center mb-1" style={{ fontSize: '11px' }}>
        👈 Swipe horizontally to view/edit seats 👉
      </div>
      <div className="p-2 p-sm-3 rounded-4 bg-dark border border-secondary overflow-x-auto touch-scroll text-center" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="d-inline-flex flex-column align-items-center" style={{ minWidth: 'max-content', margin: '0 auto' }}>
          {Array.from({ length: rows }, (_, rIdx) => {
            const r = rIdx + 1;
            const rowChar = ROW_LETTERS[r - 1] || `R${r}`;
            const rowCells = cells.filter((c) => c.row === r).sort((a, b) => a.col - b.col);

            return (
              <div key={`row-${r}`} className="d-flex align-items-center mb-1">
                {/* Row Header & Quick Action */}
                <div className="dropdown me-2">
                  <button
                    className="btn btn-sm btn-link text-secondary p-0 fw-bold text-decoration-none dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    style={{ width: '28px', fontSize: '12px' }}
                    title="Click to set whole row category"
                  >
                    {rowChar}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-dark">
                    <li><button className="dropdown-item small" type="button" onClick={() => handleAssignRowCategory(r, 'REGULAR')}>Set Row Regular</button></li>
                    <li><button className="dropdown-item small" type="button" onClick={() => handleAssignRowCategory(r, 'PREMIUM')}>Set Row Premium</button></li>
                    <li><button className="dropdown-item small" type="button" onClick={() => handleAssignRowCategory(r, 'RECLINER')}>Set Row Recliner</button></li>
                  </ul>
                </div>

                {/* Cells in Row */}
                <div className="d-flex align-items-center">
                  {rowCells.map((cell) => {
                    let bg = '#1e293b';
                    let border = '#475569';
                    let text = '#ffffff';

                    if (cell.kind === 'AISLE') {
                      bg = 'transparent';
                      border = '#242c44';
                      text = 'text-dim';
                    } else if (cell.kind === 'BLOCKED') {
                      bg = '#2a1215';
                      border = '#e50914';
                      text = '#ef4444';
                    } else if (cell.category === 'RECLINER') {
                      bg = '#3b2f15';
                      border = '#f59e0b';
                      text = '#f59e0b';
                    } else if (cell.category === 'PREMIUM') {
                      bg = '#0f293d';
                      border = '#06b6d4';
                      text = '#38bdf8';
                    }

                    return (
                      <button
                        key={`cell-${cell.row}-${cell.col}`}
                        type="button"
                        onClick={() => handleCellClick(cell.row, cell.col)}
                        title={`${cell.label || 'Aisle'} (${cell.kind === 'SEAT' ? cell.category : cell.kind})`}
                        style={{
                          width: '32px',
                          height: '32px',
                          margin: '2px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          backgroundColor: bg,
                          border: `1.5px solid ${border}`,
                          color: text,
                          cursor: 'pointer',
                        }}
                        className="btn p-0 d-flex align-items-center justify-content-center"
                      >
                        {cell.kind === 'AISLE' ? '' : cell.kind === 'BLOCKED' ? '✕' : cell.col}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-2">
        <Button variant="primary" onClick={handleSave} icon={Layers} loading={loading}>
          Save Layout Configuration
        </Button>
      </div>
    </div>
  );
}
