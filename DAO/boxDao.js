import {createCanvas, loadImage} from 'canvas'
import fs from 'fs'
export default class Box {
  constructor() {
    this.layers = [];
    this.currentLayer = -1;
  }

  async inputLayer(codes, imageDirectory) {
    // Load image to get its dimensions
    const image = await loadImage(imageDirectory);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the image onto the canvas
    ctx.drawImage(image, 0, 0);

    const identifikasi_pattern = /^\(90\)[A-Za-z0-9]{1,16}\(91\)\d{1,10}$/;
    const otentifikasi_pattern1 = /^\(90\)[A-Za-z0-9]{1,16}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)\d{1,10}$/;
    const otentifikasi_pattern2 = /^\(01\)[A-Za-z0-9]{14}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)\d{1,10}$/;

    const scanned = [];
    let total_correct = 0;
    let total_false = 0;

    for (const code of codes) {
      let status = '';
      if (identifikasi_pattern.test(code.code) || otentifikasi_pattern1.test(code.code) || otentifikasi_pattern2.test(code.code)) {
        status = 'correct';
        total_correct++;
      } else {
        status = 'incorrect';
        total_false++;
      }

      // Check for duplication
      let isDuplicate = false;
      for (const layer of this.layers) {
        for (const scannedCode of layer.scanned) {
          if (scannedCode.code === code.code) {
            status = `duplicated on layer ${layer.n_layer}`;
            isDuplicate = true;
            total_false++;
            break;
          }
        }
        if (isDuplicate) break;
      }

      // Mark image with dots based on coordinates and status
      const dotColor = status === 'correct' ? 'green' : 'red';
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(code.coor_x, code.coor_y, 30, 0, Math.PI * 2);
      ctx.fill();
      scanned.push({
        code: code.code,
        accuracy: code.accuracy,
        status: status
      });
    }
     // Save canvas to file
    //await this.saveCanvas(canvas);

    const layerData = {
      n_layer: ++this.currentLayer,
      total_scanned: codes.length,
      total_correct: total_correct,
      total_false: total_false,
      scanned: scanned
    };

    this.layers.push(layerData);
    return layerData;
    }

    async saveCanvas(canvas) {
        const out = fs.createWriteStream("C:\\Users\\umum\\Documents\\widatech\\track and trace\\middleware\\files\\output.png");
        const stream = canvas.createPNGStream();
        return new Promise((resolve, reject) => {
        stream.pipe(out);
        out.on('finish', () => {
            console.log('The image was saved.');
            resolve();
        });
        out.on('error', reject);
        });
    }
    deleteLastLayer() {
    if (this.layers.length === 0) {
      return "No layers to delete.";
    }
    this.layers.pop();
    this.currentLayer--;
    return "Last layer deleted.";
  }

  deleteLayer(n) {
    if (n < 0 || n >= this.layers.length) {
      return "Invalid layer number.";
    }
    this.layers.splice(n, 1);
    for (let i = n; i < this.layers.length; i++) {
      this.layers[i].n_layer--;
    }
    this.currentLayer--;
    return `Layer ${n} deleted.`;
    }

    emptyLayers() {
    this.layers = [];
    this.currentLayer = -1;
    return "All layers cleared.";
  }
    
}



// Example usage:
// const myBox = new Box();
// const codes = [
//   { Code: "(90)ABC(91)123", accuracy: 90 },
//   { Code: "(90)DEF(91)456", accuracy: 80 },
//   { Code: "(01)GHIJ(10)KLMN(17)789(21)101112", accuracy: 95 }
// ];
// console.log(myBox.inputLayer(codes));
// //console.log(myBox.deleteLastLayer());
// console.log(myBox.inputLayer(codes));
// console.log(myBox.deleteLayer(0));
