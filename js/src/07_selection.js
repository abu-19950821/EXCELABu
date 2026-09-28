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
    const sheet = this.activeSheet;
    const rowCount = sheet.rowCount;

    // Helper: is the main selection a "column mode" selection (spans all rows)?
    var isColumnMode = this.selection &&
      this.selection.r1 === 0 && this.selection.r2 === rowCount - 1;

    // Is column c already fully selected in main or extra?
    var inMain = isColumnMode &&
      c >= this.selection.c1 && c <= this.selection.c2;
    var extraIdx = this.extraSelections.findIndex(function(sel) {
      return sel.r1 === 0 && sel.r2 === rowCount - 1 &&
        c >= sel.c1 && c <= sel.c2;
    });

    if (inMain) {
      // Remove column c from main selection
      if (this.selection.c1 === c && this.selection.c2 === c) {
        // Only this column — promote an extra if available
        if (this.extraSelections.length > 0) {
          this.selection = this.extraSelections.shift();
          this.activeCell = { r: this.selection.r1, c: this.selection.c1 };
        } else {
          this.selection = null;
          this.activeCell = null;
        }
      } else {
        // Multiple columns — split c out, put remaining parts in extras
        var mr1 = this.selection.r1, mr2 = this.selection.r2;
        var mc1 = this.selection.c1, mc2 = this.selection.c2;
        this.extraSelections = [];
        if (mc1 < c) {
          this.extraSelections.push({ r1: mr1, c1: mc1, r2: mr2, c2: c - 1 });
        }
        if (mc2 > c) {
          this.extraSelections.push({ r1: mr1, c1: c + 1, r2: mr2, c2: mc2 });
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
      // Column c is NOT selected — add it
      if (!isColumnMode) {
        // Current selection is not column-based (e.g. single cell).
        // Replace it with full column c as the main selection.
        this.extraSelections = [];
        this.selection = { r1: 0, c1: c, r2: rowCount - 1, c2: c };
        this.activeCell = { r: 0, c: c };
      } else {
        // Already in column mode — add c as an extra column
        this.extraSelections.push({ r1: 0, c1: c, r2: rowCount - 1, c2: c });
      }
    }
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._updateToolbarState();
  },

  /** Toggle a full row in/out of selection for Ctrl+click on row header */
  _toggleRowSelection(r) {
    const sheet = this.activeSheet;
    const colCount = sheet.colCount;

    var isRowMode = this.selection &&
      this.selection.c1 === 0 && this.selection.c2 === colCount - 1;

    var inMain = isRowMode &&
      r >= this.selection.r1 && r <= this.selection.r2;
    var extraIdx = this.extraSelections.findIndex(function(sel) {
      return sel.c1 === 0 && sel.c2 === colCount - 1 &&
        r >= sel.r1 && r <= sel.r2;
    });

    if (inMain) {
      if (this.selection.r1 === r && this.selection.r2 === r) {
        if (this.extraSelections.length > 0) {
          this.selection = this.extraSelections.shift();
          this.activeCell = { r: this.selection.r1, c: this.selection.c1 };
        } else {
          this.selection = null;
          this.activeCell = null;
        }
      } else {
        var mr1 = this.selection.r1, mr2 = this.selection.r2;
        var mc1 = this.selection.c1, mc2 = this.selection.c2;
        this.extraSelections = [];
        if (mr1 < r) {
          this.extraSelections.push({ r1: mr1, c1: mc1, r2: r - 1, c2: mc2 });
        }
        if (mr2 > r) {
          this.extraSelections.push({ r1: r + 1, c1: mc1, r2: mr2, c2: mc2 });
        }
        this.selection = null;
      }
    } else if (extraIdx !== -1) {
      this.extraSelections.splice(extraIdx, 1);
      if (this.extraSelections.length === 0 && !this.selection) {
        this.selection = { r1: 0, c1: 0, r2: 0, c2: 0 };
      }
    } else {
      if (!isRowMode) {
        this.extraSelections = [];
        this.selection = { r1: r, c1: 0, r2: r, c2: colCount - 1 };
        this.activeCell = { r: r, c: 0 };
      } else {
        this.extraSelections.push({ r1: r, c1: 0, r2: r, c2: colCount - 1 });
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
      const sheet = this.activeSheet;
      const sel = this.selection;

      // Single cell: no overlay needed (active cell outline suffices)
      if (sel.r1 === sel.r2 && sel.c1 === sel.c2) {
        this.selectionOverlay.style.display = 'none';
        return;
      }

      // Compute pixel positions from accumulated row heights / col widths
      var top = GRID.COL_HEADER_HEIGHT, left = GRID.ROW_HEADER_WIDTH;
      for (var r = 0; r < sel.r1; r++) top += sheet.getRowHeight(r);
      for (var c = 0; c < sel.c1; c++) left += sheet.getColWidth(c);

      var w = 0, h = 0;
      for (var rr = sel.r1; rr <= sel.r2; rr++) h += sheet.getRowHeight(rr);
      for (var cc = sel.c1; cc <= sel.c2; cc++) w += sheet.getColWidth(cc);

      // Adjust for scroll offset (frozen rows/cols are already accounted
      // in accumulated coords — they just need the sticky top/left removed)
      var scrollTop = this.gridScroll.scrollTop;
      var scrollLeft = this.gridScroll.scrollLeft;

      // Frozen rows: don't subtract scroll offset for them
      var frozenRowTop = 0;
      if (this._frozenRow !== null && this._frozenRow !== undefined) {
        for (var fr = 0; fr < this._frozenRow; fr++) frozenRowTop += sheet.getRowHeight(fr);
      }

      // Frozen cols: don't subtract scroll offset for them
      var frozenColLeft = GRID.ROW_HEADER_WIDTH;
      if (this._frozenCol !== null && this._frozenCol !== undefined) {
        for (var fc = 0; fc < this._frozenCol; fc++) frozenColLeft += sheet.getColWidth(fc);
      }

      var adjustedTop = top;
      var adjustedLeft = left;
      if (!this._frozenRow || sel.r1 >= this._frozenRow) adjustedTop -= scrollTop;
      if (!this._frozenCol || sel.c1 >= this._frozenCol) adjustedLeft -= scrollLeft;

      this.selectionOverlay.style.left = adjustedLeft + 'px';
      this.selectionOverlay.style.top = adjustedTop + 'px';
      this.selectionOverlay.style.width = w + 'px';
      this.selectionOverlay.style.height = h + 'px';
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