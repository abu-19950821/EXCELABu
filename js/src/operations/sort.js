export const OperationsSortMixin = {
  sortSelection(ascending) {
    if (!this.selection || (this.selection.r1 === this.selection.r2 && this.selection.c1 === this.selection.c2)) {
      this._setStatus('Sort: select a range first');
      return;
    }
    this._pushUndo();
    var sheet = this.activeSheet;
    var r1 = this.selection.r1, r2 = this.selection.r2, c1 = this.selection.c1, c2 = this.selection.c2;
    var sortCol = this.activeCell ? Math.max(c1, Math.min(c2, this.activeCell.c)) : c1;
    var rows = [];
    for (var r = r1; r <= r2; r++) {
      var hasData = false;
      for (var cc = c1; cc <= c2; cc++) {
        var checkCell = sheet._data[sheet._key(r, cc)];
        if (checkCell && checkCell.value != null && checkCell.value !== '') { hasData = true; break; }
      }
      if (!hasData) continue;
      var row = {};
      var keyCell = sheet._data[sheet._key(r, sortCol)];
      row.key = (keyCell && keyCell.value != null) ? keyCell.value : '';
      row.cells = {};
      for (var cc = 0; cc < sheet.colCount; cc++) {
        var cell = sheet._data[sheet._key(r, cc)];
        if (cell) row.cells[cc] = cell;
      }
      rows.push(row);
    }
    var allNumeric = rows.length > 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].key === '' || rows[i].key == null || isNaN(Number(rows[i].key))) { allNumeric = false; break; }
    }
    rows.sort(function(a, b) {
      if (allNumeric) {
        var na = Number(a.key), nb = Number(b.key);
        if (na === nb) return 0;
        return ascending ? na - nb : nb - na;
      }
      var va = String(a.key).toLowerCase();
      var vb = String(b.key).toLowerCase();
      if (va === vb) return 0;
      return ascending ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      if (m.r1 >= r1 && m.r2 <= r2) continue;
      newMerges[mk] = m;
    }
    sheet.mergedCells = newMerges;
    sheet._rebuildMergeIndex();
    for (var r = r1; r <= r2; r++) {
      for (var cc = 0; cc < sheet.colCount; cc++) { delete sheet._data[sheet._key(r, cc)]; }
    }
    for (var i = 0; i < rows.length; i++) {
      var rr = r1 + i;
      for (var cc = 0; cc < sheet.colCount; cc++) {
        if (rows[i].cells[cc]) { sheet._data[sheet._key(rr, cc)] = rows[i].cells[cc]; }
      }
    }
    this._renderGrid();
    this._updateSelectionDisplay();
    this._sortCol = sortCol;
    this._sortAscending = ascending;
    this._sortRange = { r1: r1, r2: r2, c1: c1, c2: c2 };
    this._setStatus('Sorted ' + rows.length + ' rows ' + (ascending ? 'ascending' : 'descending'));
  },

  _clearSort() {
    this._sortCol = null;
    this._sortAscending = null;
    this._sortRange = null;
    this._renderGrid();
    this._setStatus(this._t('sortClear'));
  }
};