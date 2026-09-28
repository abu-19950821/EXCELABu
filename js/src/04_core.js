import { FONT_LIST, FONT_SIZES, DEFAULT_FONT_SIZE } from '../../config/fonts.js?v=1';
import { DEFAULT_COLORS } from '../../config/theme.js?v=2';
import { PRINT, LOCALE } from '../../config/constants.js?v=1';
import { Utils } from './01_utils.js?v=2';
import { I18N } from './14_i18n.js?v=3';

export const CoreMixin = {

  _t(key) { return I18N.t(key); },

  _init() {
    // Print margin presets (cm)
    this._printMarginPresets = PRINT.MARGIN_PRESETS;
    this._printMarginPreset = 'normal';
    this._showPrintArea = false;

    // Load saved language / 加载保存的语言
    try {
      var savedLang = localStorage.getItem(LOCALE.STORAGE_KEY);
      if (savedLang === 'zh' || savedLang === 'en') I18N.setLang(savedLang);
    } catch(e) {}

    this._buildDOM();
    this._bindEvents();
    this.addSheet(this.options.sheetName);
    this._renderAll();
    this._selectCell(0, 0);
  },

  _buildDOM() {
    this.container.classList.add('excelabu');
    this.container.innerHTML = '';

    // ── Menu Bar ──
    var menuBar = document.createElement('div');
    menuBar.className = 'excelabu-menu-bar';
    menuBar.innerHTML =
      '<button data-action="save" title="' + this._t('save') + '">&#128427; ' + this._t('save') + '</button>' +
      '<button data-action="importFile" title="' + this._t('importFile') + '">&#128194; ' + this._t('importFile') + '</button>' +
      '<button data-action="exportFile" title="' + this._t('exportFile') + '">&#128190; ' + this._t('exportFile') + '</button>' +
      '<span class="excelabu-menu-separator"></span>' +
      '<button data-action="print" title="' + this._t('print') + '">&#128424; ' + this._t('print') + '</button>' +
      '<button data-action="printPreview" title="' + this._t('printPreview') + '">&#128269; ' + this._t('printPreview') + '</button>' +
      '<span class="excelabu-menu-separator"></span>' +
      '<span class="excelabu-menu-dropdown">' +
        '<button data-action="marginMenu" title="' + this._t('margins') + '">&#128208; ' + this._t('margins') + ' &#9660;</button>' +
        '<div class="excelabu-margin-menu" style="display:none;">' +
          '<div data-action="marginNormal">' + this._t('marginNormal') + '<small> ' + this._t('marginNormalDesc') + '</small></div>' +
          '<div data-action="marginNarrow">' + this._t('marginNarrow') + '<small> ' + this._t('marginNarrowDesc') + '</small></div>' +
          '<div data-action="marginWide">' + this._t('marginWide') + '<small> ' + this._t('marginWideDesc') + '</small></div>' +
        '</div>' +
      '</span>' +
      '<span class="excelabu-menu-separator"></span>' +
      '<button data-action="undo" title="' + this._t('undo') + '">&#8630; ' + this._t('undo') + '</button>' +
      '<button data-action="redo" title="' + this._t('redo') + '">&#8631; ' + this._t('redo') + '</button>' +
      '<span class="excelabu-menu-separator"></span>' +
      '<button data-action="toggleLang" title="Switch Language" class="excelabu-lang-btn">' + (I18N.getLang() === 'zh' ? '中' : 'EN') + '</button>';
    this.container.appendChild(menuBar);

    // ── Toolbar ──
    var toolbar = document.createElement('div');
    toolbar.className = 'excelabu-toolbar';
    toolbar.innerHTML =
      '<button data-action="cut" title="' + this._t('cut') + '">&#9986; ' + this._t('cut') + '</button>' +
      '<button data-action="copy" title="' + this._t('copy') + '">&#128203; ' + this._t('copy') + '</button>' +
      '<button data-action="paste" title="' + this._t('paste') + '">&#128196; ' + this._t('paste') + '</button>' +
      '<span class="excelabu-separator"></span>' +
      '<select data-action="fontName" class="excelabu-font-name" title="' + this._t('fontName') + '">' +
        FONT_LIST.map(function(f) {
          return '<option value="' + f.name + '">' + f.name + '</option>';
        }).join('') +
      '</select>' +
      '<select data-action="fontSize" class="excelabu-font-size" title="' + this._t('fontSize') + '">' +
        FONT_SIZES.map(function(s) {
          return '<option value="' + s + '"' + (s === DEFAULT_FONT_SIZE ? ' selected' : '') + '>' + s + '</option>';
        }).join('') +
      '</select>' +
      '    <span class="excelabu-color-pick" title="' + this._t('fontColor') + '">' +
        '<span class="excelabu-color-indicator">A</span>' +
        '<input type="color" data-action="fontColor" class="excelabu-font-color" value="' + DEFAULT_COLORS.font + '">' +
      '</span>' +
      '<span class="excelabu-color-pick" title="' + this._t('fillColor') + '">' +
        '<svg class="excelabu-color-indicator" width="14" height="14" viewBox="0 0 24 24">' +
          '<path d="M7 6l10 1-3 14H5l2-15z" fill="#888"/>' +
          '<path d="M16 4a2 2 0 012-2" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>' +
        '</svg>' +
        '<input type="color" data-action="bgColor" class="excelabu-bg-color" value="' + DEFAULT_COLORS.background + '">' +
      '</span>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="bold" title="' + this._t('bold') + '" class="excelabu-toggle">B</button>' +
      '<button data-action="italic" title="' + this._t('italic') + '" class="excelabu-toggle"><i>I</i></button>' +
      '<button data-action="underline" title="' + this._t('underline') + '" class="excelabu-toggle"><u>U</u></button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="alignLeft" title="' + this._t('alignLeft') + '">&#8676;</button>' +
      '<button data-action="alignCenter" title="' + this._t('alignCenter') + '">&#8801;</button>' +
      '<button data-action="alignRight" title="' + this._t('alignRight') + '">&#8677;</button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="alignTop" title="' + this._t('alignTop') + '">&#8673;</button>' +
      '<button data-action="alignMiddle" title="' + this._t('alignMiddle') + '">&#8596;</button>' +
      '<button data-action="alignBottom" title="' + this._t('alignBottom') + '">&#8675;</button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="wrapText" title="' + this._t('wrapText') + '" class="excelabu-toggle">&#8626; ' + this._t('wrapText') + '</button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="sortAsc" title="' + this._t('sortAscending') + '">&#9650;</button>' +
      '<button data-action="sortDesc" title="' + this._t('sortDescending') + '">&#9660;</button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="find" title="' + this._t('find') + ' (Ctrl+F)">&#128270; ' + this._t('find') + '</button>' +
      '<span class="excelabu-border-group">' +
        '<button data-action="borderToggle" title="' + this._t('borders') + '">&#9644; ' + this._t('borders') + '</button>' +
        '<div class="excelabu-border-menu" style="display:none">' +
          '<div data-border="none" title="' + this._t('noBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-none"></span> ' + this._t('noBorder') + '</div>' +
          '<div data-border="all" title="' + this._t('allBorders') + '">' +
            '<span class="excelabu-border-preview excelabu-border-all"></span> ' + this._t('allBorders') + '</div>' +
          '<div data-border="outside" title="' + this._t('outsideBorders') + '">' +
            '<span class="excelabu-border-preview excelabu-border-outside"></span> ' + this._t('outsideBorders') + '</div>' +
          '<div data-border="thick" title="' + this._t('thickBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-thick"></span> ' + this._t('thickBorder') + '</div>' +
          '<div data-border="grid" title="' + this._t('gridBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-grid"></span> ' + this._t('gridBorder') + '</div>' +
          '<div class="excelabu-border-sep"></div>' +
          '<div data-border="bottom" title="' + this._t('bottomBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-bottom"></span> ' + this._t('bottomBorder') + '</div>' +
          '<div data-border="top" title="' + this._t('topBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-top"></span> ' + this._t('topBorder') + '</div>' +
          '<div data-border="left" title="' + this._t('leftBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-left"></span> ' + this._t('leftBorder') + '</div>' +
          '<div data-border="right" title="' + this._t('rightBorder') + '">' +
            '<span class="excelabu-border-preview excelabu-border-right"></span> ' + this._t('rightBorder') + '</div>' +
        '</div>' +
      '</span>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="mergeCells" title="' + this._t('mergeCells') + '">&#8846; ' + this._t('mergeCells') + '</button>' +
      '<button data-action="unmergeCells" title="' + this._t('unmergeCells') + '">&#8845; ' + this._t('unmergeCells') + '</button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="insertRow" title="' + this._t('insertRow') + '">+ ' + this._t('insertRow') + '</button>' +
      '<button data-action="deleteRow" title="' + this._t('deleteRow') + '">- ' + this._t('deleteRow') + '</button>' +
      '<button data-action="clear" title="' + this._t('clear') + '">' + this._t('clear') + '</button>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="printArea" title="' + this._t('printArea') + '" class="excelabu-toggle">&#9633; ' + this._t('printArea') + '</button>' +
      '<button data-action="freezePanes" title="' + this._t('freezePanes') + '" class="excelabu-toggle">&#128204; ' + this._t('freezePanes') + '</button>' +
      '<button data-action="conditionalFormat" title="' + this._t('conditionalFormat') + '">&#127912; ' + this._t('conditionalFormat') + '</button>';
    this.container.appendChild(toolbar);

    var formulaBar = document.createElement('div');
    formulaBar.className = 'excelabu-formula-bar';
    formulaBar.innerHTML =
      '<div class="excelabu-cell-ref">A1</div>' +
      '<span class="excelabu-formula-icon">fx</span>' +
      '<input class="excelabu-formula-input" type="text" placeholder="' + this._t('formulaPlaceholder') + '" />';
    this.container.appendChild(formulaBar);
    this.cellRefDisplay = formulaBar.querySelector('.excelabu-cell-ref');
    this.formulaInput = formulaBar.querySelector('.excelabu-formula-input');

    var gridWrapper = document.createElement('div');
    gridWrapper.className = 'excelabu-grid-wrapper';

    this.gridScroll = document.createElement('div');
    this.gridScroll.className = 'excelabu-grid-scroll';

    this.gridTable = document.createElement('table');
    this.gridTable.className = 'excelabu-grid';
    this.gridScroll.appendChild(this.gridTable);

    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'excelabu-selection-overlay';
    this.gridScroll.appendChild(this.selectionOverlay);

    gridWrapper.appendChild(this.gridScroll);

    this.copyIndicator = document.createElement('div');
    this.copyIndicator.className = 'excelabu-copy-indicator';
    gridWrapper.appendChild(this.copyIndicator);

    this.container.appendChild(gridWrapper);

    this.sheetTabsContainer = document.createElement('div');
    this.sheetTabsContainer.className = 'excelabu-sheet-tabs';
    this.container.appendChild(this.sheetTabsContainer);

    this.statusBar = document.createElement('div');
    this.statusBar.className = 'excelabu-status-bar';
    this.statusBar.textContent = this._t('ready');
    this.container.appendChild(this.statusBar);

    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'excelabu-context-menu';
    this.contextMenu.innerHTML =
      '<div class="excelabu-menu-item" data-action="cut">' + this._t('cut') + '</div>' +
      '<div class="excelabu-menu-item" data-action="copy">' + this._t('copy') + '</div>' +
      '<div class="excelabu-menu-item" data-action="paste">' + this._t('paste') + '</div>' +
      '<div class="excelabu-menu-separator"></div>' +
      '<div class="excelabu-menu-item" data-action="mergeCells">' + this._t('mergeCells') + '</div>' +
      '<div class="excelabu-menu-item" data-action="unmergeCells">' + this._t('unmergeCells') + '</div>' +
      '<div class="excelabu-menu-separator"></div>' +
      '<div class="excelabu-menu-item" data-action="insertRow">' + this._t('insertRow') + '</div>' +
      '<div class="excelabu-menu-item" data-action="deleteRow">' + this._t('deleteRow') + '</div>' +
      '<div class="excelabu-menu-separator"></div>' +
      '<div class="excelabu-menu-item" data-action="insertColumn">' + this._t('insertColumn') + '</div>' +
      '<div class="excelabu-menu-item" data-action="deleteColumn">' + this._t('deleteColumn') + '</div>' +
      '<div class="excelabu-menu-separator"></div>' +
      '<div class="excelabu-menu-item" data-action="clear">' + this._t('clear') + '</div>';
    this.container.appendChild(this.contextMenu);
  },

  _bindEvents() {
    // ── Direct color input event binding ──
    // Use 'input' for everything (preview + data save) because:
    // - 'input' fires reliably when the native colour dialog closes
    // - 'change' may not fire on all platforms for <input type="color">
    // - Saving data on 'input' ensures colour is in the model before any
    //   subsequent _finishEditing / _renderGrid triggered by cell clicks
    var fontColorInput = this.container.querySelector('.excelabu-font-color');
    var bgColorInput = this.container.querySelector('.excelabu-bg-color');

    if (fontColorInput) {
      fontColorInput.addEventListener('input', function(e) {
        // 1. Flush any active cell edit to data (only once per colour session)
        if (this.editingCell) {
          var r = this.editingCell.r;
          var c = this.editingCell.c;
          var val = this.cellEditor ? this.cellEditor.value : this.formulaInput.value;
          this._removeCellEditor();
          this.editingCell = null;
          this._pushUndo();
          this.activeSheet.setCell(r, c, val);
          this._updateFormulaBar();
          this._setStatus('Ready');
        }
        // 2. DOM preview (instant visual feedback)
        this._previewFontColor(e.target.value);
        // 3. Persist colour to data model so it survives any re-render
        //    (skip _applyStyle to avoid extra _pushUndo / _renderGrid)
        var cells = this._getSelectedCells();
        var color = e.target.value;
        var finalColor = color === DEFAULT_COLORS.font ? null : color;
        var sheet = this.activeSheet;
        for (var i = 0; i < cells.length; i++) {
          var cr = cells[i].r, cc = cells[i].c;
          this._ensureCell(cr, cc);
          if (finalColor === null) {
            delete sheet._data[cr + ',' + cc]._style.color;
          } else {
            sheet._data[cr + ',' + cc]._style.color = finalColor;
          }
        }
      }.bind(this));
    }

    if (bgColorInput) {
      bgColorInput.addEventListener('input', function(e) {
        if (this.editingCell) {
          var r = this.editingCell.r;
          var c = this.editingCell.c;
          var val = this.cellEditor ? this.cellEditor.value : this.formulaInput.value;
          this._removeCellEditor();
          this.editingCell = null;
          this._pushUndo();
          this.activeSheet.setCell(r, c, val);
          this._updateFormulaBar();
          this._setStatus('Ready');
        }
        this._previewBgColor(e.target.value);
        var cells = this._getSelectedCells();
        var color = e.target.value;
        var finalBgColor = (color === DEFAULT_COLORS.background || color === '#FFFFFF') ? null : color;
        var sheet = this.activeSheet;
        for (var i = 0; i < cells.length; i++) {
          var cr = cells[i].r, cc = cells[i].c;
          this._ensureCell(cr, cc);
          if (finalBgColor === null) {
            delete sheet._data[cr + ',' + cc]._style.bgColor;
          } else {
            sheet._data[cr + ',' + cc]._style.bgColor = finalBgColor;
          }
        }
      }.bind(this));
    }

    // ── Toolbar button clicks ──
    this.container.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (btn) {
        this._handleAction(btn.dataset.action);
      }
    }.bind(this));

    // Change events for selects (fontName / fontSize)
    this.container.addEventListener('change', function(e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var action = el.dataset.action;
      if (action === 'fontName') {
        if (this.editingCell) { this._finishEditing(); }
        this._setFontName(el.value);
      } else if (action === 'fontSize') {
        if (this.editingCell) { this._finishEditing(); }
        this._setFontSize(parseInt(el.value, 10));
      }
    }.bind(this));

    this.formulaInput.addEventListener('keydown', function(e) { this._onFormulaKeydown(e); }.bind(this));
    this.formulaInput.addEventListener('input', function() { this._onFormulaInput(); }.bind(this));
    this.formulaInput.addEventListener('blur', function() {
      if (this._formulaBarDirty) {
        this._formulaBarDirty = false;
        var ac = this.activeCell;
        if (ac && !this.editingCell) {
          this._pushUndo();
          this.activeSheet.setCell(ac.r, ac.c, this.formulaInput.value);
          this._renderGrid();
          this._updateFormulaBar();
          this._setStatus('Ready');
        }
      }
    }.bind(this));

    this.gridTable.addEventListener('mousedown', this._boundOnGridMouseDown = function(e) { this._onGridMouseDown(e); }.bind(this));
    this.gridTable.addEventListener('dblclick', this._boundOnGridDblClick = function(e) { this._onGridDblClick(e); }.bind(this));
    document.addEventListener('mousemove', this._boundOnMouseMove = function(e) { this._onMouseMove(e); }.bind(this));
    document.addEventListener('mouseup', this._boundOnMouseUp = function(e) { this._onMouseUp(e); }.bind(this));

    document.addEventListener('keydown', this._boundOnKeyDown = function(e) { this._onKeyDown(e); }.bind(this));

    this.gridScroll.addEventListener('scroll', this._boundOnScroll = function() { this._onScroll(); }.bind(this));

    this.gridTable.addEventListener('contextmenu', this._boundOnContextMenu = function(e) { this._onContextMenu(e); }.bind(this));
    document.addEventListener('click', this._boundHideContextMenu = function(e) { this._hideContextMenu(e); }.bind(this));

    this.sheetTabsContainer.addEventListener('click', function(e) {
      var tab = e.target.closest('.excelabu-sheet-tab');
      if (tab && !e.target.closest('.excelabu-add-sheet')) {
        var index = parseInt(tab.dataset.index, 10);
        if (!isNaN(index)) this.switchSheet(index);
      }
      if (e.target.closest('.excelabu-add-sheet')) {
        this.addSheet('Sheet' + (this.sheets.length + 1));
      }
    }.bind(this));

    this.sheetTabsContainer.addEventListener('dblclick', function(e) {
      var tab = e.target.closest('.excelabu-sheet-tab');
      if (tab) {
        var index = parseInt(tab.dataset.index, 10);
        if (!isNaN(index)) this._renameSheetPrompt(index);
      }
    }.bind(this));

    // Border menu item clicks
    this.container.querySelector('.excelabu-border-menu').addEventListener('mousedown', function(e) {
      var item = e.target.closest('[data-border]');
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        this._applyBorder(item.dataset.border);
        this._closeBorderMenu();
      }
    }.bind(this));

    // Close border menu when clicking outside
    document.addEventListener('mousedown', function(e) {
      var group = this.container.querySelector('.excelabu-border-group');
      if (group && !group.contains(e.target)) {
        this._closeBorderMenu();
      }
      var marginGroup = this.container.querySelector('.excelabu-menu-dropdown');
      if (marginGroup && !marginGroup.contains(e.target)) {
        var menu = this.container.querySelector('.excelabu-margin-menu');
        if (menu) menu.style.display = 'none';
      }
    }.bind(this));
  },

  _handleAction(action) {
    switch (action) {
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'cut': this.cut(); break;
      case 'copy': this.copy(); break;
      case 'paste': this.paste(); break;
      case 'bold': this._toggleBold(); break;
      case 'italic': this._toggleItalic(); break;
      case 'underline': this._toggleUnderline(); break;
      case 'alignLeft': this._setHAlign('left'); break;
      case 'alignCenter': this._setHAlign('center'); break;
      case 'alignRight': this._setHAlign('right'); break;
      case 'alignTop': this._setVAlign('top'); break;
      case 'alignMiddle': this._setVAlign('middle'); break;
      case 'alignBottom': this._setVAlign('bottom'); break;
      case 'wrapText': this._toggleWrapText(); break;
      case 'borderToggle': this._toggleBorderMenu(); break;
      case 'mergeCells': this.mergeSelection(); break;
      case 'unmergeCells': this.unmergeSelection(); break;
      case 'insertRow': this.insertRow(); break;
      case 'deleteRow': this.deleteRow(); break;
      case 'insertColumn': this.insertCol(); break;
      case 'deleteColumn': this.deleteCol(); break;
      case 'clear': this.clearCells(); break;
      case 'importFile': this.importFile(); break;
      case 'exportFile': this.exportFile(); break;
      case 'save': this._onSave(); break;
     case 'print': this._onPrint(); break;
      case 'printPreview': this._onPrintPreview(); break;
      case 'marginMenu': this._toggleMarginMenu(); break;
      case 'marginNormal': this._setPrintMargin('normal'); break;
      case 'marginNarrow': this._setPrintMargin('narrow'); break;
      case 'marginWide': this._setPrintMargin('wide'); break;
      case 'printArea': this._togglePrintArea(); break;
      case 'freezePanes': this._toggleFreezePanes(); break;
      case 'sortAsc': this.sortSelection(true); break;
      case 'sortDesc': this.sortSelection(false); break;
      case 'find': this._showFindDialog(); break;
      case 'replace': this._showReplaceDialog(); break;
      case 'conditionalFormat': this._showConditionalFormatDialog(); break;
      case 'toggleLang': this._toggleLang(); break;
    }
  },

  _toggleLang() {
    var next = I18N.getLang() === 'zh' ? 'en' : 'zh';
    I18N.setLang(next);
    try { localStorage.setItem(LOCALE.STORAGE_KEY, next); } catch(e) {}
    location.reload();
  },
  _onSave() {
    if (typeof this._saveCallback === 'function') {
      this._saveWithCallback();
    }
  },

  /**
   * Register a save callback. / 注册保存回调。
   * When the user clicks the "Save" button in the toolbar: / 当用户点击工具栏保存按钮时触发：
   *   @param {Blob}        blob  - Complete XLSX file Blob (ready for upload) / 完整 XLSX 文件 Blob
   *   @param {Object}      data  - All sheets' data: { sheetName: [...], ... } / 全部工作表数据
   *                                 - With columns (bindData) → object-array / 有columns → 对象数组
   *                                 - Without columns        → 2D array (aoa) / 无columns → 二维数组
   *   @param {ExcelABu}    inst  - The ExcelABu instance / 触发保存的实例
   */
  onSave(callback) {
    this._saveCallback = callback;
  },

  async _saveWithCallback() {
    const { ensureXLSX, getXLSX } = await import('./00_xlsx.js?v=2');
    await ensureXLSX();
    var wb = this._buildWorkbook();
    var blob;
    try {
      blob = this._buildXLSXBlob(wb);
    } catch (e) {
      console.error('Custom XLSX blob failed, using basic export:', e);
      var XLSX = getXLSX();
      var arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    // Collect data from ALL sheets / 收集全部工作表数据: { sheetName: [...], ... }
    var allData = {};
    for (var i = 0; i < this.sheets.length; i++) {
      var s = this.sheets[i];
      allData[s.name] = this._readSheetData(s);
    }
    this._saveCallback(blob, allData, this);
  },

  /**
   * Read data from a sheet for the save callback. / 从工作表中读取数据供保存回调使用。
   * - With columns, flat data → object array [{key:val}, ...]        / 有columns无分组 → 对象数组
   * - With columns, grouped data → [{..., items: [...]}, ...]        / 有columns有分组 → 嵌套对象
   * - Without columns → 2D array (Array-of-Arrays) [[...], [...]]    / 无columns → 二维数组
   * @param {Object} sheet - Sheet object / 工作表对象
   * @returns {Array}
   */
  _readSheetData(sheet) {
    if (!sheet) return [];

    var cfg = sheet._bindConfig;

    if (cfg && cfg.columns && !cfg.hasGroups) {
      // ── Flat data → object array / 无分组 → 对象数组 [{key:val}, ...] ──
      var result = [];
      var cols = cfg.columns;
      var stride = cfg.stride || 1;
      var startRow = cfg.dataStartRow || 0;
      var startCol = cfg.startCol || 0;
      var colOffsets = cfg.colOffsets;

      var maxRow = -1;
      var dataKeys = Object.keys(sheet._data);
      for (var k = 0; k < dataKeys.length; k++) {
        var parts = dataKeys[k].split(',');
        var rr = parseInt(parts[0], 10);
        if (rr >= startRow && rr > maxRow) maxRow = rr;
      }
      if (maxRow < startRow) return [];

      var itemCount = Math.floor((maxRow - startRow) / stride) + 1;

      for (var i = 0; i < itemCount; i++) {
        var dataRow = startRow + i * stride;
        var obj = {};
        var hasAnyValue = false;
        for (var ci = 0; ci < cols.length; ci++) {
          var col = cols[ci];
          if (!col.key) continue;
          var dc = (col.col != null) ? startCol + Number(col.col) : startCol + (colOffsets ? colOffsets[ci] : ci);
          var cellKey = dataRow + ',' + dc;
          var cellData = sheet._data[cellKey];
          if (cellData) {
            obj[col.key] = cellData.value;
            hasAnyValue = true;
          } else {
            obj[col.key] = null;
          }
        }
        if (hasAnyValue) {
          result.push(obj);
        }
      }
      return result;
    }

    if (cfg && cfg.columns && cfg.hasGroups) {
      // ── Grouped data → nested {..., items:[{...}]} / 有分组 → 含items嵌套 ──
      var result = [];
      var cols = cfg.columns;
      var startRow = cfg.dataStartRow || 0;
      var startCol = cfg.startCol || 0;
      var colOffsets = cfg.colOffsets;

      var maxRow = -1;
      var dataKeys = Object.keys(sheet._data);
      for (var k = 0; k < dataKeys.length; k++) {
        var parts = dataKeys[k].split(',');
        var rr = parseInt(parts[0], 10);
        if (rr >= startRow && rr > maxRow) maxRow = rr;
      }
      if (maxRow < startRow) return [];

      // Split columns into group (group:true) and child (regular)
      var groupCols = [];
      var childCols = [];
      for (var ci = 0; ci < cols.length; ci++) {
        if (cols[ci].group) {
          groupCols.push(cols[ci]);
        } else {
          childCols.push(cols[ci]);
        }
      }

      function _colOffset(col) {
        var idx = cols.indexOf(col);
        if (col.col != null) return startCol + Number(col.col);
        return startCol + (colOffsets ? colOffsets[idx] : idx);
      }

      var currentRow = startRow;
      while (currentRow <= maxRow) {
        var groupObj = { items: [] };
        var hasGroup = false;

        // Read group row values
        for (var gi = 0; gi < groupCols.length; gi++) {
          var gCol = groupCols[gi];
          var gc = _colOffset(gCol);
          var gData = sheet._data[currentRow + ',' + gc];
          if (gData && gData.value != null) {
            groupObj[gCol.key] = gData.value;
            hasGroup = true;
          }
        }

        if (!hasGroup) {
          currentRow++;
          continue;
        }

        // Find next group row (or end)
        var childEndRow = maxRow + 1;
        for (var cr = currentRow + 1; cr <= maxRow; cr++) {
          var isGroup = false;
          for (var ggi = 0; ggi < groupCols.length; ggi++) {
            var ggCol = groupCols[ggi];
            var ggc = _colOffset(ggCol);
            var ggData = sheet._data[cr + ',' + ggc];
            if (ggData && ggData.value != null) {
              isGroup = true;
              break;
            }
          }
          if (isGroup) {
            childEndRow = cr;
            break;
          }
        }

        // Read child rows
        for (var cr = currentRow + 1; cr < childEndRow; cr++) {
          var childObj = {};
          var hasChild = false;
          for (var chi = 0; chi < childCols.length; chi++) {
            var chCol = childCols[chi];
            var chc = _colOffset(chCol);
            var chData = sheet._data[cr + ',' + chc];
            if (chData) {
              childObj[chCol.key] = chData.value;
              hasChild = true;
            }
          }
          if (hasChild) {
            groupObj.items.push(childObj);
          }
        }

        result.push(groupObj);
        currentRow = childEndRow;
      }
      return result;
    }

    // ── No columns → 2D Array-of-Arrays / 无columns → 二维数组 ──
    var minR = Infinity, maxR2 = -1, minC = Infinity, maxC = -1;
    var dataKeys = Object.keys(sheet._data);
    for (var k = 0; k < dataKeys.length; k++) {
      var parts = dataKeys[k].split(',');
      var dr = parseInt(parts[0], 10);
      var dc = parseInt(parts[1], 10);
      if (dr < minR) minR = dr;
      if (dr > maxR2) maxR2 = dr;
      if (dc < minC) minC = dc;
      if (dc > maxC) maxC = dc;
    }
    if (maxR2 < minR) return [];

    var aoa = [];
    for (var r = minR; r <= maxR2; r++) {
      var row = [];
      for (var c = minC; c <= maxC; c++) {
        var cellKey = r + ',' + c;
        var cellData = sheet._data[cellKey];
        row.push(cellData ? (cellData.value !== undefined ? cellData.value : cellData.display) : null);
      }
      aoa.push(row);
    }
    return aoa;
  },

  _toggleBorderMenu() {
    var menu = this.container.querySelector('.excelabu-border-menu');
    if (!menu) return;
    var isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
  },

  _closeBorderMenu() {
    var menu = this.container.querySelector('.excelabu-border-menu');
    if (menu) menu.style.display = 'none';
  }

};