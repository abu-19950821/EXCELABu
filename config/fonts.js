export const FONT_LIST = [
  { name: '宋体',        fallback: 'SimSun, serif' },
  { name: '微软雅黑',    fallback: '\'Microsoft YaHei\', \'PingFang SC\', sans-serif' },
  { name: '黑体',        fallback: 'SimHei, sans-serif' },
  { name: '楷体',        fallback: 'KaiTi, serif' },
  { name: '仿宋',        fallback: 'FangSong, serif' },
  { name: 'Arial',       fallback: 'Helvetica, sans-serif' },
  { name: 'Calibri',     fallback: '\'Segoe UI\', sans-serif' },
  { name: 'Times New Roman', fallback: 'Times, serif' },
  { name: 'Courier New', fallback: '\'Courier\', monospace' },
  { name: 'Verdana',     fallback: '\'Geneva\', sans-serif' },
  { name: 'Tahoma',      fallback: '\'Segoe UI\', sans-serif' },
  { name: 'Georgia',     fallback: '\'Palatino Linotype\', serif' }
];

export function getFontFallback(fontName) {
  var font = FONT_LIST.find(function(f) { return f.name === fontName; });
  return font ? font.fallback : 'sans-serif';
}

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
export const DEFAULT_FONT_SIZE = 12;