import { GRID } from '../../../config/theme.js?v=2';
import { UI } from '../../../config/constants.js?v=1';

export const EventsMouseMixin = {
  _onGridMouseDown(e) {
    if (e.button === 2) {
      return;
    }

    if (e.target.closest('.excelabu-cell-editor')) {
      return;
    }

    const cellEl = e.target.closest('.excelabu-cell');
    const colHeader = e.target.closest('.excelabu-col-header');
    const rowHeader = e.target.closest('.excelabu-row-header');
    const corner = e.target.closest('.excelabu-corner');

    if (e.target.closest('.excelabu-col-resize-handle')) {
      this._startColResize(e.target.closest('.excelabu-col-header'));
      return;
    }
    if (e.target.closest('.excelabu-row-resize-handle')) {
      this._startRowResize(e.target.closest('.excelabu-row-header'));
      return;
    }

    if (e.target.closest('.excelabu-fill-handle') && this.selection) {
      e.preventDefault();
      this._startFillHandle(e);
      return;
    }

    this._hideContextMenu();

    this._finishEditing();

    if (cellEl) {
      const r = parseInt(cellEl.dataset.row, 10);
      const c = parseInt(cellEl.dataset.col, 10);

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        this._toggleExtraSelection(r, c);
        e.preventDefault();
        return;
      }

      if (e.shiftKey && this.activeCell) {
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
      this._dragStartCell = null;
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
      this._dragStartCell = null;
      this._dragStartRow = r;
      e.preventDefault();
    } else if (corner) {
      this.extraSelections = [];
      this._selectAll();
      this._dragStartCell = null;
      e.preventDefault();
    }
  },

  _onGridDblClick(e) {
    e.preventDefault();

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
    if (this.isFillDragging) {
      this._onFillMouseMove(e);
      return;
    }

    if (this.resizing) {
      this._doResize(e);
      return;
    }

    if (this.isMouseDown && this._dragStartCol !== undefined) {
      const hitEl = document.elementFromPoint(e.clientX, e.clientY);
      if (hitEl) {
        const colHeader = hitEl.closest('.excelabu-col-header');
        if (colHeader) {
          const targetC = parseInt(colHeader.dataset.col, 10);
          const startC = Math.min(this._dragStartCol, targetC);
          const endC = Math.max(this._dragStartCol, targetC);
          if (this.selection &&
              (this.selection.c1 !== startC || this.selection.c2 !== endC)) {
            this.extraSelections = [];
            this._selectRange(
              0, startC,
              this.activeSheet.rowCount - 1, endC
            );
          }
        }
      }
      return;
    }

    if (this.isMouseDown && this._dragStartRow !== undefined) {
      const hitEl = document.elementFromPoint(e.clientX, e.clientY);
      if (hitEl) {
        const rowHeader = hitEl.closest('.excelabu-row-header');
        if (rowHeader) {
          const targetR = parseInt(rowHeader.dataset.row, 10);
          const startR = Math.min(this._dragStartRow, targetR);
          const endR = Math.max(this._dragStartRow, targetR);
          if (this.selection &&
              (this.selection.r1 !== startR || this.selection.r2 !== endR)) {
            this.extraSelections = [];
            this._selectRange(
              startR, 0,
              endR, this.activeSheet.colCount - 1
            );
          }
        }
      }
      return;
    }

    if (this.isMouseDown && this._dragStartCell) {
      if (!this.isDragging) {
        const dx = e.clientX - (this._dragStartMouseX || 0);
        const dy = e.clientY - (this._dragStartMouseY || 0);
        if (Math.abs(dx) < UI.DRAG_THRESHOLD && Math.abs(dy) < UI.DRAG_THRESHOLD) {
          return;
        }
        this.isDragging = true;
      }

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
  }
};
