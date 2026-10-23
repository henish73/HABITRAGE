import { tokens } from './index';

type Palette = (typeof tokens.colors)['light'] | (typeof tokens.colors)['dark'];

/** "#0E8A78" -> "172 78% 30%" (the space-separated form Tailwind's hsl(var(--x)) colors expect). */
export function hexToHslTriplet(hex: string): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * CSS custom properties for one theme: the Vault palette as hex (--canvas, --teal …)
 * plus the HSL aliases the Tailwind/shadcn color names use (--background, --accent …).
 * The surface shades --secondary, --muted and --popover stay hand-tuned in globals.css.
 */
export function themeCssVariables(palette: Palette): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    // "muted" clashes with the shadcn HSL --muted, so the hex value is --muted-color.
    vars[key === 'muted' ? '--muted-color' : `--${kebab(key)}`] = value;
  }
  const hsl = hexToHslTriplet;
  Object.assign(vars, {
    '--background': hsl(palette.canvas),
    '--foreground': hsl(palette.ink),
    '--card': hsl(palette.surface),
    '--card-foreground': hsl(palette.ink),
    '--popover-foreground': hsl(palette.ink),
    '--secondary-foreground': hsl(palette.muted),
    '--muted-foreground': hsl(palette.muted),
    '--accent': hsl(palette.teal),
    '--positive': hsl(palette.pos),
    '--negative': hsl(palette.neg),
    '--destructive': hsl(palette.neg),
    '--warning': hsl(palette.warn),
    '--border': hsl(palette.line),
    '--input': hsl(palette.line),
    '--ring': hsl(palette.teal),
  });
  return vars;
}
