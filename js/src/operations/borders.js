export const OperationsBordersMixin = {
  _applyBorder(type) {
    var cells = this._getSelectedCells();
    if (cells.length === 0) return;
    this._finishEditing();
    this._pushUndo();
    var sheet = this.activeSheet;
    var r1 = Infinity, c1 = Infinity, r2 = -Infinity, c2 = -Infinity;
    for (var i = 0; i < cells.length; i++) {
      var r = cells[i].r, c = cells[i].c;
      if (r < r1) r1 = r; if (c < c1) c1 = c;
      if (r > r2) r2 = r; if (c > c2) c2 = c;
    }
    var borderStyle = 'thin';
    for (i = 0; i < cells.length; i++) {
      r = cells[i].r; c = cells[i].c;
      this._ensureCell(r, c);
      var st = sheet._data[sheet._key(r, c)]._style;
      delete st.borderTop; delete st.borderBottom; delete st.borderLeft; delete st.borderRight;
    }
    if (type === 'none') { } else if (type === 'thick') { borderStyle = 'thick'; }
    if (type !== 'none') {
      if (type === 'all' || type === 'grid') {
        for (i = 0; i < cells.length; i++) {
          r = cells[i].r; c = cells[i].c;
          st = sheet._data[sheet._key(r, c)]._style;
          st.borderRight = borderStyle;
          st.borderBottom = borderStyle;
          if (c === c1) st.borderLeft = borderStyle;
          if (r === r1) st.borderTop = borderStyle;
        }
      } else if (type === 'outside' || type === 'thick') {
        for (i = 0; i < cells.length; i++) {
          r = cells[i].r; c = cells[i].c;
          st = sheet._data[sheet._key(r, c)]._style;
          if (r === r1) st.borderTop = borderStyle;
          if (r === r2) st.borderBottom = borderStyle;
          if (c === c1) st.borderLeft = borderStyle;
          if (c === c2) st.borderRight = borderStyle;
        }
      } else {
        for (i = 0; i < cells.length; i++) {
          r = cells[i].r; c = cells[i].c;
          st = sheet._data[sheet._key(r, c)]._style;
          if (type === 'top') st.borderTop = borderStyle;
          if (type === 'bottom') st.borderBottom = borderStyle;
          if (type === 'left') st.borderLeft = borderStyle;
          if (type === 'right') st.borderRight = borderStyle;
        }
      }
    }
    this._renderGrid();
    this._updateSelectionDisplay();
  }
};