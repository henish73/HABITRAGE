/**
 * FinanceOS 2.0 Vault Design Tokens
 * Single source of truth for Web (CSS Variables & Tailwind) and Mobile (React Native / Expo)
 */

export const tokens = {
  colors: {
    light: {
      canvas: '#F3F5F9',
      surface: '#FFFFFF',
      raised: '#F8FAFC',
      line: '#DFE5EE',
      lineSoft: '#EAEFF5',
      ink: '#0E1726',
      muted: '#5A6B80',
      faint: '#8A99AD',
      vault: '#13294B',
      vaultInk: '#E9F0FB',
      vaultMuted: '#9FB2CF',
      teal: '#0E8A78',
      tealSoft: '#E0F2EE',
      pos: '#16835A',
      posSoft: '#E2F2EA',
      neg: '#C23A2E',
      negSoft: '#FBE8E5',
      warn: '#B8770A',
      warnSoft: '#FBF0DA',
    },
    dark: {
      canvas: '#070C15',
      surface: '#0E1522',
      raised: '#121B2B',
      line: '#1F2B3F',
      lineSoft: '#172234',
      ink: '#E7EEF8',
      muted: '#8FA0B7',
      faint: '#62738C',
      vault: '#0A1424',
      vaultInk: '#E7EEF8',
      vaultMuted: '#7F93B1',
      teal: '#39C9B2',
      tealSoft: '#0F2E2A',
      pos: '#4CC38A',
      posSoft: '#0F2A1E',
      neg: '#F2796C',
      negSoft: '#331614',
      warn: '#E8AE45',
      warnSoft: '#32250D',
    },
  },
  typography: {
    fontFamilies: {
      ui: 'Geist, system-ui, -apple-system, "Segoe UI", sans-serif',
      mono: 'Geist Mono, ui-monospace, "SF Mono", Consolas, monospace',
    },
    scales: {
      hero: { fontSize: 40, fontWeight: '600', letterSpacing: '-0.04em', lineHeight: 1.1 },
      title: { fontSize: 28, fontWeight: '700', letterSpacing: '-0.03em' },
      section: { fontSize: 17, fontWeight: '600' },
      body: { fontSize: 15.5, fontWeight: '400', lineHeight: 1.6 },
      label: { fontSize: 11, fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' },
      amount: { fontSize: 14, fontWeight: '600' },
    },
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 11,
    lg: 14,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },
  cardGradients: {
    amexEssential: ['#2B5C8A', '#173A5E'],
    tdLowRate: ['#2C7A4B', '#17492C'],
    amexGreen: ['#5E7A62', '#34493A'],
    rogersMastercard: ['#9B2F2F', '#5C1B1B'],
    cibcDividend: ['#8E2B35', '#4E1720'],
    amexSimplyCash: ['#1C3757', '#0F2033'],
  },
} as const;

export type DesignTokens = typeof tokens;
export default tokens;
