import { IsMobile } from '$lib/hooks/is-mobile.svelte.js';
import { getContext, setContext } from 'svelte';

type Getter<T> = () => T;

export type ComboboxStateProps = {
  open: Getter<boolean>;
  setOpen: (open: boolean) => void;
};

export class ComboboxState {
  readonly props: ComboboxStateProps;
  open = $derived.by(() => this.props.open());
  setOpen: ComboboxStateProps['setOpen'];
  #isMobile: IsMobile;

  constructor(props: ComboboxStateProps) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.props = props;
  }

  get isMobile() {
    return this.#isMobile.current;
  }
}

export const COMBOBOX_CONTEXT_KEY = Symbol('combobox-context');

export function setCombobox(props: ComboboxStateProps): ComboboxState {
  return setContext(COMBOBOX_CONTEXT_KEY, new ComboboxState(props));
}

export function useCombobox(): ComboboxState {
  return getContext(COMBOBOX_CONTEXT_KEY);
}
