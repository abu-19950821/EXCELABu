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
  sheetName: 'Sheet1'
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
    CORNER: 20,
    COL_HEADER: 10,
    ROW_HEADER: 5
  }
};

export const COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$|^rgba?\([^)]+\)$|^[a-zA-Z]+$/;