import { GRID } from '../../../config/theme.js?v=2';

export const RenderingFrozenMixin = {
  /**
   * Return frozen cell rendering attributes.
   * @param {boolean} isFrozenRow
   * @param {boolean} isFrozenCol
   * @param {number} frozenRowTop - top offset in px
   * @param {number} colLeft - left offset in px
   * @returns {{ cls: string, dataAttrs: string, style: string }}
   */
  _frozenCellAttrs(isFrozenRow, isFrozenCol, frozenRowTop, colLeft) {
    if (!isFrozenRow && !isFrozenCol) { return { cls: '', dataAttrs: '', style: '' }; }
    var cls, style;
    if (isFrozenRow && isFrozenCol) {
      cls = ' excelabu-cell-frozen-both';
      style = 'position:sticky;top:' + frozenRowTop + 'px;left:' + colLeft + 'px;';
    } else if (isFrozenRow) {
      cls = ' excelabu-cell-frozen-row';
      style = 'position:sticky;top:' + frozenRowTop + 'px;';
    } else {
      cls = ' excelabu-cell-frozen-col';
      style = 'position:sticky;left:' + colLeft + 'px;';
    }
    return { cls: cls, dataAttrs: ' data-frozen="true" data-frozen-top="' + frozenRowTop + '" data-frozen-left="' + colLeft + '"', style: style };
  },

  /**
   * Frozen cells use native CSS position:sticky in the table.
   * No cloning is needed — the overlay is just cleaned up.
   */
  _syncFrozenOverlay() {
    var overlays = ['_frozenBothOverlay', '_frozenColOverlay', '_frozenRowOverlay'];
    for (var oi = 0; oi < overlays.length; oi++) {
      if (this[overlays[oi]]) this[overlays[oi]].style.display = 'none';
    }
  },

  _updateFrozenOverlayTransforms() {
    var sl = this.gridScroll.scrollLeft;
    var st = this.gridScroll.scrollTop;
    if (this._frozenBothOverlay && this._frozenBothOverlay.style.display !== 'none') {
      var tx = (this._frozenCol != null) ? sl : 0;
      var ty = (this._frozenRow != null) ? st : 0;
      this._frozenBothOverlay.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    }
    if (this._frozenColOverlay && this._frozenColOverlay.style.display !== 'none') {
      this._frozenColOverlay.style.transform = 'translate(' + sl + 'px, 0px)';
    }
    if (this._frozenRowOverlay && this._frozenRowOverlay.style.display !== 'none') {
      this._frozenRowOverlay.style.transform = 'translate(0px, ' + st + 'px)';
    }
  }
};