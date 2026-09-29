import { Utils } from '../utils.js?v=3';

export const OperationsFreezeMixin = {
  _freezeColumns() {
    var sel = this.selection;
    if (!sel) return;
    this._frozenCol = sel.c2 + 1;
    var btn = this.container.querySelector('[data-action="freezeMenu"]');
    if (btn) { btn.classList.add('active'); }
    this._updateFreezeMenuState();
    this._renderGrid();
    this._updateSelectionDisplay();
    this._setStatus(this._t('freezeColumns') + ': ' + Utils.colToLetter(sel.c1) + ' - ' + Utils.colToLetter(sel.c2));
  },

  _freezeRows() {
    var sel = this.selection;
    if (!sel) return;
    this._frozenRow = sel.r2 + 1;
    var btn = this.container.querySelector('[data-action="freezeMenu"]');
    if (btn) { btn.classList.add('active'); }
    this._updateFreezeMenuState();
    this._renderGrid();
    this._updateSelectionDisplay();
    this._setStatus(this._t('freezeRows') + ': ' + (sel.r1 + 1) + ' - ' + (sel.r2 + 1));
  },

  _unfreezePanes() {
    if (!this._frozenRow && !this._frozenCol) return;
    this._frozenRow = null;
    this._frozenCol = null;
    var btn = this.container.querySelector('[data-action="freezeMenu"]');
    if (btn) { btn.classList.remove('active'); }
    this._updateFreezeMenuState();
    this._renderGrid();
    this._updateSelectionDisplay();
    this._setStatus(this._t('unfreezePanes'));
  }
};