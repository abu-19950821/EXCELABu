export const FreezeMenuMixin = {
  _toggleFreezeMenu() {
    var menu = this.container.querySelector('.excelabu-freeze-menu');
    if (!menu) return;
    var isOpen = menu.style.display === 'block';
    this._closeBorderMenu();
    this._closeSortMenu();
    if (!isOpen) {
      menu.style.display = 'block';
      this._updateFreezeMenuState();
    } else {
      menu.style.display = 'none';
    }
  },

  _closeFreezeMenu() {
    var menu = this.container.querySelector('.excelabu-freeze-menu');
    if (menu) menu.style.display = 'none';
  },

  _updateFreezeMenuState() {
    var menu = this.container.querySelector('.excelabu-freeze-menu');
    if (!menu) return;
    var sheet = this.activeSheet;
    var sel = this.selection;
    var isColFrozen = !!(this._frozenCol);
    var isRowFrozen = !!(this._frozenRow);
    var freezeColItem = menu.querySelector('[data-action=\"freezeColumns\"]');
    var freezeRowItem = menu.querySelector('[data-action=\"freezeRows\"]');
    var unfreezeItem = menu.querySelector('[data-action=\"unfreezePanes\"]');
    var isFullColSel = sel && sel.r1 === 0 && sel.r2 === sheet.rowCount - 1 && !(sel.c1 === 0 && sel.c2 === sheet.colCount - 1);
    var isFullRowSel = sel && sel.c1 === 0 && sel.c2 === sheet.colCount - 1 && !(sel.r1 === 0 && sel.r2 === sheet.rowCount - 1);
    if (freezeColItem) freezeColItem.classList.toggle('disabled', !isFullColSel);
    if (freezeRowItem) freezeRowItem.classList.toggle('disabled', !isFullRowSel);
    if (unfreezeItem) unfreezeItem.classList.toggle('disabled', !(isColFrozen || isRowFrozen));
  },
};
