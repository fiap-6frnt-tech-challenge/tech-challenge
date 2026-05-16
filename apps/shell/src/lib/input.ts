type FocusConfig = { variant?: 'focus' | 'focus-within' } | { active: boolean };

/**
 * Returns border color classes for input-like elements.
 *
 * CSS-driven focus (default): `getInputBorderColor(error)`
 *   → `focus:border-brand-primary`
 *
 * CSS-driven focus-within (wrapper divs): `getInputBorderColor(error, { variant: 'focus-within' })`
 *   → `focus-within:border-brand-primary`
 *
 * JS-driven open state (e.g. Select): `getInputBorderColor(error, { active: open })`
 *   → `border-brand-primary` when active, `focus-within:border-brand-primary` when focused but closed
 */
export function getInputBorderColor(error?: boolean, config: FocusConfig = {}): string {
  if (error) return 'border-feedback-danger';
  if ('active' in config) {
    return config.active
      ? 'border-brand-primary'
      : 'border-border focus-within:border-brand-primary';
  }
  const variant = config.variant ?? 'focus';
  if (variant === 'focus-within') return 'border-border focus-within:border-brand-primary';
  return 'border-border focus:border-brand-primary';
}
