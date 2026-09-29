import { FONT_LIST, FONT_SIZES, DEFAULT_FONT_SIZE } from '../../../config/fonts.js?v=1';
import { DEFAULT_COLORS } from '../../../config/theme.js?v=2';
import { PRINT, LOCALE } from '../../../config/constants.js?v=1';
import { I18N } from '../i18n.js?v=3';

export const CoreInitMixin = {
  _t(key) { return I18N.t(key); },

  _setStatus(msg) {
    if (this.statusBar) this.statusBar.textContent = msg;
  },

  _init() {
    this._printMarginPresets = PRINT.MARGIN_PRESETS;
    this._printMarginPreset = 'normal';
    this._showPrintArea = false;

    try {
      var savedLang = localStorage.getItem(LOCALE.STORAGE_KEY);
      if (savedLang === 'zh' || savedLang === 'en') I18N.setLang(savedLang);
    } catch(e) {}

    this._buildDOM();
    this._bindEvents();
    this.addSheet(this.options.sheetName);
    this._renderAll();
    this._selectCell(0, 0);
  },
};