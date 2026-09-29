import { Sheet } from '../sheet.js?v=8';

export const OperationsSheetMixin = {
  get activeSheet() { return this.sheets[this.activeSheetIndex]; },

  addSheet(name) {
    var sheet = new Sheet(name || 'Sheet' + (this.sheets.length + 1), this.options.rows, this.options.cols);
    this.sheets.push(sheet);
    this._renderSheetTabs();
    return this.sheets.length - 1;
  },

  switchSheet(index) {
    if (index >= 0 && index < this.sheets.length && index !== this.activeSheetIndex) {
      this._finishEditing();
      this.activeSheetIndex = index;
      this.selection = null;
      this.activeCell = { r: 0, c: 0 };
      this._renderAll();
      this._selectCell(0, 0);
      this._setStatus('Switched to ' + this.activeSheet.name);
    }
  },

  removeSheet(index) {
    if (this.sheets.length <= 1) return;
    if (index >= 0 && index < this.sheets.length) {
      this.sheets.splice(index, 1);
      if (this.activeSheetIndex >= this.sheets.length) { this.activeSheetIndex = this.sheets.length - 1; }
      this._renderAll();
      this._selectCell(0, 0);
    }
  },

  _renameSheetPrompt(index) {
    var sheet = this.sheets[index];
    var newName = prompt('Rename sheet to:', sheet.name);
    if (newName && newName.trim()) { sheet.name = newName.trim(); this._renderSheetTabs(); }
  }
};