import * as THREE from 'three';
import SceneInit from './SceneInit';

export default class ViewGL{
    constructor(canvasRef) {
        this.sceneInit = new SceneInit(canvasRef)
    }

    // ******************* PUBLIC EVENTS ******************* //

    // ******************* RENDER LOOP ******************* //
    update(t) {
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.update.bind(this));
    }
}