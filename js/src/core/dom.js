import { FONT_LIST, FONT_SIZES, DEFAULT_FONT_SIZE } from '../../../config/fonts.js?v=1';
import { DEFAULT_COLORS } from '../../../config/theme.js?v=2';
import { I18N } from '../i18n.js?v=3';

export const CoreDOMMixin = {
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
      '<select data-action="fontName" class="excelabu-font-name" name="excelabu-font-name" title="' + this._t('fontName') + '">' +
        FONT_LIST.map(function(f) {
          return '<option value="' + f.name + '">' + f.name + '</option>';
        }).join('') +
      '</select>' +
      '<select data-action="fontSize" class="excelabu-font-size" name="excelabu-font-size" title="' + this._t('fontSize') + '">' +
        FONT_SIZES.map(function(s) {
          return '<option value="' + s + '"' + (s === DEFAULT_FONT_SIZE ? ' selected' : '') + '>' + s + '</option>';
        }).join('') +
      '</select>' +
      '    <span class="excelabu-color-pick" title="' + this._t('fontColor') + '">' +
        '<span class="excelabu-color-indicator">A</span>' +
        '<input type="color" data-action="fontColor" class="excelabu-font-color" name="excelabu-font-color" value="' + DEFAULT_COLORS.font + '">' +
      '</span>' +
      '<span class="excelabu-color-pick" title="' + this._t('fillColor') + '">' +
        '<svg class="excelabu-color-indicator" width="14" height="14" viewBox="0 0 24 24">' +
          '<path d="M7 6l10 1-3 14H5l2-15z" fill="#888"/>' +
          '<path d="M16 4a2 2 0 012-2" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>' +
        '</svg>' +
        '<input type="color" data-action="bgColor" class="excelabu-bg-color" name="excelabu-bg-color" value="' + DEFAULT_COLORS.background + '">' +
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
      '<span class="excelabu-sort-group">' +
        '<button data-action="sortMenu" title="' + this._t('sort') + '">' + this._t('sort') + ' &#9660;</button>' +
        '<div class="excelabu-dropdown excelabu-sort-menu" style="display:none">' +
          '<div data-action="sortAsc">&#9650; ' + this._t('sortAscending') + '</div>' +
          '<div data-action="sortDesc">&#9660; ' + this._t('sortDescending') + '</div>' +
          '<div class="excelabu-dropdown-sep"></div>' +
          '<div data-action="sortClear">&#10005; ' + this._t('sortClear') + '</div>' +
        '</div>' +
      '</span>' +
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
      '<span class="excelabu-separator"></span>' +
      '<span class="excelabu-freeze-group">' +
        '<button data-action="freezeMenu" title="' + this._t('freezePanes') + '">&#128204; ' + this._t('freezePanes') + ' &#9660;</button>' +
        '<div class="excelabu-dropdown excelabu-freeze-menu" style="display:none">' +
          '<div data-action="freezeColumns">&#128204; ' + this._t('freezeColumns') + '</div>' +
          '<div data-action="freezeRows">&#128204; ' + this._t('freezeRows') + '</div>' +
          '<div class="excelabu-dropdown-sep"></div>' +
          '<div data-action="unfreezePanes">&#10005; ' + this._t('unfreezePanes') + '</div>' +
        '</div>' +
      '</span>' +
      '<span class="excelabu-separator"></span>' +
      '<button data-action="conditionalFormat" title="' + this._t('conditionalFormat') + '">&#127912; ' + this._t('conditionalFormat') + '</button>';
    this.container.appendChild(toolbar);

    var formulaBar = document.createElement('div');
    formulaBar.className = 'excelabu-formula-bar';
    formulaBar.innerHTML =
      '<div class="excelabu-cell-ref">A1</div>' +
      '<span class="excelabu-formula-icon">fx</span>' +
      '<input class="excelabu-formula-input" name="excelabu-formula-input" type="text" placeholder="' + this._t('formulaPlaceholder') + '" />';
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
};