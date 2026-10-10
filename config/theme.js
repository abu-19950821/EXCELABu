export const BORDER_WIDTHS = {
  thin: 1,
  medium: 2,
  thick: 3
};

export const DEFAULT_COLORS = {
  font: '#000000',
  background: '#ffffff',
  border: '#000000'
};

export const HEADER_BG_COLOR = '#e8ecf0';

export const DEFAULT_OPTIONS = {
  rows: 100,
  cols: 26,
  defaultColWidth: 100,
  defaultRowHeight: 24,
  sheetName: 'Sheet1',
  ui: {
    menuBar: true,
    toolbar: true,
    formulaBar: true,
    sheetTabs: true,
    statusBar: true,
    contextMenu: true,
    toolbarItems: {
      clipboard: true,
      fontFamily: true,
      fontSize: true,
      fontColor: true,
      fillColor: true,
      bold: true,
      italic: true,
      underline: true,
      alignLeft: true,
      alignCenter: true,
      alignRight: true,
      alignTop: true,
      alignMiddle: true,
      alignBottom: true,
      wrapText: true,
      sort: true,
      find: true,
      borders: true,
      merge: true,
      rowColOps: true,
      printArea: true,
      freeze: true,
      conditionalFormat: true
    },
    menuItems: {
      save: true,
      importFile: true,
      exportFile: true,
      print: true,
      printPreview: true,
      margins: true,
      undo: true,
      redo: true,
      toggleLang: true
    }
  }
};

export const GRID = {
  ROW_HEADER_WIDTH: 46,
  COL_HEADER_HEIGHT: 24,
  MIN_COL_WIDTH: 30,
  MIN_ROW_HEIGHT: 16,
  DEFAULT_COL_WIDTH: 100,
  DEFAULT_ROW_HEIGHT: 24,
  EXPAND_BUFFER: 10,
  VISIBLE_ROWS_FALLBACK: 20,
  VISIBLE_COLS_FALLBACK: 5,
  ZINDEX: {
    CORNER: 25,
    COL_HEADER: 22,
    ROW_HEADER: 21
  }
};

export const COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$|^rgba?\([^)]+\)$|^[a-zA-Z]+$/;