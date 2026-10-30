import React, { useState } from 'react';
import SeatCell from './SeatCell';
import SeatLegend from './SeatLegend';
import { formatPaise } from '../../lib/currency';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function SeatMap({
  layout,
  seats = [],
  selectedSeats = [],
  onToggleSeat,
  selectable = true,
  showDetails = false,
  pricing = {},
}) {
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 480) {
      return 0.85;
    }
    return 1;
  });

  if (!layout || !layout.cells || layout.cells.length === 0) {
    return <div className="text-secondary text-center py-5">Screen layout not available.</div>;
  }

  const handleZoomIn = () => setZoom((z) => Math.min(1.4, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.65, +(z - 0.15).toFixed(2)));
  const handleZoomReset = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 480) {
      setZoom(0.85);
    } else {
      setZoom(1);
    }
  };

  // Create a fast lookup map for seats by seatLabel
  const seatMap = new Map();
  seats.forEach((s) => {
    seatMap.set(s.seatLabel, s);
  });

  // Group cells by row
  const rowLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const rowGroups = [];

  for (let r = 1; r <= layout.rows; r++) {
    const rowChar = rowLetters[r - 1] || `R${r}`;
    const cellsInRow = layout.cells.filter((c) => c.row === r).sort((a, b) => a.col - b.col);

    // Identify dominant category for this row
    const firstSeat = cellsInRow.find((c) => c.kind === 'SEAT' && c.label);
    const category = firstSeat ? firstSeat.category : 'REGULAR';

    rowGroups.push({
      rowNum: r,
      rowChar,
      category,
      cells: cellsInRow,
    });
  }

  // Detect category transitions to insert category dividers
  let lastCategory = null;

  return (
    <div className="seat-map-wrapper w-100 d-flex flex-column align-items-center py-4">
      {/* Top Toolbar: Screen Hint & Mobile Zoom Controls */}
      <div className="w-100 d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 mb-4" style={{ maxWidth: '780px' }}>
        <div className="d-flex align-items-center gap-1.5 text-secondary small d-md-none">
          <span className="badge bg-dark border border-secondary text-secondary px-2 py-1" style={{ fontSize: '10px' }}>
            👈 Swipe to explore seats 👉
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="d-flex align-items-center gap-1 ms-auto bg-dark p-1 rounded-pill border border-secondary border-opacity-50">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.75}
            className="btn btn-sm btn-link text-light p-1 rounded-circle"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <span className="small text-secondary px-1 fw-bold" style={{ fontSize: '11px', minWidth: '38px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 1.4}
            className="btn btn-sm btn-link text-light p-1 rounded-circle"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={handleZoomReset}
              className="btn btn-sm btn-link text-danger p-1 rounded-circle ms-1"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Screen Indicator */}
      <div className="w-100 text-center mb-5 px-3" style={{ maxWidth: '680px' }}>
        <div
          className="mx-auto"
          style={{
            height: '10px',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
            backgroundColor: 'rgba(168, 85, 247, 0.65)',
            boxShadow: '0 -4px 24px rgba(168, 85, 247, 0.75)',
            width: '85%',
          }}
        />
        <div className="small text-secondary fw-bold text-uppercase letter-spacing-2 mt-2" style={{ letterSpacing: '4px', fontSize: '11px' }}>
          SCREEN THIS WAY
        </div>
      </div>

      {/* Seat Grid Scrollable Area */}
      <div
        className="w-100 px-2 py-3 touch-scroll"
        style={{
          overflowX: 'auto',
          textAlign: 'center',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          className="d-inline-flex flex-column align-items-center"
          style={{
            minWidth: 'max-content',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            paddingBottom: zoom > 1 ? `${(zoom - 1) * 200}px` : '0px',
          }}
        >
          {rowGroups.map((group) => {
            const isNewCategory = group.category !== lastCategory;
            lastCategory = group.category;

            const categoryPrice = pricing[group.category];

            return (
              <React.Fragment key={`row-${group.rowNum}`}>
                {isNewCategory && (
                  <div className="w-100 d-flex align-items-center justify-content-center gap-3 my-3">
                    <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-subtle)' }} />
                    <span className="badge bg-dark border border-secondary text-secondary px-3 py-1 text-uppercase fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                      {group.category} {categoryPrice ? `— ${formatPaise(categoryPrice)}` : ''}
                    </span>
                    <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border-subtle)' }} />
                  </div>
                )}

                <div className="d-flex align-items-center justify-content-center mb-1">
                  {/* Left Row Label */}
                  <span
                    className="text-secondary fw-bold me-1 me-sm-2 text-center d-flex align-items-center justify-content-center"
                    style={{
                      width: 'var(--seat-size, 34px)',
                      height: 'var(--seat-size, 34px)',
                      fontSize: 'var(--seat-font-size, 11px)',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {group.rowChar}
                  </span>

                  {/* Cells */}
                  <div className="d-flex align-items-center">
                    {group.cells.map((cell) => (
                      <SeatCell
                        key={`cell-${cell.row}-${cell.col}`}
                        cell={cell}
                        seatData={seatMap.get(cell.label)}
                        isSelected={selectedSeats.includes(cell.label)}
                        onToggle={onToggleSeat}
                        selectable={selectable}
                        showDetails={showDetails}
                      />
                    ))}
                  </div>

                  {/* Right Row Label */}
                  <span
                    className="text-secondary fw-bold ms-1 ms-sm-2 text-center d-flex align-items-center justify-content-center"
                    style={{
                      width: 'var(--seat-size, 34px)',
                      height: 'var(--seat-size, 34px)',
                      fontSize: 'var(--seat-font-size, 11px)',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {group.rowChar}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <SeatLegend />
    </div>
  );
}
