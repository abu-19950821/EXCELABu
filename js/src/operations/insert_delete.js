import { Utils } from '../utils.js?v=3';

export const OperationsInsertDeleteMixin = {
  insertRow() {
    this._pushUndo();
    var sheet = this.activeSheet;
    var insertAt = this.activeCell ? this.activeCell.r : 0;
    var newData = {};
    for (var key in sheet._data) {
      var pc = sheet._parseKey(key);
      var r = pc.r, c = pc.c;
      if (r >= insertAt) { newData[sheet._key(r + 1, c)] = sheet._data[key]; }
      else { newData[key] = sheet._data[key]; }
    }
    sheet._data = newData;
    for (var r = sheet.rowCount - 1; r >= insertAt; r--) { sheet.rowHeights[r + 1] = sheet.rowHeights[r]; }
    delete sheet.rowHeights[insertAt];
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      var nr1 = m.r1 >= insertAt ? m.r1 + 1 : m.r1;
      var nr2 = m.r2 >= insertAt ? m.r2 + 1 : m.r2;
      newMerges[sheet._key(nr1, m.c1)] = { r1: nr1, c1: m.c1, r2: nr2, c2: m.c2 };
    }
    sheet.mergedCells = newMerges;
    sheet.rowCount++;
    this._renderGrid(); this._updateSelectionDisplay();
    this._setStatus('Inserted row ' + (insertAt + 1));
  },

  deleteRow() {
    this._pushUndo();
    var sheet = this.activeSheet;
    var deleteAt = this.activeCell ? this.activeCell.r : 0;
    if (sheet.rowCount <= 1) return;
    var newData = {};
    for (var key in sheet._data) {
      var pc = sheet._parseKey(key);
      var r = pc.r, c = pc.c;
      if (r > deleteAt) { newData[sheet._key(r - 1, c)] = sheet._data[key]; }
      else if (r < deleteAt) { newData[key] = sheet._data[key]; }
    }
    sheet._data = newData;
    for (var r = deleteAt; r < sheet.rowCount - 1; r++) { sheet.rowHeights[r] = sheet.rowHeights[r + 1]; }
    delete sheet.rowHeights[sheet.rowCount - 1];
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      if (m.r1 === deleteAt) continue;
      if (m.r1 >= deleteAt || m.r2 >= deleteAt) {
        var nr1 = m.r1 > deleteAt ? m.r1 - 1 : m.r1;
        var nr2 = m.r2 > deleteAt ? m.r2 - 1 : m.r2;
        newMerges[sheet._key(nr1, m.c1)] = { r1: nr1, c1: m.c1, r2: nr2, c2: m.c2 };
      } else { newMerges[mk] = m; }
    }
    sheet.mergedCells = newMerges;
    sheet.rowCount--;
    if (this.activeCell && this.activeCell.r > deleteAt) { this.activeCell.r--; }
    if (this.selection) {
      if (this.selection.r1 > deleteAt) { this.selection.r1--; this.selection.r2--; }
      else if (this.selection.r2 >= deleteAt) { this.selection.r2--; }
      if (this.selection.r1 > this.selection.r2) this.selection = null;
    }
    this._renderGrid(); this._updateSelectionDisplay(); this._updateFormulaBar();
    this._setStatus('Deleted row ' + (deleteAt + 1));
  },

  insertCol() {
    this._pushUndo();
    var sheet = this.activeSheet;
    var insertAt = this.activeCell ? this.activeCell.c : 0;
    var newData = {};
    for (var key in sheet._data) {
      var pc = sheet._parseKey(key);
      var r = pc.r, c = pc.c;
      if (c >= insertAt) { newData[sheet._key(r, c + 1)] = sheet._data[key]; }
      else { newData[key] = sheet._data[key]; }
    }
    sheet._data = newData;
    var defW = this.options.defaultColWidth;
    for (var c = sheet.colCount - 1; c >= insertAt; c--) { sheet.colWidths[c + 1] = sheet.colWidths[c] || defW; }
    sheet.colWidths[insertAt] = defW;
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      var nc1 = m.c1 >= insertAt ? m.c1 + 1 : m.c1;
      var nc2 = m.c2 >= insertAt ? m.c2 + 1 : m.c2;
      newMerges[sheet._key(m.r1, nc1)] = { r1: m.r1, c1: nc1, r2: m.r2, c2: nc2 };
    }
    sheet.mergedCells = newMerges;
    sheet.colCount++;
    this._renderGrid(); this._updateSelectionDisplay();
    this._setStatus('Inserted column ' + Utils.colToLetter(insertAt));
  },

  deleteCol() {
    this._pushUndo();
    var sheet = this.activeSheet;
    var deleteAt = this.activeCell ? this.activeCell.c : 0;
    if (sheet.colCount <= 1) return;
    var newData = {};
    for (var key in sheet._data) {
      var pc = sheet._parseKey(key);
      var r = pc.r, c = pc.c;
      if (c > deleteAt) { newData[sheet._key(r, c - 1)] = sheet._data[key]; }
      else if (c < deleteAt) { newData[key] = sheet._data[key]; }
    }
    sheet._data = newData;
    var defW = this.options.defaultColWidth;
    for (var c = deleteAt; c < sheet.colCount - 1; c++) { sheet.colWidths[c] = sheet.colWidths[c + 1] || defW; }
    delete sheet.colWidths[sheet.colCount - 1];
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      if (m.c1 === deleteAt) continue;
      if (m.c1 >= deleteAt || m.c2 >= deleteAt) {
        var nc1 = m.c1 > deleteAt ? m.c1 - 1 : m.c1;
        var nc2 = m.c2 > deleteAt ? m.c2 - 1 : m.c2;
        newMerges[sheet._key(m.r1, nc1)] = { r1: m.r1, c1: nc1, r2: m.r2, c2: nc2 };
      } else { newMerges[mk] = m; }
    }
    sheet.mergedCells = newMerges;
    sheet.colCount--;
    if (this.activeCell && this.activeCell.c > deleteAt) { this.activeCell.c--; }
    if (this.selection) {
      if (this.selection.c1 > deleteAt) { this.selection.c1--; this.selection.c2--; }
      else if (this.selection.c2 >= deleteAt) { this.selection.c2--; }
      if (this.selection.c1 > this.selection.c2) this.selection = null;
    }
    this._renderGrid(); this._updateSelectionDisplay(); this._updateFormulaBar();
    this._setStatus('Deleted column ' + Utils.colToLetter(deleteAt));
  }
};