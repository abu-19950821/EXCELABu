import { Utils } from './utils.js?v=3';

import { HISTORY } from '../../config/constants.js?v=1';

export const HistoryMixin = {
  // ======================== Undo/Redo ========================
  /**
   * Undo/redo stacks are stored per sheet (keyed by sheet index) so switching
   * sheets does not lose history.  The stacks are lazy-created on first access.
   */
  _getUndoStack() {
    if (!this.undoStack) this.undoStack = {};
    var idx = this.activeSheetIndex;
    if (!this.undoStack[idx]) this.undoStack[idx] = [];
    return this.undoStack[idx];
  },
  _getRedoStack() {
    if (!this.redoStack) this.redoStack = {};
    var idx = this.activeSheetIndex;
    if (!this.redoStack[idx]) this.redoStack[idx] = [];
    return this.redoStack[idx];
  },

  _makeSnapshot() {
    return {
      data: this.activeSheet.getData(),
      colWidths: Utils.deepClone(this.activeSheet.colWidths),
      rowHeights: Utils.deepClone(this.activeSheet.rowHeights),
      mergedCells: Utils.deepClone(this.activeSheet.mergedCells),
      rowCount: this.activeSheet.rowCount,
      colCount: this.activeSheet.colCount
    };
  },

  _restoreSnapshot(snapshot) {
    this.activeSheet.setData(snapshot.data);
    this.activeSheet.colWidths = snapshot.colWidths;
    this.activeSheet.rowHeights = snapshot.rowHeights;
    this.activeSheet.mergedCells = snapshot.mergedCells;
    this.activeSheet._rebuildMergeIndex();
    this.activeSheet.rowCount = snapshot.rowCount;
    this.activeSheet.colCount = snapshot.colCount;
  },

  _pushUndo() {
    this._getUndoStack().push(this._makeSnapshot());
    this._getRedoStack().length = 0; // Clear redo stack on new action
    if (this._getUndoStack().length > HISTORY.UNDO_STACK_LIMIT) {
      this._getUndoStack().shift();
    }
  },

  undo() {
    if (this._getUndoStack().length === 0) {
      this._setStatus('Nothing to undo');
      return;
    }

    this._getRedoStack().push(this._makeSnapshot());

    var prevState = this._getUndoStack().pop();
    this._restoreSnapshot(prevState);

    this._renderGrid();
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._updateToolbarState();
    this._setStatus('Undo');
  },

  redo() {
    if (this._getRedoStack().length === 0) {
      this._setStatus('Nothing to redo');
      return;
    }

    this._getUndoStack().push(this._makeSnapshot());

    var nextState = this._getRedoStack().pop();
    this._restoreSnapshot(nextState);

    this._renderGrid();
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._updateToolbarState();
    this._setStatus('Redo');
  }

};