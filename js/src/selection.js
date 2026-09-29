import { GRID } from '../../config/theme.js?v=2';

export const SelectionMixin = {
  // ======================== Selection ========================
  _selectCell(r, c) {
    const sheet = this.activeSheet;
    r = Math.max(0, Math.min(r, sheet.rowCount - 1));
    c = Math.max(0, Math.min(c, sheet.colCount - 1));

    this.selection = { r1: r, c1: c, r2: r, c2: c };
    this.activeCell = { r, c };
    this.selectionAnchor = { r, c }; // Track anchor for shift+arrow extension
    this.extraSelections = [];
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._updateToolbarState();
    this._scrollToCell(r, c);
  },

  _selectRange(r1, c1, r2, c2, activeR, activeC) {
    // Ensure r1 <= r2 and c1 <= c2
    if (r1 > r2) {
      const temp = r1;
      r1 = r2;
      r2 = temp;
    }
    if (c1 > c2) {
      const temp = c1;
      c1 = c2;
      c2 = temp;
    }
    
    this.selection = { r1, c1, r2, c2 };
    this.activeCell = { r: activeR !== undefined ? activeR : r1, c: activeC !== undefined ? activeC : c1 };
    // Only update anchor if not extending (i.e., this is a new selection)
    if (activeR !== undefined && activeC !== undefined) {
      this.selectionAnchor = { r: activeR, c: activeC };
    }
    this.extraSelections = [];
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._updateToolbarState();
  },

  _selectAll() {
    const sheet = this.activeSheet;
    this._selectRange(0, 0, sheet.rowCount - 1, sheet.colCount - 1);
  },

  _selectColumn(c) {
    const sheet = this.activeSheet;
    this._selectRange(0, c, sheet.rowCount - 1, c);
  },

  _selectRow(r) {
    const sheet = this.activeSheet;
    this._selectRange(r, 0, r, sheet.colCount - 1);
  },

  /** Toggle a cell in extra selections for Ctrl+click multi-select */
  _toggleExtraSelection(r, c) {
    // Check if this cell is already in extra selections
    const idx = this.extraSelections.findIndex(sel =>
      r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2
    );

    if (idx !== -1) {
      // Remove from extra selections
      this.extraSelections.splice(idx, 1);
    } else {
      // Check if it's in the main selection
      if (this.selection &&
          r >= this.selection.r1 && r <= this.selection.r2 &&
          c >= this.selection.c1 && c <= this.selection.c2) {
        // Cell is in main selection - remove it from main selection
        // For simplicity, we'll just add it to extra selections to highlight it differently
        // A more complex implementation would split the main selection
      }
      // Add as extra single-cell selection
      this.extraSelections.push({ r1: r, c1: c, r2: r, c2: c });
    }

    this.activeCell = { r, c };
    this._updateSelectionDisplay();
    this._updateFormulaBar();
  },

  /** Toggle a full column in/out of selection for Ctrl+click on column header */
  _toggleColumnSelection(c) {
    this._toggleLinearSelection(true, c);
  },

  /** Toggle a full row in/out of selection for Ctrl+click on row header */
  _toggleRowSelection(r) {
    this._toggleLinearSelection(false, r);
  },

  /**
   * Shared helper for Ctrl+click toggle of full-column or full-row selection.
   * @param {boolean} isColumn - true for column, false for row
   * @param {number} idx - column or row index
   */
  _toggleLinearSelection(isColumn, idx) {
    const sheet = this.activeSheet;
    const spanSize = isColumn ? sheet.rowCount : sheet.colCount;

    // Helper: determine if main selection represents a "full linear" mode
    var isFullMode = this.selection &&
      (isColumn
        ? (this.selection.r1 === 0 && this.selection.r2 === spanSize - 1)
        : (this.selection.c1 === 0 && this.selection.c2 === spanSize - 1));

    // Is idx already fully selected in main or extra?
    var inMain = isFullMode &&
      (isColumn
        ? (idx >= this.selection.c1 && idx <= this.selection.c2)
        : (idx >= this.selection.r1 && idx <= this.selection.r2));

    var extraIdx = this.extraSelections.findIndex(function(sel) {
      var fullSpan = isColumn
        ? (sel.r1 === 0 && sel.r2 === spanSize - 1)
        : (sel.c1 === 0 && sel.c2 === spanSize - 1);
      if (!fullSpan) return false;
      return isColumn
        ? (idx >= sel.c1 && idx <= sel.c2)
        : (idx >= sel.r1 && idx <= sel.r2);
    });

    if (inMain) {
      // Remove idx from main selection
      var mainStart = isColumn ? this.selection.c1 : this.selection.r1;
      var mainEnd = isColumn ? this.selection.c2 : this.selection.r2;
      if (mainStart === idx && mainEnd === idx) {
        // Only this column/row — promote an extra if available
        if (this.extraSelections.length > 0) {
          this.selection = this.extraSelections.shift();
          this.activeCell = { r: this.selection.r1, c: this.selection.c1 };
        } else {
          this.selection = null;
          this.activeCell = null;
        }
      } else {
        // Multiple — split idx out, put remaining parts in extras
        var mr1 = this.selection.r1, mr2 = this.selection.r2;
        var mc1 = this.selection.c1, mc2 = this.selection.c2;
        this.extraSelections = [];
        if (isColumn) {
          if (mc1 < idx) {
            this.extraSelections.push({ r1: mr1, c1: mc1, r2: mr2, c2: idx - 1 });
          }
          if (mc2 > idx) {
            this.extraSelections.push({ r1: mr1, c1: idx + 1, r2: mr2, c2: mc2 });
          }
        } else {
          if (mr1 < idx) {
            this.extraSelections.push({ r1: mr1, c1: mc1, r2: idx - 1, c2: mc2 });
          }
          if (mr2 > idx) {
            this.extraSelections.push({ r1: idx + 1, c1: mc1, r2: mr2, c2: mc2 });
          }
        }
        this.selection = null;
      }
    } else if (extraIdx !== -1) {
      // Remove from extra
      this.extraSelections.splice(extraIdx, 1);
      if (this.extraSelections.length === 0 && !this.selection) {
        this.selection = { r1: 0, c1: 0, r2: 0, c2: 0 };
      }
    } else {
      // idx is NOT selected — add it
      if (!isFullMode) {
        // Current selection is not full linear — replace it
        this.extraSelections = [];
        if (isColumn) {
          this.selection = { r1: 0, c1: idx, r2: spanSize - 1, c2: idx };
          this.activeCell = { r: 0, c: idx };
        } else {
          this.selection = { r1: idx, c1: 0, r2: idx, c2: spanSize - 1 };
          this.activeCell = { r: idx, c: 0 };
        }
      } else {
        // Already in full mode — add idx as an extra
        if (isColumn) {
          this.extraSelections.push({ r1: 0, c1: idx, r2: spanSize - 1, c2: idx });
        } else {
          this.extraSelections.push({ r1: idx, c1: 0, r2: idx, c2: spanSize - 1 });
        }
      }
    }
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._updateToolbarState();
  },

  _updateSelectionDisplay() {
    const sheet = this.activeSheet;

    // Clear all selection outline classes (NOT background colors)
    const allCells = this.gridTable.querySelectorAll('.excelabu-cell');
    allCells.forEach(el => {
      el.style.outline = '';
      el.classList.remove('selected', 'active');
      const handle = el.querySelector('.excelabu-fill-handle');
      if (handle) handle.remove();
    });

    const colHeaders = this.gridTable.querySelectorAll('.excelabu-col-header.selected');
    colHeaders.forEach(el => el.classList.remove('selected'));

    const rowHeaders = this.gridTable.querySelectorAll('.excelabu-row-header.selected');
    rowHeaders.forEach(el => el.classList.remove('selected'));

    /** Highlight a range with blue background (no per-cell border) — uses _cellDOM cache for O(1) */
    const highlightRange = (r1, c1, r2, c2) => {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const merge = sheet.getMergeRange(r, c);
          if (merge && (r !== merge.r1 || c !== merge.c1)) {
            continue;
          }
          const cellEl = this._cellDOM ? this._cellDOM[r + ',' + c] : null;
          if (cellEl) {
            cellEl.classList.add('selected');
          }
        }
      }
    };

    // Highlight main selection
    if (this.selection) {
      highlightRange(this.selection.r1, this.selection.c1, this.selection.r2, this.selection.c2);

      for (let c = this.selection.c1; c <= this.selection.c2; c++) {
        const headerEl = this.gridTable.querySelector('.excelabu-col-header[data-col="' + c + '"]');
        if (headerEl) headerEl.classList.add('selected');
      }
      for (let r = this.selection.r1; r <= this.selection.r2; r++) {
        const headerEl = this.gridTable.querySelector('.excelabu-row-header[data-row="' + r + '"]');
        if (headerEl) headerEl.classList.add('selected');
      }
    }

    // Highlight extra selections (Ctrl+click multi-select)
    for (const extra of this.extraSelections) {
      highlightRange(extra.r1, extra.c1, extra.r2, extra.c2);

      for (let c = extra.c1; c <= extra.c2; c++) {
        const headerEl = this.gridTable.querySelector('.excelabu-col-header[data-col="' + c + '"]');
        if (headerEl) headerEl.classList.add('selected');
      }
      for (let r = extra.r1; r <= extra.r2; r++) {
        const headerEl = this.gridTable.querySelector('.excelabu-row-header[data-row="' + r + '"]');
        if (headerEl) headerEl.classList.add('selected');
      }
    }

    // Active cell — uses _cellDOM cache for O(1)
    if (this.activeCell) {
      const activeKey = this.activeCell.r + ',' + this.activeCell.c;
      const activeEl = this._cellDOM ? this._cellDOM[activeKey] : null;
      if (activeEl) {
        activeEl.classList.add('active');

        const isSingleCell = this.selection &&
          this.selection.r1 === this.selection.r2 &&
          this.selection.c1 === this.selection.c2;
        if (!isSingleCell) {
          activeEl.style.outlineStyle = 'none';
        }

        const handle = document.createElement('div');
        handle.className = 'excelabu-fill-handle';
        activeEl.appendChild(handle);
      }
    }

    // Update selection border overlay
    this._updateSelectionOverlay();
  },

  _updateSelectionOverlay() {
    if (!this.selectionOverlay) return;

    if (this.selection && this.selection.r2 >= this.selection.r1 && this.selection.c2 >= this.selection.c1) {
      const sel = this.selection;

      if (sel.r1 === sel.r2 && sel.c1 === sel.c2) {
        this.selectionOverlay.style.display = 'none';
        return;
      }

      var firstCell = this._cellDOM ? this._cellDOM[sel.r1 + ',' + sel.c1] : null;
      var lastCell  = this._cellDOM ? this._cellDOM[sel.r2 + ',' + sel.c2] : null;

      // Selection that spans frozen AND non-frozen regions uses manual calculation
      // because a single rectangle can't correctly cover sticky+vsticky+scrollable mixing.
      var spansFrozenRow = this._frozenRow && sel.r1 < this._frozenRow && sel.r2 >= this._frozenRow;
      var spansFrozenCol = this._frozenCol && sel.c1 < this._frozenCol && sel.c2 >= this._frozenCol;

      if (firstCell && lastCell && this.gridScroll && !spansFrozenRow && !spansFrozenCol) {
        var sr = this.gridScroll.getBoundingClientRect();
        var r1 = firstCell.getBoundingClientRect();
        var r2 = lastCell.getBoundingClientRect();

        // Convert visual (viewport) coordinates to scroll-content coordinates.
        // For frozen cells: visual pos already excludes scroll; adding scroll
        // compensates for the overlay being in scroll-content space.
        // For non-frozen cells: visual pos includes scroll offset; adding scroll
        // cancels it out, yielding the correct content position.
        var ox = -sr.left + this.gridScroll.scrollLeft;
        var oy = -sr.top  + this.gridScroll.scrollTop;

        this.selectionOverlay.style.left   = (r1.left + ox) + 'px';
        this.selectionOverlay.style.top    = (r1.top  + oy) + 'px';
        this.selectionOverlay.style.width  = (r2.right  - r1.left) + 'px';
        this.selectionOverlay.style.height = (r2.bottom - r1.top)  + 'px';
        this.selectionOverlay.style.display = 'block';
        return;
      }

      // Fallback manual calculation for mixed frozen/non-frozen or missing DOM
      var sheet = this.activeSheet;
      var ftop = GRID.COL_HEADER_HEIGHT, fleft = GRID.ROW_HEADER_WIDTH;
      for (var r = 0; r < sel.r1; r++) ftop  += sheet.getRowHeight(r);
      for (var c = 0; c < sel.c1; c++) fleft += sheet.getColWidth(c);
      var fw = 0, fh = 0;
      for (var rr = sel.r1; rr <= sel.r2; rr++) fh += sheet.getRowHeight(rr);
      for (var cc = sel.c1; cc <= sel.c2; cc++) fw += sheet.getColWidth(cc);

      var scrollTop = this.gridScroll ? this.gridScroll.scrollTop : 0;
      var scrollLeft = this.gridScroll ? this.gridScroll.scrollLeft : 0;
      if (!this._frozenRow || sel.r1 >= this._frozenRow) ftop  -= scrollTop;
      if (!this._frozenCol || sel.c1 >= this._frozenCol) fleft -= scrollLeft;

      this.selectionOverlay.style.left   = fleft + 'px';
      this.selectionOverlay.style.top    = ftop  + 'px';
      this.selectionOverlay.style.width  = fw    + 'px';
      this.selectionOverlay.style.height = fh    + 'px';
      this.selectionOverlay.style.display = 'block';
    } else {
      this.selectionOverlay.style.display = 'none';
    }
  },

  _scrollToCell(r, c) {
    const cellEl = this._cellDOM ? this._cellDOM[r + ',' + c] : null;
    if (cellEl) {
      cellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  },

  // ======================== Rendering ========================
};