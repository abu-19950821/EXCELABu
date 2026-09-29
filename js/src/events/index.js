import { EventsMouseMixin } from "./mouse.js?v=1";
import { EventsResizeMixin } from "./resize.js?v=2";
import { EventsKeyboardMixin } from "./keyboard.js?v=1";

const _EventsMixin = {};
Object.defineProperties(_EventsMixin, Object.getOwnPropertyDescriptors(EventsMouseMixin));
Object.defineProperties(_EventsMixin, Object.getOwnPropertyDescriptors(EventsResizeMixin));
Object.defineProperties(_EventsMixin, Object.getOwnPropertyDescriptors(EventsKeyboardMixin));

export const EventsMixin = _EventsMixin;