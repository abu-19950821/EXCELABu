import { Utils } from '../utils.js?v=3';

export const OperationsMergeMixin = {
  mergeSelection() {
    if (!this.selection) { this._setStatus('No cells selected'); return; }
    var sel = this.selection;
    if (sel.r1 === sel.r2 && sel.c1 === sel.c2) { this._setStatus('Select at least 2 cells to merge'); return; }
    this._pushUndo();
    var result = this.activeSheet.mergeCells(sel.r1, sel.c1, sel.r2, sel.c2);
    if (result === false) {
      this._setStatus('Cannot merge: overlaps with existing merged cells');
    } else {
      this._renderGrid();
      this._updateSelectionDisplay();
      this._setStatus('Merged cells ' + Utils.toCellRef(sel.r1, sel.c1) + ':' + Utils.toCellRef(sel.r2, sel.c2));
    }
  },

  unmergeSelection() {
    var ac = this.activeCell;
    if (!ac) return;
    this._pushUndo();
    var result = this.activeSheet.unmergeCells(ac.r, ac.c);
    if (result) {
      this._renderGrid();
      this._updateSelectionDisplay();
      this._setStatus('Unmerged cells');
    } else {
      this._setStatus('No merged cells found at this position');
    }
  }
};