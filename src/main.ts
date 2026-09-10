import './three/style.css';
import { Game } from './three/game';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML='<div class="loading"><span class="eyebrow">KESTREL // CONNECTING</span><h1>Establishing uplink<span class="blink">_</span></h1><p>Preparing the valley and armored units.</p></div>';
try { const game=new Game(app); await game.init(); }
catch(error){console.error(error);app.innerHTML='<div class="loading"><span class="eyebrow">UPLINK INTERRUPTED</span><h1>The battlefield could not load.</h1><p>This game requires WebGL 2. Check your connection or enable hardware acceleration, then reload.</p><button onclick="location.reload()">Reconnect</button><a href="./legacy.html">Open the original 2D game</a></div>';}
