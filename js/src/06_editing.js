import { Utils } from './01_utils.js?v=2';

import { UI } from '../../config/constants.js?v=1';

export const EditingMixin = {
  // ======================== Formula Bar ========================
  _onFormulaKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._commitFormula();
      this.formulaInput.blur();
      this.gridScroll.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this._cancelFormula();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this._commitFormula();
      this._moveSelection(this.activeCell.r, this.activeCell.c + 1, false);
      this.formulaInput.blur();
    }
  },

  _onFormulaInput() {
    // Formula bar editing: don't persist to data model on every keystroke.
    // Just track that formula bar has been modified; commit on Enter/Tab only.
    if (this.editingCell) return;
    this._formulaBarDirty = true;
  },

  _commitFormula() {
    const ac = this.activeCell;
    if (!ac) return;
    const value = this.formulaInput.value;
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
    this.formulaInput.blur();
  },

  _updateFormulaBar() {
    const ac = this.activeCell;
    if (!ac) {
      this.cellRefDisplay.textContent = '';
      this.formulaInput.value = '';
      return;
    }

    this.cellRefDisplay.textContent = Utils.toCellRef(ac.r, ac.c);

    // Don't overwrite formula bar while user is actively editing it
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
  _startEditing(r, c, clearFirst, seedChar) {
    // Cell is already selected from click/keyboard - just update ref without scrolling
    this.activeCell = { r, c };
    // Clear formula bar dirty flag since inline editing takes over
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

    // Sync formula bar
    formulaInput.value = editValue;
    this.editingCell = { r, c };

    // Create inline editor on the cell
    const cellEl = this.gridTable.querySelector(
      '.excelabu-cell[data-row="' + r + '"][data-col="' + c + '"]'
    );
    if (!cellEl) {
      // Cell not visible (maybe scrolled out of view), use formula bar instead
      formulaInput.focus({ preventScroll: true });
      formulaInput.select();
      this._formulaBarDirty = true;
      this._setStatus('Edit');
      return;
    }

    // Remove any existing editor
    this._removeCellEditor();

    // Add editing class to cell (overflow visible, padding reset)
    cellEl.classList.add('editing');

    // Create editor as child of the cell for exact size matching
    const editor = document.createElement('textarea');
    editor.className = 'excelabu-cell-editor';
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

    // Focus and position cursor
    if (seedChar) {
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(seedChar.length, seedChar.length);
    } else {
      editor.focus({ preventScroll: true });
      var len = editValue.length;
      // Defer to after browser focus/select-all to override cursor position
      setTimeout(function () {
        editor.setSelectionRange(len, len);
      }, 0);
    }

    // Bind editor events
    const commitEdit = (moveDir) => {
      const val = editor.value;
      this._removeCellEditor();
      this.editingCell = null;
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
      this._updateFormulaBar();
      this._setStatus('Ready');
    };

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.altKey) {
          // Alt+Enter: insert newline at cursor
          e.preventDefault();
          var start = editor.selectionStart;
          var end   = editor.selectionEnd;
          editor.value = editor.value.substring(0, start) + '\n' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 1;
          // Trigger auto-resize
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
      // Sync to formula bar
      formulaInput.value = editor.value;
      // Auto-resize height to fit content
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

    // Also bind formula input changes back to editor
    const syncFromFormula = () => {
      if (this.cellEditor) {
        this.cellEditor.value = formulaInput.value;
      }
    };
    formulaInput.addEventListener('input', syncFromFormula);
    this._formulaSyncHandler = syncFromFormula;

    // Focus without scrolling
    editor.focus({ preventScroll: true });
    editor.select();
    this._setStatus('Edit');
  },

  _removeCellEditor() {
    if (this.cellEditor) {
      if (this._formulaSyncHandler) {
        this.formulaInput.removeEventListener('input', this._formulaSyncHandler);
        this._formulaSyncHandler = null;
      }
      // Remove editing class from parent cell
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
      const value = this.cellEditor ? this.cellEditor.value : this.formulaInput.value;
      this._removeCellEditor();
      this.editingCell = null;
      this._pushUndo();
      this.activeSheet.setCell(r, c, value);
      // Store the last edited cell so toolbar actions can apply to it
      this._lastEditedCell = { r, c };
      this._renderCell(r, c);
      this._updateSelectionDisplay();
      this._updateFormulaBar();
      this._setStatus('Ready');
    }
  }

};