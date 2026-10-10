import { Utils } from './utils.js?v=3';

const CELL_REF_RE = /(^|[+\-*/(,\s])([A-Za-z]+)(\d+)/g;
const SAFE_EVAL_RE = /^[\d\s+\-*/().,]+$/;

export class FormulaEvaluator {
  constructor(sheet) {
    this.sheet = sheet;
    this._fnCache = new Map();
  }

  evaluate(formula) {
    if (!formula || typeof formula !== 'string') return null;
    try {
      return this._eval(formula.trim());
    } catch (e) {
      return '#ERROR!';
    }
  }

  _eval(expr) {
    const funcMatch = expr.match(/^([A-Za-z]+)\((.+)\)$/);
    if (funcMatch) {
      return this._callFunction(funcMatch[1].toUpperCase(), funcMatch[2]);
    }
    const resolved = this._resolveRefs(expr);
    return this._safeEval(resolved);
  }

  _callFunction(name, argsStr) {
    const args = this._parseArgs(argsStr);

    switch (name) {
      case 'SUM':
        return this._aggregate(args, { sum: true });
      case 'AVERAGE':
      case 'AVG': {
        var stat = this._aggregate(args, { sum: true, countNumeric: true });
        if (stat.count === 0) return '#DIV/0!';
        return stat.sum / stat.count;
      }
      case 'MIN':
        return this._aggregate(args, { min: true });
      case 'MAX':
        return this._aggregate(args, { max: true });
      case 'COUNT':
        return this._aggregate(args, { countNumeric: true }).count;
      case 'COUNTA':
        return this._aggregate(args, { countNonEmpty: true }).count;
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
    if (arg.includes(':')) {
      const range = Utils.parseRange(arg);
      if (range) return this._getRangeValues(range);
    }
    const cellRef = Utils.parseCellRef(arg);
    if (cellRef) return this._getCellValue(cellRef.r, cellRef.c);
    return arg;
  }

  _resolveRefs(expr) {
    CELL_REF_RE.lastIndex = 0;
    return expr.replace(CELL_REF_RE, (match, prefix, col, row, offset, string) => {
      if (string.substring(offset + match.length).startsWith('(')) return match;
      const c = Utils.letterToCol(col);
      const r = parseInt(row, 10) - 1;
      const val = this._getCellValue(r, c);
      const replacement = (val === null || val === undefined || val === '' || isNaN(val)) ? '0' : String(val);
      return prefix + replacement;
    });
  }

  _safeEval(expr) {
    if (!SAFE_EVAL_RE.test(expr)) return '#VALUE!';
    try {
      let fn = this._fnCache.get(expr);
      if (!fn) {
        fn = new Function('return (' + expr + ')');
        if (this._fnCache.size > 500) this._fnCache.clear();
        this._fnCache.set(expr, fn);
      }
      const result = fn();
      if (typeof result !== 'number' || !isFinite(result)) return '#NUM!';
      return result;
    } catch (e) {
      return '#VALUE!';
    }
  }

  _getCellValue(r, c) {
    const key = this.sheet._key(r, c);
    const cell = this.sheet._data[key];
    if (!cell) return null;
    if (cell.formula) {
      if (!this._evalStack) this._evalStack = new Set();
      if (this._evalStack.has(key)) return '#CIRC!';
      this._evalStack.add(key);
      try { return this._eval(cell.formula); }
      finally { this._evalStack.delete(key); }
    }
    return cell.value;
  }

  _getRangeValues(range) {
    const values = [];
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        values.push(this._getCellValue(r, c));
      }
    }
    return values;
  }

  _toNumber(val) {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  _aggregate(args, opts) {
    var sum = 0, countNumeric = 0, countNonEmpty = 0;
    var hasMin = false, min = Infinity, max = -Infinity;
    const collect = (v) => {
      if (v === null || v === undefined || v === '') return;
      countNonEmpty++;
      if (!isNaN(Number(v))) {
        var n = Number(v);
        countNumeric++;
        sum += n;
        if (opts.min) { if (!hasMin || n < min) { min = n; hasMin = true; } }
        if (opts.max) { if (n > max) max = n; }
      }
    };
    for (const arg of args) {
      const resolved = this._resolveArg(arg);
      if (Array.isArray(resolved)) {
        for (const v of resolved) collect(v);
      } else {
        collect(resolved);
      }
    }
    if (opts.min) return hasMin ? min : 0;
    if (opts.max) return max === -Infinity ? 0 : max;
    if (opts.sum) {
      if (opts.countNumeric) return { sum: sum, count: countNumeric };
      return sum;
    }
    if (opts.countNumeric) return { count: countNumeric };
    if (opts.countNonEmpty) return { count: countNonEmpty };
    return sum;
  }

  _ifFunc(args) {
    if (args.length < 2) return '#ARG!';
    const condition = this._resolveArg(args[0]);
    let isTruthy;
    if (condition === null || condition === undefined || condition === '') isTruthy = false;
    else if (condition === false) isTruthy = false;
    else if (condition === true) isTruthy = true;
    else if (typeof condition === 'number') isTruthy = condition !== 0;
    else if (typeof condition === 'string') isTruthy = condition !== '' && condition !== '0';
    else isTruthy = true;
    if (isTruthy) return this._resolveArg(args[1]);
    return args.length >= 3 ? this._resolveArg(args[2]) : false;
  }

  _concat(args) {
    return args.map(a => String(this._resolveArg(a))).join('');
  }
}