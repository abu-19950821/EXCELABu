import { Utils } from './01_utils.js?v=2';

  // ============================================================
  //  Formula Evaluator
  // ============================================================
  export class FormulaEvaluator {
    constructor(sheet) {
      this.sheet = sheet;
    }

    /** Evaluate a formula string (without the leading '=') */
    evaluate(formula) {
      if (!formula || typeof formula !== 'string') return null;
      try {
        return this._eval(formula.trim());
      } catch (e) {
        return '#ERROR!';
      }
    }

    _eval(expr) {
      // Check for function calls
      const funcMatch = expr.match(/^([A-Za-z]+)\((.+)\)$/);
      if (funcMatch) {
        return this._callFunction(funcMatch[1].toUpperCase(), funcMatch[2]);
      }

      // Replace cell references with values
      const resolved = this._resolveRefs(expr);

      // Evaluate the arithmetic expression safely
      return this._safeEval(resolved);
    }

    _callFunction(name, argsStr) {
      const args = this._parseArgs(argsStr);

      switch (name) {
        case 'SUM':
          return this._aggregate(args, (a, b) => a + b, 0);
        case 'AVERAGE':
        case 'AVG':
          return this._aggregate(args, (a, b) => a + b, 0) / this._countValues(args);
        case 'MIN':
          return this._aggregate(args, (a, b) => Math.min(a, b), Infinity);
        case 'MAX':
          return this._aggregate(args, (a, b) => Math.max(a, b), -Infinity);
        case 'COUNT':
          return this._countValues(args);
        case 'COUNTA':
          return this._countNonEmpty(args);
        case 'IF':
          return this._ifFunc(args);
        case 'CONCAT':
        case 'CONCATENATE':
          return this._concat(args);
        case 'UPPER':
          return String(this._resolveArg(args[0])).toUpperCase();
        case 'LOWER':
          return String(this._resolveArg(args[0])).toLowerCase();
        case 'TRIM':
          return String(this._resolveArg(args[0])).trim();
        case 'ABS':
          return Math.abs(this._toNumber(this._resolveArg(args[0])));
        case 'ROUND':
          return Math.round(this._toNumber(this._resolveArg(args[0])));
        case 'ROUNDUP':
          return Math.ceil(this._toNumber(this._resolveArg(args[0])));
        case 'ROUNDDOWN':
          return Math.floor(this._toNumber(this._resolveArg(args[0])));
        default:
          return '#NAME?';
      }
    }

    _parseArgs(argsStr) {
      const args = [];
      let depth = 0;
      let current = '';
      for (let i = 0; i < argsStr.length; i++) {
        const ch = argsStr[i];
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) {
          args.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      if (current.trim()) args.push(current.trim());
      return args;
    }

    _resolveArg(arg) {
      // Check if it's a range
      if (arg.includes(':')) {
        const range = Utils.parseRange(arg);
        if (range) {
          const values = this._getRangeValues(range);
          return values;
        }
      }

      // Check if it's a cell reference
      const cellRef = Utils.parseCellRef(arg);
      if (cellRef) {
        return this._getCellValue(cellRef.r, cellRef.c);
      }

      // It's a literal value
      return arg;
    }

    _resolveRefs(expr) {
      // Replace cell references with their values.
      //   - Only match when preceded by start/operator/left-paren (not a digit — avoids 5E2).
      //   - Not followed by '(' (avoids function names like SUM).
      return expr.replace(/(^|[+\-*/(,\s])([A-Za-z]+)(\d+)/g, (match, prefix, col, row, offset, string) => {
        // Check if this is followed by '(' which means it's a function call, not a cell reference
        const afterMatch = string.substring(offset + match.length);
        if (afterMatch.startsWith('(')) {
          return match;
        }

        const c = Utils.letterToCol(col);
        const r = parseInt(row, 10) - 1;
        const val = this._getCellValue(r, c);
        const replacement = (val === null || val === undefined || val === '' || isNaN(val)) ? '0' : String(val);
        return prefix + replacement;
      });
    }

    _safeEval(expr) {
      // Only allow safe characters: digits, operators, spaces, dots, parentheses
      if (!/^[\d\s+\-*/().,]+$/.test(expr)) {
        return '#VALUE!';
      }
      try {
        // Use Function constructor for safe eval
        const result = new Function('return (' + expr + ')')();
        if (typeof result !== 'number' || !isFinite(result)) return '#NUM!';
        return result;
      } catch (e) {
        return '#VALUE!';
      }
    }

    _getCellValue(r, c) {
      const key = r + ',' + c;
      const cell = this.sheet._data[key];
      if (!cell) return null;

      // If the cell has a formula, evaluate it
      if (cell.formula) {
        // Prevent circular references
        if (!this._evalStack) this._evalStack = new Set();
        if (this._evalStack.has(key)) {
          return '#CIRC!';
        }
        this._evalStack.add(key);
        try {
          return this._eval(cell.formula);
        } finally {
          this._evalStack.delete(key);
        }
      }

      return cell.value;
    }

    _getRangeValues(range) {
      const values = [];
      for (let r = range.r1; r <= range.r2; r++) {
        for (let c = range.c1; c <= range.c2; c++) {
          const val = this._getCellValue(r, c);
          values.push(val);
        }
      }
      return values;
    }

    _toNumber(val) {
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }

    _aggregate(args, fn, initial) {
      let result = initial;
      for (const arg of args) {
        const resolved = this._resolveArg(arg);
        if (Array.isArray(resolved)) {
          for (const v of resolved) {
            if (v !== null && v !== undefined && v !== '') {
              result = fn(result, this._toNumber(v));
            }
          }
        } else {
          const n = this._toNumber(resolved);
          result = fn(result, n);
        }
      }
      return result;
    }

    _countValues(args) {
      let count = 0;
      for (const arg of args) {
        const resolved = this._resolveArg(arg);
        if (Array.isArray(resolved)) {
          for (const v of resolved) {
            if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v))) {
              count++;
            }
          }
        } else if (resolved !== null && resolved !== undefined && resolved !== '' && !isNaN(Number(resolved))) {
          count++;
        }
      }
      return count;
    }

    _countNonEmpty(args) {
      let count = 0;
      for (const arg of args) {
        const resolved = this._resolveArg(arg);
        if (Array.isArray(resolved)) {
          for (const v of resolved) {
            if (v !== null && v !== undefined && v !== '') count++;
          }
        } else if (resolved !== null && resolved !== undefined && resolved !== '') {
          count++;
        }
      }
      return count;
    }

    _ifFunc(args) {
      if (args.length < 2) return '#ARG!';
      const condition = this._resolveArg(args[0]);
      // Excel-style condition: false, 0, empty string are false; everything else is true
      let isTruthy;
      if (condition === null || condition === undefined || condition === '') {
        isTruthy = false;
      } else if (condition === false) {
        isTruthy = false;
      } else if (condition === true) {
        isTruthy = true;
      } else if (typeof condition === 'number') {
        isTruthy = condition !== 0;
      } else if (typeof condition === 'string') {
        isTruthy = condition !== '' && condition !== '0';
      } else {
        isTruthy = true;
      }
      
      if (isTruthy) {
        return this._resolveArg(args[1]);
      } else {
        return args.length >= 3 ? this._resolveArg(args[2]) : false;
      }
    }

    _concat(args) {
      return args.map(a => String(this._resolveArg(a))).join('');
    }
  }