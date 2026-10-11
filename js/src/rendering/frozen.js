import { GRID } from '../../../config/theme.js?v=2';

export const RenderingFrozenMixin = {
  /**
   * Return frozen cell rendering attributes.
   * @param {boolean} isFrozenRow
   * @param {boolean} isFrozenCol
   * @param {number} frozenRowTop - top offset in px
   * @param {number} colLeft - left offset in px
   * @returns {{ cls: string, dataAttrs: string, style: string }}
   */
  _frozenCellAttrs(isFrozenRow, isFrozenCol, frozenRowTop, colLeft) {
    if (!isFrozenRow && !isFrozenCol) { return { cls: '', dataAttrs: '', style: '' }; }
    var cls, style;
    if (isFrozenRow && isFrozenCol) {
      cls = ' excelabu-cell-frozen-both';
      style = 'position:sticky;top:' + frozenRowTop + 'px;left:' + colLeft + 'px;';
    } else if (isFrozenRow) {
      cls = ' excelabu-cell-frozen-row';
      style = 'position:sticky;top:' + frozenRowTop + 'px;';
    } else {
      cls = ' excelabu-cell-frozen-col';
      style = 'position:sticky;left:' + colLeft + 'px;';
    }
    return { cls: cls, dataAttrs: ' data-frozen="true" data-frozen-top="' + frozenRowTop + '" data-frozen-left="' + colLeft + '"', style: style };
  },

  _syncFrozenRowTops() {
    var fr = this._frozenRow;
    if (fr == null || fr <= 0) return;
    var gridRect = this.gridTable.parentNode.getBoundingClientRect();
    var tbody = this.gridTable.querySelector('tbody');
    if (!tbody) return;
    var rows = tbody.children;
    for (var r = 0; r < Math.min(fr, rows.length); r++) {
      var actualTop = rows[r].getBoundingClientRect().top - gridRect.top;
      var frozenCells = rows[r].querySelectorAll('[data-frozen="true"]');
      for (var i = 0; i < frozenCells.length; i++) {
        frozenCells[i].style.top = actualTop + 'px';
        frozenCells[i].dataset.frozenTop = actualTop;
      }
    }
  },

  _syncFrozenColLefts() {
    var fc = this._frozenCol;
    if (fc == null || fc <= 0) return;
    var sheet = this.activeSheet;
    var colLefts = [];
    var accLeft = GRID.ROW_HEADER_WIDTH;
    for (var c = 0; c < sheet.colCount; c++) {
      colLefts[c] = accLeft;
      accLeft += sheet.getColWidth(c);
    }
    for (var c = 0; c < fc; c++) {
      var headerCell = this.gridTable.querySelector('.excelabu-col-header[data-col="' + c + '"]');
      if (headerCell) headerCell.style.left = colLefts[c] + 'px';
    }
    var frozenCells = this.gridTable.querySelectorAll('.excelabu-cell-frozen-col, .excelabu-cell-frozen-both');
    for (var i = 0; i < frozenCells.length; i++) {
      var cel = frozenCells[i];
      var col = parseInt(cel.dataset.col, 10);
      if (!isNaN(col) && col < fc) {
        cel.style.left = colLefts[col] + 'px';
        cel.dataset.frozenLeft = colLefts[col];
      }
    }
  }
};