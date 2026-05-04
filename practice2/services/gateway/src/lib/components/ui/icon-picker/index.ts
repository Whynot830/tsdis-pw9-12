import IconPicker from './icon-picker.svelte';
import IconDisplay from './icon-display.svelte';
import type { iconsData } from '$lib/data/icons-data.js';

export type IconData = (typeof iconsData)[number];

export { IconPicker, IconDisplay };
