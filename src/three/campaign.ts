import type { Upgrade } from './rules';
export type MissionKind = 'assault' | 'capture' | 'escort' | 'defense' | 'boss';
export interface Mission { name: string; sector: string; kind: MissionKind; briefing: string; radio: string; debrief: string; objective: string; count: number; duration: number; reward: number; }
export const MISSIONS: Mission[] = [
  { name: 'First Light', sector: 'MERIDIAN OUTSKIRTS', kind: 'assault', briefing: 'A distress signal is repeating from the valley. Your crew is the only one close enough to answer. Clear the outer patrol and find a way through.', radio: 'IVO / Use cover. Keep your front armor toward hostile guns.', debrief: 'The patrol is down. We found the broadcast: a rescue convoy is trapped beyond the relay.', objective: 'Clear the outer patrol', count: 3, duration: 0, reward: 180 },
  { name: 'Open Frequency', sector: 'RELAY STATION 07', kind: 'capture', briefing: 'The convoy cannot hear us. Reach the amber relay and hold it free of hostile armor for 18 seconds. The Warden network will try to take it back.', radio: 'IVO / Hold the ring for 18s. Hostiles interrupt capture.', debrief: 'A voice answers: “We have families aboard. Please tell us the road is open.” Mara turns toward the pass.', objective: 'Secure the relay · 18 seconds', count: 3, duration: 18, reward: 230 },
  { name: 'Homeward', sector: 'SOUTHERN EVACUATION ROAD', kind: 'escort', briefing: 'The rescue transport is moving. Stay within 12 meters so its driver can follow your signals. Clear ambushers and guide it to the northern extraction gate.', radio: 'MARA / Stay near the transport to keep it moving.', debrief: 'The first transport reaches shelter. The evacuation uplink is still exposed, and the network is turning toward it.', objective: 'Escort the rescue transport', count: 4, duration: 0, reward: 260 },
  { name: 'Long Night', sector: 'EVACUATION UPLINK', kind: 'defense', briefing: 'Hold the uplink alive for 45 seconds while Ivo routes the remaining transports. Intercept enemies before they break the relay. Watch both the relay and your hull.', radio: 'IVO / Protect the relay for 45s.', debrief: 'The uplink holds. Every transport has a route home. One siege battery still covers the final crossing.', objective: 'Defend the uplink · 45 seconds', count: 4, duration: 45, reward: 280 },
  { name: 'Glass Road', sector: 'WARDEN PERIMETER', kind: 'assault', briefing: 'Heavy armor is holding the final crossing. Use rockets to break clustered enemies and circle their fronts. The supply drums can turn their own position against them.', radio: 'MARA / Flank the heavies. Aim for their rear armor.', debrief: 'The crossing is open. The command machine has left its bunker. This is our chance to end the siege.', objective: 'Break the siege battery', count: 6, duration: 0, reward: 320 },
  { name: 'Last Signal', sector: 'WARDEN COMMAND', kind: 'boss', briefing: 'Warden is the machine coordinating the siege. Destroy its command tank. Its Rail Titan platform charges a fixed red firing line. Sidestep the shot, then attack its exposed green core.', radio: 'IVO / Rail Titan: dodge the red line, then hit its exposed core.', debrief: 'The red lights go dark. Across Meridian, radios come alive. The last transport crosses the bridge. For the first time tonight, the road is quiet.', objective: 'Destroy the Warden command tank', count: 3, duration: 0, reward: 400 },
  { name:'River Run', sector:'FLOODED VILLAGES', kind:'assault', briefing:'The valley is safe, but isolated settlements still need supplies. The Tempest missile carrier guards the patrol. Leave its red circles before impact, then strike its open core. Bridges keep your speed; crossing the water slows both sides. Brick houses can reveal medical supplies.', radio:'IVO / Tempest: leave the red zones, then hit its exposed core.', debrief:'The river villages have supplies again. A transport is waiting below the snow line.', objective:'Clear the river patrol', count:6, duration:0, reward:340 },
  { name:'Frozen Pass', sector:'NORTHERN HIGHLANDS', kind:'escort', briefing:'Guide the last relief transport through the winter pass. Stay on the cleared road for full speed. Trees and stone walls can be destroyed; steel barriers and rocky hills stop shells.', radio:'MARA / The road is clear. Snow slows movement off-road.', debrief:'The transport reaches the mountain shelters. Restore the ridge transmitter to reconnect them.', objective:'Escort the mountain relief convoy', count:5, duration:0, reward:360 },
  { name:'Ridge Watch', sector:'HIGHLAND TRANSMITTER', kind:'defense', briefing:'Protect the transmitter for 45 seconds. Iron Sovereign patrols the ridge on six legs. Dodge its three-shell volley and strike the exposed core. Avoid the muddy eastern approach. Destroy stone cover to open a flank.', radio:'IVO / Sovereign: dodge the spread, then hit its green core.', debrief:'The ridge signal joins the valley network. From river villages to mountain shelters, Meridian is connected again.', objective:'Defend the ridge uplink · 45 seconds', count:5, duration:45, reward:420 },

];
export const SAVE_KEY = 'steel-front-3d-v1';
export type Difficulty = 'story' | 'standard' | 'veteran';
export interface Save { version: 1; mission: number; cleared: boolean[]; credits: number; weapons: number[]; upgrades: Record<Upgrade, number>; difficulty: Difficulty; sound: boolean; low: boolean; }
export const freshSave = (): Save => ({ version: 1, mission: 0, cleared: Array(MISSIONS.length).fill(false), credits: 0, weapons: [], upgrades: { armor: 0, power: 0, reload: 0 }, difficulty: 'standard', sound: false, low: false });
export function parseSave(raw: string | null): Save {
  try {
    const s = JSON.parse(raw || 'null');
    if (!s || s.version !== 1 || !Number.isInteger(s.mission) || s.mission < 0 || s.mission >= s.cleared?.length || !Array.isArray(s.cleared) || ![6,MISSIONS.length].includes(s.cleared.length) || s.cleared.some((v: unknown) => typeof v !== 'boolean') || !Number.isInteger(s.credits) || s.credits < 0 || s.credits > 100000 || !['story','standard','veteran'].includes(s.difficulty)) return freshSave();
    if (!s.upgrades || ['armor','power','reload'].some(k => !Number.isInteger(s.upgrades[k]) || s.upgrades[k] < 0 || s.upgrades[k] > 3)) return freshSave();
    s.weapons ??= [];
    if(!Array.isArray(s.weapons)||s.weapons.some((w:unknown)=>!Number.isInteger(w)||Number(w)<1||Number(w)>4)||new Set(s.weapons).size!==s.weapons.length)return freshSave();
    // Extend old six-operation saves without changing earned progress or purchases.
    if(s.cleared.length===6){const finished=s.cleared.every(Boolean);s.cleared.push(...Array(MISSIONS.length-6).fill(false));if(finished)s.mission=6;}
    // A checkpoint cannot unlock past a gap in the campaign.
    const firstUncleared = s.cleared.indexOf(false);
    if (firstUncleared >= 0 && (s.mission > firstUncleared || s.cleared.slice(firstUncleared).some(Boolean))) return freshSave();
    return { ...s, sound: s.sound === true, low: s.low === true };
  } catch { return freshSave(); }
}
export function rewardClear(save: Save, mission: number): number {
  if (save.cleared[mission]) return 0;
  save.cleared[mission] = true;
  const reward = MISSIONS[mission].reward;
  save.credits += reward;
  save.mission = Math.min(MISSIONS.length-1, mission + 1);
  return reward;
}
export const weaponNames = ['120 mm cannon', '30 mm autocannon', 'Siege rockets','Pulse laser','Arc rockets'];
export function weaponCount(save: Save): number { return Math.max(save.cleared[2]?3:save.cleared[0]?2:1,...save.weapons.filter(w=>w<3).map(w=>w+1)); }

export const weaponPrices:Record<number,number>={1:120,2:180,3:360,4:420};
export function ownsWeapon(save:Save,id:number){return id<3?id<weaponCount(save):save.weapons.includes(id);}
export function buyWeapon(save:Save,id:number){const cost=weaponPrices[id];if(!cost||ownsWeapon(save,id)||save.credits<cost)return false;save.credits-=cost;save.weapons.push(id);return true;}
