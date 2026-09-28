export const PRINT = {
  PAPER_WIDTH_MM: 210,
  PAPER_HEIGHT_MM: 297,
  DPI: 96,
  MM_TO_INCH: 25.4,
  PAGE_WIDTH_PAD: 10,
  POPUP_WIDTH: 800,
  POPUP_HEIGHT: 600,
  PAGE_BREAK_COLOR: '#217346',
  TABLE_BORDER_COLOR: '#999',
  TEXT_COLOR: '#000',
  FONT_FAMILY: '"Segoe UI",Arial,sans-serif',
  FONT_SIZE: '12px',
  MARGIN_PRESETS: {
    normal:  { top: 2.54, bottom: 2.54, left: 1.91, right: 1.91 },
    narrow:  { top: 1.91, bottom: 1.91, left: 0.64, right: 0.64 },
    wide:    { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 }
  }
};

export const UI = {
  DRAG_THRESHOLD: 4,
  COPY_INDICATOR_DURATION: 2000,
  BLUR_COMMIT_DELAY: 100,
  PAGE_SCROLL_ROWS: 20
};

export const HISTORY = {
  UNDO_STACK_LIMIT: 50
};

export const IMPORT = {
  MAX_ROWS: 500,
  EXTRA_ROWS: 20,
  EXTRA_COLS: 5
};

export const LOCALE = {
  DEFAULT_LANG: 'zh',
  STORAGE_KEY: 'excelabu_lang'
};