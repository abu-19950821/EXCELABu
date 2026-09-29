import { PRINT, DEFAULT_OPTIONS } from '../../config/index.js?v=1';
import { GRID } from '../../config/theme.js?v=2';
import { Utils } from './utils.js?v=3';

export const PrintMixin = {

  // ======================== Print ========================

  _onPrint() {
    this._doPrint(false);
  },

  _onPrintPreview() {
    this._doPrint(true);
  },

  // ── Print margin helpers / 打印边距辅助 ──
  _getPrintMargin() {
    return this._printMarginPresets[this._printMarginPreset] || this._printMarginPresets[PRINT.MARGIN_PRESETS.normal ? 'normal' : 0];
  },

  _getPrintableWidth() {
    var m = this._getPrintMargin();
    return (PRINT.PAPER_WIDTH_MM - m.left * 10 - m.right * 10) * PRINT.DPI / PRINT.MM_TO_INCH;
  },

  _getPrintableHeight() {
    var m = this._getPrintMargin();
    return (PRINT.PAPER_HEIGHT_MM - m.top * 10 - m.bottom * 10) * PRINT.DPI / PRINT.MM_TO_INCH;
  },

  _toggleMarginMenu() {
    var menu = this.container.querySelector('.excelabu-margin-menu');
    if (!menu) return;
    var visible = menu.style.display !== 'none';
    menu.style.display = visible ? 'none' : 'block';
    if (!visible) {
      // Highlight current preset / 高亮当前预设
      var items = menu.querySelectorAll('div');
      for (var i = 0; i < items.length; i++) {
        var action = items[i].getAttribute('data-action');
        if (action === 'marginNormal' && this._printMarginPreset === 'normal') items[i].classList.add('active');
        else if (action === 'marginNarrow' && this._printMarginPreset === 'narrow') items[i].classList.add('active');
        else if (action === 'marginWide' && this._printMarginPreset === 'wide') items[i].classList.add('active');
        else items[i].classList.remove('active');
      }
    }
  },

  _setPrintMargin(preset) {
    this._printMarginPreset = preset;
    // Close menu / 关闭菜单
    var menu = this.container.querySelector('.excelabu-margin-menu');
    if (menu) menu.style.display = 'none';
    // Update button text / 更新按钮文字
    var btn = this.container.querySelector('[data-action="marginMenu"]');
    if (btn) {
      var labels = { normal: this._t('marginNormal'), narrow: this._t('marginNarrow'), wide: this._t('marginWide') };
      btn.innerHTML = '&#128208; ' + (labels[preset] || this._t('margins')) + ' &#9660;';
    }
    // Re-render page break lines if visible / 如果可见则重绘分页线
    if (this._showPrintArea) {
      this._renderPageBreakLines();
    }
  },

  _togglePrintArea() {
    this._showPrintArea = !this._showPrintArea;
    var btn = this.container.querySelector('[data-action="printArea"]');
    if (btn) {
      if (this._showPrintArea) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.innerHTML = (this._showPrintArea ? '&#9745; ' : '&#9633; ') + this._t('printArea');
    }
    if (this._showPrintArea) {
      this._renderPageBreakLines();
    } else {
      this._clearPageBreakLines();
    }
  },

  /**
   * Shared helper: split columns/rows into page groups.
   * Returns { colPages, rowPages }
   *   colPages: [{ start, end, x }]  (x = total width within the page)
   *   rowPages: [{ start, end, y }]  (y = total height within the page)
   * 'end' is exclusive (like splice end). x/y are cumulative sizes.
   */
  _calculatePageGroups(cols, rows, pageWidth, pageHeight) {
    var sheet = this.activeSheet;

    // ── Columns ──
    var colPages = [];
    var pageStart = 0;
    var accW = 0;
    for (var c = 0; c < cols; c++) {
      var w = sheet.getColWidth(c);
      if (accW + w > pageWidth && c > pageStart) {
        colPages.push({ start: pageStart, end: c - 1, x: accW });
        pageStart = c;
        accW = w;
      } else {
        accW += w;
      }
    }
    colPages.push({ start: pageStart, end: cols - 1, x: accW });

    // ── Rows ──
    var rowPages = [];
    var rpStart = 0;
    var accH = 0;
    for (var r = 0; r < rows; r++) {
      var h = sheet.getRowHeight(r);
      if (accH + h > pageHeight && r > rpStart) {
        rowPages.push({ start: rpStart, end: r - 1, y: accH });
        rpStart = r;
        accH = h;
      } else {
        accH += h;
      }
    }
    rowPages.push({ start: rpStart, end: rows - 1, y: accH });

    return { colPages: colPages, rowPages: rowPages };
  },

  _renderPageBreakLines() {
    this._clearPageBreakLines();

    var sheet = this.activeSheet;
    var cols = sheet.colCount;
    var rows = sheet.rowCount;

    var pw = Math.floor(this._getPrintableWidth() - PRINT.PAGE_WIDTH_PAD);
    var ph = Math.floor(this._getPrintableHeight());

    var totalW = GRID.ROW_HEADER_WIDTH;
    for (var c = 0; c < cols; c++) totalW += sheet.getColWidth(c);
    var totalH = GRID.COL_HEADER_HEIGHT;
    for (var r = 0; r < rows; r++) totalH += sheet.getRowHeight(r);

    var pages = this._calculatePageGroups(cols, rows, pw, ph);
    var colPages = pages.colPages;
    var rowPages = pages.rowPages;

    var container = document.createElement('div');
    container.className = 'excelabu-page-break-overlay';
    container.style.width = totalW + 'px';
    container.style.height = totalH + 'px';

    var LINE_COLOR = PRINT.PAGE_BREAK_COLOR;

    // ── Vertical break lines ──
    var xPos = GRID.ROW_HEADER_WIDTH;
    for (var cp = 0; cp < colPages.length - 1; cp++) {
      xPos += colPages[cp].x;
      var vLine = document.createElement('div');
      vLine.className = 'excelabu-page-break-line excelabu-page-break-v';
      vLine.style.cssText = 'position:absolute;top:0;bottom:0;left:' + xPos + 'px;width:0;border-left:2px dashed ' + LINE_COLOR + ';';
      container.appendChild(vLine);
    }

    // ── Horizontal break lines ──
    var yPos = GRID.COL_HEADER_HEIGHT;
    for (var rp = 0; rp < rowPages.length - 1; rp++) {
      yPos += rowPages[rp].y;
      var hLine = document.createElement('div');
      hLine.className = 'excelabu-page-break-line excelabu-page-break-h';
      hLine.style.cssText = 'position:absolute;left:0;right:0;top:' + yPos + 'px;height:0;border-top:2px dashed ' + LINE_COLOR + ';';
      container.appendChild(hLine);
    }

    var hLineEnd = document.createElement('div');
    hLineEnd.className = 'excelabu-page-break-line excelabu-page-break-h';
    hLineEnd.style.cssText = 'position:absolute;left:0;right:0;top:' + totalH + 'px;height:0;border-top:2px dashed ' + LINE_COLOR + ';';
    container.appendChild(hLineEnd);

    this.gridScroll.appendChild(container);
  },

  _clearPageBreakLines() {
    var all = this.gridScroll.querySelectorAll('.excelabu-page-break-overlay');
    for (var i = 0; i < all.length; i++) {
      all[i].remove();
    }
  },

  _doPrint(previewOnly) {
    const sheet = this.activeSheet;
    const last = this.activeSheet.getLastDataExtent();

    if (last.r < 0) {
      alert(this._t('noData'));
      return;
    }

    const rows = last.r + 1;
    const cols = last.c + 1;

    var pm = this._getPrintMargin();
    var pageWidth = Math.floor(this._getPrintableWidth() - PRINT.PAGE_WIDTH_PAD);
    var pageHeight = Math.floor(this._getPrintableHeight());

    // Use shared page-group calculator
    var pageData = this._calculatePageGroups(cols, rows, pageWidth, pageHeight);

    // Convert to _doPrint format (end exclusive)
    const colPages = [];
    for (var pi = 0; pi < pageData.colPages.length; pi++) {
      colPages.push({ start: pageData.colPages[pi].start, end: pageData.colPages[pi].end + 1 });
    }
    const rowPages = [];
    for (var pi = 0; pi < pageData.rowPages.length; pi++) {
      rowPages.push({ start: pageData.rowPages[pi].start, end: pageData.rowPages[pi].end + 1 });
    }

    // ── Build HTML / 构建打印 HTML ──
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print</title>';
    html += '<style>';
    html += '*{margin:0;padding:0;box-sizing:border-box;}';
    html += 'html,body{width:100%;height:100%;}';
    html += 'body{font-family:' + PRINT.FONT_FAMILY + ';font-size:' + PRINT.FONT_SIZE + ';color:' + PRINT.TEXT_COLOR + ';}';
    html += 'table{border-collapse:collapse;margin:0 auto;}';
    html += 'td{overflow:hidden;white-space:nowrap;border:1px solid ' + PRINT.TABLE_BORDER_COLOR + ';}';
    html += '.page-break{page-break-before:always;break-before:page;}';
    html += '@page{margin:' + pm.top + 'cm ' + pm.right + 'cm ' + pm.bottom + 'cm ' + pm.left + 'cm;}';
    html += '@media print{html,body{display:block;}}';
    html += '</style></head><body>';

    let firstBlock = true;
    for (let rpi = 0; rpi < rowPages.length; rpi++) {
      const rp = rowPages[rpi];
      for (let pi = 0; pi < colPages.length; pi++) {
        const { start, end } = colPages[pi];

        if (!firstBlock) {
          html += '<div class="page-break"></div>';
        }
        firstBlock = false;

        html += '<table style="border:1px solid ' + PRINT.TABLE_BORDER_COLOR + ';">';
        html += '<colgroup>';
        for (let c = start; c < end; c++) {
          const w = sheet.getColWidth(c);
          html += '<col style="width:' + w + 'px;min-width:' + w + 'px;">';
        }
        html += '</colgroup><tbody>';

        for (let r = rp.start; r < rp.end; r++) {
          const rh = sheet.getRowHeight(r);
          html += '<tr>';
          for (let c = start; c < end; c++) {
            const mergeRange = sheet.getMergeRange(r, c);
            if (mergeRange && (r !== mergeRange.r1 || c !== mergeRange.c1)) {
              continue;
            }

            let colspan = 1;
            let rowspan = 1;
            if (mergeRange && r === mergeRange.r1 && c === mergeRange.c1) {
              colspan = mergeRange.c2 - mergeRange.c1 + 1;
              rowspan = mergeRange.r2 - mergeRange.r1 + 1;
              if (c + colspan > end) colspan = end - c;
            }

            const val = sheet.getCellDisplay(r, c);
            const escaped = Utils.escapeHtml(val).replace(/\n/g, '<br>');

            const colW = sheet.getColWidth(c);
            let style = 'style="';
            style += 'width:' + colW + 'px;max-width:' + colW + 'px;';
            style += 'height:' + rh + 'px;';

            const cell = sheet.getCell(r, c);
            if (cell && cell._style) {
              const s = cell._style;
              if (s.bold) style += 'font-weight:bold;';
              if (s.italic) style += 'font-style:italic;';
              if (s.underline) style += 'text-decoration:underline;';
              if (s.color) style += 'color:' + s.color + ';';
              if (s.bgColor) style += 'background-color:' + s.bgColor + ';';
              if (s.fontSize) style += 'font-size:' + s.fontSize + 'pt;';
              if (s.fontName) style += "font-family:'" + s.fontName + "',sans-serif;";
              if (s.hAlign) style += 'text-align:' + s.hAlign + ';';
              if (s.vAlign) style += 'vertical-align:' + s.vAlign + ';';
              if (s.wrapText) style += 'white-space:pre-wrap;word-wrap:break-word;';
            }
            style += '"';

            html += '<td ' + style;
            if (colspan > 1) html += ' colspan="' + colspan + '"';
            if (rowspan > 1) html += ' rowspan="' + rowspan + '"';
            html += '>' + escaped + '</td>';
          }
          html += '</tr>';
        }

        html += '</tbody></table>';
      }
    }

    html += '</body></html>';

    // ── Open print window / 打开打印窗口 ──
    const w = window.open('', '_print', 'width=' + PRINT.POPUP_WIDTH + ',height=' + PRINT.POPUP_HEIGHT);
    if (!w) {
      alert(this._t('popupBlocked'));
      return;
    }
    w.document.write(html);
    w.document.close();

    if (!previewOnly) {
      w.print();
      w.addEventListener('afterprint', function() { w.close(); });
    }
  }

};