export const OperationsClearMixin = {
  clearCells() {
    if (!this.selection) return;
    this._pushUndo();
    var cleared = this._clearSelectionContents();
    if (cleared.length <= 20) {
      for (var i = 0; i < cleared.length; i++) { this._renderCell(cleared[i].r, cleared[i].c); }
      this._updateSelectionDisplay();
    } else { this._renderGrid(); }
    this._updateFormulaBar();
    this._setStatus('Cleared cells');
  },

  _clearSelectionContents() {
    if (!this.selection) return [];
    var sel = this.selection;
    var sheet = this.activeSheet;
    var affected = [];
    for (var r = sel.r1; r <= sel.r2; r++) {
      for (var c = sel.c1; c <= sel.c2; c++) {
        var mergeRange = sheet.getMergeRange(r, c);
        if (mergeRange && (r !== mergeRange.r1 || c !== mergeRange.c1)) continue;
        sheet.clearCell(r, c);
        affected.push({ r: r, c: c });
      }
    }
    return affected;
  }
};
