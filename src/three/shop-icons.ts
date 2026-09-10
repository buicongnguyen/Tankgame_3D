import type {Upgrade} from './rules';
// Decorative SVGs inherit the shop palette; visible labels provide accessible names.
export function upgradeIcon(id:Upgrade){
 const paths:Record<Upgrade,string>={
 armor:'<path d="M16 3 27 7v9c0 7-11 13-11 13S5 23 5 16V7Z"/><path d="m10 16 4 4 8-9"/>',
 power:'<path d="m18 2-12 17h9l-1 11 12-18h-9Z"/><path d="M3 6h5M25 26h4"/>',
 reload:'<path d="M26 12A11 11 0 0 0 7 7L3 11m0-7v7h7M6 20a11 11 0 0 0 19 5l4-4m0 7v-7h-7"/><path d="M16 10v7l4 2"/>'};
 return `<svg class="upgrade-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[id]}</svg>`;
}
