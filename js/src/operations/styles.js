import { DEFAULT_COLORS } from '../../../config/theme.js?v=2';

/**
 * Helper factory: create a toggle method for a boolean style property.
 * Example: this._toggleStyle('bold') → toggles bold on/off for selected cells.
 */
function _makeToggle(prop) {
  return function() {
    var cells = this._getSelectedCells();
    var sheet = this.activeSheet;
    var current = false;
    if (cells.length > 0) {
      var cell = sheet.getCell(cells[0].r, cells[0].c);
      current = !!(cell && cell._style && cell._style[prop]);
    }
    var patch = {};
    patch[prop] = !current;
    this._applyStyle(patch);
  };
}

export const OperationsStylesMixin = {
  _toggleBold: _makeToggle('bold'),
  _toggleItalic: _makeToggle('italic'),
  _toggleUnderline: _makeToggle('underline'),
  _toggleWrapText: _makeToggle('wrapText'),

  _setFontName(name) { if (!name) return; this._applyStyle({ fontName: name }); },

  _setFontSize(size) { this._applyStyle({ fontSize: size }); },

  _setFontColor(color) { this._applyStyle({ color: color === DEFAULT_COLORS.font ? null : color }); },

  _setBgColor(color) { this._applyStyle({ bgColor: color === DEFAULT_COLORS.background || color === '#FFFFFF' ? null : color }); },

  _previewFontColor(color) {
    var cells = this._getSelectedCells();
    var finalColor = color === DEFAULT_COLORS.font ? '' : color;
    var dom = this._cellDOM;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      var el = dom && dom[r + ',' + c];
      if (el) el.style.color = finalColor;
    }
  },

  _previewBgColor(color) {
    var cells = this._getSelectedCells();
    var finalColor = (color === DEFAULT_COLORS.background || color === '#FFFFFF') ? '' : color;
    var dom = this._cellDOM;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      var el = dom && dom[r + ',' + c];
      if (el) el.style.backgroundColor = finalColor;
    }
  },

  _setHAlign(align) { this._applyStyle({ hAlign: align }); },

  _setVAlign(align) { this._applyStyle({ vAlign: align }); },
};