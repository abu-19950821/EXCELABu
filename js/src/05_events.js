import { GRID } from '../../config/theme.js?v=2';
import { UI } from '../../config/constants.js?v=1';

export const EventsMixin = {
  // ======================== Grid Mouse Events ========================
  _onGridMouseDown(e) {
    // Right-click: don't change selection (let contextmenu handle it)
    if (e.button === 2) {
      return;
    }

    // Click inside cell editor — let the input handle cursor placement
    if (e.target.closest('.excelabu-cell-editor')) {
      return;
    }

    const cellEl = e.target.closest('.excelabu-cell');
    const colHeader = e.target.closest('.excelabu-col-header');
    const rowHeader = e.target.closest('.excelabu-row-header');
    const corner = e.target.closest('.excelabu-corner');

    // Check for resize handle
    if (e.target.closest('.excelabu-col-resize-handle')) {
      this._startColResize(e.target.closest('.excelabu-col-header'));
      return;
    }
    if (e.target.closest('.excelabu-row-resize-handle')) {
      this._startRowResize(e.target.closest('.excelabu-row-header'));
      return;
    }

    // Check for fill handle drag
    if (e.target.closest('.excelabu-fill-handle') && this.selection) {
      e.preventDefault();
      this._startFillHandle(e);
      return;
    }

    // Hide context menu
    this._hideContextMenu();

    // Finish any active editing
    this._finishEditing();

    if (cellEl) {
      const r = parseInt(cellEl.dataset.row, 10);
      const c = parseInt(cellEl.dataset.col, 10);

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        // Ctrl+click: toggle cell in extra selections
        this._toggleExtraSelection(r, c);
        e.preventDefault();
        return;
      }

      if (e.shiftKey && this.activeCell) {
        // Extend selection from anchor cell
        this.extraSelections = [];
        this._selectRange(
          Math.min(this.activeCell.r, r),
          Math.min(this.activeCell.c, c),
          Math.max(this.activeCell.r, r),
          Math.max(this.activeCell.c, c),
          this.activeCell.r, this.activeCell.c
        );
      } else {
        this.extraSelections = [];
        this._selectCell(r, c);
      }

      this.isMouseDown = true;
      this.isDragging = false;
      this._dragStartCell = { r, c };
      this._dragStartMouseX = e.clientX;
      this._dragStartMouseY = e.clientY;

      // Prevent text selection during drag
      e.preventDefault();
    } else if (colHeader) {
      const c = parseInt(colHeader.dataset.col, 10);
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl) {
        this._toggleColumnSelection(c);
      } else if (shift && this.selection) {
        var startC = Math.min(this.selection.c1, c);
        var endC = Math.max(this.selection.c2, c);
        this.extraSelections = [];
        // Shift+click column header → extend to full columns
        this._selectRange(
          0, startC,
          this.activeSheet.rowCount - 1, endC
        );
      } else {
        this.extraSelections = [];
        this._selectColumn(c);
      }
      this.isMouseDown = true;
      this.isDragging = false;
      this._dragStartCell = null; // prevent old cell drag coordinates from interfering
      this._dragStartCol = c;
      e.preventDefault();
    } else if (rowHeader) {
      const r = parseInt(rowHeader.dataset.row, 10);
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl) {
        this._toggleRowSelection(r);
      } else if (shift && this.selection) {
        var startR = Math.min(this.selection.r1, r);
        var endR = Math.max(this.selection.r2, r);
        this.extraSelections = [];
        // Shift+click row header → extend to full rows
        this._selectRange(
          startR, 0,
          endR, this.activeSheet.colCount - 1
        );
      } else {
        this.extraSelections = [];
        this._selectRow(r);
      }
      this.isMouseDown = true;
      this.isDragging = false;
      this._dragStartCell = null; // prevent old cell drag coordinates from interfering
      this._dragStartRow = r;
      e.preventDefault();
    } else if (corner) {
      this.extraSelections = [];
      this._selectAll();
      this._dragStartCell = null; // prevent old cell drag coordinates from interfering
      e.preventDefault();
    }
  },

  _onGridDblClick(e) {
    // Prevent browser default word-selection on double-click
    e.preventDefault();

    // Prevent any lingering drag state from interfering
    this.isMouseDown = false;
    this.isDragging = false;
    this._dragStartCell = null;

    const cellEl = e.target.closest('.excelabu-cell');
    if (cellEl) {
      const r = parseInt(cellEl.dataset.row, 10);
      const c = parseInt(cellEl.dataset.col, 10);
      this._startEditing(r, c);
    }
  },

  _onMouseMove(e) {
    // Fill handle drag
    if (this.isFillDragging) {
      this._onFillMouseMove(e);
      return;
    }

    // Column resize
    if (this.resizing) {
      this._doResize(e);
      return;
    }

    if (this.isMouseDown && this._dragStartCell) {
      // Require minimum movement (4px) before starting drag to avoid
      // accidental selection from tiny mouse movement during double-click
      if (!this.isDragging) {
        const dx = e.clientX - (this._dragStartMouseX || 0);
        const dy = e.clientY - (this._dragStartMouseY || 0);
        if (Math.abs(dx) < UI.DRAG_THRESHOLD && Math.abs(dy) < UI.DRAG_THRESHOLD) {
          return;
        }
        this.isDragging = true;
      }

      // Find the cell under the mouse using DOM hit-testing
      // (avoids imprecision from mathematical column/row width accumulation,
      //  which drifts when CSS distributes extra table width across columns)
      let targetR = this._dragStartCell.r;
      let targetC = this._dragStartCell.c;

      const hitEl = document.elementFromPoint(e.clientX, e.clientY);
      if (hitEl) {
        const cellEl = hitEl.closest('.excelabu-cell');
        if (cellEl) {
          targetR = parseInt(cellEl.dataset.row, 10);
          targetC = parseInt(cellEl.dataset.col, 10);
        } else if (hitEl.closest('.excelabu-col-header')) {
          targetC = parseInt(hitEl.closest('.excelabu-col-header').dataset.col, 10);
        } else if (hitEl.closest('.excelabu-row-header')) {
          targetR = parseInt(hitEl.closest('.excelabu-row-header').dataset.row, 10);
        }
      }

      targetR = Math.max(0, Math.min(targetR, this.activeSheet.rowCount - 1));
      targetC = Math.max(0, Math.min(targetC, this.activeSheet.colCount - 1));

      const startR = Math.min(this._dragStartCell.r, targetR);
      const startC = Math.min(this._dragStartCell.c, targetC);
      const endR = Math.max(this._dragStartCell.r, targetR);
      const endC = Math.max(this._dragStartCell.c, targetC);

      if (this.selection &&
          (this.selection.r1 !== startR || this.selection.c1 !== startC ||
           this.selection.r2 !== endR || this.selection.c2 !== endC)) {
        this._selectRange(startR, startC, endR, endC,
          this._dragStartCell.r, this._dragStartCell.c);
      }
    }
  },

  _onMouseUp(e) {
    this.isMouseDown = false;

    if (this.isFillDragging) {
      this._onFillMouseUp(e);
      return;
    }

    if (this.resizing) {
      this._endResize();
    }

    this.isDragging = false;
    this._dragStartCell = null;
    this._dragStartCol = undefined;
    this._dragStartRow = undefined;
  },

  // ======================== Column/Row Resize ========================
  _startColResize(headerEl) {
    const c = parseInt(headerEl.dataset.col, 10);
    const currentWidth = this.activeSheet.getColWidth(c);
    this.resizing = {
      type: 'col',
      index: c,
      startSize: currentWidth,
      startX: -1  // will be set on first mousemove
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  },

  _startRowResize(headerEl) {
    const r = parseInt(headerEl.dataset.row, 10);
    const currentHeight = this.activeSheet.getRowHeight(r);
    this.resizing = {
      type: 'row',
      index: r,
      startSize: currentHeight,
      startY: -1  // will be set on first mousemove
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  },

  _doResize(e) {
    if (!this.resizing) return;

    if (this.resizing.type === 'col') {
      if (this.resizing.startX === -1) {
        this.resizing.startX = e.clientX;
        return;
      }
      const delta = e.clientX - this.resizing.startX;
      const newWidth = Math.max(GRID.MIN_COL_WIDTH, this.resizing.startSize + delta);
      this.activeSheet.setColWidth(this.resizing.index, newWidth);

      // Direct DOM update: colgroup <col> + all cells in this column
      // col 0 = corner, col 1..N = data columns
      const colEl = this.gridTable.querySelector('col:nth-child(' + (this.resizing.index + 2) + ')');
      if (colEl) {
        colEl.style.width = newWidth + 'px';
        colEl.style.minWidth = newWidth + 'px';
      }
      const cells = this.gridTable.querySelectorAll('[data-col="' + this.resizing.index + '"]');
      for (let i = 0; i < cells.length; i++) {
        cells[i].style.width = newWidth + 'px';
        cells[i].style.maxWidth = newWidth + 'px';
      }

      this._updateSelectionDisplay();
    } else if (this.resizing.type === 'row') {
      if (this.resizing.startY === -1) {
        this.resizing.startY = e.clientY;
        return;
      }
      const delta = e.clientY - this.resizing.startY;
      const newHeight = Math.max(GRID.MIN_ROW_HEIGHT, this.resizing.startSize + delta);
      this.activeSheet.setRowHeight(this.resizing.index, newHeight);

      // Direct DOM update: all cells in this row
      const cells = this.gridTable.querySelectorAll('[data-row="' + this.resizing.index + '"]');
      for (let i = 0; i < cells.length; i++) {
        cells[i].style.height = newHeight + 'px';
      }

      this._updateSelectionDisplay();
    }
  },

  _endResize() {
    this.resizing = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this._updateSelectionDisplay();
    if (this._showPrintArea) {
      this._renderPageBreakLines();
    }
  },

  // ======================== Keyboard Events ========================
  _onKeyDown(e) {
    // Let formula input handle its own keys
    if (document.activeElement === this.formulaInput) return;
    
    // Don't handle keys while editing - the inline editor handles its own keyboard events
    if (this.editingCell) return;

    // Don't intercept keystrokes meant for open dialogs/overlays
    if (document.activeElement && document.activeElement.closest('.excelabu-search-overlay')) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl key combinations
    if (ctrl && !shift) {
      switch (e.key.toLowerCase()) {
        case 'c': e.preventDefault(); this.copy(); return;
        case 'x': e.preventDefault(); this.cut(); return;
        case 'v': e.preventDefault(); this.paste(); return;
        case 'z': e.preventDefault(); this.undo(); return;
        case 'y': e.preventDefault(); this.redo(); return;
        case 'a': e.preventDefault(); this._selectAll(); return;
        case 'f': e.preventDefault(); this._showFindDialog(); return;
      }
    }
    if (ctrl && shift) {
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); this._showReplaceDialog(); return; }
    }

    const ac = this.activeCell;
    if (!ac) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this._moveSelection(ac.r - 1, ac.c, shift);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._moveSelection(ac.r + 1, ac.c, shift);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this._moveSelection(ac.r, ac.c - 1, shift);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this._moveSelection(ac.r, ac.c + 1, shift);
        break;
      case 'Tab':
        e.preventDefault();
        if (shift) {
          this._moveSelection(ac.r, Math.max(0, ac.c - 1), false);
        } else {
          this._moveSelection(ac.r, ac.c + 1, false);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (shift) {
          this._moveSelection(Math.max(0, ac.r - 1), ac.c, false);
        } else {
          this._moveSelection(ac.r + 1, ac.c, false);
        }
        break;
      case 'F2':
        e.preventDefault();
        this._startEditing(ac.r, ac.c);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.clearCells();
        break;
      case 'Escape':
        e.preventDefault();
        this._selectCell(ac.r, ac.c);
        break;
      case 'PageUp':
        e.preventDefault();
        this._moveSelection(Math.max(0, ac.r - UI.PAGE_SCROLL_ROWS), ac.c, shift);
        break;
      case 'PageDown':
        e.preventDefault();
        this._moveSelection(Math.min(this.activeSheet.rowCount - 1, ac.r + UI.PAGE_SCROLL_ROWS), ac.c, shift);
        break;
      case 'Home':
        e.preventDefault();
        if (ctrl) {
          this._selectCell(0, 0);
        } else {
          this._moveSelection(ac.r, 0, shift);
        }
        break;
      case 'End':
        e.preventDefault();
        if (ctrl) {
          this._selectCell(this.activeSheet.rowCount - 1, this.activeSheet.colCount - 1);
        } else {
          this._moveSelection(ac.r, this.activeSheet.colCount - 1, shift);
        }
        break;
      default:
        // Start typing to edit (single printable character)
        if (e.key.length === 1 && !ctrl && !e.altKey) {
          e.preventDefault();
          this._startEditing(ac.r, ac.c, true, e.key);
        }
        break;
    }
  },

  _moveSelection(r, c, extend) {
    const sheet = this.activeSheet;
    r = Math.max(0, Math.min(r, sheet.rowCount - 1));
    c = Math.max(0, Math.min(c, sheet.colCount - 1));

    if (extend) {
      // Use the selection anchor (where the selection started)
      const anchor = this.selectionAnchor || this.activeCell || { r, c };
      
      this._selectRange(
        Math.min(anchor.r, r), Math.min(anchor.c, c),
        Math.max(anchor.r, r), Math.max(anchor.c, c),
        r, c
      );
    } else {
      this._selectCell(r, c);
    }

    this._scrollToCell(r, c);
    this._updateSelectionOverlay();
  }

};