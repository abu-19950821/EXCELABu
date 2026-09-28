import { Utils } from './01_utils.js?v=2';
import { getFontFallback } from '../../config/fonts.js?v=1';
import { BORDER_WIDTHS, DEFAULT_COLORS, GRID, COLOR_REGEX } from '../../config/theme.js?v=2';

export const RenderingMixin = {
  // ======================== Rendering ========================
  _renderAll() {
    this._renderSheetTabs();
    this._renderGrid();
    this._updateSelectionDisplay();
    if (this._showPrintArea) {
      this._renderPageBreakLines();
    }
  },

  _renderSheetTabs() {
    this.sheetTabsContainer.innerHTML = '';

    this.sheets.forEach((sheet, index) => {
      const tab = document.createElement('button');
      tab.className = 'excelabu-sheet-tab';
      if (index === this.activeSheetIndex) tab.classList.add('active');
      tab.dataset.index = index;
      tab.textContent = sheet.name;
      this.sheetTabsContainer.appendChild(tab);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'excelabu-add-sheet';
    addBtn.textContent = '+';
    this.sheetTabsContainer.appendChild(addBtn);
  },

  _getLastDataRowCol(sheet) {
    let maxR = -1;
    let maxC = -1;
    for (const key in sheet._data) {
      const parts = key.split(',');
      const r = parseInt(parts[0], 10);
      const c = parseInt(parts[1], 10);
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    return { r: maxR, c: maxC };
  },

  _ensureGridSize() {
    const sheet = this.activeSheet;
    const last = this._getLastDataRowCol(sheet);

    // Visible area
    const scrollEl = this.gridScroll;
    const rowH = GRID.COL_HEADER_HEIGHT;
    const colW = GRID.DEFAULT_COL_WIDTH;
    const visibleRows = scrollEl.clientHeight > 0
      ? Math.ceil(scrollEl.clientHeight / rowH)
      : GRID.VISIBLE_ROWS_FALLBACK;
    const visibleCols = scrollEl.clientWidth > GRID.ROW_HEADER_WIDTH
      ? Math.ceil((scrollEl.clientWidth - GRID.ROW_HEADER_WIDTH) / colW)
      : GRID.VISIBLE_COLS_FALLBACK;

    // needed = max(lastData+1+buffer, visible+buffer)
    const neededRows = Math.max(last.r + 1 + GRID.EXPAND_BUFFER, visibleRows + GRID.EXPAND_BUFFER);
    const neededCols = Math.max(last.c + 1 + GRID.EXPAND_BUFFER, visibleCols + GRID.EXPAND_BUFFER);

    if (sheet.rowCount !== neededRows || sheet.colCount !== neededCols) {
      sheet.rowCount = neededRows;
      sheet.colCount = neededCols;
    }
  },

  _renderGrid() {
    this._ensureGridSize();
    const sheet = this.activeSheet;
    const rows = sheet.rowCount;
    const cols = sheet.colCount;

    let html = '<colgroup>';
    // Reserve col 0 for the corner/row-header column (46px wide)
    html += '<col style="width:' + GRID.ROW_HEADER_WIDTH + 'px;min-width:' + GRID.ROW_HEADER_WIDTH + 'px;">';
    for (let c = 0; c < cols; c++) {
      const width = sheet.getColWidth(c);
      html += '<col style="width:' + width + 'px;min-width:' + width + 'px;">';
    }
    html += '</colgroup>';

    // Pre-compute frozen column left offsets (used by column headers & data cells)
    var frozenColLefts = [];
    if (this._frozenCol !== null && this._frozenCol !== undefined) {
      var accLeft = GRID.ROW_HEADER_WIDTH;
      for (var fc = 0; fc < this._frozenCol; fc++) {
        frozenColLefts[fc] = accLeft;
        accLeft += sheet.getColWidth(fc);
      }
    }

    html += '<thead><tr>';

    // Corner cell
    html += '<th class="excelabu-corner" style="position:sticky;top:0;left:0;z-index:' + GRID.ZINDEX.CORNER + ';"></th>';

    // Column headers — add left sticky when columns are frozen
    for (let c = 0; c < cols; c++) {
      const width = sheet.getColWidth(c);
      var isColFrozen = this._frozenCol !== null && this._frozenCol !== undefined && c < this._frozenCol;
      var colHeadExtra = '';
      if (isColFrozen) {
        colHeadExtra = 'left:' + frozenColLefts[c] + 'px;z-index:' + (GRID.ZINDEX.CORNER + 1) + ';';
      } else {
        colHeadExtra = 'z-index:' + GRID.ZINDEX.COL_HEADER + ';';
      }
      html += '<th class="excelabu-col-header" data-col="' + c + '" ' +
        'style="position:sticky;top:0;' + colHeadExtra + 'width:' + width + 'px;max-width:' + width + 'px;">' +
        Utils.colToLetter(c) +
        '<div class="excelabu-col-resize-handle"></div>' +
        '</th>';
    }

    html += '</tr></thead><tbody>';

    // Track which positions are skipped due to merge (colspan)
    for (let r = 0; r < rows; r++) {
      const rowHeight = sheet.getRowHeight(r);
      var isFrozenRow = this._frozenRow !== null && this._frozenRow !== undefined && r < this._frozenRow;
      var frozenRowTop = 0;
      if (isFrozenRow) {
        frozenRowTop = GRID.COL_HEADER_HEIGHT;
        for (var fr = 0; fr < r; fr++) { frozenRowTop += sheet.getRowHeight(fr); }
      }
      html += '<tr>';

      // Row header — also sticky-top when row is frozen
      var rowHeaderFreeze = '';
      if (isFrozenRow) {
        rowHeaderFreeze = 'top:' + frozenRowTop + 'px;z-index:' + GRID.ZINDEX.CORNER + ';';
      }
      html += '<th class="excelabu-row-header" data-row="' + r + '" ' +
        'style="position:sticky;left:0;' + rowHeaderFreeze + 'width:' + GRID.ROW_HEADER_WIDTH + 'px;height:' + rowHeight + 'px;">' +
        (r + 1) +
        '<div class="excelabu-row-resize-handle"></div>' +
        '</th>';

      // Data cells
      let c = 0;
      while (c < cols) {
        // Check if this cell is part of a merged region
        const mergeRange = sheet.getMergeRange(r, c);

        if (mergeRange && (r !== mergeRange.r1 || c !== mergeRange.c1)) {
          // This cell is covered by a merge from an earlier cell - skip it
          c++;
          continue;
        }

        if (mergeRange && r === mergeRange.r1 && c === mergeRange.c1) {
          // This is the master cell of a merge - render with colspan/rowspan
          const colspan = mergeRange.c2 - mergeRange.c1 + 1;
          const rowspan = mergeRange.r2 - mergeRange.r1 + 1;

          // Calculate total width of merged columns
          let totalWidth = 0;
          for (let mc = mergeRange.c1; mc <= mergeRange.c2; mc++) {
            totalWidth += sheet.getColWidth(mc);
          }

          // Calculate total height of merged rows
          let totalHeight = 0;
          for (let mr = mergeRange.r1; mr <= mergeRange.r2; mr++) {
            totalHeight += sheet.getRowHeight(mr);
          }

          const displayValue = sheet.getCellDisplay(r, c);
          const escapedValue = Utils.escapeHtml(displayValue).replace(/\n/g, '<br>');
          const cell = sheet.getCell(r, c);
          const styleAttr = this._buildCellStyleAttr(cell, totalWidth, totalHeight, r, c);

          var isFrozenColM = this._frozenCol !== null && this._frozenCol !== undefined && c < this._frozenCol;
          var frozenClassM = '';
          var frozenDataAttrsM = '';
          if (isFrozenRow || isFrozenColM) {
            if (isFrozenRow && isFrozenColM) {
              frozenClassM = ' excelabu-cell-frozen-both';
              frozenDataAttrsM = ' data-frozen="true" data-frozen-top="' + frozenRowTop + '" data-frozen-left="' + frozenColLefts[c] + '"';
            } else if (isFrozenRow) {
              frozenClassM = ' excelabu-cell-frozen-row';
              frozenDataAttrsM = ' data-frozen="true" data-frozen-top="' + frozenRowTop + '"';
            } else {
              frozenClassM = ' excelabu-cell-frozen-col';
              frozenDataAttrsM = ' data-frozen="true" data-frozen-left="' + frozenColLefts[c] + '"';
            }
          }

          html += '<td class="excelabu-cell' + frozenClassM + '" data-row="' + r + '" data-col="' + c + '" ' +
            'colspan="' + colspan + '" rowspan="' + rowspan + '" ' +
            frozenDataAttrsM + ' ' + styleAttr + '>' +
            escapedValue +
            '</td>';

          c = mergeRange.c2 + 1;
        } else {
          // Regular cell
          const width = sheet.getColWidth(c);
          const displayValue = sheet.getCellDisplay(r, c);
          const escapedValue = Utils.escapeHtml(displayValue).replace(/\n/g, '<br>');
          const cell = sheet.getCell(r, c);
          const styleAttr = this._buildCellStyleAttr(cell, width, rowHeight, r, c);

          var isFrozenCol = this._frozenCol !== null && this._frozenCol !== undefined && c < this._frozenCol;
          var frozenClass = '';
          var frozenDataAttrs = '';
          if (isFrozenRow || isFrozenCol) {
            if (isFrozenRow && isFrozenCol) {
              frozenClass = ' excelabu-cell-frozen-both';
              frozenDataAttrs = ' data-frozen="true" data-frozen-top="' + frozenRowTop + '" data-frozen-left="' + frozenColLefts[c] + '"';
            } else if (isFrozenRow) {
              frozenClass = ' excelabu-cell-frozen-row';
              frozenDataAttrs = ' data-frozen="true" data-frozen-top="' + frozenRowTop + '"';
            } else {
              frozenClass = ' excelabu-cell-frozen-col';
              frozenDataAttrs = ' data-frozen="true" data-frozen-left="' + frozenColLefts[c] + '"';
            }
          }

          html += '<td class="excelabu-cell' + frozenClass + '" data-row="' + r + '" data-col="' + c + '" ' + frozenDataAttrs + ' ' + styleAttr + '>' +
            escapedValue +
            '</td>';

          c++;
        }
      }

      html += '</tr>';
    }

    html += '</tbody>';

    this.gridTable.innerHTML = html;

    // Build DOM cell cache for O(1) lookups (used by selection / scrollToCell / _renderCell)
    this._cellDOM = {};
    var cells = this.gridTable.querySelectorAll('.excelabu-cell');
    for (var i = 0; i < cells.length; i++) {
      var el = cells[i];
      this._cellDOM[el.dataset.row + ',' + el.dataset.col] = el;
    }

    // Cache frozen cells for scroll-driven repositioning
    this._frozenCellList = this.gridTable.querySelectorAll('[data-frozen]');

    // Initial positioning of frozen cells
    this._updateFrozenCellPositions();
  },

  /**
   * Incrementally update a single cell's DOM without full re-render.
   * Falls back to _renderGrid if the cell is part of a merge or not in cache.
   */
  _renderCell(r, c) {
    var sheet = this.activeSheet;
    var key = r + ',' + c;
    var el = this._cellDOM && this._cellDOM[key];

    if (!el) { this._renderGrid(); return; }

    // If this cell is a merge sub-cell, delegate to master
    var merge = sheet.getMergeRange(r, c);
    if (merge && (r !== merge.r1 || c !== merge.c1)) {
      this._renderCell(merge.r1, merge.c1);
      return;
    }

    var displayValue = sheet.getCellDisplay(r, c);
    var escapedValue = Utils.escapeHtml(displayValue).replace(/\n/g, '<br>');
    var cell = sheet.getCell(r, c);
    var width = sheet.getColWidth(c);
    var rowHeight = sheet.getRowHeight(r);

    if (merge) {
      var totalWidth = 0;
      for (var mc = merge.c1; mc <= merge.c2; mc++) { totalWidth += sheet.getColWidth(mc); }
      var totalHeight = 0;
      for (var mr = merge.r1; mr <= merge.r2; mr++) { totalHeight += sheet.getRowHeight(mr); }
      width = totalWidth;
      rowHeight = totalHeight;
    }

    var styleAttr = this._buildCellStyleAttr(cell, width, rowHeight, r, c);
    // Strip leading space and replace surrounding quotes
    var styleClean = styleAttr.replace(/^\s*/, '').replace(/^style="/, '').replace(/"$/, '');

    el.setAttribute('style', styleClean);
    // Re-apply freeze offset if this is a frozen cell
    if (el.getAttribute('data-frozen') === 'true') {
      if (el.getAttribute('data-frozen-top') !== null) el.style.top = (this.scrollTop || 0) + 'px';
      if (el.getAttribute('data-frozen-left') !== null) el.style.left = (this.scrollLeft || 0) + 'px';
    }
    el.innerHTML = escapedValue;
  },

  // ======================== Scroll ========================
  _onScroll() {
    this.scrollTop = this.gridScroll.scrollTop;
    this.scrollLeft = this.gridScroll.scrollLeft;
    this._updateFrozenCellPositions();
    this._updateSelectionOverlay();
  },

  /**
   * Reposition frozen cells using position:relative offsets so they
   * stay visible when the user scrolls. This avoids CSS position:sticky
   * reliability issues on <td> elements.
   */
  _updateFrozenCellPositions() {
    var list = this._frozenCellList;
    if (!list || !list.length) return;
    var st = this.scrollTop || 0;
    var sl = this.scrollLeft || 0;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.getAttribute('data-frozen-top') !== null) el.style.top = st + 'px';
      if (el.getAttribute('data-frozen-left') !== null) el.style.left = sl + 'px';
    }
  },

  _buildCellStyleAttr(cell, width, rowHeight, r, c) {
    var parts = [];
    parts.push('width:' + width + 'px;max-width:' + width + 'px;height:' + rowHeight + 'px;');

    // Conditional format override (applied before cell style so cell style takes precedence)
    if (r !== undefined && c !== undefined && this.activeSheet._conditionalFormats) {
      var rules = this.activeSheet._conditionalFormats;
      var rawValue = cell ? cell.value : null;
      for (var ri = 0; ri < rules.length; ri++) {
        var rule = rules[ri];
        // Check if cell is in this rule's range
        var inRange = false;
        for (var rri = 0; rri < rule.ranges.length; rri++) {
          var range = rule.ranges[rri];
          if (r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2) {
            inRange = true;
            break;
          }
        }
        if (!inRange) continue;

        var match = false;
        var cellVal = rawValue !== null && rawValue !== undefined ? Number(rawValue) : NaN;
        var ruleVal = Number(rule.value);
        if (rule.operator === 'contains') {
          match = String(rawValue != null ? rawValue : '').indexOf(String(rule.value != null ? rule.value : '')) !== -1;
        } else if (!isNaN(cellVal) && !isNaN(ruleVal)) {
          // Both are numeric — compare numerically
          switch (rule.operator) {
            case 'gt': match = cellVal > ruleVal; break;
            case 'lt': match = cellVal < ruleVal; break;
            case 'gte': match = cellVal >= ruleVal; break;
            case 'lte': match = cellVal <= ruleVal; break;
            case 'eq': match = cellVal === ruleVal; break;
            case 'neq': match = cellVal !== ruleVal; break;
          }
        } else {
          // Fallback: string comparison
          var strCell = String(rawValue != null ? rawValue : '');
          var strRule = String(rule.value != null ? rule.value : '');
          switch (rule.operator) {
            case 'eq': match = strCell === strRule; break;
            case 'neq': match = strCell !== strRule; break;
            case 'gt': match = strCell > strRule; break;
            case 'lt': match = strCell < strRule; break;
            case 'gte': match = strCell >= strRule; break;
            case 'lte': match = strCell <= strRule; break;
          }
        }

        if (match) {
          if (rule.bgColor) parts.push('background-color:' + rule.bgColor + ';');
          if (rule.color) parts.push('color:' + rule.color + ';');
          break;
        }
      }
    }

    if (cell && cell._style) {
      var s = cell._style;

      // Font styles - sanitize color values to prevent XSS
      if (s.bold) parts.push('font-weight:bold;');
      if (s.italic) parts.push('font-style:italic;');
      if (s.underline && s.strike) parts.push('text-decoration:underline line-through;');
      else if (s.underline) parts.push('text-decoration:underline;');
      else if (s.strike) parts.push('text-decoration:line-through;');
      if (s.color) {
        // Only allow valid CSS color values (hex, rgb, rgba, named colors)
        var color = String(s.color).replace(/[<>"'\\]/g, '');
        if (COLOR_REGEX.test(color)) {
          parts.push('color:' + color + ';');
        }
      }
      if (s.bgColor) {
        // Only allow valid CSS color values
        var bgColor = String(s.bgColor).replace(/[<>"'\\]/g, '');
        if (COLOR_REGEX.test(bgColor)) {
          parts.push('background-color:' + bgColor + ';');
        }
      }
      if (s.fontSize) parts.push('font-size:' + s.fontSize + 'pt;');
      if (s.fontName) {
        var fn = s.fontName;
        if (!fn || typeof fn !== 'string' || !fn.trim()) {
          // skip malformed font name
        } else {
          // Sanitize font name to prevent XSS
          var safeFont = fn.replace(/[<>"'\\]/g, '');
          parts.push("font-family:'" + safeFont + "'," + getFontFallback(safeFont) + ";");
        }
      }

      // Alignment
      if (s.hAlign) {
        var ha = s.hAlign;
        if (ha === 'centerContinuous') ha = 'center';
        // Only allow valid alignment values
        if (['left', 'center', 'right', 'justify'].includes(ha)) {
          parts.push('text-align:' + ha + ';');
        }
      }
      if (s.vAlign) {
        var va = s.vAlign;
        // Only allow valid vertical alignment values
        if (['top', 'middle', 'bottom'].includes(va)) {
          parts.push('vertical-align:' + va + ';');
        }
      }
      // Wrap Text button → pre-wrap + break-word (soft wrap when column too narrow)
      if (s.wrapText) parts.push('white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;');

      // Borders - sanitize border values
      var borderColor = s.borderColor || DEFAULT_COLORS.border;
      var safeBorderColor = String(borderColor).replace(/[<>"'\\]/g, '');
      if (COLOR_REGEX.test(safeBorderColor)) {
        // If any border property exists on the style (even null/cleared),
        // suppress CSS default grid lines so they don't leak through
        var hasAnyBorder = ('borderTop' in s) || ('borderBottom' in s) || ('borderLeft' in s) || ('borderRight' in s);
        if (hasAnyBorder) {
          // Clear CSS defaults first, then apply user borders on top
          parts.push('border-top:' + (s.borderTop ? (BORDER_WIDTHS[s.borderTop] || 1) + 'px solid ' + safeBorderColor : '0 none') + ';');
          parts.push('border-bottom:' + (s.borderBottom ? (BORDER_WIDTHS[s.borderBottom] || 1) + 'px solid ' + safeBorderColor : '0 none') + ';');
          parts.push('border-left:' + (s.borderLeft ? (BORDER_WIDTHS[s.borderLeft] || 1) + 'px solid ' + safeBorderColor : '0 none') + ';');
          parts.push('border-right:' + (s.borderRight ? (BORDER_WIDTHS[s.borderRight] || 1) + 'px solid ' + safeBorderColor : '0 none') + ';');
        }
      }
    }

    return 'style="' + parts.join('') + '"';
  }

};