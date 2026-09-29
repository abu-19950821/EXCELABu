import { FreezeMenuMixin } from './freeze_menu.js?v=1';
import { SortMenuMixin } from './sort_menu.js?v=1';
import { BorderMenuMixin } from './border_menu.js?v=1';

const _ToolbarMixin = {};
Object.defineProperties(_ToolbarMixin, Object.getOwnPropertyDescriptors(FreezeMenuMixin));
Object.defineProperties(_ToolbarMixin, Object.getOwnPropertyDescriptors(SortMenuMixin));
Object.defineProperties(_ToolbarMixin, Object.getOwnPropertyDescriptors(BorderMenuMixin));

export const ToolbarMixin = _ToolbarMixin;