import type {Upgrade} from './rules';
// Decorative SVGs inherit the shop palette; visible labels provide accessible names.
export function upgradeIcon(id:Upgrade){
 const paths:Record<Upgrade,string>={
 engine:'<path d="m4 8 10 8L4 24M17 8l10 8-10 8"/>',
 shield:'<path d="M16 3 27 7v9c0 7-11 13-11 13S5 23 5 16V7Z"/><path d="M16 9v13M10 16h12"/>',
 armor:'<path d="M16 3 27 7v9c0 7-11 13-11 13S5 23 5 16V7Z"/><path d="m10 16 4 4 8-9"/>',
 power:'<path d="m18 2-12 17h9l-1 11 12-18h-9Z"/><path d="M3 6h5M25 26h4"/>',
 reload:'<path d="M26 12A11 11 0 0 0 7 7L3 11m0-7v7h7M6 20a11 11 0 0 0 19 5l4-4m0 7v-7h-7"/><path d="M16 10v7l4 2"/>'};
 return `<svg class="upgrade-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[id]}</svg>`;
}

export const coin=(cost:number)=>`<svg class="coin-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 8h-3l-2 4 2 4h3M7 12h8" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>${cost}</span>`;
export function weaponIcon(id:number){
 const paths=[
 'M5 25h22M8 22V12h13v10M16 12V3',
 'M7 26V12h18v14M12 12V3M20 12V3',
 'm10 25-5 3 1-8L20 4l7-1-1 7-16 15ZM15 11l6 6',
 'M6 27 14 19M16 17l11-11M21 4l7 7M6 20l6 6M15 5v4M24 19h5',
 'M5 25Q7 4 27 7m-6-4 6 4-5 5M3 28h7',
 'M5 25h22M8 21V13h16v8M9 13V3M14 13V3M19 13V3M24 13V3',
 'm5 24 8-8 4 4-8 8ZM13 16 24 5l4-1-1 4-10 12M4 12l5-5',
 'M3 27Q3 7 18 5M11 27Q11 7 24 5M19 27Q19 11 29 10',
 'M16 3c3 8-3 8 3 13 4-1 4-4 4-4 10 17-16 21-16 7 0-4 5-7 9-16Z'];
 return `<svg class="upgrade-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[id]??paths[2]}"/></svg>`;
}
