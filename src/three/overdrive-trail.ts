import * as T from 'three';
import { reducedMotion } from './media';

// One additive surface follows the hull. Its top edge tucks underneath the rear armor.
function makeTrail() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const glow = ctx.createRadialGradient(64, 178, 2, 64, 178, 54);
  glow.addColorStop(0, '#e6ffff');
  glow.addColorStop(0.25, 'rgba(96,233,255,.9)');
  glow.addColorStop(1, 'rgba(41,165,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Two fine pairs of track streaks fade towards the ground behind the tank.
  for (const [start, end, length] of [[26, 15, 140], [34, 29, 100], [94, 99, 100], [102, 113, 140]]) {
    const fade = ctx.createLinearGradient(0, 169, 0, 169 - length);
    fade.addColorStop(0, 'rgba(207,255,255,.95)');
    fade.addColorStop(1, 'rgba(73,203,255,0)');
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.moveTo(start - 2, 169);
    ctx.lineTo(start + 2, 169);
    ctx.lineTo(end, 169 - length);
    ctx.fill();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const geometry = new T.PlaneGeometry(3.5, 3.8).rotateX(-Math.PI / 2).translate(0, 0, -1.9);
  const material = new T.MeshBasicMaterial({map:texture, transparent:true, depthWrite:false, blending:T.AdditiveBlending, toneMapped:false});
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'OverdriveTrail';
  mesh.position.set(0, .42, -1.46);
  return mesh;
}

export class OverdriveTrail {
  private mesh?: ReturnType<typeof makeTrail>;

  update(hull:T.Object3D, remaining:number, vx:number, vz:number) {
    if (remaining <= 0) {
      this.mesh?.removeFromParent();
      return;
    }
    const mesh = this.mesh ??= makeTrail();
    if (mesh.parent !== hull) hull.add(mesh);
    const speed = Math.min(1, Math.hypot(vx, vz) / 10);
    mesh.scale.z = reducedMotion() ? .26 : .35 + speed * .75;
    mesh.material.opacity = .9 * Math.min(1, remaining / .18);
  }
}
