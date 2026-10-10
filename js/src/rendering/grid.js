import { Utils } from '../utils.js?v=3';
import { GRID } from '../../../config/theme.js?v=2';

export const RenderingGridMixin = {
  _renderAll() {
    this._renderSheetTabs();
    this._renderGrid();
    this._updateSelectionDisplay();
    if (this._showPrintArea) { this._renderPageBreakLines(); }
  },

  _renderSheetTabs() {
    if (!this.sheetTabsContainer) return;
    this.sheetTabsContainer.innerHTML = '';
    this.sheets.forEach((sheet, index) => {
      var tab = document.createElement('button');
      tab.className = 'excelabu-sheet-tab';
      if (index === this.activeSheetIndex) tab.classList.add('active');
      tab.dataset.index = index;
      tab.textContent = sheet.name;
      this.sheetTabsContainer.appendChild(tab);
    });
    var addBtn = document.createElement('button');
    addBtn.className = 'excelabu-add-sheet';
    addBtn.textContent = '+';
    this.sheetTabsContainer.appendChild(addBtn);
  },

  _ensureGridSize() {
    var sheet = this.activeSheet;
    var last = sheet.getLastDataExtent();
    var scrollEl = this.gridScroll;
    var rowH = GRID.COL_HEADER_HEIGHT;
    var colW = GRID.DEFAULT_COL_WIDTH;
    var visibleRows = scrollEl.clientHeight > 0 ? Math.ceil(scrollEl.clientHeight / rowH) : GRID.VISIBLE_ROWS_FALLBACK;
    var visibleCols = scrollEl.clientWidth > GRID.ROW_HEADER_WIDTH ? Math.ceil((scrollEl.clientWidth - GRID.ROW_HEADER_WIDTH) / colW) : GRID.VISIBLE_COLS_FALLBACK;
    var minRows = Math.max(last.r + 1 + GRID.EXPAND_BUFFER, visibleRows + GRID.EXPAND_BUFFER);
    var minCols = Math.max(last.c + 1 + GRID.EXPAND_BUFFER, visibleCols + GRID.EXPAND_BUFFER);
    var changed = false;
    if (sheet.rowCount < minRows) { sheet.rowCount = minRows; changed = true; }
    if (sheet.colCount < minCols) { sheet.colCount = minCols; changed = true; }
    if (this.gridTable && !changed) {
      var tbody = this.gridTable.querySelector('tbody');
      if (tbody) {
        if (tbody.children.length !== sheet.rowCount) changed = true;
        else if (tbody.children[0] && tbody.children[0].children.length < sheet.colCount + 1) changed = true;
      }
    }
    return changed;
  },

  _renderGrid() {
    this._ensureGridSize();
    var sheet = this.activeSheet;
    var rows = sheet.rowCount;
    var cols = sheet.colCount;
    var frozenCol = this._frozenCol != null ? this._frozenCol : 0;
    var frozenRow = this._frozenRow != null ? this._frozenRow : 0;
    var html = '<colgroup>';
    html += '<col style="width:' + GRID.ROW_HEADER_WIDTH + 'px;min-width:' + GRID.ROW_HEADER_WIDTH + 'px;">';
    for (var c = 0; c < cols; c++) { var width = sheet.getColWidth(c); html += '<col style="width:' + width + 'px;min-width:' + width + 'px;">'; }
    html += '</colgroup>';
    var colLefts = [];
    var accLeft = GRID.ROW_HEADER_WIDTH;
    for (var cc = 0; cc < cols; cc++) { colLefts[cc] = accLeft; accLeft += sheet.getColWidth(cc); }
    html += '<thead><tr>';
    html += '<th class="excelabu-corner" style="position:sticky;top:0;left:0;z-index:' + GRID.ZINDEX.CORNER + ';"></th>';
    for (var c = 0; c < cols; c++) {
      var width = sheet.getColWidth(c);
      var isColFrozen = frozenCol > 0 && c < frozenCol;
      var colHeadExtra = isColFrozen ? 'left:' + colLefts[c] + 'px;z-index:' + (GRID.ZINDEX.CORNER - 1) + ';' : 'z-index:' + GRID.ZINDEX.COL_HEADER + ';';
      html += '<th class="excelabu-col-header' + (this._sortCol === c ? ' excelabu-col-header-sorted' : '') + '" data-col="' + c + '" ' +
        'style="position:sticky;top:0;' + colHeadExtra + 'width:' + width + 'px;max-width:' + width + 'px;">' +
        Utils.colToLetter(c) +
        (this._sortCol === c ? '<span class="excelabu-sort-indicator">' + (this._sortAscending ? '&#9650;' : '&#9660;') + '</span>' : '') +
        '<div class="excelabu-col-resize-handle"></div></th>';
    }
    html += '</tr></thead><tbody>';

    var rowTopOffsets = new Array(rows);
    var accTop = GRID.COL_HEADER_HEIGHT;
    for (var ri = 0; ri < rows; ri++) {
      rowTopOffsets[ri] = accTop;
      accTop += sheet.getRowHeight(ri);
    }

    for (var r = 0; r < rows; r++) {
      var rowHeight = sheet.getRowHeight(r);
      var isFrozenRow = frozenRow > 0 && r < frozenRow;
      var frozenRowTop = rowTopOffsets[r];
      html += '<tr>';
      if (isFrozenRow) {
        html += '<th class="excelabu-row-header" data-row="' + r + '" data-frozen="true" data-frozen-top="' + frozenRowTop + '" ' +
          'style="position:sticky;top:' + frozenRowTop + 'px;left:0px;z-index:' + GRID.ZINDEX.CORNER +
          ';width:' + GRID.ROW_HEADER_WIDTH + 'px;height:' + rowHeight + 'px;">' + (r + 1) + '<div class="excelabu-row-resize-handle"></div></th>';
      } else {
        html += '<th class="excelabu-row-header" data-row="' + r + '" style="position:sticky;left:0px;z-index:' + GRID.ZINDEX.ROW_HEADER + ';width:' + GRID.ROW_HEADER_WIDTH + 'px;height:' + rowHeight + 'px;">' +
          (r + 1) + '<div class="excelabu-row-resize-handle"></div></th>';
      }
      var c = 0;
      while (c < cols) {
        var mergeRange = sheet.getMergeRange(r, c);
        if (mergeRange && (r !== mergeRange.r1 || c !== mergeRange.c1)) { c++; continue; }
        if (mergeRange && r === mergeRange.r1 && c === mergeRange.c1) {
          var colspan = mergeRange.c2 - mergeRange.c1 + 1;
          var rowspan = mergeRange.r2 - mergeRange.r1 + 1;
          var mergedSize = sheet.getMergedSize(mergeRange);
          var totalWidth = mergedSize.width;
          var totalHeight = mergedSize.height;
          var displayValue = sheet.getCellDisplay(r, c);
          var escapedValue = Utils.escapeHtml(displayValue).replace(/\n/g, '<br>');
          var cell = sheet.getCell(r, c);
          var styleAttr = this._buildCellStyleAttr(cell, totalWidth, totalHeight, r, c);
          var isFrozenColM = frozenCol > 0 && c < frozenCol;
          var attrsM = this._frozenCellAttrs(isFrozenRow, isFrozenColM, frozenRowTop, colLefts[c]);
          var finalStyleAttrM = attrsM.style ? styleAttr.replace('style="', 'style="' + attrsM.style) : styleAttr;
          html += '<td class="excelabu-cell' + attrsM.cls + '" data-row="' + r + '" data-col="' + c + '" ' +
            'colspan="' + colspan + '" rowspan="' + rowspan + '" ' + attrsM.dataAttrs + ' ' + finalStyleAttrM + '>' + escapedValue + '</td>';
          c = mergeRange.c2 + 1;
        } else {
          var width = sheet.getColWidth(c);
          var displayValue = sheet.getCellDisplay(r, c);
          var escapedValue = Utils.escapeHtml(displayValue).replace(/\n/g, '<br>');
          var cell = sheet.getCell(r, c);
          var styleAttr = this._buildCellStyleAttr(cell, width, rowHeight, r, c);
          var isFrozenCol = frozenCol > 0 && c < frozenCol;
          var attrs = this._frozenCellAttrs(isFrozenRow, isFrozenCol, frozenRowTop, colLefts[c]);
          var finalStyleAttr = attrs.style ? styleAttr.replace('style="', 'style="' + attrs.style) : styleAttr;
          html += '<td class="excelabu-cell' + attrs.cls + '" data-row="' + r + '" data-col="' + c + '" ' + attrs.dataAttrs + ' ' + finalStyleAttr + '>' + escapedValue + '</td>';
          c++;
        }
      }
      html += '</tr>';
    }
    html += '</tbody>';
    // iPad/tablet Safari: force the fixed-layout table to its full content width so
    // columns are not squeezed into the container and a horizontal scrollbar appears.
    this.gridTable.style.width = accLeft + 'px';
    this.gridTable.style.minWidth = accLeft + 'px';
    this.gridTable.innerHTML = html;
    this._cellDOM = {};
    var cells = this.gridTable.querySelectorAll('.excelabu-cell');
    for (var i = 0; i < cells.length; i++) { var el = cells[i]; this._cellDOM[el.dataset.row + ',' + el.dataset.col] = el; }
    this._syncFrozenOverlay();
  }
};