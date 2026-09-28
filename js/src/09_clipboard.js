import { Utils } from './01_utils.js?v=2';

import { UI } from '../../config/constants.js?v=1';

export const ClipboardMixin = {
  // ======================== Context Menu ========================
  _onContextMenu(e) {
    e.preventDefault();
    this._hideContextMenu();

    const cellEl = e.target.closest('.excelabu-cell');
    if (cellEl) {
      const r = parseInt(cellEl.dataset.row, 10);
      const c = parseInt(cellEl.dataset.col, 10);

      // Check if cell is in any existing selection (main or extra)
      let inSelection = false;
      if (this.selection &&
          r >= this.selection.r1 && r <= this.selection.r2 &&
          c >= this.selection.c1 && c <= this.selection.c2) {
        inSelection = true;
      }
      if (!inSelection) {
        for (const extra of this.extraSelections) {
          if (r >= extra.r1 && r <= extra.r2 && c >= extra.c1 && c <= extra.c2) {
            inSelection = true;
            break;
          }
        }
      }

      // If clicking outside all selections, select that cell
      if (!inSelection) {
        this._selectCell(r, c);
      }
    }

    this.contextMenu.style.display = 'block';
    this.contextMenu.style.left = e.clientX + 'px';
    this.contextMenu.style.top = e.clientY + 'px';

    // Ensure menu stays within viewport
    const menuRect = this.contextMenu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      this.contextMenu.style.left = (e.clientX - menuRect.width) + 'px';
    }
    if (menuRect.bottom > window.innerHeight) {
      this.contextMenu.style.top = (e.clientY - menuRect.height) + 'px';
    }
  },

  _hideContextMenu() {
    this.contextMenu.style.display = 'none';
  },

  // ======================== Clipboard (Copy/Cut/Paste) ========================
  copy() {
    if (!this.selection) return;
    const sel = this.selection;
    const sheet = this.activeSheet;

    const data = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      const row = [];
      for (let c = sel.c1; c <= sel.c2; c++) {
        const cell = sheet.getCell(r, c);
        if (cell && cell.formula) {
          row.push({ formula: cell.formula, value: sheet.getCellDisplay(r, c), _style: cell._style });
        } else if (cell) {
          row.push({ value: cell.value, _style: cell._style });
        } else {
          row.push({ value: null, _style: null });
        }
      }
      data.push(row);
    }

    this.clipboard = {
      data: data,
      rows: sel.r2 - sel.r1 + 1,
      cols: sel.c2 - sel.c1 + 1,
      r1: sel.r1,
      c1: sel.c1
    };
    this.clipboardAction = 'copy';

    // Also copy as TSV to system clipboard
    this._copyToSystemClipboard(data);

    this._showCopyIndicator();
    this._setStatus('Copied ' + (sel.r2 - sel.r1 + 1) + 'x' + (sel.c2 - sel.c1 + 1) + ' cells');
  },

  _copyToSystemClipboard(data) {
    const tsv = data.map(row =>
      row.map(cell => {
        const val = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
        // Escape tabs and newlines in values
        return val.includes('\t') || val.includes('\n') ? '"' + val.replace(/"/g, '""') + '"' : val;
      }).join('\t')
    ).join('\n');

    // Check for clipboard API support; fallback to execCommand
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {
        this._fallbackCopy(tsv);
      });
    } else {
      this._fallbackCopy(tsv);
    }
  },

  _fallbackCopy(tsv) {
    const textarea = document.createElement('textarea');
    textarea.value = tsv;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(textarea);
  },

  cut() {
    if (!this.selection) return;
    this.copy();
    this.clipboardAction = 'cut';
    this._setStatus('Cut ' + (this.selection.r2 - this.selection.r1 + 1) + 'x' + (this.selection.c2 - this.selection.c1 + 1) + ' cells');
  },

  paste() {
    if (!this.clipboard || !this.activeCell) {
      this._setStatus('Nothing to paste');
      return;
    }

    this._pushUndo();

    const ac = this.activeCell;
    const sheet = this.activeSheet;

    // Clear cut cells
    if (this.clipboardAction === 'cut') {
      const cb = this.clipboard;
      sheet.clearRange(cb.r1, cb.c1, cb.r1 + cb.rows - 1, cb.c1 + cb.cols - 1);
      this.clipboardAction = 'copy'; // Only cut once
    }

    // Paste data
    const cb = this.clipboard;
    for (let dr = 0; dr < cb.rows; dr++) {
      for (let dc = 0; dc < cb.cols; dc++) {
        const targetR = ac.r + dr;
        const targetC = ac.c + dc;
        if (targetR < sheet.rowCount && targetC < sheet.colCount) {
          const srcCell = cb.data[dr][dc];
          if (srcCell.formula) {
            sheet.setCellFormula(targetR, targetC, srcCell.formula);
          } else if (srcCell.value != null) {
            sheet.setCell(targetR, targetC, srcCell.value);
          }
          // Copy source cell style
          if (srcCell._style) {
            var key = targetR + ',' + targetC;
            if (sheet._data[key]) {
              sheet._data[key]._style = Utils.deepClone(srcCell._style);
            }
          }
        }
      }
    }

    this._selectRange(ac.r, ac.c, ac.r + cb.rows - 1, ac.c + cb.cols - 1);
    this._renderGrid();
    this._updateFormulaBar();
    this._setStatus('Pasted ' + cb.rows + 'x' + cb.cols + ' cells');
  },

  _showCopyIndicator() {
    if (!this.selection) return;
    const sel = this.selection;

    const cellEl = this.gridTable.querySelector(
      '.excelabu-cell[data-row="' + sel.r1 + '"][data-col="' + sel.c1 + '"]'
    );
    if (!cellEl) return;

    const cellRect = cellEl.getBoundingClientRect();
    const wrapperRect = this.gridScroll.getBoundingClientRect();

    this.copyIndicator.style.display = 'block';
    this.copyIndicator.style.left = (cellRect.left - wrapperRect.left + this.gridScroll.scrollLeft) + 'px';
    this.copyIndicator.style.top = (cellRect.top - wrapperRect.top + this.gridScroll.scrollTop) + 'px';

    // Calculate total width and height of selection
    const sheet = this.activeSheet;
    let totalWidth = 0;
    for (let c = sel.c1; c <= sel.c2; c++) {
      totalWidth += sheet.getColWidth(c);
    }
    let totalHeight = 0;
    for (let r = sel.r1; r <= sel.r2; r++) {
      totalHeight += sheet.getRowHeight(r);
    }

    this.copyIndicator.style.width = totalWidth + 'px';
    this.copyIndicator.style.height = totalHeight + 'px';

    setTimeout(() => {
      this.copyIndicator.style.display = 'none';
    }, UI.COPY_INDICATOR_DURATION);
  }

};