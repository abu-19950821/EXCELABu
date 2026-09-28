import { ensureXLSX, getXLSX } from './00_xlsx.js?v=2';
import { Sheet } from './03_sheet.js?v=4';
import { IMPORT } from '../../config/constants.js?v=1';

export const ImportMixin = {

  async importFile() {
    await ensureXLSX();
    const XLSX = getXLSX();

    if (!this._fileInput) {
      this._fileInput = document.createElement('input');
      this._fileInput.type = 'file';
      this._fileInput.accept = '.xlsx,.xls,.csv,.ods';
      this._fileInput.style.display = 'none';
      document.body.appendChild(this._fileInput);

      this._fileInputOnChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: 'array', cellFormula: true, cellStyles: true });
            this._importWorkbook(wb);
          } catch (err) {
            alert('Failed to read file: ' + err.message);
            console.error(err);
            this._setStatus('Import failed');
          }
        };
        reader.onerror = () => {
          alert('Failed to read file');
          this._setStatus('Import failed');
        };
        reader.readAsArrayBuffer(file);

        this._fileInput.value = '';
      };

      this._fileInput.addEventListener('change', this._fileInputOnChange);
    }

    this._fileInput.click();
  },

  /**
   * 从服务器 URL 导入 xlsx/xls/csv 文件
   * @param {string} url - 文件 URL
   * @param {Object} [opts] - 可选配置
   * @param {Object} [opts.headers] - 自定义请求头
   * @param {string} [opts.credentials] - 跨域凭证: 'include' | 'same-origin' | 'omit'
   * @returns {Promise<void>}
   */
  async importFromUrl(url, opts = {}) {
    await ensureXLSX();
    const XLSX = getXLSX();

    this._setStatus('Downloading...');

    try {
      const fetchOpts = {
        headers: opts.headers || {},
      };
      if (opts.credentials) {
        fetchOpts.credentials = opts.credentials;
      }

      const response = await fetch(url, fetchOpts);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const wb = XLSX.read(data, { type: 'array', cellFormula: true, cellStyles: true });
      this._importWorkbook(wb);
    } catch (err) {
      console.error('Failed to load file from URL:', err);
      this._setStatus('Import failed: ' + err.message);
      throw err;
    }
  },

  _buildWorkbook() {
    const XLSX = getXLSX();

    const wb = XLSX.utils.book_new();

    for (let i = 0; i < this.sheets.length; i++) {
      const sheetData = this.sheets[i];
      const ws = this._sheetToWorksheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, sheetData.name || ('Sheet' + (i + 1)));
    }

    return wb;
  },

  async exportFile() {
    await ensureXLSX();

    var wb = this._buildWorkbook();
    var fileName = (this.sheets[0] && this.sheets[0].name) ? this.sheets[0].name + '.xlsx' : 'spreadsheet.xlsx';
    var blob;
    try {
      blob = this._buildXLSXBlob(wb);
    } catch (e) {
      console.error('Custom XLSX export failed, falling back to basic export:', e);
      var XLSX = getXLSX();
      XLSX.writeFile(wb, fileName);
      return;
    }
    // Trigger download
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  },

  /**
   * Build XLSX ZIP Blob from a SheetJS workbook (with full style support). / 从工作簿构建带样式的 XLSX Blob
   * Does NOT trigger download — caller decides what to do with the Blob. / 不触发浏览器下载
   * @param {Object} wb  SheetJS workbook object (from _buildWorkbook) / 由 _buildWorkbook 构建
   * @returns {Blob}     XLSX file as a Blob (ready for download or upload) / 可用于下载或上传
   */
  _buildXLSXBlob(wb) {
    var XLSX = getXLSX();

    // Step 1: Build style tables from all sheets / 第一步：构建样式表
    var sheets = [];
    for (var si = 0; si < wb.SheetNames.length; si++) {
      sheets.push(wb.Sheets[wb.SheetNames[si]]);
    }
    var tables = _buildStyleTables(sheets, XLSX);

    // Step 2: Collect unique shared strings / 第二步：收集共享字符串
    var sst = [];
    var sstMap = {};
    for (var si = 0; si < sheets.length; si++) {
      var ws = sheets[si];
      var ref = ws['!ref'];
      if (!ref) continue;
      var range = XLSX.utils.decode_range(ref);
      for (var r = range.s.r; r <= range.e.r; r++) {
        for (var c = range.s.c; c <= range.e.c; c++) {
          var addr = XLSX.utils.encode_cell({ r: r, c: c });
          var cell = ws[addr];
          if (!cell) continue;
          if (cell.t === 'str' || (!cell.t && typeof cell.v === 'string')) {
            var sv = String(cell.v);
            if (sstMap[sv] === undefined) {
              sstMap[sv] = sst.length;
              sst.push(sv);
            }
          }
        }
      }
    }

    // Step 3: Generate XML files / 第三步：生成 XML 文件
    var xmlDecl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var nsWorkbook = ' xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    var nsRel = ' xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
    var nsContent = ' xmlns="http://schemas.openxmlformats.org/package/2006/content-types"';

    var stylesXML = xmlDecl + '\n' + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + _genStylesXML(tables) + '</styleSheet>';

    var sstXML = xmlDecl + '\n';
    if (sst.length > 0) {
      sstXML += '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + sst.length + '" uniqueCount="' + sst.length + '">';
      for (var ssi = 0; ssi < sst.length; ssi++) {
        sstXML += '<si><t>' + _xmlEscape(sst[ssi]) + '</t></si>';
      }
      sstXML += '</sst>';
    } else {
      sstXML += '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>';
    }

    var bookXML = xmlDecl + '\n' + '<workbook' + nsWorkbook + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    for (var bsi = 0; bsi < wb.SheetNames.length; bsi++) {
      bookXML += '<sheet name="' + _xmlEscape(wb.SheetNames[bsi]) + '" sheetId="' + (bsi + 1) + '" r:id="rId' + (bsi + 1) + '"/>';
    }
    bookXML += '</sheets></workbook>';

    var bookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships' + nsRel + '>';
    for (var bri = 0; bri < wb.SheetNames.length; bri++) {
      bookRels += '<Relationship Id="rId' + (bri + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (bri + 1) + '.xml"/>';
    }
    bookRels += '<Relationship Id="rId' + (wb.SheetNames.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    bookRels += '<Relationship Id="rId' + (wb.SheetNames.length + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>';
    bookRels += '</Relationships>';

    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships' + nsRel + '>';
    rootRels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>';
    rootRels += '</Relationships>';

    var ctXML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types' + nsContent + '>';
    ctXML += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
    ctXML += '<Default Extension="xml" ContentType="application/xml"/>';
    ctXML += '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>';
    for (var cti = 0; cti < wb.SheetNames.length; cti++) {
      ctXML += '<Override PartName="/xl/worksheets/sheet' + (cti + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }
    ctXML += '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    ctXML += '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>';
    ctXML += '</Types>';

    var sheetXMLs = [];
    for (var sxi = 0; sxi < sheets.length; sxi++) {
      sheetXMLs.push(_genSheetXML(sheets[sxi], XLSX));
    }

    var files = [];
    files.push({ name: '[Content_Types].xml', data: ctXML });
    files.push({ name: '_rels/.rels', data: rootRels });
    files.push({ name: 'xl/workbook.xml', data: bookXML });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: bookRels });
    files.push({ name: 'xl/styles.xml', data: stylesXML });
    files.push({ name: 'xl/sharedStrings.xml', data: sstXML });
    for (var fxi = 0; fxi < sheetXMLs.length; fxi++) {
      files.push({ name: 'xl/worksheets/sheet' + (fxi + 1) + '.xml', data: sheetXMLs[fxi] });
    }

    return _buildZIP(files);
  },

  _importWorkbook(wb) {
    const XLSX = getXLSX();
    this._finishEditing();

    this.sheets = [];

    // Build style lookup from workbook
    const styles = wb.Styles || {};
    const styleLookup = _buildStyleLookup(styles);

    const sheetNames = wb.SheetNames;
    if (sheetNames.length === 0) return;

    for (let i = 0; i < sheetNames.length; i++) {
      const name = sheetNames[i];
      const ws = wb.Sheets[name];

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const rows = Math.min(range.e.r + 1 + IMPORT.EXTRA_ROWS, IMPORT.MAX_ROWS);
      const cols = Math.max(range.e.c + 1 + IMPORT.EXTRA_COLS, 26);

      const sheet = new Sheet(name, rows, cols);

      // 导入列宽 — MDW=7 重算 + 5% 视觉补偿。
      // SheetJS MDW=6 → 对整数宽度列无法修正 → wpx 偏小 ~14%。
      // 用 colInfo.width(原始 OOXML 宽度) + MDW=7 可精确还原。
      // 加 5% 补偿浏览器渲染差异(box-model/字体渲染/抗锯齿)。
      if (ws['!cols']) {
        for (let c = 0; c < ws['!cols'].length; c++) {
          const colInfo = ws['!cols'][c];
          if (!colInfo) continue;

          let basePx;
          if (colInfo.width != null) {
            // width2px with MDW=7: floor((width + round(128/7)/256) * 7)
            // = floor((width + 18/256) * 7)
            basePx = Math.floor((colInfo.width + 18/256) * 7);
          } else if (colInfo.wch) {
            // Fallback: 1ch ≈ 7px at 96dpi for Calibri 11pt
            basePx = Math.round(colInfo.wch * 7);
          } else if (colInfo.wpx) {
            // Last resort
            basePx = colInfo.wpx;
          } else {
            continue;
          }

          // 5% browser rendering compensation factor
          // Compensates for font rendering, anti-aliasing, and box-model differences
          sheet.colWidths[c] = Math.round(basePx * 1.05);
        }
      }

      // Import row heights
      if (ws['!rows']) {
        for (let r = 0; r < ws['!rows'].length; r++) {
          const rowInfo = ws['!rows'][r];
          if (!rowInfo) continue;
          if (rowInfo.hpt != null) {
            // Convert points to pixels (1pt = 96/72 px at 96dpi)
            sheet.rowHeights[r] = Math.round(rowInfo.hpt * 96 / 72);
          }
        }
      }

      // Import merged cells
      if (ws['!merges']) {
        for (const merge of ws['!merges']) {
          sheet.mergedCells[merge.s.r + ',' + merge.s.c] = {
            r1: merge.s.r,
            c1: merge.s.c,
            r2: merge.e.r,
            c2: merge.e.c
          };
        }
      }

      // Import cell data
      let cellCount = 0;
      let styledCount = 0;
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r: r, c: c });
          const cell = ws[addr];
          if (!cell) continue;

          const key = r + ',' + c;
          cellCount++;
          var cellStyle = _parseStyle(cell, styleLookup);
          if (cellStyle) styledCount++;

          if (cell.f) {
            sheet._data[key] = { formula: cell.f, value: cell.v, _style: cellStyle };
          } else {
            let val = cell.v;
            if (cell.t === 'd') {
              val = new Date(val);
            } else if (cell.t === 'b') {
              val = val === true;
            }
            sheet._data[key] = { value: val, _style: cellStyle };
          }
        }
      }

      this.sheets.push(sheet);
    }

    this.activeSheetIndex = 0;
    this.selection = null;
    this.activeCell = { r: 0, c: 0 };
    this.undoStack = {};
    this.redoStack = {};
    this.extraSelections = [];
    this.clipboard = null;

    this._renderAll();
    this._selectCell(0, 0);

    this._setStatus('Imported ' + wb.SheetNames.length + ' sheet(s)');
  },

  _sheetToWorksheet(sheet) {
    const XLSX = getXLSX();
    const maxR = sheet.rowCount;
    const maxC = sheet.colCount;

    const aoa = [];
    let lastNonEmptyRow = -1;

    for (let r = 0; r < maxR; r++) {
      const row = [];
      for (let c = 0; c < maxC; c++) {
        const cell = sheet.getCell(r, c);
        if (!cell) {
          row.push(null);
          continue;
        }

        if (cell.formula) {
          row.push(cell.formula);
        } else {
          var v = cell.value !== undefined ? cell.value : null;
          row.push(v);
        }
      }

      const hasContent = row.some(function (v, cIdx) {
        if (v !== null) return true;
        var styleKey = r + ',' + cIdx;
        var styleData = sheet._data[styleKey];
        return styleData && styleData._style && Object.keys(styleData._style).length > 0;
      });
      if (hasContent) {
        lastNonEmptyRow = r;
      }
      aoa.push(row);
    }

    const trimmedRows = lastNonEmptyRow >= 0 ? lastNonEmptyRow + 1 : 1;
    const data = aoa.slice(0, trimmedRows);

    let lastNonEmptyCol = -1;
    for (let r = 0; r < trimmedRows; r++) {
      for (let c = maxC - 1; c > lastNonEmptyCol; c--) {
        var colCheckKey = r + ',' + c;
        var colCheckData = sheet._data[colCheckKey];
        if (data[r][c] !== null || (colCheckData && colCheckData._style && Object.keys(colCheckData._style).length > 0)) {
          lastNonEmptyCol = Math.max(lastNonEmptyCol, c);
          break;
        }
      }
    }

    for (let r = 0; r < data.length; r++) {
      data[r] = data[r].slice(0, lastNonEmptyCol + 1);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Embed styles directly into cell objects so XLSX serializes them properly
    var maxStyledRow = -1;
    var maxStyledCol = -1;
    for (var r = 0; r <= lastNonEmptyRow; r++) {
      for (var c = 0; c <= lastNonEmptyCol; c++) {
        var cellKey = r + ',' + c;
        var cellData = sheet._data[cellKey];
        if (cellData && cellData._style) {
          var cellRef = XLSX.utils.encode_cell({ r: r, c: c });
          var xlsxStyle = _exportStyle(cellData._style);
          if (xlsxStyle && Object.keys(xlsxStyle).length > 0) {
            var wsCell = ws[cellRef];
            if (!wsCell) {
              wsCell = { t: 's', v: '' };
              ws[cellRef] = wsCell;
            }
            // Rebuild cell with style: embed everything into a clean object
            ws[cellRef] = _buildCellWithStyle(wsCell, xlsxStyle);
            if (r > maxStyledRow) maxStyledRow = r;
            if (c > maxStyledCol) maxStyledCol = c;
          }
        }
      }
    }

    // Expand !ref to cover styled cells that sit outside the value-based range
    var oldRef = ws['!ref'];
    if (oldRef) {
      var oldRange = XLSX.utils.decode_range(oldRef);
      var newER = Math.max(oldRange.e.r, lastNonEmptyRow, maxStyledRow);
      var newEC = Math.max(oldRange.e.c, lastNonEmptyCol, maxStyledCol);
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: oldRange.s.r, c: oldRange.s.c },
        e: { r: newER, c: newEC }
      });
    }

    ws['!cols'] = [];
    for (let c = 0; c <= lastNonEmptyCol; c++) {
      const w = sheet.getColWidth(c);
      ws['!cols'].push({ wpx: w, wch: Math.round(w / 7) });
    }

    const customRows = Object.keys(sheet.rowHeights);
    if (customRows.length > 0) {
      ws['!rows'] = [];
      for (var i = 0; i < customRows.length; i++) {
        var r = parseInt(customRows[i], 10);
        // Convert pixels to points for hpt (1px = 72/96 pt at 96dpi)
        // 将像素转换为点（96dpi：1px = 72/96 pt）
        ws['!rows'][r] = { hpt: sheet.rowHeights[r] * 72 / 96, hpx: sheet.rowHeights[r] };
      }
    }

    const mergeKeys = Object.keys(sheet.mergedCells);
    if (mergeKeys.length > 0) {
      ws['!merges'] = [];
      for (var j = 0; j < mergeKeys.length; j++) {
        var m = sheet.mergedCells[mergeKeys[j]];
        ws['!merges'].push({ s: { r: m.r1, c: m.c1 }, e: { r: m.r2, c: m.c2 } });
      }
    }

    return ws;
  }

};

// Build a lookup from CellXf + Fonts for style resolution
// Stores raw arrays for direct CellXf index lookup via cell._xfId
function _buildStyleLookup(styles) {
  var lookup = {};
  var cellXfs = styles.CellXf;
  var fonts = styles.Fonts;
  var borders = styles.Borders;

  if (!cellXfs || !Array.isArray(cellXfs)) return lookup;

  // Store raw arrays for direct index access
  lookup._cellXfs = cellXfs;
  lookup._fonts = fonts;
  lookup._borders = borders;

  // Fallback: default style from CellXf[0]
  if (cellXfs[0]) {
    lookup._default = _xfToStyle(cellXfs[0], fonts, borders);
  }

  return lookup;
}

// Convert a CellXf + Fonts + Borders array to a simplified style object
function _xfToStyle(xf, fonts, borders) {
  var style = {};

  // Number format: stored separately via cell.z, skip here

  // Font
  if (xf.fontId != null && fonts && fonts[xf.fontId]) {
    var font = fonts[xf.fontId];
    if (font.bold) style.bold = true;
    if (font.italic) style.italic = true;
    if (font.underline) style.underline = true;
    if (font.strike) style.strike = true;
    if (font.sz) style.fontSize = typeof font.sz === 'number' ? font.sz : parseInt(font.sz, 10) || null;
    if (font.name) style.fontName = font.name;
    if (font.color && font.color.rgb) {
      var c = font.color.rgb;
      if (c === 'FF000000' || c === '00000000') {
        // black / auto, skip
      } else {
        style.color = '#' + (c.length === 8 ? c.slice(2) : c);
      }
    }
  }

  // Alignment
  if (xf.alignment) {
    var a = xf.alignment;
    if (a.horizontal && a.horizontal !== 'general') style.hAlign = a.horizontal;
    if (a.vertical && a.vertical !== 'bottom') style.vAlign = a.vertical;
    if (a.wrapText) style.wrapText = true;
  }

  // Borders
  if (xf.borderId != null && borders && borders[xf.borderId]) {
    var b = borders[xf.borderId];
    if (b.top && b.top.style) style.borderTop = b.top.style;
    if (b.bottom && b.bottom.style) style.borderBottom = b.bottom.style;
    if (b.left && b.left.style) style.borderLeft = b.left.style;
    if (b.right && b.right.style) style.borderRight = b.right.style;
    if (b.top && b.top.color && b.top.color.rgb) {
      var bc = b.top.color.rgb;
      style.borderColor = '#' + (bc.length === 8 ? bc.slice(2) : bc);
    }
  }

  return style;
}

// Make a stable key from a Fill object for lookup
function _fillKey(fill) {
  if (!fill) return '__none__';
  var parts = [];
  if (fill.patternType) parts.push('pt:' + fill.patternType);
  if (fill.fgColor && fill.fgColor.rgb) parts.push('fg:' + fill.fgColor.rgb);
  if (fill.bgColor && fill.bgColor.rgb) parts.push('bg:' + fill.bgColor.rgb);
  return parts.join('|') || '__empty__';
}

// Convert SheetJS cell style to internal format
function _parseStyle(cell, styleLookup) {
  var style = {};

  // Number format (always available via cell.z)
  if (cell.z && cell.z !== 'General') {
    style.numFmt = cell.z;
  }

  // Direct CellXf index lookup (the reliable approach)
  if (cell._xfId != null && styleLookup._cellXfs && styleLookup._cellXfs[cell._xfId]) {
    var xf = styleLookup._cellXfs[cell._xfId];
    var xfStyle = _xfToStyle(xf, styleLookup._fonts, styleLookup._borders);
    for (var k in xfStyle) {
      if (xfStyle.hasOwnProperty(k)) {
        style[k] = xfStyle[k];
      }
    }
  } else if (styleLookup && styleLookup._default) {
    // Fallback: use default style for cells without _xfId
    var def = styleLookup._default;
    for (var dk in def) {
      if (def.hasOwnProperty(dk)) {
        style[dk] = def[dk];
      }
    }
  }

  // Background color from fill (cell.s is the Fill object)
  if (cell.s && typeof cell.s === 'object' && cell.s.fgColor && cell.s.fgColor.rgb && cell.s.patternType !== 'none') {
    var bg = cell.s.fgColor.rgb;
    style.bgColor = '#' + (bg.length === 8 ? bg.slice(2) : bg);
  }

  if (Object.keys(style).length === 0) return null;
  return style;
}

// Convert internal _style to XLSX cell style format for export
function _exportStyle(style) {
  var s = {};
  if (!style) return s;

  // Font
  if (style.bold || style.italic || style.underline || style.strike || style.fontSize || style.fontName || style.color) {
    s.font = {};
    if (style.bold) s.font.bold = true;
    if (style.italic) s.font.italic = true;
    if (style.underline) s.font.underline = true;
    if (style.strike) s.font.strike = true;
    if (style.fontSize) s.font.sz = Number(style.fontSize);
    if (style.fontName) s.font.name = style.fontName;
    if (style.color) {
      var cc = style.color.replace('#', '');
      s.font.color = { rgb: 'FF' + cc };
    }
  }

  // Fill (background color)
  if (style.bgColor) {
    var bg = style.bgColor.replace('#', '');
    s.fill = {
      patternType: 'solid',
      fgColor: { rgb: 'FF' + bg }
    };
  }

  // Alignment
  if (style.hAlign || style.vAlign || style.wrapText) {
    s.alignment = {};
    if (style.hAlign) s.alignment.horizontal = style.hAlign;
    if (style.vAlign) s.alignment.vertical = style.vAlign;
    if (style.wrapText) s.alignment.wrapText = true;
  }

  // Number format
  if (style.numFmt) {
    s.numFmt = style.numFmt;
  }

  // Border
  var hasBorder = style.borderTop || style.borderBottom || style.borderLeft || style.borderRight;
  if (hasBorder) {
    s.border = {};
    var sides = ['borderTop', 'borderBottom', 'borderLeft', 'borderRight'];
    var sideKeys = ['top', 'bottom', 'left', 'right'];
    for (var i = 0; i < sides.length; i++) {
      if (style[sides[i]]) {
        var bw = style[sides[i]] || 'thin';
        var borderColorRgb = null;
        if (style.borderColor) {
          var bcc = style.borderColor.replace('#', '');
          borderColorRgb = { rgb: 'FF' + bcc };
        }
        s.border[sideKeys[i]] = { style: bw, color: borderColorRgb || { auto: 1 } };
      }
    }
  }

  return Object.keys(s).length > 0 ? s : null;
}

// Merge an aoa_to_sheet cell with its style, preserving cell type/value/formula
function _buildCellWithStyle(cell, xlsxStyle) {
  var merged = { s: xlsxStyle };

  // Preserve cell type
  if (cell.t != null) merged.t = cell.t;

  // Preserve value or formula
  if (cell.f != null) {
    merged.f = cell.f;
    if (cell.v != null) merged.v = cell.v;
  } else {
    merged.v = cell.v != null ? cell.v : '';
  }

  return merged;
}

// ============================================================
//  Custom XLSX Export — full style support
//  SheetJS community edition ignores cell.s during write,
//  so we build XLSX from scratch with proper styles.xml.
// ============================================================

function _xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function _xmlTag(name, attrs, content, selfClose) {
  var a = '';
  for (var k in attrs) {
    if (attrs[k] != null) a += ' ' + k + '="' + _xmlEscape(attrs[k]) + '"';
  }
  if (selfClose) return '<' + name + a + '/>';
  if (content === '') return '<' + name + a + '>';
  return '<' + name + a + '>' + content + '</' + name + '>';
}

// --- Style collectors ---

function _styleKeyFont(font) {
  var k = 'sz' + (font.sz||'11') + '|n' + (font.name||'Calibri');
  if (font.bold) k += '|b';
  if (font.italic) k += '|i';
  if (font.underline) k += '|u';
  if (font.strike) k += '|s';
  if (font.color && font.color.rgb) k += '|c' + font.color.rgb;
  return k;
}

function _styleKeyFill(fill) {
  if (!fill || !fill.patternType || fill.patternType === 'none') return '__none__';
  var k = fill.patternType;
  if (fill.fgColor && fill.fgColor.rgb) k += '|fg' + fill.fgColor.rgb;
  if (fill.bgColor && fill.bgColor.rgb) k += '|bg' + fill.bgColor.rgb;
  return k;
}

function _styleKeyBorder(b) {
  var k = '';
  var sides = ['top', 'bottom', 'left', 'right', 'diagonal'];
  for (var i = 0; i < sides.length; i++) {
    var side = b[sides[i]];
    k += (side && side.style && side.style !== 'none') ? side.style : '-';
    if (side && side.color && side.color.rgb) k += side.color.rgb;
  }
  return k;
}

function _styleKeyAlignment(a) {
  var k = (a.horizontal||'-') + '|' + (a.vertical||'-');
  if (a.wrapText) k += '|w';
  if (a.textRotation) k += '|r' + a.textRotation;
  return k;
}

function _buildStyleTables(sheets, XLSX) {
  var fontKeys = [], fontList = [];
  var fillKeys = [], fillList = [];
  var borderKeys = [], borderList = [];
  var alignKeys = [], alignList = [];
  var numFmtKeys = [], numFmtList = [];
  var cellXfKeys = [], cellXfList = [];

  // Add defaults
  fontKeys.push('__default__');
  fontList.push({ sz: '11', name: 'Calibri', color: { rgb: 'FF000000', theme: 1 } });

  fillKeys.push('__none__');
  fillList.push(null);

  fillKeys.push('__gray125__');
  fillList.push({ patternType: 'gray125' });

  borderKeys.push('__none__');
  borderList.push(null);

  alignKeys.push('__none__');
  alignList.push(null);

  numFmtKeys.push('General');
  numFmtList.push(0);

  // Default cellXf
  cellXfKeys.push('0|0|0|0|0');
  cellXfList.push({ numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 });

  function _lookup(list, keys, key, val) {
    if (val == null) return 0;
    var idx = keys.indexOf(key);
    if (idx >= 0) return idx;
    list.push(val);
    keys.push(key);
    return list.length - 1;
  }

  for (var si = 0; si < sheets.length; si++) {
    var ws = sheets[si];
    var ref = ws['!ref'];
    if (!ref) continue;
    var range = XLSX.utils.decode_range(ref);
    for (var r = range.s.r; r <= range.e.r; r++) {
      for (var c = range.s.c; c <= range.e.c; c++) {
        var addr = XLSX.utils.encode_cell({ r: r, c: c });
        var cell = ws[addr];
        if (!cell || !cell.s) continue;

        var s = cell.s;

        // Font — XLSX fonts are self-contained (no inheritance), so merge with default
        var fontId = 0;
        if (s.font) {
          var mergedFont = {};
          var defaultFont = fontList[0];
          for (var _dfk in defaultFont) { if (defaultFont.hasOwnProperty(_dfk)) mergedFont[_dfk] = defaultFont[_dfk]; }
          for (var _sfk in s.font) { if (s.font.hasOwnProperty(_sfk)) mergedFont[_sfk] = s.font[_sfk]; }
          fontId = _lookup(fontList, fontKeys, _styleKeyFont(mergedFont), mergedFont);
        }

        // Fill
        var fillId = 0;
        if (s.fill && s.fill.patternType && s.fill.patternType !== 'none') {
          fillId = _lookup(fillList, fillKeys, _styleKeyFill(s.fill), s.fill);
        }

        // Border
        var borderId = 0;
        if (s.border) {
          borderId = _lookup(borderList, borderKeys, _styleKeyBorder(s.border), s.border);
        }

        // Alignment
        var alignId = 0;
        if (s.alignment) {
          alignId = _lookup(alignList, alignKeys, _styleKeyAlignment(s.alignment), s.alignment);
        }

        // Number format
        var numFmtId = 0;
        if (s.numFmt && s.numFmt !== 'General') {
          numFmtId = _lookup(numFmtList, numFmtKeys, s.numFmt, s.numFmt);
          // Custom formats must use IDs >= 164 (0-163 are built-in)
          numFmtId = 163 + numFmtId;
        }

        // CellXf
        var xfKey = numFmtId + '|' + fontId + '|' + fillId + '|' + borderId + '|' + alignId;
        var xfId = _lookup(cellXfList, cellXfKeys, xfKey, {
          numFmtId: numFmtId,
          fontId: fontId,
          fillId: fillId,
          borderId: borderId,
          xfId: 0,
          alignId: alignId,
          applyNumberFormat: numFmtId > 0 ? 1 : 0,
          applyFont: fontId > 0 ? 1 : 0,
          applyFill: fillId > 0 ? 1 : 0,
          applyBorder: borderId > 0 ? 1 : 0,
          applyAlignment: alignId > 0 ? 1 : 0
        });

        // Set the numeric style ID on the cell (replaces the style object)
        cell.styleId = xfId;
        cell.alignId = alignId;
      }
    }
  }

  return {
    fonts: fontList,
    fills: fillList,
    borders: borderList,
    alignments: alignList,
    numFmts: numFmtList,
    cellXfs: cellXfList,
    cellXfKeys: cellXfKeys
  };
}

// --- XML generators ---

function _genStylesXML(tables) {
  var o = [];

  // Number formats
  o.push('<numFmts count="' + (tables.numFmts.length - 1) + '">');
  for (var i = 0; i < tables.numFmts.length; i++) {
    if (i === 0) continue; // skip "General"
    o.push('<numFmt numFmtId="' + (163 + i) + '" formatCode="' + _xmlEscape(tables.numFmts[i]) + '"/>');
  }
  o.push('</numFmts>');

  // Fonts
  o.push('<fonts count="' + tables.fonts.length + '">');
  for (var fi = 0; fi < tables.fonts.length; fi++) {
    var f = tables.fonts[fi];
    o.push('<font>');
    if (f.bold) o.push('<b/>');
    if (f.italic) o.push('<i/>');
    if (f.underline) o.push('<u/>');
    if (f.strike) o.push('<strike/>');
    if (f.sz) o.push('<sz val="' + f.sz + '"/>');
    if (f.color) {
      if (f.color.rgb) o.push('<color rgb="' + f.color.rgb + '"/>');
      else if (f.color.theme) o.push('<color theme="' + f.color.theme + '"/>');
    }
    if (f.name) o.push('<name val="' + _xmlEscape(f.name) + '"/>');
    o.push('</font>');
  }
  o.push('</fonts>');

  // Fills
  o.push('<fills count="' + tables.fills.length + '">');
  for (var fli = 0; fli < tables.fills.length; fli++) {
    var fill = tables.fills[fli];
    if (!fill || fill.patternType === 'gray125') {
      o.push('<fill><patternFill patternType="' + (fill ? fill.patternType : 'none') + '"/></fill>');
    } else {
      o.push('<fill><patternFill patternType="' + fill.patternType + '">');
      if (fill.fgColor && fill.fgColor.rgb) o.push('<fgColor rgb="' + fill.fgColor.rgb + '"/>');
      if (fill.bgColor && fill.bgColor.rgb) o.push('<bgColor rgb="' + fill.bgColor.rgb + '"/>');
      o.push('</patternFill></fill>');
    }
  }
  o.push('</fills>');

  // Borders
  o.push('<borders count="' + tables.borders.length + '">');
  for (var bi = 0; bi < tables.borders.length; bi++) {
    var b = tables.borders[bi];
    o.push('<border>');
    var sides = ['left', 'right', 'top', 'bottom', 'diagonal'];
    for (var si = 0; si < sides.length; si++) {
      var side = (b && b[sides[si]]) || {};
      var tag = '<' + sides[si];
      if (side.style && side.style !== 'none') {
        tag += ' style="' + side.style + '"';
        if (side.color && side.color.rgb) tag += '><color rgb="' + side.color.rgb + '"/></' + sides[si] + '>';
        else tag += '/>';
      } else {
        tag += '/>';
      }
      o.push(tag);
    }
    o.push('</border>');
  }
  o.push('</borders>');

  // CellXfs
  o.push('<cellXfs count="' + tables.cellXfs.length + '">');
  for (var ci = 0; ci < tables.cellXfs.length; ci++) {
    var xf = tables.cellXfs[ci];
    if (xf.applyAlignment && xf.alignId > 0 && tables.alignments[xf.alignId]) {
      var al = tables.alignments[xf.alignId];
      o.push('<xf numFmtId="' + xf.numFmtId + '" fontId="' + xf.fontId + '" fillId="' + xf.fillId + '" borderId="' + xf.borderId + '" xfId="' + (xf.xfId || 0) + '"');
      if (xf.applyNumberFormat) { o.push(' applyNumberFormat="1"'); }
      if (xf.applyFont) { o.push(' applyFont="1"'); }
      if (xf.applyFill) { o.push(' applyFill="1"'); }
      if (xf.applyBorder) { o.push(' applyBorder="1"'); }
      o.push(' applyAlignment="1">');
      o.push('<alignment');
      if (al.horizontal) o.push(' horizontal="' + al.horizontal + '"');
      if (al.vertical) o.push(' vertical="' + al.vertical + '"');
      if (al.wrapText) o.push(' wrapText="1"');
      if (al.textRotation) o.push(' textRotation="' + al.textRotation + '"');
      o.push('/></xf>');
    } else {
      o.push('<xf numFmtId="' + xf.numFmtId + '" fontId="' + xf.fontId + '" fillId="' + xf.fillId + '" borderId="' + xf.borderId + '" xfId="' + (xf.xfId || 0) + '"');
      if (xf.applyNumberFormat) { o.push(' applyNumberFormat="1"'); }
      if (xf.applyFont) { o.push(' applyFont="1"'); }
      if (xf.applyFill) { o.push(' applyFill="1"'); }
      if (xf.applyBorder) { o.push(' applyBorder="1"'); }
      o.push('/>');
    }
  }
  o.push('</cellXfs>');

  // Cell styles
  o.push('<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>');
  o.push('<dxfs count="0"/>');
  o.push('<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>');

  return o.join('');
}

function _genSheetXML(ws, XLSX) {
  var o = [];
  o.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  o.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');

  // Sheet views
  o.push('<sheetViews><sheetView workbookViewId="0" tabSelected="1"/></sheetViews>');
  o.push('<sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"/>');

  // Columns
  if (ws['!cols'] && ws['!cols'].length > 0) {
    o.push('<cols>');
    for (var ci = 0; ci < ws['!cols'].length; ci++) {
      var col = ws['!cols'][ci];
      if (!col) continue;
      o.push('<col min="' + (ci + 1) + '" max="' + (ci + 1) + '" width="' + (col.wch || Math.round((col.wpx || 80) / 7)) + '" customWidth="1"/>');
    }
    o.push('</cols>');
  }

  // Sheet data
  o.push('<sheetData>');

  var ref = ws['!ref'];
  if (ref) {
    var range = XLSX.utils.decode_range(ref);
    for (var r = range.s.r; r <= range.e.r; r++) {
      o.push('<row r="' + (r + 1) + '">');
      for (var c = range.s.c; c <= range.e.c; c++) {
        var addr = XLSX.utils.encode_cell({ r: r, c: c });
        var cell = ws[addr];
        if (!cell) continue;

        var refStr = XLSX.utils.encode_cell({ r: r, c: c });
        var attrs = ' r="' + refStr + '"';

        // Style
        if (cell.styleId != null && cell.styleId > 0) {
          attrs += ' s="' + cell.styleId + '"';
        }

        // Type
        var type = '';
        var value = '';
        var formula = '';

        if (cell.f) {
          formula = '<f>' + _xmlEscape(cell.f) + '</f>';
        }

        if (cell.v === undefined || cell.v === null || cell.v === '') {
          // Empty or formula-only cell
          if (!formula) {
            // Style-only cell (e.g., borders on empty cell) — still export
            if (cell.styleId != null && cell.styleId > 0) {
              o.push('<c' + attrs + '/>');
            }
            continue;
          }
          // For formula cells with values
          if (cell.v !== undefined && cell.v !== null) {
            type = 'n';
            value = '<v>' + cell.v + '</v>';
          }
        } else if (typeof cell.v === 'number') {
          type = 'n';
          value = '<v>' + cell.v + '</v>';
        } else if (typeof cell.v === 'boolean') {
          type = 'b';
          value = '<v>' + (cell.v ? '1' : '0') + '</v>';
        } else {
          type = 'inlineStr';
          value = '<is><t>' + _xmlEscape(String(cell.v)) + '</t></is>';
        }

        if (type) attrs += ' t="' + type + '"';

        o.push('<c' + attrs + '>' + formula + value + '</c>');
      }
      o.push('</row>');
    }
  }

  o.push('</sheetData>');

  // Merged cells
  if (ws['!merges'] && ws['!merges'].length > 0) {
    o.push('<mergeCells count="' + ws['!merges'].length + '">');
    for (var mi = 0; mi < ws['!merges'].length; mi++) {
      var m = ws['!merges'][mi];
      o.push('<mergeCell ref="' + XLSX.utils.encode_range(m) + '"/>');
    }
    o.push('</mergeCells>');
  }

  o.push('<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>');
  o.push('</worksheet>');

  return o.join('');
}

// --- ZIP builder (pure binary) ---

function _crc32(bytes, start, end) {
  start = start || 0;
  end = end != null ? end : bytes.length;
  var crc = -1;
  for (var i = start; i < end; i++) {
    crc = (crc >>> 8) ^ _crc32Table[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

var _crc32Table = (function () {
  var t = new Array(256);
  for (var i = 0; i < 256; i++) {
    var c = i;
    for (var j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c;
  }
  return t;
})();

function _setU32(buf, offset, n) {
  buf[offset]     = n & 0xFF;
  buf[offset + 1] = (n >>> 8) & 0xFF;
  buf[offset + 2] = (n >>> 16) & 0xFF;
  buf[offset + 3] = (n >>> 24) & 0xFF;
}

function _setU16(buf, offset, n) {
  buf[offset]     = n & 0xFF;
  buf[offset + 1] = (n >>> 8) & 0xFF;
}

function _utf8Len(str) {
  var len = 0;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) len += 1;
    else if (c < 0x800) len += 2;
    else if (c < 0xD800 || c >= 0xE000) len += 3;
    else { i++; len += 4; }
  }
  return len;
}

function _encodeUTF8(str, buf, offset) {
  var pos = offset;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) {
      buf[pos++] = c;
    } else if (c < 0x800) {
      buf[pos++] = 0xC0 | (c >>> 6);
      buf[pos++] = 0x80 | (c & 0x3F);
    } else if (c < 0xD800 || c >= 0xE000) {
      buf[pos++] = 0xE0 | (c >>> 12);
      buf[pos++] = 0x80 | ((c >>> 6) & 0x3F);
      buf[pos++] = 0x80 | (c & 0x3F);
    } else {
      i++;
      c = 0x10000 + (((c & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF));
      buf[pos++] = 0xF0 | (c >>> 18);
      buf[pos++] = 0x80 | ((c >>> 12) & 0x3F);
      buf[pos++] = 0x80 | ((c >>> 6) & 0x3F);
      buf[pos++] = 0x80 | (c & 0x3F);
    }
  }
  return pos - offset;
}

function _strToU8(str) {
  var len = _utf8Len(str);
  var buf = new Uint8Array(len);
  _encodeUTF8(str, buf, 0);
  return buf;
}

function _buildZIP(files) {
  var count = files.length;
  var locals = new Array(count);
  var centrals = new Array(count);
  var localOffsets = new Array(count);

  // First pass: calculate sizes
  var offset = 0;
  for (var i = 0; i < count; i++) {
    var nameU8 = _strToU8(files[i].name);
    var dataU8 = (typeof files[i].data === 'string') ? _strToU8(files[i].data) : files[i].data;
    var nameLen = nameU8.length;
    var dataLen = dataU8.length;
    var crc = _crc32(dataU8);

    var lh = new Uint8Array(30 + nameLen);
    _setU32(lh, 0, 0x04034b50);
    _setU16(lh, 4, 20);
    _setU16(lh, 6, 0);
    _setU16(lh, 8, 0);
    _setU16(lh, 10, 0);
    _setU16(lh, 12, 0);
    _setU32(lh, 14, crc);
    _setU32(lh, 18, dataLen);
    _setU32(lh, 22, dataLen);
    _setU16(lh, 26, nameLen);
    _setU16(lh, 28, 0);
    lh.set(nameU8, 30);

    localOffsets[i] = offset;
    locals[i] = { header: lh, data: dataU8 };
    offset += 30 + nameLen + dataLen;

    var cd = new Uint8Array(46 + nameLen);
    _setU32(cd, 0, 0x02014b50);
    _setU16(cd, 4, 20);
    _setU16(cd, 6, 20);
    _setU16(cd, 8, 0);
    _setU16(cd, 10, 0);
    _setU16(cd, 12, 0);
    _setU16(cd, 14, 0);
    _setU32(cd, 16, crc);
    _setU32(cd, 20, dataLen);
    _setU32(cd, 24, dataLen);
    _setU16(cd, 28, nameLen);
    _setU16(cd, 30, 0);
    _setU16(cd, 32, 0);
    _setU16(cd, 34, 0);
    _setU16(cd, 36, 0);
    _setU32(cd, 38, 0);
    _setU32(cd, 42, localOffsets[i]);
    cd.set(nameU8, 46);
    centrals[i] = cd;
  }

  // Concatenate everything
  var parts = [];
  var totalLen = 0;
  for (var i = 0; i < count; i++) {
    parts.push(locals[i].header, locals[i].data);
    totalLen += locals[i].header.length + locals[i].data.length;
  }

  var centralStart = totalLen;
  var centralLen = 0;
  for (var i = 0; i < count; i++) {
    parts.push(centrals[i]);
    totalLen += centrals[i].length;
    centralLen += centrals[i].length;
  }

  var eocd = new Uint8Array(22);
  _setU32(eocd, 0, 0x06054b50);
  _setU16(eocd, 4, 0);
  _setU16(eocd, 6, 0);
  _setU16(eocd, 8, count);
  _setU16(eocd, 10, count);
  _setU32(eocd, 12, centralLen);
  _setU32(eocd, 16, centralStart);
  _setU16(eocd, 20, 0);
  parts.push(eocd);

  return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// --- Module-level helpers (used by _buildXLSXBlob) / 模块级辅助函数 ---