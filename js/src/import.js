import { ensureXLSX, getXLSX } from './xlsx.js?v=2';
import { Sheet } from './sheet.js?v=8';
import { IMPORT } from '../../config/constants.js?v=1';
import { _buildStyleTables, _genStylesXML, _genSheetXML, _buildZIP, _xmlEscape, _exportStyle, _buildCellWithStyle } from './xlsx_export.js?v=1';

export const ImportMixin = {

  async importFile() {
    await ensureXLSX();
    const XLSX = getXLSX();

    if (!this._fileInput) {
      this._fileInput = document.createElement('input');
      this._fileInput.type = 'file';
      this._fileInput.name = 'excelabu-file-input';
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
   * @param {Object} [opts] - 可选配�?
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
   * Does NOT trigger download �?caller decides what to do with the Blob. / 不触发浏览器下载
   * @param {Object} wb  SheetJS workbook object (from _buildWorkbook) / �?_buildWorkbook 构建
   * @returns {Blob}     XLSX file as a Blob (ready for download or upload) / 可用于下载或上传
   */
  _buildXLSXBlob(wb) {
    var XLSX = getXLSX();

    // Step 1: Build style tables from all sheets / 第一步：构建样式�?
    var sheets = [];
    for (var si = 0; si < wb.SheetNames.length; si++) {
      sheets.push(wb.Sheets[wb.SheetNames[si]]);
    }
    var tables = _buildStyleTables(sheets, XLSX);

    // Step 2: Collect unique shared strings / 第二步：收集共享字符�?
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

      // 导入列宽 �?MDW=7 重算 + 5% 视觉补偿�?
      // SheetJS MDW=6 �?对整数宽度列无法修正 �?wpx 偏小 ~14%�?
      // �?colInfo.width(原始 OOXML 宽度) + MDW=7 可精确还原�?
      // �?5% 补偿浏览器渲染差�?box-model/字体渲染/抗锯�?�?
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
            // Fallback: 1ch �?7px at 96dpi for Calibri 11pt
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

      // Data and merges were written directly to bypass setCell/mergeCells,
      // so the extent and merge index must be rebuilt explicitly.
      sheet._recalcLastDataExtent();
      sheet._rebuildMergeIndex();

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
        // 将像素转换为点（96dpi�?px = 72/96 pt�?
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