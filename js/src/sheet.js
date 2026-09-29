import { Utils } from './utils.js?v=3';
import { FormulaEvaluator } from './formula.js?v=5';
import { GRID } from '../../config/theme.js?v=3';

  // ============================================================
  //  Sheet - Data Model for a single sheet
  // ============================================================
  export class Sheet {
    constructor(name, rowCount, colCount) {
      this.name = name;
      this.rowCount = rowCount;
      this.colCount = colCount;
      this._data = {};        // key: "row,col" -> { value, formula, style }
      this.colWidths = {};    // key: col index -> width in px
      this.rowHeights = {};   // key: row index -> height in px
      this.mergedCells = {};  // key: "r,c" -> { r1, c1, r2, c2 } (only top-left stores the range)
      this._mergeIndex = {}; // row-index: { r: [merge, ...] } for O(1) getMergeRange
      this.formulaEval = new FormulaEvaluator(this);
      // Track last non-empty row/col for O(1) extent queries (avoid full _data scan)
      this._lastDataRow = -1;
      this._lastDataCol = -1;
    }

    /** Recalculate _lastDataRow/_lastDataCol by scanning _data keys */
    _recalcLastDataExtent() {
      this._lastDataRow = -1;
      this._lastDataCol = -1;
      for (var key in this._data) {
        var pc = this._parseKey(key);
        if (pc.r > this._lastDataRow) this._lastDataRow = pc.r;
        if (pc.c > this._lastDataCol) this._lastDataCol = pc.c;
      }
    }

    /** Get the extent of non-empty cells â€?uses cached values (O(1)) */
    getLastDataExtent() {
      if (this._lastDataRow < 0 && this._lastDataCol < 0) {
        // Verify: there might genuinely be data at row 0, col 0
        if (this._data[this._key(0, 0)] !== undefined) {
          this._lastDataRow = 0;
          this._lastDataCol = 0;
        }
      }
      return { r: this._lastDataRow, c: this._lastDataCol };
    }

    /** Rebuild the merge index for O(1) range lookups */
    _rebuildMergeIndex() {
      this._mergeIndex = {};
      for (const key in this.mergedCells) {
        const m = this.mergedCells[key];
        for (let r = m.r1; r <= m.r2; r++) {
          if (!this._mergeIndex[r]) this._mergeIndex[r] = [];
          this._mergeIndex[r].push(m);
        }
      }
    }

    /** Build canonical cell key: "r,c" */
    _key(r, c) {
      return r + ',' + c;
    }

    /** Parse a "r,c" key back into { r, c } */
    _parseKey(key) {
      var parts = key.split(',');
      return { r: parseInt(parts[0], 10), c: parseInt(parts[1], 10) };
    }

    getCell(r, c) {
      const key = this._key(r, c);
      return this._data[key] || null;
    }

    getCellValue(r, c) {
      const cell = this.getCell(r, c);
      if (!cell) return null;
      if (cell.formula) {
        return this.formulaEval.evaluate(cell.formula);
      }
      return cell.value;
    }

    getCellDisplay(r, c) {
      const cell = this.getCell(r, c);
      if (!cell) return '';
      if (cell.display !== undefined && cell.display !== null) return String(cell.display);
      if (cell.formula) {
        const val = this.formulaEval.evaluate(cell.formula);
        return this._formatValue(val, cell);
      }
      return this._formatValue(cell.value, cell);
    }

    /** Format any JS value for display, respecting cell _style.numFmt */
    _formatValue(val, cell) {
      if (val === null || val === undefined) return '';

      var numFmt = (cell && cell._style && cell._style.numFmt) || '';

      // Number format: percentage
      var pctMatch = numFmt.match(/^(0(?:\.0+)?)%$/);
      if (typeof val === 'number' && pctMatch) {
        var decimals = pctMatch[1] === '0' ? 0 : (pctMatch[1].length - 2);
        return (val * 100).toFixed(decimals) + '%';
      }

      if (val instanceof Date) {
        return val.toLocaleDateString();
      }
      if (typeof val === 'boolean') {
        return val ? 'TRUE' : 'FALSE';
      }
      if (typeof val === 'number') {
        if (Math.abs(val) < 1e12 && Math.abs(val) >= 1e-6) {
          return String(Math.round(val * 1e10) / 1e10);
        }
        return String(val);
      }
      return String(val);
    }

    /** Update cached last-data-extent after a cell write at (r, c) */
    _updateLastDataExtent(r, c) {
      if (r > this._lastDataRow) this._lastDataRow = r;
      if (c > this._lastDataCol) this._lastDataCol = c;
    }

    setCell(r, c, value) {
      const key = this._key(r, c);
      var existingCell = this._data[key];
      var _prevStyle = existingCell ? Utils.deepClone(existingCell._style) : {};

      // Handle empty/deletion
      if (value === '' || value === null || value === undefined) {
        // Keep style when clearing value
        if (_prevStyle && Object.keys(_prevStyle).length > 0) {
          this._data[key] = { value: '', _style: _prevStyle };
        } else {
          delete this._data[key];
        }
        // Deletion may shrink extent â€?recalc
        this._recalcLastDataExtent();
        return;
      }

      // Track extent
      this._updateLastDataExtent(r, c);

      // Handle Date objects
      if (value instanceof Date) {
        this._data[key] = {
          value: value,
          formula: null,
          display: null,
          _style: _prevStyle
        };
        return;
      }

      // Handle booleans explicitly (before string check)
      if (typeof value === 'boolean') {
        this._data[key] = {
          value: value,
          formula: null,
          display: null,
          _style: _prevStyle
        };
        return;
      }

      // Handle numbers explicitly
      if (typeof value === 'number') {
        this._data[key] = {
          value: value,
          formula: null,
          display: null,
          _style: _prevStyle
        };
        return;
      }

      const strValue = String(value);

      // Formula detection
      if (strValue.startsWith('=')) {
        this._data[key] = {
          value: null,
          formula: strValue.substring(1),
          display: null,
          _style: _prevStyle
        };
      } else {
        // Try parse as number for better type handling
        const num = Number(strValue);
        if (!isNaN(num) && strValue.trim() !== '') {
          this._data[key] = {
            value: num,
            formula: null,
            display: null,
            _style: _prevStyle
          };
        } else {
          this._data[key] = {
            value: strValue,
            formula: null,
            display: null,
            _style: _prevStyle
          };
        }
      }
    }

    setCellFormula(r, c, formula) {
      const key = this._key(r, c);
      if (!formula || formula === '') {
        delete this._data[key];
        this._recalcLastDataExtent();
        return;
      }
      this._updateLastDataExtent(r, c);
      if (this._data[key] && this._data[key]._style) {
        var _prevStyle = this._data[key]._style;
        this._data[key] = {
          value: null,
          formula: formula,
          display: null,
          _style: _prevStyle
        };
      } else {
        this._data[key] = {
          value: null,
          formula: formula,
          display: null,
          _style: null
        };
      }
    }

    hasCell(r, c) {
      return this._key(r, c) in this._data;
    }

    clearCell(r, c) {
      var key = this._key(r, c);
      var cell = this._data[key];
      if (!cell) return;
      // Keep _style, only clear value/formula/display (Clear Contents behavior)
      var style = cell._style;
      if (style && Object.keys(style).length > 0) {
        this._data[key] = { value: '', _style: style };
      } else {
        delete this._data[key];
      }
      // Deletion may shrink extent
      this._recalcLastDataExtent();
    }

    clearRange(r1, c1, r2, c2) {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          this.clearCell(r, c);
        }
      }
    }

    getData() {
      return Utils.deepClone(this._data);
    }

    setData(data) {
      this._data = Utils.deepClone(data);
      this._recalcLastDataExtent();
    }

    getColWidth(c) {
      return this.colWidths[c] || GRID.DEFAULT_COL_WIDTH;
    }

    setColWidth(c, width) {
      this.colWidths[c] = Math.max(GRID.MIN_COL_WIDTH, width);
    }

    getRowHeight(r) {
      return this.rowHeights[r] || GRID.DEFAULT_ROW_HEIGHT;
    }

    setRowHeight(r, height) {
      this.rowHeights[r] = Math.max(GRID.MIN_ROW_HEIGHT, height);
    }

    /** Merge a range of cells. Only top-left keeps data. */
    mergeCells(r1, c1, r2, c2) {
      if (r1 === r2 && c1 === c2) return; // Single cell, nothing to merge

      // Check for overlapping merges
      for (const key in this.mergedCells) {
        const m = this.mergedCells[key];
        if (Utils.rangesOverlap(r1, c1, r2, c2, m.r1, m.c1, m.r2, m.c2)) {
          return false; // Overlap, can't merge
        }
      }

      // Clear data from all cells except top-left
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (r === r1 && c === c1) continue; // Skip top-left cell
          const key = this._key(r, c);
          delete this._data[key];
        }
      }

      // Store merge info on top-left cell only
      this.mergedCells[this._key(r1, c1)] = { r1, c1, r2, c2 };
      this._rebuildMergeIndex();

      return true;
    }

    /** Unmerge cells at the given position */
    unmergeCells(r, c) {
      // Find the merge that contains this cell
      for (const key in this.mergedCells) {
        const m = this.mergedCells[key];
        if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) {
          delete this.mergedCells[key];
          this._rebuildMergeIndex();
          return true;
        }
      }
      return false;
    }

    /** Check if a cell is part of a merged region */
    isMerged(r, c) {
      for (const key in this.mergedCells) {
        const m = this.mergedCells[key];
        if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) {
          // Return true for any cell in the merged region
          return true;
        }
      }
      return false;
    }

    /** Get the merge range that contains this cell, or null */
    getMergeRange(r, c) {
      var rowMerges = this._mergeIndex[r];
      if (!rowMerges) return null;
      for (var i = 0; i < rowMerges.length; i++) {
        var m = rowMerges[i];
        if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) {
          return m;
        }
      }
      return null;
    }

    /** Check if a cell is the top-left of a merged region (the master cell) */
    isMergeMaster(r, c) {
      return this._key(r, c) in this.mergedCells;
    }

    /** Get the merge info for the top-left cell */
    getMergeInfo(r, c) {
      return this.mergedCells[this._key(r, c)] || null;
    }
  }