import { Utils } from './01_utils.js?v=2';
import { Sheet } from './03_sheet.js?v=4';
import { DEFAULT_COLORS } from '../../config/theme.js?v=2';
import { GRID } from '../../config/theme.js?v=2';

export const OperationsMixin = {
  // ======================== Sheet Management ========================
  get activeSheet() {
    return this.sheets[this.activeSheetIndex];
  },

  addSheet(name) {
    const sheet = new Sheet(
      name || 'Sheet' + (this.sheets.length + 1),
      this.options.rows,
      this.options.cols
    );
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
    if (this.sheets.length <= 1) return; // Keep at least one sheet
    if (index >= 0 && index < this.sheets.length) {
      this.sheets.splice(index, 1);
      if (this.activeSheetIndex >= this.sheets.length) {
        this.activeSheetIndex = this.sheets.length - 1;
      }
      this._renderAll();
      this._selectCell(0, 0);
    }
  },

  _renameSheetPrompt(index) {
    const sheet = this.sheets[index];
    const newName = prompt('Rename sheet to:', sheet.name);
    if (newName && newName.trim()) {
      sheet.name = newName.trim();
      this._renderSheetTabs();
    }
  },

  // ======================== Merge Cells ========================
  /** Merge the currently selected range */
  mergeSelection() {
    if (!this.selection) {
      this._setStatus('No cells selected');
      return;
    }
    const sel = this.selection;
    if (sel.r1 === sel.r2 && sel.c1 === sel.c2) {
      this._setStatus('Select at least 2 cells to merge');
      return;
    }
    this._pushUndo();
    const result = this.activeSheet.mergeCells(sel.r1, sel.c1, sel.r2, sel.c2);
    if (result === false) {
      this._setStatus('Cannot merge: overlaps with existing merged cells');
    } else {
      this._renderGrid();
      this._updateSelectionDisplay();
      this._setStatus('Merged cells ' + Utils.toCellRef(sel.r1, sel.c1) + ':' + Utils.toCellRef(sel.r2, sel.c2));
    }
  },

  /** Unmerge cells at the active cell position */
  unmergeSelection() {
    const ac = this.activeCell;
    if (!ac) return;
    this._pushUndo();
    const result = this.activeSheet.unmergeCells(ac.r, ac.c);
    if (result) {
      this._renderGrid();
      this._updateSelectionDisplay();
      this._setStatus('Unmerged cells');
    } else {
      this._setStatus('No merged cells found at this position');
    }
  },

  // ======================== Row Operations ========================
  insertRow() {
    this._pushUndo();
    const sheet = this.activeSheet;
    const insertAt = this.activeCell ? this.activeCell.r : 0;

    // Shift data down
    const newData = {};
    for (const key in sheet._data) {
      const [r, c] = key.split(',').map(Number);
      if (r >= insertAt) {
        newData[(r + 1) + ',' + c] = sheet._data[key];
      } else {
        newData[key] = sheet._data[key];
      }
    }
    sheet._data = newData;

    // Shift row heights down
    for (let r = sheet.rowCount - 1; r >= insertAt; r--) {
      sheet.rowHeights[r + 1] = sheet.rowHeights[r];
    }
    delete sheet.rowHeights[insertAt];

    // Update merged cells
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      var nr1 = m.r1 >= insertAt ? m.r1 + 1 : m.r1;
      var nr2 = m.r2 >= insertAt ? m.r2 + 1 : m.r2;
      newMerges[nr1 + ',' + m.c1] = { r1: nr1, c1: m.c1, r2: nr2, c2: m.c2 };
    }
    sheet.mergedCells = newMerges;

    sheet.rowCount++;

    this._renderGrid();
    this._updateSelectionDisplay();
    this._setStatus('Inserted row ' + (insertAt + 1));
  },

  deleteRow() {
    this._pushUndo();
    const sheet = this.activeSheet;
    const deleteAt = this.activeCell ? this.activeCell.r : 0;

    if (sheet.rowCount <= 1) return;

    const newData = {};
    for (const key in sheet._data) {
      const [r, c] = key.split(',').map(Number);
      if (r > deleteAt) {
        newData[(r - 1) + ',' + c] = sheet._data[key];
      } else if (r < deleteAt) {
        newData[key] = sheet._data[key];
      }
      // r === deleteAt: skip (delete)
    }
    sheet._data = newData;

    // Shift row heights up
    for (let r = deleteAt; r < sheet.rowCount - 1; r++) {
      sheet.rowHeights[r] = sheet.rowHeights[r + 1];
    }
    delete sheet.rowHeights[sheet.rowCount - 1];

    // Update merged cells
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      if (m.r1 === deleteAt) continue; // top row deleted → merge data lost → remove merge
      if (m.r1 >= deleteAt || m.r2 >= deleteAt) {
        var nr1 = m.r1 > deleteAt ? m.r1 - 1 : m.r1;
        var nr2 = m.r2 > deleteAt ? m.r2 - 1 : m.r2;
        newMerges[nr1 + ',' + m.c1] = { r1: nr1, c1: m.c1, r2: nr2, c2: m.c2 };
      } else {
        newMerges[mk] = m;
      }
    }
    sheet.mergedCells = newMerges;

    sheet.rowCount--;

    if (this.activeCell && this.activeCell.r > deleteAt) {
      this.activeCell.r--;
    }
    if (this.selection) {
      if (this.selection.r1 > deleteAt) { this.selection.r1--; this.selection.r2--; }
      else if (this.selection.r2 >= deleteAt) { this.selection.r2--; }
      if (this.selection.r1 > this.selection.r2) this.selection = null;
    }

    this._renderGrid();
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._setStatus('Deleted row ' + (deleteAt + 1));
  },

  // ======================== Column Operations ========================
  insertCol() {
    this._pushUndo();
    const sheet = this.activeSheet;
    const insertAt = this.activeCell ? this.activeCell.c : 0;

    // Shift data right
    const newData = {};
    for (const key in sheet._data) {
      const parts = key.split(',');
      const r = parseInt(parts[0], 10);
      const c = parseInt(parts[1], 10);
      if (c >= insertAt) {
        newData[r + ',' + (c + 1)] = sheet._data[key];
      } else {
        newData[key] = sheet._data[key];
      }
    }
    sheet._data = newData;

    // Shift column widths right
    const defW = this.options.defaultColWidth;
    for (let c = sheet.colCount - 1; c >= insertAt; c--) {
      sheet.colWidths[c + 1] = sheet.colWidths[c] || defW;
    }
    sheet.colWidths[insertAt] = defW;

    // Update merged cells
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      var nc1 = m.c1 >= insertAt ? m.c1 + 1 : m.c1;
      var nc2 = m.c2 >= insertAt ? m.c2 + 1 : m.c2;
      newMerges[m.r1 + ',' + nc1] = { r1: m.r1, c1: nc1, r2: m.r2, c2: nc2 };
    }
    sheet.mergedCells = newMerges;

    sheet.colCount++;

    this._renderGrid();
    this._updateSelectionDisplay();
    this._setStatus('Inserted column ' + Utils.colToLetter(insertAt));
  },

  deleteCol() {
    this._pushUndo();
    const sheet = this.activeSheet;
    const deleteAt = this.activeCell ? this.activeCell.c : 0;

    if (sheet.colCount <= 1) return;

    const newData = {};
    for (const key in sheet._data) {
      const parts = key.split(',');
      const r = parseInt(parts[0], 10);
      const c = parseInt(parts[1], 10);
      if (c > deleteAt) {
        newData[r + ',' + (c - 1)] = sheet._data[key];
      } else if (c < deleteAt) {
        newData[key] = sheet._data[key];
      }
      // c === deleteAt: skip (delete)
    }
    sheet._data = newData;

    // Shift column widths left
    const defW = this.options.defaultColWidth;
    for (let c = deleteAt; c < sheet.colCount - 1; c++) {
      sheet.colWidths[c] = sheet.colWidths[c + 1] || defW;
    }
    delete sheet.colWidths[sheet.colCount - 1];

    // Update merged cells
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      if (m.c1 === deleteAt) continue; // left col deleted → merge data lost → remove merge
      if (m.c1 >= deleteAt || m.c2 >= deleteAt) {
        var nc1 = m.c1 > deleteAt ? m.c1 - 1 : m.c1;
        var nc2 = m.c2 > deleteAt ? m.c2 - 1 : m.c2;
        newMerges[m.r1 + ',' + nc1] = { r1: m.r1, c1: nc1, r2: m.r2, c2: nc2 };
      } else {
        newMerges[mk] = m;
      }
    }
    sheet.mergedCells = newMerges;

    sheet.colCount--;

    if (this.activeCell && this.activeCell.c > deleteAt) {
      this.activeCell.c--;
    }
    if (this.selection) {
      if (this.selection.c1 > deleteAt) { this.selection.c1--; this.selection.c2--; }
      else if (this.selection.c2 >= deleteAt) { this.selection.c2--; }
      if (this.selection.c1 > this.selection.c2) this.selection = null;
    }

    this._renderGrid();
    this._updateSelectionDisplay();
    this._updateFormulaBar();
    this._setStatus('Deleted column ' + Utils.colToLetter(deleteAt));
  },

  // ======================== Clear ========================
  clearCells() {
    if (!this.selection) return;
    this._pushUndo();
    var cleared = this._clearSelectionContents();
    if (cleared.length <= 20) {
      for (var i = 0; i < cleared.length; i++) {
        this._renderCell(cleared[i].r, cleared[i].c);
      }
      this._updateSelectionDisplay();
    } else {
      this._renderGrid();
    }
    this._updateFormulaBar();
    this._setStatus('Cleared cells');
  },

  _clearSelectionContents() {
    if (!this.selection) return [];
    const sel = this.selection;
    const sheet = this.activeSheet;
    var affected = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      for (let c = sel.c1; c <= sel.c2; c++) {
        // Skip cells that are part of a merge but not the master cell
        const mergeRange = sheet.getMergeRange(r, c);
        if (mergeRange && (r !== mergeRange.r1 || c !== mergeRange.c1)) {
          continue; // Skip non-master merged cells
        }
        sheet.clearCell(r, c);
        affected.push({ r: r, c: c });
      }
    }
    return affected;
  },

  // ======================== Formatting ========================
  /**
   * Get all cells affected by the current selection + extra selections
   * Returns array of {r, c} objects
   */
  _getSelectedCells() {
    var cells = [];
    var sheet = this.activeSheet;
    var sel = this.selection;
    if (!sel) return cells;

    for (var r = sel.r1; r <= sel.r2; r++) {
      for (var c = sel.c1; c <= sel.c2; c++) {
        cells.push({ r: r, c: c });
      }
    }
    if (this.extraSelections) {
      for (var i = 0; i < this.extraSelections.length; i++) {
        var es = this.extraSelections[i];
        for (var er = es.r1; er <= es.r2; er++) {
          for (var ec = es.c1; ec <= es.c2; ec++) {
            cells.push({ r: er, c: ec });
          }
        }
      }
    }
    return cells;
  },

  /** Ensure a cell has a _data entry (creating one if needed) so we can attach styles */
  _ensureCell(r, c) {
    var sheet = this.activeSheet;
    var key = r + ',' + c;
    if (!sheet._data[key]) {
      sheet._data[key] = { value: '', _style: {} };
    }
    if (!sheet._data[key]._style) {
      sheet._data[key]._style = {};
    }
  },

  /** Apply a style patch to all selected cells */
  _applyStyle(patch) {
    var cells = this._getSelectedCells();
    if (cells.length === 0) return;

    this._pushUndo();

    var sheet = this.activeSheet;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      this._ensureCell(r, c);
      var style = sheet._data[r + ',' + c]._style;
      for (var k in patch) {
        if (patch.hasOwnProperty(k)) {
          if (patch[k] === null || patch[k] === undefined) {
            delete style[k];
          } else {
            style[k] = patch[k];
          }
        }
      }
    }

    // Incremental render for small selections, full render for large ones
    if (cells.length <= 20) {
      for (var i = 0; i < cells.length; i++) {
        this._renderCell(cells[i].r, cells[i].c);
      }
    } else {
      this._renderGrid();
    }
    this._updateSelectionDisplay();
    this._updateToolbarState();
  },

  // ---- Toggles ----

  _toggleBold() {
    var cells = this._getSelectedCells();
    var sheet = this.activeSheet;
    var current = false;
    // Check first cell's bold state
    if (cells.length > 0) {
      var cell = sheet.getCell(cells[0].r, cells[0].c);
      current = !!(cell && cell._style && cell._style.bold);
    }
    this._applyStyle({ bold: !current });
  },

  _toggleItalic() {
    var cells = this._getSelectedCells();
    var sheet = this.activeSheet;
    var current = false;
    if (cells.length > 0) {
      var cell = sheet.getCell(cells[0].r, cells[0].c);
      current = !!(cell && cell._style && cell._style.italic);
    }
    this._applyStyle({ italic: !current });
  },

  _toggleUnderline() {
    var cells = this._getSelectedCells();
    var sheet = this.activeSheet;
    var current = false;
    if (cells.length > 0) {
      var cell = sheet.getCell(cells[0].r, cells[0].c);
      current = !!(cell && cell._style && cell._style.underline);
    }
    this._applyStyle({ underline: !current });
  },

  // ---- Font ----

  _setFontName(name) {
    if (!name) return;
    this._applyStyle({ fontName: name });
  },

  _setFontSize(size) {
    this._applyStyle({ fontSize: size });
  },

  _setFontColor(color) {
    this._applyStyle({ color: color === DEFAULT_COLORS.font ? null : color });
  },

  _setBgColor(color) {
    this._applyStyle({ bgColor: color === DEFAULT_COLORS.background || color === '#FFFFFF' ? null : color });
  },

  // ---- Real-time preview (DOM only, no data change, no undo, no re-render) ----
  _previewFontColor(color) {
    var cells = this._getSelectedCells();
    var finalColor = color === DEFAULT_COLORS.font ? '' : color;
    var dom = this._cellDOM;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      var el = dom && dom[r + ',' + c];
      if (el) el.style.color = finalColor;
    }
  },

  _previewBgColor(color) {
    var cells = this._getSelectedCells();
    var finalColor = (color === DEFAULT_COLORS.background || color === '#FFFFFF') ? '' : color;
    var dom = this._cellDOM;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      var el = dom && dom[r + ',' + c];
      if (el) el.style.backgroundColor = finalColor;
    }
  },

  // ---- Borders ----
  _applyBorder(type) {
    var cells = this._getSelectedCells();
    if (cells.length === 0) return;

    this._finishEditing();
    this._pushUndo();

    var sheet = this.activeSheet;
    var r1 = Infinity, c1 = Infinity, r2 = -Infinity, c2 = -Infinity;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      if (r < r1) r1 = r; if (c < c1) c1 = c;
      if (r > r2) r2 = r; if (c > c2) c2 = c;
    }

    var borderStyle = 'thin';

    // First, clear all borders on all cells in selection
    for (i = 0; i < cells.length; i++) {
      r = cells[i].r; c = cells[i].c;
      this._ensureCell(r, c);
      var st = sheet._data[r + ',' + c]._style;
      delete st.borderTop;
      delete st.borderBottom;
      delete st.borderLeft;
      delete st.borderRight;
    }

    if (type === 'none') {
      // Already cleared above, nothing else to do
    } else if (type === 'thick') {
      borderStyle = 'thick';
      // fall through
    }

    if (type !== 'none') {
      if (type === 'all' || type === 'grid') {
        // Clean grid: right+bottom per cell. 1st col +left, 1st row +top. No doubling.
        for (i = 0; i < cells.length; i++) {
          r = cells[i].r; c = cells[i].c;
          st = sheet._data[r + ',' + c]._style;
          st.borderRight = borderStyle;
          st.borderBottom = borderStyle;
          if (c === c1) st.borderLeft = borderStyle;
          if (r === r1) st.borderTop = borderStyle;
        }
      // grid (田字格) currently same as all — uncomment below to enable bolder 4-side grid:
      // } else if (type === 'grid') {
      //   for (i = 0; i < cells.length; i++) {
      //     r = cells[i].r; c = cells[i].c;
      //     st = sheet._data[r + ',' + c]._style;
      //     st.borderTop = borderStyle;
      //     st.borderBottom = borderStyle;
      //     st.borderLeft = borderStyle;
      //     st.borderRight = borderStyle;
      //   }
      } else if (type === 'outside' || type === 'thick') {
        // Only outer edges
        for (i = 0; i < cells.length; i++) {
          r = cells[i].r; c = cells[i].c;
          st = sheet._data[r + ',' + c]._style;
          if (r === r1) st.borderTop = borderStyle;
          if (r === r2) st.borderBottom = borderStyle;
          if (c === c1) st.borderLeft = borderStyle;
          if (c === c2) st.borderRight = borderStyle;
        }
      } else {
        // Single side: bottom, top, left, right
        for (i = 0; i < cells.length; i++) {
          r = cells[i].r; c = cells[i].c;
          st = sheet._data[r + ',' + c]._style;
          if (type === 'top') st.borderTop = borderStyle;
          if (type === 'bottom') st.borderBottom = borderStyle;
          if (type === 'left') st.borderLeft = borderStyle;
          if (type === 'right') st.borderRight = borderStyle;
        }
      }
    }

    this._renderGrid();
    this._updateSelectionDisplay();
  },

  // ---- Alignment ----

  _setHAlign(align) {
    this._applyStyle({ hAlign: align });
  },

  _setVAlign(align) {
    this._applyStyle({ vAlign: align });
  },

  _toggleWrapText() {
    var cells = this._getSelectedCells();
    var sheet = this.activeSheet;
    var current = false;
    if (cells.length > 0) {
      var cell = sheet.getCell(cells[0].r, cells[0].c);
      current = !!(cell && cell._style && cell._style.wrapText);
    }
    this._applyStyle({ wrapText: !current });
  },

  // ---- Toolbar State Sync ----
  /** Update toolbar controls to reflect the current cell's style */
  _updateToolbarState() {
    var cell = null;
    var sheet = this.activeSheet;
    if (this.activeCell) {
      cell = sheet.getCell(this.activeCell.r, this.activeCell.c);
    }
    var style = (cell && cell._style) || {};

    // Bold / Italic / Underline toggle buttons
    var boldBtn = this.container.querySelector('[data-action="bold"]');
    var italicBtn = this.container.querySelector('[data-action="italic"]');
    var underlineBtn = this.container.querySelector('[data-action="underline"]');
    if (boldBtn) boldBtn.classList.toggle('active', !!style.bold);
    if (italicBtn) italicBtn.classList.toggle('active', !!style.italic);
    if (underlineBtn) underlineBtn.classList.toggle('active', !!style.underline);
    var wrapBtn = this.container.querySelector('[data-action="wrapText"]');
    if (wrapBtn) wrapBtn.classList.toggle('active', !!style.wrapText);

    // Font name dropdown
    var fontNameSel = this.container.querySelector('[data-action="fontName"]');
    if (fontNameSel && style.fontName) fontNameSel.value = style.fontName;
    else if (fontNameSel) fontNameSel.selectedIndex = 0;

    // Font size dropdown
    var fontSizeSel = this.container.querySelector('[data-action="fontSize"]');
    if (fontSizeSel && style.fontSize) fontSizeSel.value = String(style.fontSize);

    // Font color
    var fontColorInput = this.container.querySelector('[data-action="fontColor"]');
    if (fontColorInput) fontColorInput.value = style.color || DEFAULT_COLORS.font;

    // Background color
    var bgColorInput = this.container.querySelector('[data-action="bgColor"]');
    if (bgColorInput) bgColorInput.value = style.bgColor || DEFAULT_COLORS.background;

    // Alignment buttons
    var hAlignBtns = { left: 'alignLeft', center: 'alignCenter', right: 'alignRight' };
    for (var ha in hAlignBtns) {
      var btn = this.container.querySelector('[data-action="' + hAlignBtns[ha] + '"]');
      if (btn) btn.classList.toggle('active', style.hAlign === ha);
    }
    var vAlignBtns = { top: 'alignTop', middle: 'alignMiddle', bottom: 'alignBottom' };
    for (var va in vAlignBtns) {
      var btn2 = this.container.querySelector('[data-action="' + vAlignBtns[va] + '"]');
      if (btn2) btn2.classList.toggle('active', style.vAlign === va);
    }
  },

  // ======================== Fill Handle ========================

  _startFillHandle(e) {
    if (!this.selection) return;
    this.isFillDragging = true;
    this._fillSourceR1 = this.selection.r1;
    this._fillSourceC1 = this.selection.c1;
    this._fillSourceR2 = this.selection.r2;
    this._fillSourceC2 = this.selection.c2;
    this._fillMouseStartX = e.clientX;
    this._fillMouseStartY = e.clientY;
    this._setStatus('Fill handle: drag to extend');
  },

  _onFillMouseMove(e) {
    if (!this.isFillDragging || !this.selection) return;
    var sheet = this.activeSheet;
    var dx = e.clientX - this._fillMouseStartX;
    var dy = e.clientY - this._fillMouseStartY;

    // Determine target range
    var r1 = this._fillSourceR1, r2 = this._fillSourceR2;
    var c1 = this._fillSourceC1, c2 = this._fillSourceC2;
    var srcRows = r2 - r1 + 1;
    var srcCols = c2 - c1 + 1;

    // Average cell size for pixel-to-cell conversion
    var avgRh = 0, cwBuffer = 0;
    for (var rr = r1; rr <= r2; rr++) avgRh += sheet.getRowHeight(rr);
    avgRh = avgRh / srcRows || GRID.COL_HEADER_HEIGHT;
    for (var cc = c1; cc <= c2; cc++) cwBuffer += sheet.getColWidth(cc);
    var avgCw = cwBuffer / srcCols || GRID.DEFAULT_COL_WIDTH;

    // Which direction is the user dragging?
    var tgR1, tgR2, tgC1, tgC2;
    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical drag
      if (dy > 0) { tgR1 = r2 + 1; tgR2 = r2 + Math.max(1, Math.round(dy / avgRh)); }
      else { tgR1 = r1 - Math.max(1, Math.round(-dy / avgRh)); tgR2 = r1 - 1; }
      tgC1 = c1; tgC2 = c2;
    } else {
      // Horizontal drag
      if (dx > 0) { tgC1 = c2 + 1; tgC2 = c2 + Math.max(1, Math.round(dx / avgCw)); }
      else { tgC1 = c1 - Math.max(1, Math.round(-dx / avgCw)); tgC2 = c1 - 1; }
      tgR1 = r1; tgR2 = r2;
    }

    if (tgR1 < 0) tgR1 = 0;
    if (tgC1 < 0) tgC1 = 0;
    if (tgR2 >= this.activeSheet.rowCount) tgR2 = this.activeSheet.rowCount - 1;
    if (tgC2 >= this.activeSheet.colCount) tgC2 = this.activeSheet.colCount - 1;
    if (tgR1 > tgR2 || tgC1 > tgC2) return;
    this._fillTargetR1 = tgR1; this._fillTargetR2 = tgR2;
    this._fillTargetC1 = tgC1; this._fillTargetC2 = tgC2;

    this._updateFillPreview();
  },

  _onFillMouseUp(e) {
    if (!this.isFillDragging) return;
    this.isFillDragging = false;
    this._removeFillPreview();
    if (!this._fillTargetR1 && this._fillTargetR1 !== 0 && !this._fillTargetR2 && this._fillTargetR2 !== 0) { this._setStatus('Ready'); return; }

    this._pushUndo();
    var sheet = this.activeSheet;
    var srcR1 = this._fillSourceR1, srcC1 = this._fillSourceC1;
    var srcR2 = this._fillSourceR2, srcC2 = this._fillSourceC2;
    var tgR1 = this._fillTargetR1, tgC1 = this._fillTargetC1;
    var tgR2 = this._fillTargetR2, tgC2 = this._fillTargetC2;

    if (tgR1 == null || tgC1 == null || tgR2 == null || tgC2 == null) { this._setStatus('Ready'); return; }

    var srcRows = srcR2 - srcR1 + 1;
    var srcCols = srcC2 - srcC1 + 1;
    var isSingleCell = (srcRows === 1 && srcCols === 1);
    var isVertical = (tgC1 === srcC1 && tgC2 === srcC2);
    var isHorizontal = (tgR1 === srcR1 && tgR2 === srcR2);

    // Detect arithmetic series for multi-row/col source (1,2,3 → 4,5,6)
    var extendSeriesV = false, seriesDiffV = 0, lastSrcValV = null;
    if (isVertical && srcRows >= 2 && !isSingleCell) {
      var allNum = true, fColVals = [];
      for (var sr = srcR1; sr <= srcR2; sr++) {
        var ck = sheet._data[sr + ',' + srcC1];
        var v = ck ? ck.value : null;
        if (typeof v !== 'number' || isNaN(v)) { allNum = false; break; }
        fColVals.push(v);
      }
      if (allNum && fColVals.length >= 2) {
        var d = fColVals[1] - fColVals[0];
        var isArith = true;
        for (var qi = 1; qi < fColVals.length; qi++) {
          if (fColVals[qi] - fColVals[qi - 1] !== d) { isArith = false; break; }
        }
        if (isArith) { extendSeriesV = true; seriesDiffV = d; lastSrcValV = fColVals[fColVals.length - 1]; }
      }
    }
    var extendSeriesH = false, seriesDiffH = 0, lastSrcValH = null;
    if (isHorizontal && srcCols >= 2 && !isSingleCell) {
      var allNumH = true, fRowVals = [];
      for (var sc = srcC1; sc <= srcC2; sc++) {
        var ckH = sheet._data[srcR1 + ',' + sc];
        var vH = ckH ? ckH.value : null;
        if (typeof vH !== 'number' || isNaN(vH)) { allNumH = false; break; }
        fRowVals.push(vH);
      }
      if (allNumH && fRowVals.length >= 2) {
        var dH = fRowVals[1] - fRowVals[0];
        var isArithH = true;
        for (var qj = 1; qj < fRowVals.length; qj++) {
          if (fRowVals[qj] - fRowVals[qj - 1] !== dH) { isArithH = false; break; }
        }
        if (isArithH) { extendSeriesH = true; seriesDiffH = dH; lastSrcValH = fRowVals[fRowVals.length - 1]; }
      }
    }

    for (var r = tgR1; r <= tgR2; r++) {
      for (var c = tgC1; c <= tgC2; c++) {
        var srcR, srcC;
        if (isVertical) {
          srcR = srcR1 + ((r - tgR1) % srcRows);
          srcC = c;
        } else if (isHorizontal) {
          srcR = r;
          srcC = srcC1 + ((c - tgC1) % srcCols);
        } else {
          srcR = srcR1 + ((r - tgR1) % srcRows);
          srcC = srcC1 + ((c - tgC1) % srcCols);
        }

        var srcCell = sheet._data[srcR + ',' + srcC];
        if (srcCell) {
          var newVal = srcCell.value;

          // Arithmetic series extension for multi-cell source (1,2,3 → 4,5,6)
          if (extendSeriesV && c === srcC1) {
            newVal = lastSrcValV + seriesDiffV * (r - srcR2);
          } else if (extendSeriesH && r === srcR1) {
            newVal = lastSrcValH + seriesDiffH * (c - srcC2);
          } else if (isSingleCell && typeof srcCell.value === 'number' && !isNaN(srcCell.value)) {
            if (isVertical) newVal = srcCell.value + (r - tgR1);
            else if (isHorizontal) newVal = srcCell.value + (c - tgC1);
          }

          sheet.setCell(r, c, newVal);
          if (srcCell._style) {
            this._ensureCell(r, c);
            var tgtStyle = sheet._data[r + ',' + c]._style;
            var s = srcCell._style;
            for (var k in s) {
              if (s.hasOwnProperty(k)) tgtStyle[k] = s[k];
            }
          }
          this._renderCell(r, c);
        }
      }
    }

    // Extend selection to include fill range
    this._selectRange(
      Math.min(this._fillSourceR1, tgR1), Math.min(this._fillSourceC1, tgC1),
      Math.max(this._fillSourceR2, tgR2), Math.max(this._fillSourceC2, tgC2),
      this.activeCell.r, this.activeCell.c
    );

    this._setStatus('Fill completed');
    this._fillTargetR1 = null; this._fillTargetC1 = null;
    this._fillTargetR2 = null; this._fillTargetC2 = null;
  },

  _updateFillPreview() {
    this._removeFillPreview();
    if (this._fillTargetR1 == null || this._fillTargetR2 == null) return;
    var overlay = document.createElement('div');
    overlay.className = 'excelabu-fill-preview';
    overlay.style.position = 'absolute';
    overlay.style.border = '2px dashed #2a5cdb';
    overlay.style.backgroundColor = 'rgba(42,92,219,0.05)';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9';

    var sheet = this.activeSheet;
    var tgR1 = this._fillTargetR1, tgC1 = this._fillTargetC1;
    var tgR2 = this._fillTargetR2, tgC2 = this._fillTargetC2;

    var top = GRID.COL_HEADER_HEIGHT, left = GRID.ROW_HEADER_WIDTH;
    for (var r = 0; r < tgR1; r++) top += sheet.getRowHeight(r);
    for (var c = 0; c < tgC1; c++) left += sheet.getColWidth(c);

    var w = 0, h = 0;
    for (var rr = tgR1; rr <= tgR2; rr++) h += sheet.getRowHeight(rr);
    for (var cc = tgC1; cc <= tgC2; cc++) w += sheet.getColWidth(cc);

    overlay.style.top = top + 'px';
    overlay.style.left = left + 'px';
    overlay.style.width = w + 'px';
    overlay.style.height = h + 'px';

    var scrollWrap = this.container.querySelector('.excelabu-table-wrapper');
    if (scrollWrap) scrollWrap.appendChild(overlay);
    this._fillPreviewOverlay = overlay;
  },

  _removeFillPreview() {
    if (this._fillPreviewOverlay) {
      this._fillPreviewOverlay.remove();
      this._fillPreviewOverlay = null;
    }
  },

  // ======================== Sort ========================

  sortSelection(ascending) {
    if (!this.selection || (this.selection.r1 === this.selection.r2 && this.selection.c1 === this.selection.c2)) {
      this._setStatus('Sort: select a range first');
      return;
    }
    this._pushUndo();
    var sheet = this.activeSheet;
    var r1 = this.selection.r1, r2 = this.selection.r2, c1 = this.selection.c1, c2 = this.selection.c2;

    // Determine sort key column: clamp active cell col to selection range
    var sortCol = this.activeCell ? Math.max(c1, Math.min(c2, this.activeCell.c)) : c1;

    // Build row records — skip empty rows, collect all columns (not just selection)
    var rows = [];
    for (var r = r1; r <= r2; r++) {
      // Check if this row has any data at all
      var hasData = false;
      for (var cc = 0; cc < sheet.colCount; cc++) {
        var checkCell = sheet._data[r + ',' + cc];
        if (checkCell && checkCell.value != null && checkCell.value !== '') { hasData = true; break; }
      }
      if (!hasData) continue;

      var row = {};
      var keyCell = sheet._data[r + ',' + sortCol];
      row.key = (keyCell && keyCell.value != null) ? keyCell.value : '';
      row.cells = {};
      // Collect ALL cell data for this row (entire row moves with sort)
      for (var cc = 0; cc < sheet.colCount; cc++) {
        var cell = sheet._data[r + ',' + cc];
        if (cell) row.cells[cc] = cell;
      }
      rows.push(row);
    }

    // Detect if all keys are numeric for numeric sort
    var allNumeric = true;
    for (var i = 0; i < rows.length; i++) {
      if (typeof rows[i].key !== 'number' || isNaN(rows[i].key)) { allNumeric = false; break; }
    }

    // Sort
    rows.sort(function(a, b) {
      if (allNumeric) {
        var va = a.key, vb = b.key;
        if (va === vb) return 0;
        if (ascending) return va - vb;
        return vb - va;
      }
      var va = String(a.key).toLowerCase();
      var vb = String(b.key).toLowerCase();
      if (va === vb) return 0;
      if (ascending) return va < vb ? -1 : 1;
      return va > vb ? -1 : 1;
    });

    // Remove merge info that overlaps with sort range
    var newMerges = {};
    for (var mk in sheet.mergedCells) {
      var m = sheet.mergedCells[mk];
      if (m.r1 >= r1 && m.r2 <= r2 && m.c1 >= c1 && m.c2 <= c2) continue;
      newMerges[mk] = m;
    }
    sheet.mergedCells = newMerges;

    // Clear old data for the entire row range (all columns, not just selection)
    for (var r = r1; r <= r2; r++) {
      for (var cc = 0; cc < sheet.colCount; cc++) {
        delete sheet._data[r + ',' + cc];
      }
    }
    // Write back sorted rows — all columns move together
    for (var i = 0; i < rows.length; i++) {
      var rr = r1 + i;
      for (var cc = 0; cc < sheet.colCount; cc++) {
        if (rows[i].cells[cc]) {
          sheet._data[rr + ',' + cc] = rows[i].cells[cc];
        }
      }
    }

    this._renderGrid();
    this._updateSelectionDisplay();
    this._setStatus('Sorted ' + rows.length + ' rows ' + (ascending ? 'ascending' : 'descending'));
  },

  // ======================== Find & Replace ========================

  _showFindDialog() {
    this._closeSearchDialog();
    this._buildSearchDialog(false);
  },

  _showReplaceDialog() {
    this._closeSearchDialog();
    this._buildSearchDialog(true);
  },

  _buildSearchDialog(isReplace) {
    var t = this._t.bind(this);
    var overlay = document.createElement('div');
    overlay.className = 'excelabu-search-overlay';
    overlay.innerHTML =
      '<div class="excelabu-search-dialog">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
          '<span style="font-weight:600;font-size:13px;">' + (isReplace ? t('findReplaceTitle') : t('findTitle')) + '</span>' +
          '<span style="margin-left:auto;cursor:pointer;font-size:16px;line-height:1;" data-action="closeSearch">&times;</span>' +
        '</div>' +
        '<input class="excelabu-search-input" type="text" placeholder="' + t('findPlaceholder') + '" style="width:100%;padding:4px 6px;margin-bottom:6px;border:1px solid #ccc;border-radius:3px;font-size:12px;box-sizing:border-box;" />' +
        (isReplace ? '<input class="excelabu-replace-input" type="text" placeholder="' + t('replacePlaceholder') + '" style="width:100%;padding:4px 6px;margin-bottom:8px;border:1px solid #ccc;border-radius:3px;font-size:12px;box-sizing:border-box;" />' : '') +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
          '<button data-action="searchNext" style="padding:3px 10px;font-size:11px;">' + t('findNext') + '</button>' +
          '<button data-action="searchPrev" style="padding:3px 10px;font-size:11px;">' + t('findPrev') + '</button>' +
          (isReplace ? '<button data-action="searchReplace" style="padding:3px 10px;font-size:11px;">' + t('replace') + '</button>' : '') +
          (isReplace ? '<button data-action="searchReplaceAll" style="padding:3px 10px;font-size:11px;">' + t('replaceAll') + '</button>' : '') +
          '<span class="excelabu-search-count" style="font-size:11px;color:#666;margin-left:8px;align-self:center;"></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    this._searchOverlay = overlay;
    this._searchIsReplace = isReplace;

    var self = this;
    var input = overlay.querySelector('.excelabu-search-input');
    setTimeout(function() { input.focus(); }, 50);

    overlay.addEventListener('click', function(e) {
      var action = e.target.dataset.action || (e.target.closest && e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action);
      if (!action) return;
      e.stopPropagation();
      switch (action) {
        case 'closeSearch': self._closeSearchDialog(); break;
        case 'searchNext': self._searchAction(1); break;
        case 'searchPrev': self._searchAction(-1); break;
        case 'searchReplace': self._replaceOne(); break;
        case 'searchReplaceAll': self._replaceAll(); break;
      }
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); self._searchAction(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') { self._closeSearchDialog(); }
    });

    // Close on Escape
    document.addEventListener('keydown', function _close(e) {
      if (e.key === 'Escape') { self._closeSearchDialog(); document.removeEventListener('keydown', _close); }
    }, { once: true });
  },

  _closeSearchDialog() {
    if (this._searchOverlay) {
      this._searchOverlay.remove();
      this._searchOverlay = null;
    }
    this._searchResults = null;
    this._searchIndex = -1;
    this._clearSearchHighlights();
  },

  _collectSearchResults(query) {
    if (!query) return [];
    var sheet = this.activeSheet;
    var results = [];
    var q = query.toLowerCase();
    for (var key in sheet._data) {
      var cell = sheet._data[key];
      if (!cell || cell.value == null) continue;
      var text = String(cell.value).toLowerCase();
      if (text.indexOf(q) !== -1) {
        var parts = key.split(',');
        results.push({ r: parseInt(parts[0], 10), c: parseInt(parts[1], 10), text: String(cell.value) });
      }
    }
    return results;
  },

  _searchAction(direction) {
    if (!this._searchOverlay) return;
    var input = this._searchOverlay.querySelector('.excelabu-search-input');
    var query = input.value.trim();
    if (!query) return;

    var results = this._collectSearchResults(query);
    var countEl = this._searchOverlay.querySelector('.excelabu-search-count');
    if (results.length === 0) {
      if (countEl) countEl.textContent = this._t('noResults');
      return;
    }

    this._searchResults = results;
    if (this._searchIndex < 0 || this._searchIndex >= results.length) {
      this._searchIndex = direction > 0 ? 0 : results.length - 1;
    } else {
      this._searchIndex = (this._searchIndex + direction + results.length) % results.length;
    }

    var match = results[this._searchIndex];
    this._selectCell(match.r, match.c);
    this._scrollToCell(match.r, match.c);

    if (countEl) countEl.textContent = (this._searchIndex + 1) + '/' + results.length;

    // Highlight all matches
    this._clearSearchHighlights();
    this._searchHighlightBg = {};
    var dom = this._cellDOM;
    for (var i = 0; i < results.length; i++) {
      var key = results[i].r + ',' + results[i].c;
      var el = dom && dom[key];
      if (el) {
        this._searchHighlightBg[key] = el.style.backgroundColor;
        el.style.backgroundColor = i === this._searchIndex ? '#fde047' : '#fef9c3';
      }
    }
  },

  _clearSearchHighlights() {
    if (!this._searchResults && !this._searchHighlightBg) return;
    var dom = this._cellDOM;
    var saved = this._searchHighlightBg || {};
    // Restore saved backgrounds
    for (var key in saved) {
      var el = dom && dom[key];
      if (el) el.style.backgroundColor = saved[key];
    }
    this._searchHighlightBg = null;
    this._searchResults = null;
  },

  _replaceOne() {
    if (!this._searchOverlay || !this._searchResults || this._searchResults.length === 0) return;
    var input = this._searchOverlay.querySelector('.excelabu-replace-input');
    if (!input) return;
    var replacement = input.value;
    var match = this._searchResults[this._searchIndex];
    var matchKey = match.r + ',' + match.c;
    this._pushUndo();
    this.activeSheet.setCell(match.r, match.c, replacement);
    this._renderCell(match.r, match.c);
    this._clearSearchHighlights();

    // Re-collect results after replacement
    var queryInput = this._searchOverlay.querySelector('.excelabu-search-input');
    var query = queryInput ? queryInput.value.trim() : '';
    var results = this._collectSearchResults(query);
    this._searchResults = results;
    var countEl = this._searchOverlay.querySelector('.excelabu-search-count');

    if (results.length === 0) {
      if (countEl) countEl.textContent = this._t('noResults');
      this._searchIndex = -1;
      return;
    }

    // Find next match after the replaced cell
    var newIdx = -1;
    for (var i = 0; i < results.length; i++) {
      var k = results[i].r + ',' + results[i].c;
      if (k === matchKey) { newIdx = i; break; }
    }
    if (newIdx === -1) {
      // Replaced cell no longer matches — find next
      for (var j = 0; j < results.length; j++) {
        if (results[j].r > match.r || (results[j].r === match.r && results[j].c > match.c)) {
          newIdx = j; break;
        }
      }
      if (newIdx === -1) newIdx = 0;
    }

    this._searchIndex = newIdx;
    var newMatch = results[this._searchIndex];
    this._selectCell(newMatch.r, newMatch.c);
    this._scrollToCell(newMatch.r, newMatch.c);
    if (countEl) countEl.textContent = (this._searchIndex + 1) + '/' + results.length;

    // Re-highlight
    this._searchHighlightBg = {};
    var dom = this._cellDOM;
    for (var i = 0; i < results.length; i++) {
      var key = results[i].r + ',' + results[i].c;
      var el = dom && dom[key];
      if (el) {
        this._searchHighlightBg[key] = el.style.backgroundColor;
        el.style.backgroundColor = i === this._searchIndex ? '#fde047' : '#fef9c3';
      }
    }
  },

  _replaceAll() {
    if (!this._searchOverlay) return;
    var findInput = this._searchOverlay.querySelector('.excelabu-search-input');
    var replaceInput = this._searchOverlay.querySelector('.excelabu-replace-input');
    if (!findInput || !replaceInput) return;
    var query = findInput.value.trim();
    if (!query) return;
    var replacement = replaceInput.value;

    var results = this._collectSearchResults(query);
    if (results.length === 0) return;

    this._pushUndo();
    for (var i = 0; i < results.length; i++) {
      this.activeSheet.setCell(results[i].r, results[i].c, replacement);
      this._renderCell(results[i].r, results[i].c);
    }
    this._clearSearchHighlights();
    this._closeSearchDialog();
    this._setStatus('Replaced ' + results.length + ' occurrence(s)');
  },

  // ======================== Freeze Panes ========================

  _toggleFreezePanes() {
    var sheet = this.activeSheet;
    if (this._frozenRow || this._frozenCol) {
      // Unfreeze
      this._frozenRow = null;
      this._frozenCol = null;
      var btn = this.container.querySelector('[data-action="freezePanes"]');
      if (btn) {
        btn.classList.remove('active');
        btn.title = this._t('freezePanes');
        btn.innerHTML = '&#128204; ' + this._t('freezePanes');
      }
      this._renderGrid();
      this._updateSelectionDisplay();
      this._setStatus('Panes unfrozen');
    } else {
      // Freeze at active cell — handle row/column-only selection
      var r = this.activeCell ? this.activeCell.r : 0;
      var c = this.activeCell ? this.activeCell.c : 0;
      this._frozenRow = r > 0 ? r : null;
      this._frozenCol = c > 0 ? c : null;
      var btn = this.container.querySelector('[data-action="freezePanes"]');
      if (btn) {
        btn.classList.add('active');
        btn.title = this._t('unfreezePanes');
        btn.innerHTML = '&#128204; ' + this._t('unfreezePanes');
      }
      this._renderGrid();
      this._updateSelectionDisplay();
      this._updateFormulaBar();
      this._setStatus('Panes frozen at ' + (c > 0 ? Utils.colToLetter(c) : '') + (r > 0 ? (r + 1) : ''));
    }
  },

  // ======================== Conditional Format ========================

  _showConditionalFormatDialog() {
    if (!this.selection) { this._setStatus(this._t('selectCellsFirst')); return; }

    var t = this._t.bind(this);
    var overlay = document.createElement('div');
    overlay.className = 'excelabu-search-overlay';
    overlay.innerHTML =
      '<div class="excelabu-search-dialog">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
          '<span style="font-weight:600;font-size:13px;">' + t('conditionalFormat') + '</span>' +
          '<span style="margin-left:auto;cursor:pointer;font-size:16px;" data-action="closeCFDialog">&times;</span>' +
        '</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">' +
          '<select class="excelabu-cf-operator" style="padding:3px;font-size:11px;">' +
            '<option value="gt">' + t('cfGreaterThan') + '</option>' +
            '<option value="lt">' + t('cfLessThan') + '</option>' +
            '<option value="gte">' + t('cfGreaterOrEqual') + '</option>' +
            '<option value="lte">' + t('cfLessOrEqual') + '</option>' +
            '<option value="eq">' + t('cfEqualTo') + '</option>' +
            '<option value="neq">' + t('cfNotEqual') + '</option>' +
            '<option value="contains">' + t('cfContains') + '</option>' +
          '</select>' +
          '<input class="excelabu-cf-value" type="text" placeholder="' + t('cfValue') + '" style="width:80px;padding:3px 6px;border:1px solid #ccc;border-radius:3px;font-size:12px;" />' +
        '</div>' +
        '<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px;">' +
          '<span style="font-size:11px;">' + t('cfFill') + ':</span>' +
          '<input type="color" class="excelabu-cf-bg" value="#fca5a5" style="width:24px;height:24px;padding:0;border:none;cursor:pointer;" />' +
          '<span style="font-size:11px;">' + t('cfTextColor') + ':</span>' +
          '<input type="color" class="excelabu-cf-color" value="#000000" style="width:24px;height:24px;padding:0;border:none;cursor:pointer;" />' +
        '</div>' +
        '<button data-action="applyCF" style="padding:3px 10px;font-size:11px;">' + t('cfApply') + '</button>' +
        '<button data-action="clearCF" style="padding:3px 10px;font-size:11px;margin-left:4px;">' + t('cfClearAll') + '</button>' +
      '</div>';
    document.body.appendChild(overlay);

    // Auto-focus the value input so keystrokes go to the dialog, not the cell
    var cfInput = overlay.querySelector('.excelabu-cf-value');
    if (cfInput) { setTimeout(function() { cfInput.focus(); }, 50); }

    var self = this;
    overlay.addEventListener('click', function(e) {
      var action = e.target.dataset.action || (e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action);
      if (action === 'closeCFDialog') { overlay.remove(); }
      if (action === 'applyCF') { overlay.remove(); self._applyConditionalFormat(overlay); }
      if (action === 'clearCF') { overlay.remove(); self._clearConditionalFormats(); }
    });
  },

  _applyConditionalFormat(overlay) {
    var operator = overlay.querySelector('.excelabu-cf-operator').value;
    var valStr = overlay.querySelector('.excelabu-cf-value').value.trim();
    var bgColor = overlay.querySelector('.excelabu-cf-bg').value;
    var textColor = overlay.querySelector('.excelabu-cf-color').value;
    if (!valStr) { this._setStatus(this._t('enterValue')); return; }

    var cells = this._getSelectedCells();
    if (cells.length === 0) return;

    this._pushUndo();

    // Store rule on the sheet
    if (!this.activeSheet._conditionalFormats) this.activeSheet._conditionalFormats = [];
    this.activeSheet._conditionalFormats.push({
      ranges: [{ r1: this.selection.r1, c1: this.selection.c1, r2: this.selection.r2, c2: this.selection.c2 }],
      operator: operator,
      value: valStr,
      bgColor: bgColor,
      color: textColor
    });

    this._renderGrid();
    this._setStatus('Conditional format applied');
  },

  _clearConditionalFormats() {
    this.activeSheet._conditionalFormats = [];
    this._renderGrid();
    this._setStatus('All conditional formats cleared');
  },

  // ======================== Utility ========================
  _setStatus(msg) {
    if (this.statusBar) {
      this.statusBar.textContent = msg;
    }
  }

};