import type {Save} from './campaign';
export const STRIKES_PER_BACKGROUND=2;
/** First deployment only: no grants from preview, retry, level changes or revisits. */
export function grantBackgroundStrikes(save:Save,index:number){
 if(!Number.isInteger(index)||index<0||index>=save.strikeBackgrounds.length||save.strikeBackgrounds[index])return 0;
 save.strikeBackgrounds[index]=true;save.strikeCharges+=STRIKES_PER_BACKGROUND;
 return STRIKES_PER_BACKGROUND;
}
