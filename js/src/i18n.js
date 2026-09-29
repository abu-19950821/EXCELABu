import { I18N_MAP, LOCALE } from '../../config/index.js?v=3';

export const I18N = {
  _lang: LOCALE.DEFAULT_LANG,

  setLang(lang) { this._lang = lang; },
  getLang() { return this._lang; },

  t(key) {
    var lang = this._lang;
    if (!I18N_MAP[lang] || !I18N_MAP[lang][key]) {
      if (I18N_MAP['en'] && I18N_MAP['en'][key]) return I18N_MAP['en'][key];
      return key;
    }
    return I18N_MAP[lang][key];
  }
};

export var t = I18N.t.bind(I18N);
export var setLang = I18N.setLang.bind(I18N);
export var getLang = I18N.getLang.bind(I18N);