import { DEFAULT_COLORS } from '../../../config/theme.js?v=2';

export const OperationsShareMixin = {
  /** Cache toolbar DOM references after first render */
  _toolbarEls: null,

  _getToolbarEls() {
    if (this._toolbarEls) return this._toolbarEls;
    var c = this.container;
    this._toolbarEls = {
      boldBtn: c.querySelector('[data-action="bold"]'),
      italicBtn: c.querySelector('[data-action="italic"]'),
      underlineBtn: c.querySelector('[data-action="underline"]'),
      wrapBtn: c.querySelector('[data-action="wrapText"]'),
      fontNameSel: c.querySelector('[data-action="fontName"]'),
      fontSizeSel: c.querySelector('[data-action="fontSize"]'),
      fontColorInput: c.querySelector('[data-action="fontColor"]'),
      bgColorInput: c.querySelector('[data-action="bgColor"]'),
      alignLeft: c.querySelector('[data-action="alignLeft"]'),
      alignCenter: c.querySelector('[data-action="alignCenter"]'),
      alignRight: c.querySelector('[data-action="alignRight"]'),
      alignTop: c.querySelector('[data-action="alignTop"]'),
      alignMiddle: c.querySelector('[data-action="alignMiddle"]'),
      alignBottom: c.querySelector('[data-action="alignBottom"]')
    };
    return this._toolbarEls;
  },

  _getSelectedCells() {
    var cells = [];
    var sel = this.selection;
    if (!sel) return cells;
    for (var r = sel.r1; r <= sel.r2; r++) {
      for (var c = sel.c1; c <= sel.c2; c++) { cells.push({ r: r, c: c }); }
    }
    if (this.extraSelections) {
      for (var i = 0; i < this.extraSelections.length; i++) {
        var es = this.extraSelections[i];
        for (var er = es.r1; er <= es.r2; er++) {
          for (var ec = es.c1; ec <= es.c2; ec++) { cells.push({ r: er, c: ec }); }
        }
      }
    }
    return cells;
  },

  _ensureCell(r, c) {
    var sheet = this.activeSheet;
    var key = sheet._key(r, c);
    if (!sheet._data[key]) { sheet._data[key] = { value: '', _style: {} }; }
    if (!sheet._data[key]._style) { sheet._data[key]._style = {}; }
  },

  _applyStyle(patch) {
    var cells = this._getSelectedCells();
    if (cells.length === 0) return;
    this._pushUndo();
    var sheet = this.activeSheet;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      this._ensureCell(r, c);
      var style = sheet._data[sheet._key(r, c)]._style;
      for (var k in patch) {
        if (patch.hasOwnProperty(k)) {
          if (patch[k] === null || patch[k] === undefined) { delete style[k]; }
          else { style[k] = patch[k]; }
        }
      }
    }
    if (cells.length <= 20) {
      for (var i = 0; i < cells.length; i++) { this._renderCell(cells[i].r, cells[i].c); }
    } else { this._renderGrid(); }
    this._updateSelectionDisplay();
    this._updateToolbarState();
  },

  _updateToolbarState() {
    var cell = null;
    var sheet = this.activeSheet;
    if (this.activeCell) { cell = sheet.getCell(this.activeCell.r, this.activeCell.c); }
    var style = (cell && cell._style) || {};
    var els = this._getToolbarEls();
    if (els.boldBtn) els.boldBtn.classList.toggle('active', !!style.bold);
    if (els.italicBtn) els.italicBtn.classList.toggle('active', !!style.italic);
    if (els.underlineBtn) els.underlineBtn.classList.toggle('active', !!style.underline);
    if (els.wrapBtn) els.wrapBtn.classList.toggle('active', !!style.wrapText);
    if (els.fontNameSel && style.fontName) els.fontNameSel.value = style.fontName;
    else if (els.fontNameSel) els.fontNameSel.selectedIndex = 0;
    if (els.fontSizeSel && style.fontSize) els.fontSizeSel.value = String(style.fontSize);
    if (els.fontColorInput) els.fontColorInput.value = style.color || DEFAULT_COLORS.font;
    if (els.bgColorInput) els.bgColorInput.value = style.bgColor || DEFAULT_COLORS.background;
    if (els.alignLeft) els.alignLeft.classList.toggle('active', style.hAlign === 'left');
    if (els.alignCenter) els.alignCenter.classList.toggle('active', style.hAlign === 'center');
    if (els.alignRight) els.alignRight.classList.toggle('active', style.hAlign === 'right');
    if (els.alignTop) els.alignTop.classList.toggle('active', style.vAlign === 'top');
    if (els.alignMiddle) els.alignMiddle.classList.toggle('active', style.vAlign === 'middle');
    if (els.alignBottom) els.alignBottom.classList.toggle('active', style.vAlign === 'bottom');
  }
};