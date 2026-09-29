import { GRID } from '../../../config/theme.js?v=2';

export const OperationsFillHandleMixin = {
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
    var rect = this.gridScroll.getBoundingClientRect();
    var visualX = e.clientX - rect.left;
    var visualY = e.clientY - rect.top;
    var targetR = this._fillSourceR2;
    var targetC = this._fillSourceC2;
    var accumulatedY = GRID.COL_HEADER_HEIGHT;
    var frozenCount = this._frozenRow || 0;
    for (var r = 0; r < frozenCount; r++) {
      var rh = sheet.getRowHeight(r);
      if (visualY >= accumulatedY && visualY < accumulatedY + rh) { targetR = r; break; }
      accumulatedY += rh;
    }
    if (targetR === this._fillSourceR2) {
      accumulatedY = GRID.COL_HEADER_HEIGHT;
      for (var r = 0; r < frozenCount; r++) accumulatedY += sheet.getRowHeight(r);
      accumulatedY -= (this.scrollTop || 0);
      for (var r = frozenCount; r < sheet.rowCount; r++) {
        var rh = sheet.getRowHeight(r);
        if (visualY >= accumulatedY && visualY < accumulatedY + rh) { targetR = r; break; }
        accumulatedY += rh;
      }
    }
    var accumulatedX = GRID.ROW_HEADER_WIDTH;
    var frozenCols = this._frozenCol || 0;
    for (var c = 0; c < frozenCols; c++) {
      var cw = sheet.getColWidth(c);
      if (visualX >= accumulatedX && visualX < accumulatedX + cw) { targetC = c; break; }
      accumulatedX += cw;
    }
    if (targetC === this._fillSourceC2) {
      accumulatedX = GRID.ROW_HEADER_WIDTH;
      for (var c = 0; c < frozenCols; c++) accumulatedX += sheet.getColWidth(c);
      accumulatedX -= (this.scrollLeft || 0);
      for (var c = frozenCols; c < sheet.colCount; c++) {
        var cw = sheet.getColWidth(c);
        if (visualX >= accumulatedX && visualX < accumulatedX + cw) { targetC = c; break; }
        accumulatedX += cw;
      }
    }
    targetR = Math.max(0, Math.min(targetR, sheet.rowCount - 1));
    targetC = Math.max(0, Math.min(targetC, sheet.colCount - 1));
    var r1 = this._fillSourceR1, r2 = this._fillSourceR2;
    var c1 = this._fillSourceC1, c2 = this._fillSourceC2;
    var tgR1, tgR2, tgC1, tgC2;
    if (targetR >= r2 && targetC >= c1 && targetC <= c2) { tgR1 = r2 + 1; tgR2 = targetR; tgC1 = c1; tgC2 = c2; }
    else if (targetR < r1 && targetC >= c1 && targetC <= c2) { tgR1 = targetR; tgR2 = r1 - 1; tgC1 = c1; tgC2 = c2; }
    else if (targetC >= c2 && targetR >= r1 && targetR <= r2) { tgC1 = c2 + 1; tgC2 = targetC; tgR1 = r1; tgR2 = r2; }
    else if (targetC < c1 && targetR >= r1 && targetR <= r2) { tgC1 = targetC; tgC2 = c1 - 1; tgR1 = r1; tgR2 = r2; }
    else {
      var dy = targetR - r2; var dx = targetC - c2;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 0) { tgR1 = r2 + 1; tgR2 = targetR; } else { tgR1 = targetR; tgR2 = r1 - 1; }
        tgC1 = c1; tgC2 = c2;
      } else {
        if (dx > 0) { tgC1 = c2 + 1; tgC2 = targetC; } else { tgC1 = targetC; tgC2 = c1 - 1; }
        tgR1 = r1; tgR2 = r2;
      }
    }
    if (tgR1 < 0) tgR1 = 0; if (tgC1 < 0) tgC1 = 0;
    if (tgR2 >= sheet.rowCount) tgR2 = sheet.rowCount - 1;
    if (tgC2 >= sheet.colCount) tgC2 = sheet.colCount - 1;
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
    var extendSeriesV = false, seriesDiffV = 0, lastSrcValV = null;
    if (isVertical && srcRows >= 2 && !isSingleCell) {
      var allNum = true, fColVals = [];
      for (var sr = srcR1; sr <= srcR2; sr++) {
        var ck = sheet._data[sheet._key(sr, srcC1)];
        var v = ck ? ck.value : null;
        if (typeof v !== 'number' || isNaN(v)) { allNum = false; break; }
        fColVals.push(v);
      }
      if (allNum && fColVals.length >= 2) {
        var d = fColVals[1] - fColVals[0];
        var isArith = true;
        for (var qi = 1; qi < fColVals.length; qi++) { if (fColVals[qi] - fColVals[qi - 1] !== d) { isArith = false; break; } }
        if (isArith) { extendSeriesV = true; seriesDiffV = d; lastSrcValV = fColVals[fColVals.length - 1]; }
      }
    }
    var extendSeriesH = false, seriesDiffH = 0, lastSrcValH = null;
    if (isHorizontal && srcCols >= 2 && !isSingleCell) {
      var allNumH = true, fRowVals = [];
      for (var sc = srcC1; sc <= srcC2; sc++) {
        var ckH = sheet._data[sheet._key(srcR1, sc)];
        var vH = ckH ? ckH.value : null;
        if (typeof vH !== 'number' || isNaN(vH)) { allNumH = false; break; }
        fRowVals.push(vH);
      }
      if (allNumH && fRowVals.length >= 2) {
        var dH = fRowVals[1] - fRowVals[0];
        var isArithH = true;
        for (var qj = 1; qj < fRowVals.length; qj++) { if (fRowVals[qj] - fRowVals[qj - 1] !== dH) { isArithH = false; break; } }
        if (isArithH) { extendSeriesH = true; seriesDiffH = dH; lastSrcValH = fRowVals[fRowVals.length - 1]; }
      }
    }
    for (var r = tgR1; r <= tgR2; r++) {
      for (var c = tgC1; c <= tgC2; c++) {
        var srcR, srcC;
        if (isVertical) { srcR = srcR1 + ((r - tgR1) % srcRows); srcC = c; }
        else if (isHorizontal) { srcR = r; srcC = srcC1 + ((c - tgC1) % srcCols); }
        else { srcR = srcR1 + ((r - tgR1) % srcRows); srcC = srcC1 + ((c - tgC1) % srcCols); }
        var srcCell = sheet._data[sheet._key(srcR, srcC)];
        if (srcCell) {
          var newVal = srcCell.value;
          if (extendSeriesV && c === srcC1) { newVal = lastSrcValV + seriesDiffV * (r - srcR2); }
          else if (extendSeriesH && r === srcR1) { newVal = lastSrcValH + seriesDiffH * (c - srcC2); }
          else if (isSingleCell && typeof srcCell.value === 'number' && !isNaN(srcCell.value)) {
            if (isVertical) newVal = srcCell.value + (r - srcR2);
            else if (isHorizontal) newVal = srcCell.value + (c - srcC2);
          }
          sheet.setCell(r, c, newVal);
          if (srcCell._style) {
            this._ensureCell(r, c);
            var tgtStyle = sheet._data[sheet._key(r, c)]._style;
            for (var k in srcCell._style) { if (srcCell._style.hasOwnProperty(k)) tgtStyle[k] = srcCell._style[k]; }
          }
          this._renderCell(r, c);
        }
      }
    }
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
    overlay.style.zIndex = '15';
    var tgR1 = this._fillTargetR1, tgC1 = this._fillTargetC1;
    var tgR2 = this._fillTargetR2, tgC2 = this._fillTargetC2;
    var firstCell = this._cellDOM ? this._cellDOM[tgR1 + ',' + tgC1] : null;
    var lastCell  = this._cellDOM ? this._cellDOM[tgR2 + ',' + tgC2] : null;
    var scrollWrap = this.gridScroll;
    if (firstCell && lastCell && scrollWrap) {
      var sr = scrollWrap.getBoundingClientRect();
      var r1 = firstCell.getBoundingClientRect();
      var r2 = lastCell.getBoundingClientRect();
      var ox = -sr.left + (this.scrollLeft || 0);
      var oy = -sr.top  + (this.scrollTop  || 0);
      overlay.style.left   = (r1.left + ox) + 'px';
      overlay.style.top    = (r1.top  + oy) + 'px';
      overlay.style.width  = (r2.right  - r1.left) + 'px';
      overlay.style.height = (r2.bottom - r1.top)  + 'px';
      scrollWrap.appendChild(overlay);
      this._fillPreviewOverlay = overlay;
      return;
    }
    var sheet = this.activeSheet;
    var top = GRID.COL_HEADER_HEIGHT, left = GRID.ROW_HEADER_WIDTH;
    for (var r = 0; r < tgR1; r++) top += sheet.getRowHeight(r);
    for (var c = 0; c < tgC1; c++) left += sheet.getColWidth(c);
    var w = 0, h = 0;
    for (var rr = tgR1; rr <= tgR2; rr++) h += sheet.getRowHeight(rr);
    for (var cc = tgC1; cc <= tgC2; cc++) w += sheet.getColWidth(cc);
    var st = this.scrollTop || 0;
    var sl = this.scrollLeft || 0;
    if (!this._frozenRow || tgR1 >= this._frozenRow) top -= st;
    if (!this._frozenCol || tgC1 >= this._frozenCol) left -= sl;
    overlay.style.top = top + 'px';
    overlay.style.left = left + 'px';
    overlay.style.width = w + 'px';
    overlay.style.height = h + 'px';
    if (scrollWrap) scrollWrap.appendChild(overlay);
    this._fillPreviewOverlay = overlay;
  },

  _removeFillPreview() {
    if (this._fillPreviewOverlay) { this._fillPreviewOverlay.remove(); this._fillPreviewOverlay = null; }
  }
};