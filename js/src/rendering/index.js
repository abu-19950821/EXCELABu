import { RenderingGridMixin } from './grid.js?v=3';
import { RenderingFrozenMixin } from './frozen.js?v=1';
import { RenderingCellMixin } from './cell.js?v=2';

const _RenderingMixin = {};
Object.defineProperties(_RenderingMixin, Object.getOwnPropertyDescriptors(RenderingGridMixin));
Object.defineProperties(_RenderingMixin, Object.getOwnPropertyDescriptors(RenderingFrozenMixin));
Object.defineProperties(_RenderingMixin, Object.getOwnPropertyDescriptors(RenderingCellMixin));

export const RenderingMixin = _RenderingMixin;