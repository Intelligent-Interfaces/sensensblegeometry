import * as THREE from 'three';

export class FlowerSystem {
  group: THREE.Group;
  type: string;
  
  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `Flower_${type}`;
    
    const sprite = this.createTextSprite(`[Flower: ${type}] Placeholder`);
    sprite.position.y = 2;
    this.group.add(sprite);
  }

  private createTextSprite(message: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    if (context) {
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = 'black';
      context.lineWidth = 8;
      context.strokeRect(0, 0, canvas.width, canvas.height);
      context.font = 'Bold 40px Arial';
      context.fillStyle = 'black';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(message, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 1, 1);
    return sprite;
  }
}
