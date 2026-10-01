import * as THREE from './vendor/three.module.js';

export const VIEW = {fov:52, yaw:-.86, pitch:.42, minYaw:-1.18, maxYaw:-.28, minPitch:.18, maxPitch:.72};

export function positionCamera(camera, focus, height, yaw=VIEW.yaw, pitch=VIEW.pitch, parallax=new THREE.Vector3()) {
  const distance=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2));
  camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch))
    .multiplyScalar(distance).add(focus).add(parallax);
  camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  return distance;
}

// A depth texture supplies actual camera-space distance. Text is composited in
// HTML afterwards, so depth of field never makes museum captions unreadable.
export class DepthOfField {
  constructor(renderer) {
    this.renderer=renderer;
    this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.uniforms={colorMap:{value:this.target.texture},depthMap:{value:this.target.depthTexture},
      resolution:{value:new THREE.Vector2(1,1)},near:{value:.1},far:{value:700},focusDistance:{value:25}};
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:this.uniforms,
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`
        uniform sampler2D colorMap,depthMap;
        uniform vec2 resolution;
        uniform float near,far,focusDistance;
        varying vec2 vUv;
        float distanceAt(vec2 uv){float d=texture2D(depthMap,uv).x;return near*far/(far-(far-near)*d);}
        void main(){
          float distance=distanceAt(vUv);
          float radius=clamp((abs(distance-focusDistance)-7.0)*.18,0.0,3.2);
          vec2 stepSize=radius/resolution;
          vec4 color=texture2D(colorMap,vUv)*.28;
          for(int i=0;i<8;i++){
            float angle=float(i)*.78539816;
            vec2 sampleUv=vUv+vec2(cos(angle),sin(angle))*stepSize;
            color+=texture2D(colorMap,sampleUv)*.09;
          }
          gl_FragColor=color;
          #include <colorspace_fragment>
        }`});
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  }
  resize(w,h){this.target.setSize(w,h);this.uniforms.resolution.value.set(w,h)}
  render(scene,camera,focusDistance){
    this.uniforms.near.value=camera.near;this.uniforms.far.value=camera.far;this.uniforms.focusDistance.value=focusDistance;
    this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);
    this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  }
}
