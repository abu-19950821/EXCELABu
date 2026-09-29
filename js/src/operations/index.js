import { OperationsSheetMixin } from './sheet.js?v=2';
import { OperationsShareMixin } from './share.js?v=2';
import { OperationsFreezeMixin } from './freeze.js?v=2';
import { OperationsSortMixin } from './sort.js?v=1';
import { OperationsMergeMixin } from './merge.js?v=2';
import { OperationsInsertDeleteMixin } from './insert_delete.js?v=2';
import { OperationsClearMixin } from './clear.js?v=1';
import { OperationsStylesMixin } from './styles.js?v=2';
import { OperationsBordersMixin } from './borders.js?v=1';
import { OperationsFillHandleMixin } from './fill_handle.js?v=1';
import { OperationsFindReplaceMixin } from './find_replace.js?v=2';
import { OperationsConditionalMixin } from './conditional.js?v=1';

const _OperationsMixin = {};
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsSheetMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsShareMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsFreezeMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsSortMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsMergeMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsInsertDeleteMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsClearMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsStylesMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsBordersMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsFillHandleMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsFindReplaceMixin));
Object.defineProperties(_OperationsMixin, Object.getOwnPropertyDescriptors(OperationsConditionalMixin));

export const OperationsMixin = _OperationsMixin;