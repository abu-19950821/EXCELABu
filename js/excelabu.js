/*!
 * ExcelABu - Excel-like Spreadsheet Component / �?Excel 电子表格组件
 * Pure JavaScript / HTML implementation
 * @version 1.0.0
 *
 * ===========================================================================
 *  Public API Reference / 公开接口参�?
 * ===========================================================================
 *
 * ── 数据操作 (Data Operations) ──
 *   .getCellValue(row, col)          Get cell display value / 获取单元格显示�?
 *   .setCellValue(row, col, value)   Set cell value ("=..." for formula) / 设置值（"=公式" 表示公式�?
 *   .getData()                       Get raw data map for active sheet / 获取当前工作表原始数?
 *   .loadData(data, [target])        Load 2D array into a sheet / 载入二维数组到工作表
 *   .bindData(spec)                  Bind object array with columns / 绑定对象数组（含列定义、表头、样式）
 *
 * ── 导航与选择 (Navigation & Selection) ──
 *   .getActiveCell()                 �?"A1" reference / 当前单元格引�?
 *   .getSelection()                  �?{ start:"A1", end:"C3" } / 选区范围
 *   .selectCell(ref)                 Select cell by "A1" reference / 选中指定单元�?
 *   .selectRange(ref)                Select range by "B2:C3" reference / 框选指定范�?
 *
 * ── 工作表管�?(Sheet Management) ──
 *   .getSheetCount()                 �?number of sheets / 工作表总数
 *   .getSheetName()                  �?active sheet name / 当前工作表名�?
 *   .addSheet(name)                  Add sheet, returns index / 添加工作表，返回索引
 *   .addNewSheet(name)               Add sheet & switch to it / 添加工作表并切换过去
 *   .goToSheet(index)                Switch to sheet by index / 切换到指定索引的工作�?
 *   .switchSheet(index)              Alias for goToSheet / goToSheet 的别�?
 *   .removeSheet(index)              Remove sheet by index / 删除指定索引的工作表
 *   .renameSheet(name)               Rename active sheet / 重命名当前工作表
 *
 * ── 行列操作 (Row / Column) ──
 *   .setColWidth(col, width)         Set column width in px (col 0-based) / 设置列宽�?起索引）
 *   .setRowHeight(row, height)       Set row height in px / 设置行高
 *   .insertRow()                     Insert row above active cell / 在活动格上方插入一�?
 *   .deleteRow()                     Delete row of active cell / 删除活动格所在行
 *   .insertCol()                     Insert column left of active cell / 在活动格左侧插入�?
 *   .deleteCol()                     Delete column of active cell / 删除活动格所在列
 *
 * ── 单元格操�?(Cell Operations) ──
 *   .mergeSelection()                Merge selected range / 合并当前选区
 *   .unmergeSelection()              Unmerge at active cell / 取消当前格合�?
 *   .clearCells()                    Clear selected cells / 清空选区内容
 *
 * ── 剪贴�?(Clipboard) ──
 *   .copy()                          Copy selection to clipboard / 复制选区
 *   .cut()                           Cut selection to clipboard / 剪切选区
 *   .paste()                         Paste from clipboard / 粘贴
 *
 * ── 撤销重做 (History) ──
 *   .undo()                          Undo last operation / 撤销
 *   .redo()                          Redo undone operation / 重做
 *
 * ── 导入导出 (Import / Export) ──
 *   .importFile()                    Open file dialog to import XLSX / 打开对话框导�?XLSX
 *   .importFromUrl(url[, opts])      Fetch & import XLSX from server URL / 从服务端 URL 拉取并导�?
 *                                     opts.headers  �?自定义请求头 (e.g. Authorization)
 *                                     opts.credentials �?跨域凭证 'include'|'same-origin'|'omit'
 *   .exportFile()                    Export & download workbook as XLSX / 导出并下�?XLSX
 *   .onSave(callback)                Register save callback / 注册保存回调�?
 *                                     callback(blob, allData, inst)
 *                                     allData = { "Sheet1":[[...]], "Employee":[{...}], ... }
 *                                     Sheets with columns �?object-array / 有columns �?对象数组
 *                                     Sheets without columns �?2D array / 无columns �?二维数组
 *
 * ── 组件控制 (Component) ──
 *   .refresh()                       Re-render entire grid / 强制刷新整个表格
 *   .destroy()                       Destroy component & cleanup / 销毁组件，清空容器
 */

import { CoreMixin } from './src/core/index.js?v=2';
import { ToolbarMixin } from './src/toolbar/index.js?v=1';
import { EventsMixin } from './src/events/index.js?v=2';
import { EditingMixin } from './src/editing.js?v=7';
import { SelectionMixin } from './src/selection.js?v=7';
import { RenderingMixin } from './src/rendering/index.js?v=3';
import { ClipboardMixin } from './src/clipboard.js?v=5';
import { HistoryMixin } from './src/history.js?v=6';
import { OperationsMixin } from './src/operations/index.js?v=2';
import { PublicMixin } from './src/public.js?v=13';
import { ImportMixin } from './src/import.js?v=10';
import { PrintMixin } from './src/print.js?v=3';
import { DEFAULT_OPTIONS } from '../config/theme.js?v=2';

// ============================================================
//  ExcelABu - Main Spreadsheet Component
// ============================================================
class ExcelABu {
  /**
   * @param {HTMLElement|string} container - The container element or selector
   * @param {Object} options
   * @param {number} options.rows - Number of rows (default 100)
   * @param {number} options.cols - Number of columns (default 26)
   * @param {number} options.defaultColWidth - Default column width in px (default 64)
   * @param {number} options.defaultRowHeight - Default row height in px (default 24)
   * @param {string} options.sheetName - Initial sheet name (default 'Sheet1')
   */
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error('ExcelABu: Container element not found');
    }

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    // State
    this.sheets = [];
    this.activeSheetIndex = 0;
    this.selection = null;     // { r1, c1, r2, c2 }
    this.activeCell = { r: 0, c: 0 };
    this.selectionAnchor = { r: 0, c: 0 }; // Anchor for shift+arrow extension
    this.editingCell = null;
    this.clipboard = null;
    this.clipboardAction = null; // 'copy' | 'cut'
    this.undoStack = {};
    this.redoStack = {};
    this.isMouseDown = false;
    this.isDragging = false;
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.cellEditor = null;  // inline editor element
    this.extraSelections = []; // for Ctrl+click multi-select

    // Column/row resize state
    this.resizing = null; // { type: 'col'|'row', index, startX, startY, startSize }

    // DOM references
    this.el = null;
    this.gridScroll = null;
    this.gridTable = null;
    this.formulaInput = null;
    this.cellRefDisplay = null;
    this.statusBar = null;

    this._init();
  }
}

// Apply all mixins to the prototype (using defineProperties to preserve getters/setters)
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(CoreMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(ToolbarMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(EventsMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(EditingMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(SelectionMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(RenderingMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(ClipboardMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(HistoryMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(OperationsMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(PublicMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(ImportMixin));
Object.defineProperties(ExcelABu.prototype, Object.getOwnPropertyDescriptors(PrintMixin));

// Expose to global scope
window.ExcelABu = ExcelABu;

export { ExcelABu };