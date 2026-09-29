import { GRID } from '../../../config/theme.js?v=2';

export const EventsResizeMixin = {
  _resizeRAF: null,
  _pendingResizeData: null,

  _startColResize(headerEl) {
    const c = parseInt(headerEl.dataset.col, 10);
    const currentWidth = this.activeSheet.getColWidth(c);
    this.resizing = {
      type: 'col',
      index: c,
      startSize: currentWidth,
      startX: -1
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
      startY: -1
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  },

  _doResize(e) {
    if (!this.resizing) return;
    var self = this;

    if (this._resizeRAF) cancelAnimationFrame(this._resizeRAF);
    this._resizeRAF = requestAnimationFrame(function() {
      self._resizeRAF = null;

      if (self.resizing.type === 'col') {
        if (self.resizing.startX === -1) {
          self.resizing.startX = e.clientX;
          return;
        }
        const delta = e.clientX - self.resizing.startX;
        const newWidth = Math.max(GRID.MIN_COL_WIDTH, self.resizing.startSize + delta);
        self.activeSheet.setColWidth(self.resizing.index, newWidth);

        const colEl = self.gridTable.querySelector('col:nth-child(' + (self.resizing.index + 2) + ')');
        if (colEl) {
          colEl.style.width = newWidth + 'px';
          colEl.style.minWidth = newWidth + 'px';
        }
        const cells = self.gridTable.querySelectorAll('[data-col="' + self.resizing.index + '"]');
        for (let i = 0; i < cells.length; i++) {
          cells[i].style.width = newWidth + 'px';
          cells[i].style.maxWidth = newWidth + 'px';
        }

        self._updateSelectionDisplay();
      } else if (self.resizing.type === 'row') {
        if (self.resizing.startY === -1) {
          self.resizing.startY = e.clientY;
          return;
        }
        const delta = e.clientY - self.resizing.startY;
        const newHeight = Math.max(GRID.MIN_ROW_HEIGHT, self.resizing.startSize + delta);
        self.activeSheet.setRowHeight(self.resizing.index, newHeight);

        const cells = self.gridTable.querySelectorAll('[data-row="' + self.resizing.index + '"]');
        for (let i = 0; i < cells.length; i++) {
          cells[i].style.height = newHeight + 'px';
        }

        self._updateSelectionDisplay();
      }
    });
  },

  _endResize() {
    if (this._resizeRAF) { cancelAnimationFrame(this._resizeRAF); this._resizeRAF = null; }
    this.resizing = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this._updateSelectionDisplay();
    if (this._showPrintArea) {
      this._renderPageBreakLines();
    }
  }
};