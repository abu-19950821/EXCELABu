import { CoreInitMixin } from './init.js?v=1';
import { CoreDOMMixin } from './dom.js?v=1';
import { CoreBindEventsMixin } from './bind_events.js?v=2';
import { CoreActionMixin } from './action.js?v=1';
import { CoreSaveMixin } from './save.js?v=1';

const _CoreMixin = {};
Object.defineProperties(_CoreMixin, Object.getOwnPropertyDescriptors(CoreInitMixin));
Object.defineProperties(_CoreMixin, Object.getOwnPropertyDescriptors(CoreDOMMixin));
Object.defineProperties(_CoreMixin, Object.getOwnPropertyDescriptors(CoreBindEventsMixin));
Object.defineProperties(_CoreMixin, Object.getOwnPropertyDescriptors(CoreActionMixin));
Object.defineProperties(_CoreMixin, Object.getOwnPropertyDescriptors(CoreSaveMixin));

export const CoreMixin = _CoreMixin;