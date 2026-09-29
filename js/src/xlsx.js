// Load SheetJS xlsx library and export it
// The classic .min.js script is loaded once, then the global is reused

let _loading = null;

export function getXLSX() {
  return typeof XLSX !== 'undefined' ? window.XLSX : null;
}

export function ensureXLSX() {
  if (typeof XLSX !== 'undefined') return Promise.resolve(window.XLSX);
  if (_loading) return _loading;

  _loading = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = 'js/xlsx.js?v=3';
    s.onload = function () {
      resolve(window.XLSX);
    };
    s.onerror = function () {
      _loading = null;
      reject(new Error('Failed to load xlsx library'));
    };
    document.head.appendChild(s);
  });

  return _loading;
}