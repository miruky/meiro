// 線画のSVGアイコン。currentColorでテーマに追従し、装飾なので aria-hidden を付ける。

const PATHS: Readonly<Record<string, string>> = {
  play: '<path d="M7 5.2 18.5 12 7 18.8Z" fill="currentColor" stroke="none" />',
  pause:
    '<rect x="7" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none" /><rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none" />',
  step: '<path d="M6 5l9 7-9 7Z" fill="currentColor" stroke="none" /><rect x="16.5" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none" />',
  reset: '<path d="M5 12a7 7 0 1 0 2-4.9" /><path d="M4 4v4h4" />',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />',
  route:
    '<circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="6" r="2.4" /><path d="M8 17c4 0 4-11 8-11" stroke-dasharray="2.4 2.6" />',
  link: '<path d="M9 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L10.5 6.5" /><path d="M15 10a4 4 0 0 0-5.66 0L6.5 12.84a4 4 0 0 0 5.66 5.66L13.5 17.5" />',
  check: '<path d="M5 12.5 10 17 19 7" />',
};

export function icon(name: keyof typeof PATHS, size = 20): string {
  return (
    `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true">${PATHS[name]}</svg>`
  );
}

export type IconName = keyof typeof PATHS;
