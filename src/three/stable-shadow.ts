import * as T from 'three';

/** Keep the moving sun's shadow texels fixed on the world instead of crawling over it. */
export class StableShadow {
  private offset = new T.Vector3();
  private right = new T.Vector3();
  private up = new T.Vector3();
  private light: T.DirectionalLight;

  constructor(light: T.DirectionalLight) {
    this.light = light;
    this.offset.subVectors(light.position, light.target.position);
    const rotation = new T.Matrix4().lookAt(light.position, light.target.position, light.up);
    this.right.setFromMatrixColumn(rotation, 0);
    this.up.setFromMatrixColumn(rotation, 1);
  }

  update(focus: T.Vector3) {
    const light = this.light, camera = light.shadow.camera;
    const texelX = (camera.right - camera.left) / light.shadow.mapSize.x;
    const texelY = (camera.top - camera.bottom) / light.shadow.mapSize.y;
    const x = focus.dot(this.right), y = focus.dot(this.up);
    // Snap in LIGHT space, not world X/Z: the sun is angled relative to the map.
    light.target.position.copy(focus)
      .addScaledVector(this.right, Math.round(x / texelX) * texelX - x)
      .addScaledVector(this.up, Math.round(y / texelY) * texelY - y);
    light.position.copy(light.target.position).add(this.offset);
  }
}
