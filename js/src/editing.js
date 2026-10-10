import { Utils } from './utils.js?v=3';

import { UI } from '../../config/constants.js?v=1';

export const EditingMixin = {
  // ======================== Formula Bar ========================
  _onFormulaKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._commitFormula();
      if (this.formulaInput) this.formulaInput.blur();
      this.gridScroll.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this._cancelFormula();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this._commitFormula();
      this._moveSelection(this.activeCell.r, this.activeCell.c + 1, false);
      if (this.formulaInput) this.formulaInput.blur();
    }
  },

  _onFormulaInput() {
    if (this.editingCell) return;
    this._formulaBarDirty = true;
  },

  _commitFormula() {
    const ac = this.activeCell;
    if (!ac) return;
    const value = this.formulaInput ? this.formulaInput.value : '';
    this._pushUndo();
    this.activeSheet.setCell(ac.r, ac.c, value);
    this._formulaBarDirty = false;
    this._renderCell(ac.r, ac.c);
    this._updateFormulaBar();
    this._setStatus('Ready');
  },

  _cancelFormula() {
    this._finishEditing();
    this._formulaBarDirty = false;
    this._updateFormulaBar();
    if (this.formulaInput) this.formulaInput.blur();
  },

  _updateFormulaBar() {
    const ac = this.activeCell;
    if (!ac) {
      if (this.cellRefDisplay) this.cellRefDisplay.textContent = '';
      if (this.formulaInput) this.formulaInput.value = '';
      return;
    }

    if (this.cellRefDisplay) {
      const sel = this.selection;
      if (sel && (sel.r1 !== sel.r2 || sel.c1 !== sel.c2)) {
        this.cellRefDisplay.textContent = Utils.toCellRef(sel.r1, sel.c1) + ':' + Utils.toCellRef(sel.r2, sel.c2);
      } else {
        this.cellRefDisplay.textContent = Utils.toCellRef(ac.r, ac.c);
      }
    }

    if (!this.formulaInput) return;
    if (this._formulaBarDirty) return;

    const cell = this.activeSheet.getCell(ac.r, ac.c);
    if (cell && cell.formula) {
      this.formulaInput.value = '=' + cell.formula;
    } else if (cell) {
      this.formulaInput.value = String(cell.value !== null && cell.value !== undefined ? cell.value : '');
    } else {
      this.formulaInput.value = '';
    }
  },

  // ======================== Cell Editing ========================

  /** Create the inline <textarea> editor inside the cell element */
  _createInlineEditor(cellEl, editValue) {
    // Remove any existing editor
    this._removeCellEditor();

    // Add editing class to cell (overflow visible, padding reset)
    cellEl.classList.add('editing');

    const editor = document.createElement('textarea');
    editor.className = 'excelabu-cell-editor';
    editor.name = 'excelabu-cell-editor';
    editor.value = editValue;
    editor.rows = 1;
    editor.style.position = 'absolute';
    editor.style.left = '0';
    editor.style.top = '0';
    editor.style.width = '100%';
    editor.style.height = '100%';
    editor.style.minHeight = '100%';

    cellEl.appendChild(editor);
    this.cellEditor = editor;
    return editor;
  },

  _startEditing(r, c, clearFirst, seedChar) {
    this.activeCell = { r, c };
    this.editingCell = null;
    this._formulaRefAnchor = null;
    this._formulaBarDirty = false;
    this._updateFormulaBar();

    const sheet = this.activeSheet;
    const cell = sheet.getCell(r, c);
    const formulaInput = this.formulaInput;

    let editValue = '';
    if (clearFirst) {
      editValue = seedChar || '';
    } else if (cell && cell.formula) {
      editValue = '=' + cell.formula;
    } else if (cell) {
      editValue = String(cell.value !== null && cell.value !== undefined ? cell.value : '');
    }

    if (formulaInput) formulaInput.value = editValue;
    this.editingCell = { r, c };

    const cellEl = this.gridTable.querySelector(
      '.excelabu-cell[data-row="' + r + '"][data-col="' + c + '"]'
    );
    if (!cellEl) {
      if (formulaInput) {
        formulaInput.focus({ preventScroll: true });
        formulaInput.select();
        this._formulaBarDirty = true;
      }
      this._setStatus('Edit');
      return;
    }

    const editor = this._createInlineEditor(cellEl, editValue);

    if (seedChar) {
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(seedChar.length, seedChar.length);
    } else {
      editor.focus({ preventScroll: true });
      var len = editValue.length;
      setTimeout(function () {
        editor.setSelectionRange(len, len);
      }, 0);
    }

    const commitEdit = (moveDir) => {
      const val = editor.value;
      this._removeCellEditor();
      this.editingCell = null;
      this._formulaRefAnchor = null;
      this._pushUndo();
      sheet.setCell(r, c, val);
      this._renderGrid();
      this._updateSelectionDisplay();
      this._updateFormulaBar();

      if (moveDir === 'down') {
        this._moveSelection(Math.min(sheet.rowCount - 1, r + 1), c, false);
      } else if (moveDir === 'right') {
        this._moveSelection(r, Math.min(sheet.colCount - 1, c + 1), false);
      }
      this._setStatus('Ready');
    };

    const cancelEdit = () => {
      this._removeCellEditor();
      this.editingCell = null;
      this._formulaRefAnchor = null;
      this._updateFormulaBar();
      this._setStatus('Ready');
    };

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.altKey) {
          e.preventDefault();
          var start = editor.selectionStart;
          var end   = editor.selectionEnd;
          editor.value = editor.value.substring(0, start) + '\n' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 1;
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          e.preventDefault();
          commitEdit('down');
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit('right');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });

    editor.addEventListener('input', () => {
      if (formulaInput) formulaInput.value = editor.value;
      editor.style.height = 'auto';
      editor.style.height = Math.max(
        cellEl.offsetHeight,
        editor.scrollHeight
      ) + 'px';
    });

    editor.addEventListener('blur', () => {
      setTimeout(() => {
        if (this.cellEditor === editor) {
          commitEdit(null);
        }
      }, UI.BLUR_COMMIT_DELAY);
    });

    if (formulaInput) {
      const syncFromFormula = () => {
        if (this.cellEditor) {
          this.cellEditor.value = formulaInput.value;
        }
      };
      formulaInput.addEventListener('input', syncFromFormula);
      this._formulaSyncHandler = syncFromFormula;
    }

    editor.focus({ preventScroll: true });
    editor.select();
    this._setStatus('Edit');
  },

  _removeCellEditor() {
    if (this.cellEditor) {
      if (this._formulaSyncHandler && this.formulaInput) {
        this.formulaInput.removeEventListener('input', this._formulaSyncHandler);
        this._formulaSyncHandler = null;
      }
      const parentCell = this.cellEditor.parentElement;
      if (parentCell) {
        parentCell.classList.remove('editing');
      }
      this.cellEditor.remove();
      this.cellEditor = null;
    }
  },

  _finishEditing() {
    if (this.editingCell) {
      const { r, c } = this.editingCell;
      const value = this.cellEditor ? this.cellEditor.value : (this.formulaInput ? this.formulaInput.value : '');
      this._removeCellEditor();
      this.editingCell = null;
      this._formulaRefAnchor = null;
      this._pushUndo();
      this.activeSheet.setCell(r, c, value);
      this._lastEditedCell = { r, c };
      this._renderCell(r, c);
      this._updateSelectionDisplay();
      this._updateFormulaBar();
      this._setStatus('Ready');
    }
  },

  _cursorInString(formula, cursorPos) {
    let inStr = false;
    for (let i = 0; i < cursorPos && i < formula.length; i++) {
      if (formula[i] === '"') {
        if (inStr && formula[i + 1] === '"') { i++; continue; }
        inStr = !inStr;
      }
    }
    return inStr;
  },

  _tryFormulaReference(opts) {
    const editor = this.cellEditor;
    const formulaInput = this.formulaInput;
    const currentValue = editor ? editor.value : (formulaInput ? formulaInput.value : '');

    if (!currentValue.startsWith('=')) return false;

    const cursorPos = editor ? editor.selectionStart : (currentValue.length);
    if (this._cursorInString(currentValue, cursorPos)) return false;

    let ref;
    if (opts.shift && this._formulaRefAnchor) {
      const a = this._formulaRefAnchor;
      const r1 = Math.min(a.r, opts.r), r2 = Math.max(a.r, opts.r);
      const c1 = Math.min(a.c, opts.c), c2 = Math.max(a.c, opts.c);
      ref = Utils.toCellRef(r1, c1) + ':' + Utils.toCellRef(r2, c2);
    } else {
      ref = Utils.toCellRef(opts.r, opts.c);
      this._formulaRefAnchor = { r: opts.r, c: opts.c };
    }

    if (editor) {
      const s = editor.selectionStart, e = editor.selectionEnd;
      const before = editor.value.substring(0, s);
      const after = editor.value.substring(e);
      editor.value = before + ref + after;
      const caret = before.length + ref.length;
      editor.selectionStart = editor.selectionEnd = caret;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (formulaInput) {
      formulaInput.value = editor ? editor.value : ('=' + ref);
    }

    return true;
  }

};