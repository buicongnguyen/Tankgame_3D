import type {Save} from './campaign';
import {ownsWeapon} from './campaign';
import {UPGRADES,UPGRADE_CAP,upgradeCost} from './rules';
import type {Upgrade} from './rules';
import {upgradeIcon} from './shop-icons';
import {WEAPONS,weaponLevel,weaponUpgradeCost,weaponDamage,barrels,powerMultiplier,reloadMultiplier,reloadSeconds,engineMultiplier,shieldBonus,shieldCooldown} from './armory';
import {getSkin} from './skins';
const titles:Record<Upgrade,string>={armor:'Reactive armor',power:'Shaped charges',reload:'Autoloader',engine:'Drive engine',shield:'Shield generator'};
function systemValue(save:Save,id:Upgrade){
 if(id==='armor')return `${240+save.upgrades.armor*65} base hull`;
 if(id==='power')return `Damage ×${powerMultiplier(save).toFixed(2)}`;
 if(id==='reload')return `Reload ×${reloadMultiplier({...save,weaponLevels:[]},0).toFixed(2)}`;
 if(id==='engine')return `Speed ×${engineMultiplier(save).toFixed(2)}`;
 return `${(getSkin(save.skin).shield+shieldBonus(save)).toFixed(1)}s shield / ${shieldCooldown(save).toFixed(1)}s recharge`;
}
export function workshop(save:Save){
 return `<div class="depot-heading"><h2>Tank systems</h2><span>20 LEVELS EACH</span></div><div class="upgrade-grid">${UPGRADES.map(id=>{
  const level=save.upgrades[id]??0,cost=upgradeCost(level),max=level>=UPGRADE_CAP,next={...save,upgrades:{...save.upgrades,[id]:Math.min(UPGRADE_CAP,level+1)}};
  return `<article class="upgrade-card"><span class="eyebrow">LEVEL ${level} / ${UPGRADE_CAP}</span><h3>${upgradeIcon(id)}${titles[id]}</h3><p>${systemValue(save,id)}${max?'':` → ${systemValue(next,id)}`}</p><button data-action="buy" data-value="${id}" ${max||save.credits<cost?'disabled':''}>${max?'MAX LEVEL':`UPGRADE · ${cost} CR`}</button></article>`;
 }).join('')}</div><div class="depot-heading"><h2>Weapons</h2><span>INDIVIDUAL UPGRADES</span></div><p class="shop-weapon-help">Purchases equip next mission. Switch Gun or C / 1–9 in battle.</p><div class="upgrade-grid weapon-shop">${WEAPONS.map((w,id)=>{
  const owned=ownsWeapon(save,id),level=weaponLevel(save,id),cost=owned?weaponUpgradeCost(level):w.price,max=level>=UPGRADE_CAP,damage=Math.round(w.damage*weaponDamage(save,id)*powerMultiplier(save)*getSkin(save.skin).damage),next={...save,weaponLevels:save.weaponLevels.map((n,i)=>i===id?Math.min(UPGRADE_CAP,n+1):n)},nextDamage=Math.round(w.damage*weaponDamage(next,id)*powerMultiplier(save)*getSkin(save.skin).damage);
  return `<article class="upgrade-card" data-weapon-card="${id}"><span class="eyebrow">${owned?'OWNED':'LOCKED'} · LEVEL ${level} / ${UPGRADE_CAP}</span><h3>${w.name}</h3><p>${w.description}</p><small class="weapon-stat">${damage}${owned&&!max?` → ${nextDamage}`:''} ${w.flame?'burst damage':'damage'}${id===5?` × ${barrels(save,id)}`:id===7?' × 3':''} · ${reloadSeconds(save,id).toFixed(2)}s ${w.flame?'burst interval':'reload'}</small><button data-action="${owned?'upgrade-weapon':'buy-weapon'}" data-value="${id}" ${owned&&max||save.credits<cost?'disabled':''}>${owned&&max?'MAX LEVEL':`${owned?'UPGRADE':'BUY'} · ${cost} CR`}</button></article>`;
 }).join('')}</div>`;
}
