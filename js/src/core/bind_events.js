import { DEFAULT_COLORS } from "../../../config/theme.js?v=2";

export const CoreBindEventsMixin = {
  /**
   * If a cell editor is open, commit its value to the sheet.
   * Used by fontColor/bgColor quick-color-pickers to persist edits.
   */
  _commitEditingBeforeAction() {
    if (this.editingCell) {
      var r = this.editingCell.r, c = this.editingCell.c;
      var val = this.cellEditor ? this.cellEditor.value : this.formulaInput.value;
      this._removeCellEditor();
      this.editingCell = null;
      this._pushUndo();
      this.activeSheet.setCell(r, c, val);
      this._updateFormulaBar();
      this._setStatus("Ready");
    }
  },

  _bindEvents() {
    var fontColorInput = this.container.querySelector(".excelabu-font-color");
    var bgColorInput = this.container.querySelector(".excelabu-bg-color");
    if (fontColorInput) {
      fontColorInput.addEventListener("input", function(e) {
        this._commitEditingBeforeAction();
        this._previewFontColor(e.target.value);
        var cells = this._getSelectedCells();
        var color = e.target.value;
        var finalColor = color === DEFAULT_COLORS.font ? null : color;
        var sheet = this.activeSheet;
        for (var i = 0; i < cells.length; i++) {
          var cr = cells[i].r, cc = cells[i].c;
          this._ensureCell(cr, cc);
          if (finalColor === null) delete sheet._data[sheet._key(cr, cc)]._style.color;
          else sheet._data[sheet._key(cr, cc)]._style.color = finalColor;
        }
      }.bind(this));
    }
    if (bgColorInput) {
      bgColorInput.addEventListener("input", function(e) {
        this._commitEditingBeforeAction();
        this._previewBgColor(e.target.value);
        var cells = this._getSelectedCells();
        var color = e.target.value;
        var finalBgColor = (color === DEFAULT_COLORS.background || color === "#FFFFFF") ? null : color;
        var sheet = this.activeSheet;
        for (var i = 0; i < cells.length; i++) {
          var cr = cells[i].r, cc = cells[i].c;
          this._ensureCell(cr, cc);
          if (finalBgColor === null) delete sheet._data[sheet._key(cr, cc)]._style.bgColor;
          else sheet._data[sheet._key(cr, cc)]._style.bgColor = finalBgColor;
        }
      }.bind(this));
    }
    this.container.addEventListener("click", function(e) {
      var btn = e.target.closest("[data-action]");
      if (btn) this._handleAction(btn.dataset.action);
    }.bind(this));
    this.container.addEventListener("change", function(e) {
      var el = e.target.closest("[data-action]");
      if (!el) return;
      var action = el.dataset.action;
      if (action === "fontName") {
        if (this.editingCell) this._finishEditing();
        this._setFontName(el.value);
      } else if (action === "fontSize") {
        if (this.editingCell) this._finishEditing();
        this._setFontSize(parseInt(el.value, 10));
      }
    }.bind(this));
    this.formulaInput.addEventListener("keydown", function(e) { this._onFormulaKeydown(e); }.bind(this));
    this.formulaInput.addEventListener("input", function() { this._onFormulaInput(); }.bind(this));
    this.formulaInput.addEventListener("blur", function() {
      if (this._formulaBarDirty) {
        this._formulaBarDirty = false;
        var ac = this.activeCell;
        if (ac && !this.editingCell) {
          this._pushUndo();
          this.activeSheet.setCell(ac.r, ac.c, this.formulaInput.value);
          this._renderGrid();
          this._updateFormulaBar();
          this._setStatus("Ready");
        }
      }
    }.bind(this));
    this.gridTable.addEventListener("mousedown", this._boundOnGridMouseDown = function(e) { this._onGridMouseDown(e); }.bind(this));
    this.gridTable.addEventListener("dblclick", this._boundOnGridDblClick = function(e) { this._onGridDblClick(e); }.bind(this));
    document.addEventListener("mousemove", this._boundOnMouseMove = function(e) { this._onMouseMove(e); }.bind(this));
    document.addEventListener("mouseup", this._boundOnMouseUp = function(e) { this._onMouseUp(e); }.bind(this));
    document.addEventListener("keydown", this._boundOnKeyDown = function(e) { this._onKeyDown(e); }.bind(this));
    this.gridScroll.addEventListener("scroll", this._boundOnScroll = function() { this._onScroll(); }.bind(this));
    this.gridTable.addEventListener("contextmenu", this._boundOnContextMenu = function(e) { this._onContextMenu(e); }.bind(this));
    document.addEventListener("click", this._boundHideContextMenu = function(e) { this._hideContextMenu(e); }.bind(this));
    this.sheetTabsContainer.addEventListener("click", function(e) {
      var tab = e.target.closest(".excelabu-sheet-tab");
      if (tab && !e.target.closest(".excelabu-add-sheet")) {
        var index = parseInt(tab.dataset.index, 10);
        if (!isNaN(index)) this.switchSheet(index);
      }
      if (e.target.closest(".excelabu-add-sheet")) this.addSheet("Sheet" + (this.sheets.length + 1));
    }.bind(this));
    this.sheetTabsContainer.addEventListener("dblclick", function(e) {
      var tab = e.target.closest(".excelabu-sheet-tab");
      if (tab) {
        var index = parseInt(tab.dataset.index, 10);
        if (!isNaN(index)) this._renameSheetPrompt(index);
      }
    }.bind(this));
    this.container.querySelector(".excelabu-border-menu").addEventListener("mousedown", function(e) {
      var item = e.target.closest("[data-border]");
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        this._applyBorder(item.dataset.border);
        this._closeBorderMenu();
      }
    }.bind(this));
    document.addEventListener("mousedown", function(e) {
      var group = this.container.querySelector(".excelabu-border-group");
      if (group && !group.contains(e.target)) this._closeBorderMenu();
      var sortGroup = this.container.querySelector(".excelabu-sort-group");
      if (sortGroup && !sortGroup.contains(e.target)) this._closeSortMenu();
      var freezeGroup = this.container.querySelector(".excelabu-freeze-group");
      if (freezeGroup && !freezeGroup.contains(e.target)) this._closeFreezeMenu();
      var marginGroup = this.container.querySelector(".excelabu-menu-dropdown");
      if (marginGroup && !marginGroup.contains(e.target)) {
        var menu = this.container.querySelector(".excelabu-margin-menu");
        if (menu) menu.style.display = "none";
      }
    }.bind(this));
  },
};