export const CoreActionMixin = {
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
      case 'freezeMenu': this._toggleFreezeMenu(); break;
      case 'freezeColumns': this._closeFreezeMenu(); this._freezeColumns(); break;
      case 'freezeRows': this._closeFreezeMenu(); this._freezeRows(); break;
      case 'unfreezePanes': this._closeFreezeMenu(); this._unfreezePanes(); break;
      case 'sortMenu': this._toggleSortMenu(); break;
      case 'sortAsc': this._closeSortMenu(); this.sortSelection(true); break;
      case 'sortDesc': this._closeSortMenu(); this.sortSelection(false); break;
      case 'sortClear': this._closeSortMenu(); this._clearSort(); break;
      case 'find': this._showFindDialog(); break;
      case 'replace': this._showReplaceDialog(); break;
      case 'conditionalFormat': this._showConditionalFormatDialog(); break;
      case 'toggleLang': this._toggleLang(); break;
    }
  },
};
