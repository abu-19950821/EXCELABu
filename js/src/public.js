import { Utils } from './utils.js?v=3';
import { HEADER_BG_COLOR } from '../../config/theme.js?v=2';

export const PublicMixin = {
  // ======================== Public API ========================
  /** Get the display value of a cell */
  getCellValue(row, col) {
    return this.activeSheet.getCellDisplay(row, col);
  },

  /** Set a cell value. Use "=FORMULA" for formulas. */
  setCellValue(row, col, value) {
    this._pushUndo();
    this.activeSheet.setCell(row, col, value);
    this._renderGrid();
    this._updateFormulaBar();
  },

  /** Get all data for the active sheet */
  getData() {
    return this.activeSheet.getData();
  },

  /** Set all data for the active sheet */
  setData(data) {
    this.activeSheet.setData(data);
    this._renderGrid();
    this._updateFormulaBar();
  },

  /** Load a 2D array into a sheet.
   *  Like ElementUI table, accepts data[row][col] in one call.
   *  Automatically detects formulas (=FORMULA), numbers, strings, booleans, dates.
   *  Skips null/undefined/'' cells.
   *  @param {Array} data   - 2D array of cell values
   *  @param {number|string} [target=0] - Sheet index (0-based) or sheet name
   */
  loadData(data, target) {
    if (!data || !Array.isArray(data)) return;

    var sheet;
    if (target === undefined || target === null) {
      sheet = this.activeSheet;
    } else if (typeof target === 'number') {
      sheet = this.sheets[target];
      if (!sheet) {
        console.warn('ExcelABu: Sheet index ' + target + ' out of range');
        return;
      }
    } else if (typeof target === 'string') {
      for (var i = 0; i < this.sheets.length; i++) {
        if (this.sheets[i].name === target) {
          sheet = this.sheets[i];
          break;
        }
      }
      if (!sheet) {
        console.warn('ExcelABu: Sheet "' + target + '" not found');
        return;
      }
    }

    this._pushUndo();

    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      if (!row || !Array.isArray(row)) continue;
      for (var c = 0; c < row.length; c++) {
        var val = row[c];
        if (val === null || val === undefined || val === '') continue;
        sheet.setCell(r, c, val);
      }
    }

    // Only re-render active sheet / 只重绘当前活动工作表
    if (sheet === this.activeSheet) {
      this._renderGrid();
      this._updateSelectionDisplay();
      this._updateFormulaBar();
    }
    this._setStatus('Data loaded');
  },

  /** Get the active cell reference (e.g., "A1") */
  getActiveCell() {
    if (!this.activeCell) return null;
    return Utils.toCellRef(this.activeCell.r, this.activeCell.c);
  },

  /** Get the current selection range */
  getSelection() {
    if (!this.selection) return null;
    return {
      start: Utils.toCellRef(this.selection.r1, this.selection.c1),
      end: Utils.toCellRef(this.selection.r2, this.selection.c2)
    };
  },

  /** Select a cell by reference (e.g., "A1") */
  selectCell(ref) {
    const parsed = Utils.parseCellRef(ref);
    if (parsed) {
      this._selectCell(parsed.r, parsed.c);
    }
  },

  /** Select a range by reference (e.g., "B2:C3") / 通过引用选中一个范�?*/
  selectRange(ref) {
    var parts = ref.split(':');
    if (parts.length !== 2) return;
    var s = Utils.parseCellRef(parts[0]);
    var e = Utils.parseCellRef(parts[1]);
    if (s && e) {
      this.selection = { r1: s.r, c1: s.c, r2: e.r, c2: e.c };
      this.activeCell = { r: s.r, c: s.c };
      this._updateSelectionDisplay();
      this._updateFormulaBar();
    }
  },

  /** Get the number of sheets */
  getSheetCount() {
    return this.sheets.length;
  },

  /** Get the active sheet name */
  getSheetName() {
    return this.activeSheet.name;
  },

  /** Add a new sheet and return its index */
  addNewSheet(name) {
    return this.switchSheet(this.addSheet(name));
  },

  /** Switch to a sheet by index */
  goToSheet(index) {
    this.switchSheet(index);
  },

  /** Rename the active sheet */
  renameSheet(name) {
    this.activeSheet.name = name;
    this._renderSheetTabs();
  },

  /** Set column width in pixels */
  setColWidth(col, width) {
    this.activeSheet.setColWidth(col, width);
    this._renderGrid();
    this._updateSelectionDisplay();
  },

  /** Set row height in pixels */
  setRowHeight(row, height) {
    this.activeSheet.setRowHeight(row, height);
    this._renderGrid();
    this._updateSelectionDisplay();
  },

  /** Refresh the entire grid */
  refresh() {
    this._renderGrid();
    this._updateSelectionDisplay();
    this._updateFormulaBar();
  },

  /** Destroy the component and clean up */
  destroy() {
    // Remove document-level listeners to prevent memory leaks
    if (this._boundOnMouseMove)    document.removeEventListener('mousemove', this._boundOnMouseMove);
    if (this._boundOnMouseUp)      document.removeEventListener('mouseup', this._boundOnMouseUp);
    if (this._boundOnKeyDown)      document.removeEventListener('keydown', this._boundOnKeyDown);
    if (this._boundHideContextMenu) document.removeEventListener('click', this._boundHideContextMenu);

    // Remove file input from DOM
    if (this._fileInput) {
      if (this._fileInputOnChange) this._fileInput.removeEventListener('change', this._fileInputOnChange);
      if (this._fileInput.parentNode) this._fileInput.parentNode.removeChild(this._fileInput);
      this._fileInput = null;
      this._fileInputOnChange = null;
    }

    this.container.innerHTML = '';
    this.container.classList.remove('excelabu');
  },

  // ======================== bindData �?Template + Object Array ========================
  /**
   * Bind an array of data objects to the sheet using column templates.
   * Each column defines its position span (row × col), styles, and data binding.
   * The row stride (rows per data item) = max span.row across all columns.
   *
   * @param {Object} spec
   * @param {string}   [spec.sheetName]      Sheet name (creates/switches if given; default: active sheet)
   * @param {number}   [spec.startRow=0]     Starting row index (0-based)
   * @param {number}   [spec.startCol=0]     Starting column index (0-based)
   * @param {Array}    spec.columns          Column definitions
   * @param {string}   [spec.columns[].key]  Property name in data objects (omit for static cell)
   * @param {boolean}  [spec.columns[].group=false] Mark as group column (merged across children when data has `items`)
   * @param {number}   [spec.columns[].col]  Absolute column index within template (overrides auto-offset)
   * @param {number}   [spec.columns[].row]  Row offset within current data stride (default 0)
   * @param {*}        [spec.columns[].value] Static value (used when no key)
   * @param {string}   [spec.columns[].formula] Static formula (=SUM(...))
   * @param {string}   [spec.columns[].title] Header label (omit to skip header row)
   * @param {number}   [spec.columns[].width] Column width in px
   * @param {Object}   [spec.columns[].span] Cell span within template
   * @param {number}   [.span.row=1]         Row span (1 = single row, 2+ = merged rows)
   * @param {number}   [.span.col=1]         Column span (1 = single col, 2+ = merged cols)
   * @param {Object}   [spec.columns[].style] Cell style (shared by header + data cells)
   * @param {string}   [.style.color]           Font color (hex, name, rgb)
   * @param {string}   [.style.background]      Background color
   * @param {boolean}  [.style.bold]            Bold
   * @param {boolean}  [.style.italic]          Italic
   * @param {boolean}  [.style.underline]       Underline
   * @param {boolean}  [.style.strikethrough]   Strikethrough
   * @param {number}   [.style.fontSize]        Font size in pt
   * @param {string}   [.style.fontFamily]      Font family name
   * @param {string}   [.style.align]           left | center | right
   * @param {string}   [.style.valign]          top | middle | bottom
   * @param {boolean}  [.style.wrapText]        Wrap text
   * @param {string}   [.style.border]          thin | medium | thick | none (applies all 4 sides)
   * @param {string}   [.style.borderColor]     Border color
   * @param {string}   [.style.numberFormat]    Excel number format (@ = text, 0 = integer, 0.00 = decimal)
   * @param {Object}   [spec.columns[].headerStyle] Header-only style overrides (same shape as style)
   * @param {Array}    spec.data              Array of data objects
   *
   * @example
   *   excel.bindData({
   *     sheetName: 'Employee',
   *     columns: [
   *       { key: 'id',    title: 'ID',   width: 60,  span: { row: 1, col: 1 }, style: { align:'center' } },
   *       { key: 'name',  title: 'Name', width: 120, span: { row: 1, col: 1 } },
   *       { key: 'desc',  title: 'Description', width: 200, span: { row: 2, col: 1 } } // merged 2 rows
   *     ],
   *     data: [
   *       { id: 1001, name: 'Alice', desc: 'Engineer' },
   *       { id: 1002, name: 'Bob',   desc: 'Designer' }
   *     ]
   *   });
   */
  bindData(spec) {
    if (!spec || !spec.columns || !spec.data) {
      console.warn('ExcelABu.bindData: missing "columns" or "data"');
      return;
    }

    var sheet;
    if (spec.sheetName) {
      for (var i = 0; i < this.sheets.length; i++) {
        if (this.sheets[i].name === spec.sheetName) {
          sheet = this.sheets[i];
          this.activeSheetIndex = i;
          break;
        }
      }
      if (!sheet) {
        this.switchSheet(this.addSheet(spec.sheetName));
        sheet = this.activeSheet;
      }
    } else {
      sheet = this.activeSheet;
    }

    this._pushUndo();

    var startRow = spec.startRow || 0;
    var startCol = spec.startCol || 0;
    var columns = spec.columns;
    var data = spec.data;

    // ── 0. Pre-compute spans, offsets and stride ──
    var colSpans = [];   // { row, col } per column
    var colOffsets = [];  // cumulative column offset per column
    var stride = 1;       // row stride = max rowSpan
    var offset = 0;

    for (var ci = 0; ci < columns.length; ci++) {
      var span = (columns[ci].span) || {};
      var rs = Math.max(1, span.row || 1);
      var cs = Math.max(1, span.col || 1);
      colSpans.push({ row: rs, col: cs });
      colOffsets.push(offset);
      offset += cs;
      if (rs > stride) stride = rs;
    }

    // Total columns used by template
    var totalCols = offset;

    // ── 1. Write header row ──
    var hasHeader = false;
    for (var ci = 0; ci < columns.length; ci++) {
      if (columns[ci].title !== undefined && columns[ci].title !== null) {
        hasHeader = true;
        break;
      }
    }

    if (hasHeader) {
      for (var ci = 0; ci < columns.length; ci++) {
        var col = columns[ci];
        if (col.title === undefined || col.title === null) continue;
        var hs = colSpans[ci];
        var hc = (col.col != null) ? startCol + Number(col.col) : startCol + colOffsets[ci];

        var hStyle = _normalizeStyle(col.style);
        if (col.headerStyle) {
          var over = _normalizeStyle(col.headerStyle);
          for (var k in over) { hStyle[k] = over[k]; }
        }
        if (!('bold' in hStyle)) hStyle.bold = true;
        if (!('bgColor' in hStyle)) hStyle.bgColor = HEADER_BG_COLOR;

        sheet._data[startRow + ',' + hc] = {
          value: String(col.title),
          formula: null,
          display: null,
          _style: hStyle
        };

        // Merge header cell if its own span requires it
        if (hs.col > 1 || hs.row > 1) {
          sheet.mergeCells(startRow, hc, startRow + hs.row - 1, hc + hs.col - 1);
        }
      }
      startRow += stride;
    }

    /** Whether any data row contains nested groups */
    var hasGroups = false;
    for (var ri = 0; ri < data.length; ri++) {
      if (data[ri].items || data[ri].children) { hasGroups = true; break; }
    }

    var currentRow = startRow;

    // Store bind config for save callback data extraction / 保存配置供保存回调读取数据
    sheet._bindConfig = {
      columns: columns,
      dataStartRow: currentRow,
      startCol: startCol,
      stride: stride,
      hasGroups: hasGroups,
      colOffsets: colOffsets,
      totalCols: totalCols
    };

    // ── 2. Write data rows (flat or nested groups) ──
    for (var ri = 0; ri < data.length; ri++) {
      var rowObj = data[ri];
      var children = rowObj.items || rowObj.children;
      var groupSize = children ? children.length : stride;

      if (children && children.length > 0) {
        // ── Nested group: write group columns (merged across children),
        //     then child rows beneath ──
        for (var ci = 0; ci < columns.length; ci++) {
          var col = columns[ci];
          if (!col.group) continue;
          var grpCol = (col.col != null) ? startCol + Number(col.col) : startCol + colOffsets[ci];
          var gVal = col.key ? rowObj[col.key] : (col.value !== undefined ? col.value : undefined);
          if (gVal === undefined || gVal === null) continue;

          var gStyle = _normalizeStyle(col.style);
          // Auto-detect formulas
          var gFml = null;
          if (typeof gVal === 'string' && gVal.charAt(0) === '=') {
            gFml = gVal.substring(1);
            gVal = null;
          }

          sheet._data[currentRow + ',' + grpCol] = { value: gVal, formula: gFml, display: null, _style: gStyle };
          if (children.length > 1) {
            sheet.mergeCells(currentRow, grpCol, currentRow + children.length - 1, grpCol);
          }
        }

        // Write child rows / 写入子数据行
        for (var si = 0; si < children.length; si++) {
          var child = children[si];
          for (var ci = 0; ci < columns.length; ci++) {
            var col = columns[ci];
            if (col.group) continue;
            var ccOff = (col.col != null) ? startCol + Number(col.col) : startCol + colOffsets[ci];
            var cRow = currentRow + si + (col.row != null ? Number(col.row) : 0);
            var cStyle = _normalizeStyle(col.style);

            var cv = undefined;
            var cfml = null;
            if (col.key) {
              cv = child[col.key];
              if (cv === undefined || cv === null) cv = rowObj[col.key]; // fallback to parent
              if (cv === undefined || cv === null) continue;
              if (typeof cv === 'string' && cv.charAt(0) === '=') {
                cfml = cv.substring(1);
                cv = null;
              }
            } else if (col.formula) {
              cfml = col.formula;
            } else if (col.value !== undefined && col.value !== null) {
              cv = col.value;
            } else {
              continue;
            }

            var ss = colSpans[ci];
            sheet._data[cRow + ',' + ccOff] = { value: cv, formula: cfml, display: null, _style: cStyle };
            if (ss.row > 1 || ss.col > 1) {
              sheet.mergeCells(cRow, ccOff, cRow + ss.row - 1, ccOff + ss.col - 1);
            }
          }
        }
        currentRow += children.length;

      } else {
        // ── Flat row (existing behavior) ──
        for (var ci = 0; ci < columns.length; ci++) {
          var col = columns[ci];
          var ss = colSpans[ci];
          var dc = (col.col != null) ? startCol + Number(col.col) : startCol + colOffsets[ci];
          var dStyle = _normalizeStyle(col.style);
          var dRow = currentRow + (col.row != null ? Number(col.row) : 0);

          var cellValue = undefined;
          var cellFormula = null;

          if (col.key) {
            cellValue = rowObj[col.key];
            if (cellValue === undefined || cellValue === null) continue;
            if (typeof cellValue === 'string' && cellValue.charAt(0) === '=') {
              cellFormula = cellValue.substring(1);
              cellValue = null;
            }
          } else if (col.formula) {
            cellFormula = col.formula;
          } else if (col.value !== undefined && col.value !== null) {
            cellValue = col.value;
          } else {
            continue;
          }

          sheet._data[dRow + ',' + dc] = { value: cellValue, formula: cellFormula, display: null, _style: dStyle };
          if (ss.row > 1 || ss.col > 1) {
            sheet.mergeCells(dRow, dc, dRow + ss.row - 1, dc + ss.col - 1);
          }
        }
        currentRow += stride;
      }
    }

    // ── 3. Set column widths ──
    for (var ci = 0; ci < totalCols; ci++) {
      var colIdx = startCol + ci;
      // Find which column definition this belongs to
      for (var j = 0; j < colOffsets.length; j++) {
        var nextOffset = (j + 1 < colOffsets.length) ? colOffsets[j + 1] : totalCols;
        if (ci >= colOffsets[j] && ci < nextOffset) {
          var colDef = columns[j];
          if (colDef.width !== undefined && colDef.width !== null) {
            sheet.setColWidth(colIdx, colDef.width);
          }
          break;
        }
      }
    }

    // ── 4. Re-render ──
    if (sheet === this.activeSheet) {
      this._renderGrid();
      this._updateSelectionDisplay();
      this._updateFormulaBar();
      this._renderSheetTabs();
    }

    this._setStatus('Bound ' + data.length + ' row(s)');
  }
};

// ── Style normalizer: user-facing keys �?internal _style keys ──
var STYLE_MAP = {
  color:           'color',
  background:      'bgColor',
  bold:            'bold',
  italic:          'italic',
  underline:       'underline',
  strikethrough:   'strike',
  fontSize:        'fontSize',
  fontFamily:      'fontName',
  align:           'hAlign',
  valign:          'vAlign',
  wrapText:        'wrapText',
  border:          null, // special: maps to all 4 sides
  borderColor:     'borderColor',
  numberFormat:    'numFmt'
};

function _normalizeStyle(userStyle) {
  if (!userStyle) return {};
  var out = {};

  var keys = Object.keys(userStyle);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = userStyle[k];
    if (v === undefined || v === null) continue;

    if (k === 'border') {
      if (v === 'none' || v === false) {
        out.borderTop = null;
        out.borderBottom = null;
        out.borderLeft = null;
        out.borderRight = null;
      } else {
        out.borderTop = v;
        out.borderBottom = v;
        out.borderLeft = v;
        out.borderRight = v;
      }
    } else if (STYLE_MAP[k]) {
      out[STYLE_MAP[k]] = v;
    }
  }

  return out;
}