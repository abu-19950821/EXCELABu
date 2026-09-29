export const BorderMenuMixin = {
  _toggleBorderMenu() {
    var menu = this.container.querySelector('.excelabu-border-menu');
    if (!menu) return;
    var isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
  },

  _closeBorderMenu() {
    var menu = this.container.querySelector('.excelabu-border-menu');
    if (menu) menu.style.display = 'none';
  },
};
