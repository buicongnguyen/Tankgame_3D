import {UI} from './vi-ui';
import {MESSAGES} from './vi-messages';
import {STORY,STORY_PATTERNS} from './vi-story';
import {PATTERNS} from './vi-patterns';
export const VI_TEXT:Record<string,string>={...UI,...MESSAGES,...STORY};
export const VI_PATTERNS:[string,string][]=[...STORY_PATTERNS,...PATTERNS];
