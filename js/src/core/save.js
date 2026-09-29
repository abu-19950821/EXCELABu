import { LOCALE } from '../../../config/constants.js?v=1';
import { I18N } from '../i18n.js?v=3';

export const CoreSaveMixin = {
  _toggleLang() {
    var next = I18N.getLang() === 'zh' ? 'en' : 'zh';
    I18N.setLang(next);
    try { localStorage.setItem(LOCALE.STORAGE_KEY, next); } catch(e) {}
    location.reload();
  },

  _onSave() {
    if (typeof this._saveCallback === 'function') {
      this._saveWithCallback();
    }
  },

  onSave(callback) {
    this._saveCallback = callback;
  },

  async _saveWithCallback() {
    const { ensureXLSX, getXLSX } = await import('../xlsx.js?v=2');
    await ensureXLSX();
    var wb = this._buildWorkbook();
    var blob;
    try {
      blob = this._buildXLSXBlob(wb);
    } catch (e) {
      console.error('Custom XLSX blob failed, using basic export:', e);
      var XLSX = getXLSX();
      var arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    var allData = {};
    for (var i = 0; i < this.sheets.length; i++) {
      var s = this.sheets[i];
      allData[s.name] = this._readSheetData(s);
    }
    this._saveCallback(blob, allData, this);
  },

  _readSheetData(sheet) {
    if (!sheet) return [];

    var cfg = sheet._bindConfig;

    if (cfg && cfg.columns && !cfg.hasGroups) {
      var result = [];
      var cols = cfg.columns;
      var stride = cfg.stride || 1;
      var startRow = cfg.dataStartRow || 0;
      var startCol = cfg.startCol || 0;
      var colOffsets = cfg.colOffsets;

      var maxRow = -1;
      var dataKeys = Object.keys(sheet._data);
      for (var k = 0; k < dataKeys.length; k++) {
        var parts = dataKeys[k].split(',');
        var rr = parseInt(parts[0], 10);
        if (rr >= startRow && rr > maxRow) maxRow = rr;
      }
      if (maxRow < startRow) return [];

      var itemCount = Math.floor((maxRow - startRow) / stride) + 1;

      for (var i = 0; i < itemCount; i++) {
        var dataRow = startRow + i * stride;
        var obj = {};
        var hasAnyValue = false;
        for (var ci = 0; ci < cols.length; ci++) {
          var col = cols[ci];
          if (!col.key) continue;
          var dc = (col.col != null) ? startCol + Number(col.col) : startCol + (colOffsets ? colOffsets[ci] : ci);
          var cellKey = dataRow + ',' + dc;
          var cellData = sheet._data[cellKey];
          if (cellData) {
            obj[col.key] = cellData.value;
            hasAnyValue = true;
          } else {
            obj[col.key] = null;
          }
        }
        if (hasAnyValue) {
          result.push(obj);
        }
      }
      return result;
    }

    if (cfg && cfg.columns && cfg.hasGroups) {
      var result = [];
      var cols = cfg.columns;
      var startRow = cfg.dataStartRow || 0;
      var startCol = cfg.startCol || 0;
      var colOffsets = cfg.colOffsets;

      var maxRow = -1;
      var dataKeys = Object.keys(sheet._data);
      for (var k = 0; k < dataKeys.length; k++) {
        var parts = dataKeys[k].split(',');
        var rr = parseInt(parts[0], 10);
        if (rr >= startRow && rr > maxRow) maxRow = rr;
      }
      if (maxRow < startRow) return [];

      var groupCols = [];
      var childCols = [];
      for (var ci = 0; ci < cols.length; ci++) {
        if (cols[ci].group) {
          groupCols.push(cols[ci]);
        } else {
          childCols.push(cols[ci]);
        }
      }

      function _colOffset(col) {
        var idx = cols.indexOf(col);
        if (col.col != null) return startCol + Number(col.col);
        return startCol + (colOffsets ? colOffsets[idx] : idx);
      }

      var currentRow = startRow;
      while (currentRow <= maxRow) {
        var groupObj = { items: [] };
        var hasGroup = false;

        for (var gi = 0; gi < groupCols.length; gi++) {
          var gCol = groupCols[gi];
          var gc = _colOffset(gCol);
          var gData = sheet._data[currentRow + ',' + gc];
          if (gData && gData.value != null) {
            groupObj[gCol.key] = gData.value;
            hasGroup = true;
          }
        }

        if (!hasGroup) {
          currentRow++;
          continue;
        }

        var childEndRow = maxRow + 1;
        for (var cr = currentRow + 1; cr <= maxRow; cr++) {
          var isGroup = false;
          for (var ggi = 0; ggi < groupCols.length; ggi++) {
            var ggCol = groupCols[ggi];
            var ggc = _colOffset(ggCol);
            var ggData = sheet._data[cr + ',' + ggc];
            if (ggData && ggData.value != null) {
              isGroup = true;
              break;
            }
          }
          if (isGroup) {
            childEndRow = cr;
            break;
          }
        }

        for (var cr = currentRow + 1; cr < childEndRow; cr++) {
          var childObj = {};
          var hasChild = false;
          for (var chi = 0; chi < childCols.length; chi++) {
            var chCol = childCols[chi];
            var chc = _colOffset(chCol);
            var chData = sheet._data[cr + ',' + chc];
            if (chData) {
              childObj[chCol.key] = chData.value;
              hasChild = true;
            }
          }
          if (hasChild) {
            groupObj.items.push(childObj);
          }
        }

        result.push(groupObj);
        currentRow = childEndRow;
      }
      return result;
    }

    var minR = Infinity, maxR2 = -1, minC = Infinity, maxC = -1;
    var dataKeys = Object.keys(sheet._data);
    for (var k = 0; k < dataKeys.length; k++) {
      var parts = dataKeys[k].split(',');
      var dr = parseInt(parts[0], 10);
      var dc = parseInt(parts[1], 10);
      if (dr < minR) minR = dr;
      if (dr > maxR2) maxR2 = dr;
      if (dc < minC) minC = dc;
      if (dc > maxC) maxC = dc;
    }
    if (maxR2 < minR) return [];

    var aoa = [];
    for (var r = minR; r <= maxR2; r++) {
      var row = [];
      for (var c = minC; c <= maxC; c++) {
        var cellKey = r + ',' + c;
        var cellData = sheet._data[cellKey];
        row.push(cellData ? (cellData.value !== undefined ? cellData.value : cellData.display) : null);
      }
      aoa.push(row);
    }
    return aoa;
  }
};