// Run this with: node assets/generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

function drawIcon(ctx, size) {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#F59E0B');
  gradient.addColorStop(1, '#D97706');
  
  // Rounded rectangle
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Bird silhouette
  ctx.fillStyle = '#000000';
  const scale = size / 128;
  ctx.save();
  ctx.scale(scale, scale);
  
  ctx.beginPath();
  ctx.moveTo(98, 38);
  ctx.bezierCurveTo(96, 40, 92, 42, 86, 44);
  ctx.bezierCurveTo(88, 50, 88, 56, 86, 62);
  ctx.bezierCurveTo(84, 68, 80, 74, 74, 80);
  ctx.bezierCurveTo(68, 86, 60, 90, 50, 92);
  ctx.bezierCurveTo(40, 94, 30, 94, 20, 90);
  ctx.bezierCurveTo(28, 90, 34, 88, 40, 84);
  ctx.bezierCurveTo(34, 84, 30, 82, 26, 78);
  ctx.bezierCurveTo(30, 78, 34, 76, 36, 74);
  ctx.bezierCurveTo(30, 72, 26, 68, 24, 64);
  ctx.bezierCurveTo(28, 66, 32, 66, 34, 66);
  ctx.bezierCurveTo(28, 60, 26, 54, 26, 46);
  ctx.bezierCurveTo(28, 48, 32, 48, 34, 48);
  ctx.bezierCurveTo(28, 44, 26, 38, 26, 30);
  ctx.bezierCurveTo(26, 28, 26, 26, 28, 24);
  ctx.bezierCurveTo(36, 34, 46, 40, 60, 42);
  ctx.bezierCurveTo(60, 40, 58, 38, 58, 36);
  ctx.bezierCurveTo(58, 28, 64, 22, 72, 22);
  ctx.bezierCurveTo(76, 22, 80, 24, 82, 26);
  ctx.bezierCurveTo(86, 24, 90, 24, 92, 22);
  ctx.bezierCurveTo(90, 26, 90, 30, 86, 32);
  ctx.bezierCurveTo(90, 32, 94, 30, 96, 30);
  ctx.bezierCurveTo(94, 34, 92, 36, 88, 38);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, size);
  
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(__dirname, `icon-${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: icon-${size}.png`);
});

console.log('Done! Icons generated in assets/');
