/** Convert kebab-case to PascalCase (e.g. "a-arrow-down" -> "AArrowDown") */
export function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert PascalCase to kebab-case.
 * e.g. "AArrowDown" -> "a-arrow-down"
 */
export function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
