// ============================================================
  //  Utility Functions
  // ============================================================
  export const Utils = {
    /** Convert column index (0-based) to letter(s), e.g. 0->A, 25->Z, 26->AA */
    colToLetter(col) {
      let result = '';
      let n = col;
      do {
        result = String.fromCharCode((n % 26) + 65) + result;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      return result;
    },

    /** Convert column letter(s) to 0-based index, e.g. A->0, Z->25, AA->26 */
    letterToCol(letter) {
      let col = 0;
      for (let i = 0; i < letter.length; i++) {
        col = col * 26 + (letter.toUpperCase().charCodeAt(i) - 64);
      }
      return col - 1;
    },

    /** Parse cell reference like "A1" or "AA10" into { r, c } (0-based) */
    parseCellRef(ref) {
      const match = ref.match(/^([A-Za-z]+)(\d+)$/);
      if (!match) return null;
      return {
        c: Utils.letterToCol(match[1]),
        r: parseInt(match[2], 10) - 1
      };
    },

    /** Convert 0-based row,col to cell reference like "A1" */
    toCellRef(r, c) {
      return Utils.colToLetter(c) + (r + 1);
    },

    /** Parse a range like "A1:B5" into start/end {r,c} */
    parseRange(range) {
      const parts = range.split(':');
      if (parts.length !== 2) return null;
      const start = Utils.parseCellRef(parts[0]);
      const end = Utils.parseCellRef(parts[1]);
      if (!start || !end) return null;
      return {
        r1: Math.min(start.r, end.r),
        c1: Math.min(start.c, end.c),
        r2: Math.max(start.r, end.r),
        c2: Math.max(start.c, end.c)
      };
    },

    /** Check if two cells/ranges have intersection */
    rangesOverlap(r1, c1, r2, c2, tr, tc, br, bc) {
      return !(c2 < tc || c1 > bc || r2 < tr || r1 > br);
    },

    /** Deep clone an object (with circular-reference protection) */
    deepClone(obj, _seen) {
      if (obj === null || typeof obj !== 'object') return obj;
      _seen = _seen || new WeakSet();
      if (_seen.has(obj)) return obj; // circular reference → safe return
      _seen.add(obj);
      if (Array.isArray(obj)) return obj.map(function(item) { return Utils.deepClone(item, _seen); });
      const clone = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          clone[key] = Utils.deepClone(obj[key], _seen);
        }
      }
      return clone;
    },

    /** Escape HTML special characters */
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };