export const OperationsFindReplaceMixin = {
  _showFindDialog() { this._closeSearchDialog(); this._buildSearchDialog(false); },
  _showReplaceDialog() { this._closeSearchDialog(); this._buildSearchDialog(true); },

  _buildSearchDialog(isReplace) {
    var t = this._t.bind(this);
    var overlay = document.createElement('div');
    overlay.className = 'excelabu-search-overlay';
    overlay.innerHTML =
      '<div class="excelabu-search-dialog">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
          '<span style="font-weight:600;font-size:13px;">' + (isReplace ? t('findReplaceTitle') : t('findTitle')) + '</span>' +
          '<span style="margin-left:auto;cursor:pointer;font-size:16px;line-height:1;" data-action="closeSearch">×</span>' +
        '</div>' +
        '<input class="excelabu-search-input" name="excelabu-search-input" type="text" placeholder="' + t('findPlaceholder') + '" style="width:100%;padding:4px 6px;margin-bottom:6px;border:1px solid #ccc;border-radius:3px;font-size:12px;box-sizing:border-box;" />' +
        (isReplace ? '<input class="excelabu-replace-input" name="excelabu-replace-input" type="text" placeholder="' + t('replacePlaceholder') + '" style="width:100%;padding:4px 6px;margin-bottom:8px;border:1px solid #ccc;border-radius:3px;font-size:12px;box-sizing:border-box;" />' : '') +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
          '<button data-action="searchNext" style="padding:3px 10px;font-size:11px;">' + t('findNext') + '</button>' +
          '<button data-action="searchPrev" style="padding:3px 10px;font-size:11px;">' + t('findPrev') + '</button>' +
          (isReplace ? '<button data-action="searchReplace" style="padding:3px 10px;font-size:11px;">' + t('replace') + '</button>' : '') +
          (isReplace ? '<button data-action="searchReplaceAll" style="padding:3px 10px;font-size:11px;">' + t('replaceAll') + '</button>' : '') +
          '<span class="excelabu-search-count" style="font-size:11px;color:#666;margin-left:8px;align-self:center;"></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    this._searchOverlay = overlay;
    this._searchIsReplace = isReplace;
    var self = this;
    var input = overlay.querySelector('.excelabu-search-input');
    setTimeout(function() { input.focus(); }, 50);
    overlay.addEventListener('click', function(e) {
      var action = e.target.dataset.action || (e.target.closest && e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action);
      if (!action) return;
      e.stopPropagation();
      switch (action) {
        case 'closeSearch': self._closeSearchDialog(); break;
        case 'searchNext': self._searchAction(1); break;
        case 'searchPrev': self._searchAction(-1); break;
        case 'searchReplace': self._replaceOne(); break;
        case 'searchReplaceAll': self._replaceAll(); break;
      }
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); self._searchAction(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') { self._closeSearchDialog(); }
    });
    document.addEventListener('keydown', function _close(e) {
      if (e.key === 'Escape') { self._closeSearchDialog(); document.removeEventListener('keydown', _close); }
    }, { once: true });
  },

  _closeSearchDialog() {
    if (this._searchOverlay) { this._searchOverlay.remove(); this._searchOverlay = null; }
    this._searchResults = null;
    this._searchIndex = -1;
    this._clearSearchHighlights();
  },

  _collectSearchResults(query) {
    if (!query) return [];
    var sheet = this.activeSheet;
    var results = [];
    var q = query.toLowerCase();
    for (var key in sheet._data) {
      var cell = sheet._data[key];
      if (!cell || cell.value == null) continue;
      var text = String(cell.value).toLowerCase();
      if (text.indexOf(q) !== -1) {
        var parts = key.split(',');
        results.push({ r: parseInt(parts[0], 10), c: parseInt(parts[1], 10), text: String(cell.value) });
      }
    }
    return results;
  },

  _searchAction(direction) {
    if (!this._searchOverlay) return;
    var input = this._searchOverlay.querySelector('.excelabu-search-input');
    var query = input.value.trim();
    if (!query) return;
    var results = this._collectSearchResults(query);
    var countEl = this._searchOverlay.querySelector('.excelabu-search-count');
    if (results.length === 0) { if (countEl) countEl.textContent = this._t('noResults'); return; }
    this._searchResults = results;
    if (this._searchIndex < 0 || this._searchIndex >= results.length) {
      this._searchIndex = direction > 0 ? 0 : results.length - 1;
    } else {
      this._searchIndex = (this._searchIndex + direction + results.length) % results.length;
    }
    var match = results[this._searchIndex];
    this._selectCell(match.r, match.c);
    this._scrollToCell(match.r, match.c);
    if (countEl) countEl.textContent = (this._searchIndex + 1) + '/' + results.length;
    this._clearSearchHighlights();
    var dom = this._cellDOM;
    for (var i = 0; i < results.length; i++) {
      var el = dom && dom[this.activeSheet._key(results[i].r, results[i].c)];
      if (el) {
        el.classList.add(i === this._searchIndex ? 'search-current' : 'search-highlight');
      }
    }
  },

  _clearSearchHighlights() {
    var dom = this._cellDOM;
    if (!dom) return;
    for (var key in dom) {
      var el = dom[key];
      if (el) {
        el.classList.remove('search-highlight', 'search-current');
      }
    }
    this._searchResults = null;
  },

  _replaceOne() {
    if (!this._searchOverlay || !this._searchResults || this._searchResults.length === 0) return;
    var input = this._searchOverlay.querySelector('.excelabu-replace-input');
    if (!input) return;
    var replacement = input.value;
    var match = this._searchResults[this._searchIndex];
    var matchKey = this.activeSheet._key(match.r, match.c);
    this._pushUndo();
    this.activeSheet.setCell(match.r, match.c, replacement);
    this._renderCell(match.r, match.c);
    this._clearSearchHighlights();
    var queryInput = this._searchOverlay.querySelector('.excelabu-search-input');
    var query = queryInput ? queryInput.value.trim() : '';
    var results = this._collectSearchResults(query);
    this._searchResults = results;
    var countEl = this._searchOverlay.querySelector('.excelabu-search-count');
    if (results.length === 0) { if (countEl) countEl.textContent = this._t('noResults'); this._searchIndex = -1; return; }
    var newIdx = -1;
    for (var i = 0; i < results.length; i++) { if (this.activeSheet._key(results[i].r, results[i].c) === matchKey) { newIdx = i; break; } }
    if (newIdx === -1) {
      for (var j = 0; j < results.length; j++) {
        if (results[j].r > match.r || (results[j].r === match.r && results[j].c > match.c)) { newIdx = j; break; }
      }
      if (newIdx === -1) newIdx = 0;
    }
    this._searchIndex = newIdx;
    var newMatch = results[this._searchIndex];
    this._selectCell(newMatch.r, newMatch.c);
    this._scrollToCell(newMatch.r, newMatch.c);
    if (countEl) countEl.textContent = (this._searchIndex + 1) + '/' + results.length;
    var dom = this._cellDOM;
    for (var i = 0; i < results.length; i++) {
      var el = dom && dom[this.activeSheet._key(results[i].r, results[i].c)];
      if (el) {
        el.classList.add(i === this._searchIndex ? 'search-current' : 'search-highlight');
      }
    }
  },

  _replaceAll() {
    if (!this._searchOverlay) return;
    var findInput = this._searchOverlay.querySelector('.excelabu-search-input');
    var replaceInput = this._searchOverlay.querySelector('.excelabu-replace-input');
    if (!findInput || !replaceInput) return;
    var query = findInput.value.trim();
    if (!query) return;
    var replacement = replaceInput.value;
    var results = this._collectSearchResults(query);
    if (results.length === 0) return;
    this._pushUndo();
    for (var i = 0; i < results.length; i++) { this.activeSheet.setCell(results[i].r, results[i].c, replacement); this._renderCell(results[i].r, results[i].c); }
    this._clearSearchHighlights();
    this._closeSearchDialog();
    this._setStatus('Replaced ' + results.length + ' occurrence(s)');
  }
};