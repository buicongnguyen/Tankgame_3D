import type {Save} from './campaign';
import {ownsWeapon} from './campaign';
import {UPGRADES,UPGRADE_CAP,upgradeCost} from './rules';
import type {Upgrade} from './rules';
import {AUTO_PACK} from './auto-missiles';
import {ammoCapacity} from './skins';
import {upgradeIcon,weaponIcon,coin} from './shop-icons';
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
 return `<article class="field-pack"><div>${weaponIcon(6)}<strong>Auto missiles <span>${save.autoPack?'PACK READY':`× ${ammoCapacity(save.skin,AUTO_PACK.rounds)}`}</span></strong><p>Next sortie only · E / Auto · vehicles within 42 m</p><small>Unused rounds expire on exit, defeat or restart.</small></div><button data-action="buy-auto" aria-label="Buy Auto missile pack for 40 credits" ${save.autoPack||save.credits<AUTO_PACK.price?'disabled':''}>${save.autoPack?'READY':coin(AUTO_PACK.price)}</button></article><div class="depot-heading"><h2>Tank systems</h2><span>20 LEVELS EACH</span></div><div class="upgrade-grid">${UPGRADES.map(id=>{
  const level=save.upgrades[id]??0,cost=upgradeCost(level),max=level>=UPGRADE_CAP,next={...save,upgrades:{...save.upgrades,[id]:Math.min(UPGRADE_CAP,level+1)}};
  return `<article class="upgrade-card"><span class="eyebrow">LEVEL ${level} / ${UPGRADE_CAP}</span><h3>${upgradeIcon(id)}${titles[id]}</h3><p>${systemValue(save,id)}${max?'':` → ${systemValue(next,id)}`}</p><button class="price-button" aria-label="Upgrade ${titles[id]} for ${cost} credits" data-action="buy" data-value="${id}" ${max||save.credits<cost?'disabled':''}>${max?'MAX':coin(cost)}</button></article>`;
 }).join('')}</div><div class="depot-heading"><h2>Weapons</h2><span>INDIVIDUAL UPGRADES</span></div><p class="shop-weapon-help">Equip next sortie · C / 1–9 to switch.</p><div class="upgrade-grid weapon-shop">${WEAPONS.map((w,id)=>{
  const owned=ownsWeapon(save,id),level=weaponLevel(save,id),cost=owned?weaponUpgradeCost(level):w.price,max=level>=UPGRADE_CAP,damage=Math.round(w.damage*weaponDamage(save,id)*powerMultiplier(save)*getSkin(save.skin).damage),next={...save,weaponLevels:save.weaponLevels.map((n,i)=>i===id?Math.min(UPGRADE_CAP,n+1):n)},nextDamage=Math.round(w.damage*weaponDamage(next,id)*powerMultiplier(save)*getSkin(save.skin).damage);
  return `<article class="upgrade-card" data-weapon-card="${id}"><details class="weapon-info"><summary aria-label="Details for ${w.name}"><h3>${weaponIcon(id)}${w.name}<span class="detail-cue" aria-hidden="true">⌄</span></h3><span class="eyebrow">${owned?'OWNED':'LOCKED'} · LEVEL ${level} / ${UPGRADE_CAP}</span></summary><p>${w.description}</p></details><small class="weapon-stat">${damage}${owned&&!max?` → ${nextDamage}`:''} ${w.flame?'burst damage':'damage'}${id===5?` × ${barrels(save,id)}`:id===7?' × 3':''} · ${reloadSeconds(save,id).toFixed(2)}s ${w.flame?'burst interval':'reload'}${w.capacity?` · ${ammoCapacity(save.skin,w.capacity)} ${id===7?'volleys':id===8?'bursts':'shots'}`:''}</small><button class="price-button" aria-label="${owned?'Upgrade':'Buy'} ${w.name} for ${cost} credits" data-action="${owned?'upgrade-weapon':'buy-weapon'}" data-value="${id}" ${owned&&max||save.credits<cost?'disabled':''}>${owned&&max?'MAX':coin(cost)}</button></article>`;
 }).join('')}</div>`;
}
