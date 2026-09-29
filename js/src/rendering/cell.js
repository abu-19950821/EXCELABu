import { Utils } from '../utils.js?v=3';
import { getFontFallback } from '../../../config/fonts.js?v=1';
import { BORDER_WIDTHS, DEFAULT_COLORS, COLOR_REGEX } from '../../../config/theme.js?v=2';

export const RenderingCellMixin = {
  /** Track recursion depth for _renderCell to prevent infinite loops */
  _renderCellDepth: 0,

  _renderCell(r, c) {
    if (this._renderCellDepth > 10) {
      this._renderCellDepth = 0;
      this._renderGrid();
      return;
    }

    var sheet = this.activeSheet;
    var key = r + ',' + c;
    var el = this._cellDOM && this._cellDOM[key];
    if (!el) {
      this._renderCellDepth++;
      this._renderGrid();
      this._renderCellDepth = 0;
      return;
    }
    var merge = sheet.getMergeRange(r, c);
    if (merge && (r !== merge.r1 || c !== merge.c1)) {
      this._renderCellDepth++;
      this._renderCell(merge.r1, merge.c1);
      this._renderCellDepth = 0;
      return;
    }
    var displayValue = sheet.getCellDisplay(r, c);
    var escapedValue = Utils.escapeHtml(displayValue).replace(/\n/g, '<br>');
    var cell = sheet.getCell(r, c);
    var width = sheet.getColWidth(c);
    var rowHeight = sheet.getRowHeight(r);
    if (merge) {
      var totalWidth = 0;
      for (var mc = merge.c1; mc <= merge.c2; mc++) totalWidth += sheet.getColWidth(mc);
      var totalHeight = 0;
      for (var mr = merge.r1; mr <= merge.r2; mr++) totalHeight += sheet.getRowHeight(mr);
      width = totalWidth; rowHeight = totalHeight;
    }
    var styleAttr = this._buildCellStyleAttr(cell, width, rowHeight, r, c);
    var styleClean = styleAttr.replace(/^\s*/, '').replace(/^style="/, '').replace(/"$/, '');
    el.setAttribute('style', styleClean);
    el.innerHTML = escapedValue;
    if (el.getAttribute('data-frozen') === 'true') {
      var isFrozenRow = el.classList.contains('excelabu-cell-frozen-row') || el.classList.contains('excelabu-cell-frozen-both');
      var isFrozenCol = el.classList.contains('excelabu-cell-frozen-col') || el.classList.contains('excelabu-cell-frozen-both');
      var frozenTop = el.getAttribute('data-frozen-top');
      var frozenLeft = el.getAttribute('data-frozen-left');
      if (isFrozenRow && frozenTop !== null) el.style.top = frozenTop + 'px';
      if (isFrozenCol && frozenLeft !== null) el.style.left = frozenLeft + 'px';
    }
  },

  _scrollRAF: null,

  _onScroll() {
    var self = this;
    if (this._scrollRAF) cancelAnimationFrame(this._scrollRAF);
    this._scrollRAF = requestAnimationFrame(function() {
      self._scrollRAF = null;
      self.scrollTop = self.gridScroll.scrollTop;
      self.scrollLeft = self.gridScroll.scrollLeft;
      self._updateFrozenOverlayTransforms();
      self._updateSelectionOverlay();
    });
  },

  _buildCellStyleAttr(cell, width, rowHeight, r, c) {
    var parts = [];
    parts.push('width:' + width + 'px;max-width:' + width + 'px;height:' + rowHeight + 'px;');

    // Conditional format override
    if (r !== undefined && c !== undefined && this.activeSheet._conditionalFormats) {
      var rules = this.activeSheet._conditionalFormats;
      var rawValue = cell ? cell.value : null;
      for (var ri = 0; ri < rules.length; ri++) {
        var rule = rules[ri];
        var inRange = false;
        for (var rri = 0; rri < rule.ranges.length; rri++) {
          var range = rule.ranges[rri];
          if (r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2) { inRange = true; break; }
        }
        if (!inRange) continue;
        var match = false;
        var cellVal = rawValue !== null && rawValue !== undefined ? Number(rawValue) : NaN;
        var ruleVal = Number(rule.value);
        if (rule.operator === 'contains') {
          match = String(rawValue != null ? rawValue : '').indexOf(String(rule.value != null ? rule.value : '')) !== -1;
        } else if (!isNaN(cellVal) && !isNaN(ruleVal)) {
          switch (rule.operator) {
            case 'gt': match = cellVal > ruleVal; break;
            case 'lt': match = cellVal < ruleVal; break;
            case 'gte': match = cellVal >= ruleVal; break;
            case 'lte': match = cellVal <= ruleVal; break;
            case 'eq': match = cellVal === ruleVal; break;
            case 'neq': match = cellVal !== ruleVal; break;
          }
        } else {
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
      if (s.bold) parts.push('font-weight:bold;');
      if (s.italic) parts.push('font-style:italic;');
      if (s.underline && s.strike) parts.push('text-decoration:underline line-through;');
      else if (s.underline) parts.push('text-decoration:underline;');
      else if (s.strike) parts.push('text-decoration:line-through;');
      if (s.color) {
        var color = String(s.color).replace(/[<>""'\\]/g, '');
        if (COLOR_REGEX.test(color)) parts.push('color:' + color + ';');
      }
      if (s.bgColor) {
        var bgColor = String(s.bgColor).replace(/[<>""'\\]/g, '');
        if (COLOR_REGEX.test(bgColor)) parts.push('background-color:' + bgColor + ';');
      }
      if (s.fontSize) parts.push('font-size:' + s.fontSize + 'pt;');
      if (s.fontName) {
        var fn = s.fontName;
        if (!fn || typeof fn !== 'string' || !fn.trim()) { /* skip */ }
        else {
          var safeFont = fn.replace(/[<>""'\\]/g, '');
          parts.push("font-family:'" + safeFont + "'," + getFontFallback(safeFont) + ";");
        }
      }
      if (s.hAlign) {
        var ha = s.hAlign;
        if (ha === 'centerContinuous') ha = 'center';
        if (['left', 'center', 'right', 'justify'].includes(ha)) parts.push('text-align:' + ha + ';');
      }
      if (s.vAlign) {
        var va = s.vAlign;
        if (['top', 'middle', 'bottom'].includes(va)) parts.push('vertical-align:' + va + ';');
      }
      if (s.wrapText) parts.push('white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;');

      var borderColor = s.borderColor || DEFAULT_COLORS.border;
      var safeBorderColor = String(borderColor).replace(/[<>""'\\]/g, '');
      if (COLOR_REGEX.test(safeBorderColor)) {
        var hasAnyBorder = ('borderTop' in s) || ('borderBottom' in s) || ('borderLeft' in s) || ('borderRight' in s);
        if (hasAnyBorder) {
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