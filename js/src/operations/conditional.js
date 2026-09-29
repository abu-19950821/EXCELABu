export const OperationsConditionalMixin = {
  _showConditionalFormatDialog() {
    if (!this.selection) { this._setStatus(this._t('selectCellsFirst')); return; }
    var t = this._t.bind(this);
    var overlay = document.createElement('div');
    overlay.className = 'excelabu-search-overlay';
    overlay.innerHTML =
      '<div class="excelabu-search-dialog">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
          '<span style="font-weight:600;font-size:13px;">' + t('conditionalFormat') + '</span>' +
          '<span style="margin-left:auto;cursor:pointer;font-size:16px;" data-action="closeCFDialog">×</span>' +
        '</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:6px;align-items:center;">' +
          '<select class="excelabu-cf-operator" name="excelabu-cf-operator" style="padding:3px;font-size:11px;">' +
            '<option value="gt">' + t('cfGreaterThan') + '</option>' +
            '<option value="lt">' + t('cfLessThan') + '</option>' +
            '<option value="gte">' + t('cfGreaterOrEqual') + '</option>' +
            '<option value="lte">' + t('cfLessOrEqual') + '</option>' +
            '<option value="eq">' + t('cfEqualTo') + '</option>' +
            '<option value="neq">' + t('cfNotEqual') + '</option>' +
            '<option value="contains">' + t('cfContains') + '</option>' +
          '</select>' +
          '<input class="excelabu-cf-value" name="excelabu-cf-value" type="text" placeholder="' + t('cfValue') + '" style="width:80px;padding:3px 6px;border:1px solid #ccc;border-radius:3px;font-size:12px;" />' +
        '</div>' +
        '<div style="display:flex;gap:4px;align-items:center;margin-bottom:8px;">' +
          '<span style="font-size:11px;">' + t('cfFill') + ':</span>' +
          '<input type="color" class="excelabu-cf-bg" name="excelabu-cf-bg" value="#fca5a5" style="width:24px;height:24px;padding:0;border:none;cursor:pointer;" />' +
          '<span style="font-size:11px;">' + t('cfTextColor') + ':</span>' +
          '<input type="color" class="excelabu-cf-color" name="excelabu-cf-color" value="#000000" style="width:24px;height:24px;padding:0;border:none;cursor:pointer;" />' +
        '</div>' +
        '<button data-action="applyCF" style="padding:3px 10px;font-size:11px;">' + t('cfApply') + '</button>' +
        '<button data-action="clearCF" style="padding:3px 10px;font-size:11px;margin-left:4px;">' + t('cfClearAll') + '</button>' +
      '</div>';
    document.body.appendChild(overlay);
    var cfInput = overlay.querySelector('.excelabu-cf-value');
    if (cfInput) { setTimeout(function() { cfInput.focus(); }, 50); }
    var self = this;
    overlay.addEventListener('click', function(e) {
      var action = e.target.dataset.action || (e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action);
      if (action === 'closeCFDialog') { overlay.remove(); }
      if (action === 'applyCF') { overlay.remove(); self._applyConditionalFormat(overlay); }
      if (action === 'clearCF') { overlay.remove(); self._clearConditionalFormats(); }
    });
  },

  _applyConditionalFormat(overlay) {
    var operator = overlay.querySelector('.excelabu-cf-operator').value;
    var valStr = overlay.querySelector('.excelabu-cf-value').value.trim();
    var bgColor = overlay.querySelector('.excelabu-cf-bg').value;
    var textColor = overlay.querySelector('.excelabu-cf-color').value;
    if (!valStr) { this._setStatus(this._t('enterValue')); return; }
    var cells = this._getSelectedCells();
    if (cells.length === 0) return;
    this._pushUndo();
    if (!this.activeSheet._conditionalFormats) this.activeSheet._conditionalFormats = [];
    this.activeSheet._conditionalFormats.push({
      ranges: [{ r1: this.selection.r1, c1: this.selection.c1, r2: this.selection.r2, c2: this.selection.c2 }],
      operator: operator, value: valStr, bgColor: bgColor, color: textColor
    });
    this._renderGrid();
    this._setStatus('Conditional format applied');
  },

  _clearConditionalFormats() {
    this.activeSheet._conditionalFormats = [];
    this._renderGrid();
    this._setStatus('All conditional formats cleared');
  }
};