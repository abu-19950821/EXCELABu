export const SortMenuMixin = {
  _toggleSortMenu() {
    var menu = this.container.querySelector('.excelabu-sort-menu');
    if (!menu) return;
    var isOpen = menu.style.display === 'block';
    this._closeBorderMenu();
    menu.style.display = isOpen ? 'none' : 'block';
  },

  _closeSortMenu() {
    var menu = this.container.querySelector('.excelabu-sort-menu');
    if (menu) menu.style.display = 'none';
  },
};
