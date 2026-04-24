const { createCanvas } = require('canvas');
const fs = require('fs');

const width = 1024;
const height = 500;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Create gradient background
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Decorative circles
ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
ctx.beginPath();
ctx.arc(974, 50, 150, 0, Math.PI * 2);
ctx.fill();

ctx.beginPath();
ctx.arc(-30, 450, 100, 0, Math.PI * 2);
ctx.fill();

ctx.beginPath();
ctx.arc(920, 250, 75, 0, Math.PI * 2);
ctx.fill();

// Icon (using a simple shape instead of emoji for better compatibility)
ctx.fillStyle = '#FFD700';
ctx.beginPath();
ctx.arc(512, 140, 35, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#667eea';
ctx.font = 'bold 40px Arial';
ctx.textAlign = 'center';
ctx.fillText('$', 512, 155);

// Title
ctx.fillStyle = 'white';
ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
ctx.textAlign = 'center';
ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
ctx.shadowBlur = 20;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 4;
ctx.fillText('בשליטה', 512, 280);

// Subtitle
ctx.font = '600 32px "Segoe UI", Arial, sans-serif';
ctx.shadowBlur = 10;
ctx.shadowOffsetY = 2;
ctx.fillText('Excel Your Money', 512, 330);

// Tagline
ctx.font = '500 20px "Segoe UI", Arial, sans-serif';
ctx.shadowBlur = 0;
ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
ctx.fillText('ניהול תקציב חכם', 512, 370);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./feature-graphic-1024x500.png', buffer);
console.log('✅ Feature graphic created: feature-graphic-1024x500.png (1024x500 pixels)');
