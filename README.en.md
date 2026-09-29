# ExcelABu

> A pure JavaScript / HTML Excel-like spreadsheet component — zero-dependency, embeddable, feature-rich.

---
![输入图片说明](DEMO.png)

https://abu-19950821.github.io/EXCELABu/

---

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
  - [Basic Usage](#basic-usage)
  - [Data Loading](#data-loading)
  - [Data Binding](#data-binding)
  - [Formulas](#formulas)
  - [Import & Export](#import--export)
  - [Callbacks](#callbacks)
  - [Undo & Redo](#undo--redo)
- [Internationalization](#internationalization)
- [Browser Compatibility](#browser-compatibility)

---

## Introduction

ExcelABu is a lightweight, full-featured spreadsheet web component. Built with vanilla JavaScript using a **Mixin pattern**, it requires no third-party frameworks. Key features include:

- In-cell editing (double-click or F2)
- Formula engine (SUM, AVERAGE, MIN, MAX, IF, CONCAT, and more)
- Cell styling (font family, size, color, background, borders, alignment)
- Cell merge / unmerge
- Row / column insert and delete
- Column width and row height resizing
- Freeze panes (frozen rows and columns)
- Data sorting
- Find and replace
- Clipboard operations (copy / cut / paste)
- Undo / redo (per-sheet independent history stacks)
- Multi-selection (Ctrl+click)
- Multiple sheet management
- XLSX import and export (powered by SheetJS)
- Print preview
- Internationalization (Chinese / English)
- Object array data binding (bindData)
- Fill handle

---

## Quick Start

### Method 1: Direct Import

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="css/excelabu.css">
</head>
<body>
  <div id="spreadsheet" style="width:100%;height:600px;"></div>

  <script type="module">
    import { ExcelABu } from './js/excelabu.js';

    const sheet = new ExcelABu('#spreadsheet', {
      rows: 100,
      cols: 26,
      defaultColWidth: 80,
      defaultRowHeight: 24
    });

    sheet.loadData([
      ['Item',    'Q1',  'Q2',  'Q3',  'Q4'],
      ['Revenue', 1200,  1500,  1800,  2000],
      ['Cost',    800,   900,   1000,  1200],
      ['Profit',  '=B2-B3', '=C2-C3', '=D2-D3', '=E2-E3']
    ]);
  </script>
</body>
</html>
```

### Method 2: ES Module Import

```javascript
import { ExcelABu } from './js/excelabu.js';

const container = document.getElementById('my-spreadsheet');
const sheet = new ExcelABu(container, {
  rows: 50,
  cols: 16,
  sheetName: 'Report'
});
```

---

## Architecture Overview

ExcelABu is designed with the **Mixin Composition Pattern**. The main `ExcelABu` class composes 12 Mixin modules onto its prototype via `Object.defineProperties`, forming a fully functional spreadsheet instance.

```
ExcelABu (Main Class)
├── CoreMixin                  Core functionality
│   ├── CoreInitMixin         Initialization & state management
│   ├── CoreDOMMixin          DOM construction (menubar, toolbar, formula bar, grid container)
│   ├── CoreBindEventsMixin   Event binding (click, input, scroll)
│   ├── CoreActionMixin       Action dispatching
│   └── CoreSaveMixin         Save callback registration
├── ToolbarMixin              Toolbar sub-menus
│   ├── BorderMenuMixin       Border dropdown
│   ├── FreezeMenuMixin       Freeze dropdown
│   └── SortMenuMixin         Sort dropdown
├── EventsMixin               Event handling
│   ├── EventsMouseMixin      Mouse events
│   ├── EventsKeyboardMixin   Keyboard events
│   └── EventsResizeMixin     Column/row resize events
├── EditingMixin              Cell editor & formula bar
├── SelectionMixin            Selection management (multi-select, row/col selection)
├── RenderingMixin            Rendering pipeline
│   ├── RenderingGridMixin    Grid rendering (HTML string concatenation → innerHTML)
│   ├── RenderingFrozenMixin  Frozen overlay rendering
│   └── RenderingCellMixin    Cell style rendering
├── ClipboardMixin            Clipboard (copy/cut/paste + context menu)
├── HistoryMixin              Undo/redo (per-sheet independent stacks)
├── OperationsMixin           Operation layer
│   ├── OperationsSheetMixin      Sheet management (add/remove/switch/rename)
│   ├── OperationsShareMixin      Shared style operations (bold/italic/align, etc.)
│   ├── OperationsFreezeMixin     Freeze panes
│   ├── OperationsSortMixin       Sorting
│   ├── OperationsMergeMixin      Merge/unmerge cells
│   ├── OperationsInsertDeleteMixin Row/column insert/delete
│   ├── OperationsClearMixin      Clear contents
│   ├── OperationsStylesMixin     Style settings
│   ├── OperationsBordersMixin    Border settings
│   ├── OperationsFillHandleMixin Fill handle
│   ├── OperationsFindReplaceMixin Find & replace
│   └── OperationsConditionalMixin Conditional formatting
├── PublicMixin               Public API
├── ImportMixin               XLSX import/export
└── PrintMixin                Print preview
```

### Data Model

- **Sheet class**: In-memory data model for a single worksheet. Uses a sparse matrix stored as `{ "row,col": CellObject }`.
- **CellObject**: `{ value, formula, display, _style }` — `formula` is stored without the `=` prefix.
- **FormulaEvaluator**: Recursive-descent expression evaluator supporting cell reference resolution, function calls, arithmetic operations, and circular reference detection.
- **MergedCells**: `{ "row,col": { r1, c1, r2, c2 } }` — only the top-left cell of a merge range stores the full geometry, with `_mergeIndex` providing O(1) lookups.

### Rendering Pipeline

1. `_ensureGridSize()` auto-expands rows/columns based on data extent and viewport size.
2. Builds the complete `<table>` HTML via string concatenation (with `colgroup`, `colspan`, `rowspan`).
3. Injects HTML via a single `innerHTML` assignment to avoid frequent DOM operations.
4. Creates a `_cellDOM` cache (`{ "row,col": HTMLElement }`) for efficient selection highlighting and partial re-renders.

### History (Undo/Redo)

- Each sheet has its own `undoStack` and `redoStack`.
- Snapshots include: data map, column widths, row heights, merged cells, row/col count.
- Default stack depth: 50 (configurable via `HISTORY.UNDO_STACK_LIMIT` in `config/constants.js`).

---

## Directory Structure

```
excelabu/
├── index.html                 # Demo page with full API testing panel
├── config/
│   ├── constants.js           # Global constants (print, UI, history, import, locale)
│   ├── fonts.js               # Font list and size presets
│   ├── i18n.js                # Internationalization definitions
│   ├── index.js               # Config entry point
│   └── theme.js               # Theme constants (colors, grid, default options)
├── css/
│   ├── excelabu.css           # Main stylesheet (grid, toolbar, menus, dialogs)
│   └── fonts.css              # Font icon styles
├── js/
│   ├── excelabu.js            # Main entry: ExcelABu class + Mixin composition
│   ├── xlsx.js                # SheetJS loader (dynamic js-xlsx loading)
│   └── src/
│       ├── core/
│       │   ├── index.js       # CoreMixin composition
│       │   ├── init.js        # CoreInitMixin: initialization flow
│       │   ├── dom.js         # CoreDOMMixin: DOM construction
│       │   ├── bind_events.js # CoreBindEventsMixin: event binding
│       │   ├── action.js      # CoreActionMixin: action dispatching
│       │   └── save.js        # CoreSaveMixin: save callback
│       ├── events/
│       │   ├── index.js       # EventsMixin composition
│       │   ├── mouse.js       # Mouse event handling
│       │   ├── keyboard.js    # Keyboard event handling
│       │   └── resize.js      # Column/row drag resize
│       ├── operations/
│       │   ├── index.js       # OperationsMixin composition
│       │   ├── borders.js     # Border operations
│       │   ├── clear.js       # Clear content
│       │   ├── conditional.js # Conditional formatting
│       │   ├── fill_handle.js # Fill handle
│       │   ├── find_replace.js# Find & replace
│       │   ├── freeze.js      # Freeze panes
│       │   ├── insert_delete.js # Row/column insert/delete
│       │   ├── merge.js       # Merge/unmerge
│       │   ├── share.js       # Shared style operations
│       │   ├── sheet.js       # Sheet management
│       │   ├── sort.js        # Sorting
│       │   └── styles.js      # Style settings
│       ├── rendering/
│       │   ├── index.js       # RenderingMixin composition
│       │   ├── cell.js        # Cell style rendering
│       │   ├── frozen.js      # Frozen overlay rendering
│       │   └── grid.js        # Grid rendering
│       ├── toolbar/
│       │   ├── index.js       # ToolbarMixin composition
│       │   ├── border_menu.js # Border dropdown menu
│       │   ├── freeze_menu.js # Freeze dropdown menu
│       │   └── sort_menu.js   # Sort dropdown menu
│       ├── clipboard.js       # Clipboard (copy/cut/paste + context menu)
│       ├── editing.js         # Cell editor & formula bar
│       ├── formula.js         # Formula evaluator (FormulaEvaluator)
│       ├── history.js         # Undo/redo
│       ├── i18n.js            # I18N utility
│       ├── import.js          # XLSX import/export
│       ├── print.js           # Print preview
│       ├── public.js          # Public API implementation
│       ├── selection.js       # Selection management
│       ├── sheet.js           # Sheet data model class
│       ├── utils.js           # Utilities (cell ref conversion, deep clone, HTML escaping)
│       └── xlsx_export.js     # XLSX export custom XML generator
└── README.en.md
```

---

## Configuration

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rows` | `number` | `100` | Initial row count |
| `cols` | `number` | `26` | Initial column count |
| `defaultColWidth` | `number` | `100` | Default column width (px) |
| `defaultRowHeight` | `number` | `24` | Default row height (px) |
| `sheetName` | `string` | `'Sheet1'` | Initial sheet name |

### Global Constants (`config/constants.js`)

| Constant | Description | Default |
|----------|-------------|---------|
| `HISTORY.UNDO_STACK_LIMIT` | Undo stack depth | `50` |
| `IMPORT.MAX_ROWS` | Max rows on import | `500` |
| `IMPORT.EXTRA_ROWS` | Extra buffer rows on import | `20` |
| `UI.DRAG_THRESHOLD` | Drag threshold (px) | `4` |
| `UI.COPY_INDICATOR_DURATION` | Copy indicator duration (ms) | `2000` |
| `UI.BLUR_COMMIT_DELAY` | Editor blur commit delay (ms) | `100` |
| `LOCALE.DEFAULT_LANG` | Default language | `'zh'` |
| `PRINT.MARGIN_PRESETS` | Print margin presets | `{ normal, narrow, wide }` |

### Grid Constants (`config/theme.js`)

| Constant | Default | Description |
|----------|---------|-------------|
| `GRID.ROW_HEADER_WIDTH` | `46` | Row header area width (px) |
| `GRID.COL_HEADER_HEIGHT` | `24` | Column header area height (px) |
| `GRID.MIN_COL_WIDTH` | `30` | Minimum column width (px) |
| `GRID.MIN_ROW_HEIGHT` | `16` | Minimum row height (px) |
| `GRID.EXPAND_BUFFER` | `10` | Auto-expand buffer rows/cols |

---

## API Reference

### Data Operations

| Method | Description |
|--------|-------------|
| `getCellValue(row, col)` | Get the **display value** of a cell (formulas are evaluated automatically) |
| `setCellValue(row, col, value)` | Set a cell value. Prefix with `"=..."` for formulas |
| `getData()` | Get raw data map for the active sheet |
| `setData(data)` | Set raw data for the active sheet |
| `loadData(data, [target])` | Load a 2D array into a sheet; auto-detects formulas, numbers, strings |
| `bindData(spec)` | Bind an object array to a sheet (with column definitions, headers, styles, grouping) |

### Navigation & Selection

| Method | Description |
|--------|-------------|
| `getActiveCell()` | Returns active cell reference (e.g., `"A1"`) |
| `getSelection()` | Returns selection range `{ start: "A1", end: "C3" }` |
| `selectCell(ref)` | Select a cell by reference (e.g., `"B2"`) |
| `selectRange(ref)` | Select a range by reference (e.g., `"B2:C5"`) |

### Sheet Management

| Method | Description |
|--------|-------------|
| `getSheetCount()` | Get total number of sheets |
| `getSheetName()` | Get active sheet name |
| `addSheet(name)` | Add a sheet, returns its index |
| `addNewSheet(name)` | Add a sheet and switch to it |
| `goToSheet(index)` | Switch to the sheet at the given index |
| `switchSheet(index)` | Alias for `goToSheet` |
| `removeSheet(index)` | Remove the sheet at the given index |
| `renameSheet(name)` | Rename the active sheet |

### Row & Column Operations

| Method | Description |
|--------|-------------|
| `setColWidth(col, width)` | Set column width in px (0-based index) |
| `setRowHeight(row, height)` | Set row height in px |
| `insertRow()` | Insert a row above the active cell |
| `deleteRow()` | Delete the row of the active cell |
| `insertCol()` | Insert a column to the left of the active cell |
| `deleteCol()` | Delete the column of the active cell |

### Cell Operations

| Method | Description |
|--------|-------------|
| `mergeSelection()` | Merge the current selection |
| `unmergeSelection()` | Unmerge at the active cell |
| `clearCells()` | Clear content of selected cells |

### Clipboard

| Method | Description |
|--------|-------------|
| `copy()` | Copy selection data to internal clipboard and system clipboard (TSV) |
| `cut()` | Cut selection data |
| `paste()` | Paste from internal clipboard |

### Undo & Redo

| Method | Description |
|--------|-------------|
| `undo()` | Undo the last operation |
| `redo()` | Redo a previously undone operation |

### Import & Export

| Method | Description |
|--------|-------------|
| `importFile()` | Open file dialog to import XLSX/XLS/CSV |
| `importFromUrl(url, [opts])` | Fetch and import XLSX from a server URL |
| `exportFile()` | Export and download the workbook as XLSX (with styles) |
| `onSave(callback)` | Register a save callback (triggered by the toolbar save button) |

### Component Control

| Method | Description |
|--------|-------------|
| `refresh()` | Force re-render the entire grid |
| `destroy()` | Destroy the component, clear the container, remove event listeners |

---

## Usage Examples

### Basic Usage

```javascript
import { ExcelABu } from './js/excelabu.js';

// Method 1: Pass a CSS selector
const sheet = new ExcelABu('#spreadsheet', {
  rows: 50,
  cols: 16
});

// Method 2: Pass a DOM element
const container = document.getElementById('my-sheet');
const sheet2 = new ExcelABu(container, {
  rows: 200,
  cols: 52,       // up to column AZ
  defaultColWidth: 90,
  defaultRowHeight: 28,
  sheetName: 'MySheet'
});
```

### Data Loading

#### loadData — 2D Array

```javascript
sheet.loadData([
  ['',        'Q1',    'Q2',    'Q3',    'Total'],
  ['Revenue', 1200,    1500,    1800,    '=SUM(B2:D2)'],
  ['Cost',    800,     900,     1000,    '=SUM(B3:D3)'],
  ['Profit',  '=B2-B3','=C2-C3','=D2-D3','=SUM(B4:D4)']
]);
```

Auto type detection:

| Input | Type |
|-------|------|
| `'Hello'` | String |
| `1200` | Number |
| `'=SUM(A1:A5)'` | Formula |
| `true` | Boolean |
| `null / undefined / ''` | Skipped |

#### loadData to a specific sheet

```javascript
// By index (0-based)
sheet.loadData(data, 1);

// By sheet name
sheet.loadData(data, 'Employee');
```

#### getData / setData — Raw Data Map

```javascript
// Get raw data
const rawData = sheet.getData();
// Returns: { "0,0": { value: 'Revenue' }, "0,1": { value: 1200, formula: null }, ... }

// Restore from raw data
sheet.setData(rawData);
```

### Data Binding (bindData)

`bindData` is a signature feature of ExcelABu. It automatically renders object arrays into styled tables with column definitions, headers, and grouping support.

#### Flat Data Binding

```javascript
sheet.bindData({
  sheetName: 'Employee',        // optional; creates and switches to this sheet
  startRow: 0,                  // starting row (0-based)
  startCol: 0,                  // starting column (0-based)
  columns: [
    { key: 'id',     title: 'ID',       width: 60,  style: { align: 'center' } },
    { key: 'name',   title: 'Name',     width: 100 },
    { key: 'dept',   title: 'Department', width: 120 },
    { key: 'salary', title: 'Salary',   width: 90,  style: { align: 'right', numberFormat: '#,##0' } }
  ],
  data: [
    { id: 1001, name: 'Alice',   dept: 'Engineering', salary: 8500 },
    { id: 1002, name: 'Bob',     dept: 'Design',      salary: 7200 },
    { id: 1003, name: 'Charlie', dept: 'Engineering', salary: 9000 }
  ]
});
```

#### Grouped Data Binding (Master-Detail)

When a data object contains an `items` sub-array, columns marked with `group: true` auto-merge across child rows:

```javascript
sheet.bindData({
  sheetName: 'TeamGroups',
  columns: [
    { key: 'id',   title: 'ID',   width: 60,  group: true, style: { align: 'center' } },
    { key: 'note', title: 'Note', width: 180, group: true, style: { valign: 'top' } },
    { key: 'name', title: 'Name', width: 100 },
    { key: 'dept', title: 'Dept', width: 120 }
  ],
  data: [{
    id: 1001,
    note: 'Team lead\n5 years',
    items: [
      { name: 'Alice',   dept: 'Engineering' },
      { name: 'Bob',     dept: 'Design' },
      { name: 'Charlie', dept: 'Engineering' }
    ]
  }]
});
```

### Formulas

#### Supported Functions

| Function | Description |
|----------|-------------|
| `SUM(range)` | Sum of values |
| `AVERAGE(range)` / `AVG(range)` | Average |
| `MIN(range)` | Minimum value |
| `MAX(range)` | Maximum value |
| `COUNT(range)` | Count (numeric only) |
| `COUNTA(range)` | Count (non-empty cells) |
| `IF(condition, trueVal, falseVal)` | Conditional |
| `CONCAT(val1, val2, ...)` / `CONCATENATE` | String concatenation |
| `UPPER(text)` | Convert to uppercase |
| `LOWER(text)` | Convert to lowercase |
| `TRIM(text)` | Trim whitespace |
| `ABS(num)` | Absolute value |
| `ROUND(num)` | Round to nearest integer |
| `ROUNDUP(num)` | Round up |
| `ROUNDDOWN(num)` | Round down |

#### Formula Examples

```javascript
// Arithmetic
sheet.setCellValue(0, 0, '=A1+B1*2');
sheet.setCellValue(0, 1, '=(C1+D1)/E1');

// Functions
sheet.setCellValue(0, 2, '=SUM(A1:A10)');
sheet.setCellValue(0, 3, '=IF(B2>100, "High", "Low")');
sheet.setCellValue(0, 4, '=AVERAGE(B2:D2)');
sheet.setCellValue(0, 5, '=CONCAT(A1, " - ", B1)');

// Mixed references
sheet.setCellValue(1, 0, '=SUM(A1:A5)*2 + MAX(B1:B5)');
```

#### Circular Reference Protection

The formula evaluator includes circular reference detection. It returns `#CIRC!` when a cycle is detected.

```javascript
sheet.setCellValue(0, 0, '=A1');  // Self-reference → #CIRC!
```

### Import & Export

#### Export to XLSX

```javascript
// One-click export (with styles)
sheet.exportFile();
// The browser will download spreadsheet.xlsx automatically
```

#### Import from XLSX

```javascript
// Open file picker
sheet.importFile();

// Import from a server URL
await sheet.importFromUrl('https://example.com/data.xlsx');

// With custom headers
await sheet.importFromUrl('https://api.example.com/report.xlsx', {
  headers: { 'Authorization': 'Bearer token123' },
  credentials: 'include'
});
```

#### Save Callback (onSave)

```javascript
sheet.onSave(function(blob, allData, instance) {
  // blob:    XLSX file as a Blob
  // allData: All sheets data collection
  //   {
  //     "Sheet1": [["A1","B1"],["A2","B2"]],           // 2D array (no columns)
  //     "Employee": [{id:1,name:"Alice"},{...}]          // object array (has columns)
  //   }
  // instance: The ExcelABu instance

  // Example: upload to server
  const formData = new FormData();
  formData.append('file', blob, 'spreadsheet.xlsx');
  fetch('https://api.example.com/upload', {
    method: 'POST',
    body: formData
  });

  console.log('Saved! Total sheets:', Object.keys(allData).length);
});
```

### Undo & Redo

```javascript
sheet.undo();  // Undo last action
sheet.redo();  // Redo last undone action
```

Each sheet maintains its own independent undo/redo stacks. Switching sheets preserves history. Maximum 50 steps by default.

### Style Operations

```javascript
// Set column width
sheet.setColWidth(0, 120);   // Column A = 120px
sheet.setColWidth(2, 200);   // Column C = 200px

// Set row height
sheet.setRowHeight(0, 40);   // Row 1 = 40px
```

### Full Lifecycle

```javascript
// Create
const sheet = new ExcelABu('#app', { rows: 100, cols: 20 });

// Use
sheet.loadData(data);
sheet.addNewSheet('Summary');
sheet.selectCell('B2');

// Destroy (cleanup)
sheet.destroy();  // Removes event listeners, clears container, prevents memory leaks
```

---

## Internationalization

ExcelABu ships with built-in Chinese and English language support. Language detection priority:

1. Language preference stored in `localStorage` (key: `excelabu_lang`)
2. Default language: Chinese

```javascript
// Switch language via localStorage
localStorage.setItem('excelabu_lang', 'en');
location.reload();  // Refresh to apply
```

Toolbar labels, menu items, context menus, and dialog texts are all internationalized. To add a new language, add a new translation object to `config/i18n.js`.

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 80+ | Full support |
| Firefox 80+ | Full support |
| Safari 14+ | Full support |
| Edge 80+ | Full support |
| IE 11 | Not supported (requires modern ES and CSS features) |

### Dependencies

- **SheetJS (xlsx)**: Import/export depends on the `js-xlsx` library, loaded dynamically via a `<script>` tag on first use (CDN: `https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`).
- **No other third-party dependencies**: All core spreadsheet functionality is zero-dependency vanilla JavaScript.

---

## License

MIT