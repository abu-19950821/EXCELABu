import { UI } from '../../../config/constants.js?v=1';

export const EventsKeyboardMixin = {
  _onKeyDown(e) {
    if (document.activeElement === this.formulaInput) return;
    
    if (this.editingCell) return;

    if (document.activeElement && document.activeElement.closest('.excelabu-search-overlay')) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (ctrl && !shift) {
      switch (e.key.toLowerCase()) {
        case 'c': e.preventDefault(); this.copy(); return;
        case 'x': e.preventDefault(); this.cut(); return;
        case 'v': e.preventDefault(); this.paste(); return;
        case 'z': e.preventDefault(); this.undo(); return;
        case 'y': e.preventDefault(); this.redo(); return;
        case 'a': e.preventDefault(); this._selectAll(); return;
        case 'f': e.preventDefault(); this._showFindDialog(); return;
      }
    }
    if (ctrl && shift) {
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); this._showReplaceDialog(); return; }
    }

    const ac = this.activeCell;
    if (!ac) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this._moveSelection(ac.r - 1, ac.c, shift);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._moveSelection(ac.r + 1, ac.c, shift);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this._moveSelection(ac.r, ac.c - 1, shift);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this._moveSelection(ac.r, ac.c + 1, shift);
        break;
      case 'Tab':
        e.preventDefault();
        if (shift) {
          this._moveSelection(ac.r, Math.max(0, ac.c - 1), false);
        } else {
          this._moveSelection(ac.r, ac.c + 1, false);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (shift) {
          this._moveSelection(Math.max(0, ac.r - 1), ac.c, false);
        } else {
          this._moveSelection(ac.r + 1, ac.c, false);
        }
        break;
      case 'F2':
        e.preventDefault();
        this._startEditing(ac.r, ac.c);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.clearCells();
        break;
      case 'Escape':
        e.preventDefault();
        this._selectCell(ac.r, ac.c);
        break;
      case 'PageUp':
        e.preventDefault();
        this._moveSelection(Math.max(0, ac.r - UI.PAGE_SCROLL_ROWS), ac.c, shift);
        break;
      case 'PageDown':
        e.preventDefault();
        this._moveSelection(Math.min(this.activeSheet.rowCount - 1, ac.r + UI.PAGE_SCROLL_ROWS), ac.c, shift);
        break;
      case 'Home':
        e.preventDefault();
        if (ctrl) {
          this._selectCell(0, 0);
        } else {
          this._moveSelection(ac.r, 0, shift);
        }
        break;
      case 'End':
        e.preventDefault();
        if (ctrl) {
          this._selectCell(this.activeSheet.rowCount - 1, this.activeSheet.colCount - 1);
        } else {
          this._moveSelection(ac.r, this.activeSheet.colCount - 1, shift);
        }
        break;
      default:
        if (e.key.length === 1 && !ctrl && !e.altKey) {
          e.preventDefault();
          this._startEditing(ac.r, ac.c, true, e.key);
        }
        break;
    }
  },

  _moveSelection(r, c, extend) {
    const sheet = this.activeSheet;
    r = Math.max(0, Math.min(r, sheet.rowCount - 1));
    c = Math.max(0, Math.min(c, sheet.colCount - 1));

    if (extend) {
      const anchor = this.selectionAnchor || this.activeCell || { r, c };
      
      this._selectRange(
        Math.min(anchor.r, r), Math.min(anchor.c, c),
        Math.max(anchor.r, r), Math.max(anchor.c, c),
        r, c
      );
    } else {
      this._selectCell(r, c);
    }

    this._scrollToCell(r, c);
    this._updateSelectionOverlay();
  }
};
