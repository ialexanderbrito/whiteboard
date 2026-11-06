export const STICKY_COLORS = [
  { name: 'Amarelo', value: '#fff9b1', text: '#713f12' },
  { name: 'Verde', value: '#dcfce7', text: '#14532d' },
  { name: 'Azul', value: '#e0f2fe', text: '#0c4a6e' },
  { name: 'Rosa', value: '#fce7f3', text: '#831843' },
  { name: 'Laranja', value: '#ffedd5', text: '#7c2d12' },
  { name: 'Roxo', value: '#f3e8ff', text: '#581c87' },
];

export const USER_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

export function getRandomUserColor(): string {
  const index = Math.floor(Math.random() * USER_COLORS.length);
  return USER_COLORS[index];
}
