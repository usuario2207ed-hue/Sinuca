const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 🔽 Variável para imagem escolhida
let centerImage = new Image();
let hasImage = false;

// 🔽 Carregar imagem salva no localStorage
const savedImage = localStorage.getItem("centerImage");
if (savedImage) {
  centerImage.src = savedImage;
  hasImage = true;
}

// Função para processar imagem selecionada
document.getElementById("fileInput").addEventListener("change", function(e){
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      centerImage.src = evt.target.result;
      localStorage.setItem("centerImage", evt.target.result); // Salvar no localStorage
      hasImage = true;
    }
    reader.readAsDataURL(file);
  }
});

let maxPower = 18.0;
let shotMultiplierX = 7.0;
let shotMultiplierY = 7.2;
let frictionCue = 0.997;
let frictionColored = 0.993;
let collisionDamping = 0.85;
let collisionDampingColored = 0.90;
let maxBallSpeed = 12;

const ballRadius = 21; 
const pocketRadius = 36;

const hitSound = new Audio("https://www.soundjay.com/button/beep-07.wav");
const pocketSound = new Audio("https://www.soundjay.com/button/beep-09.wav");

let balls = [];
let cueBall;
let isAiming = false;
let aimAngle = 0;
let shotPower = 0;

function resizeCanvas(){
  canvas.width = window.innerWidth * 0.8;
  canvas.height = window.innerHeight * 0.6;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function initBalls() {
  balls = [];
  cueBall = {x: canvas.width/2, y: canvas.height - 60, vx:0, vy:0, color:"white", id:"cue"};
  balls.push(cueBall);

  let startX = canvas.width/2;
  let startY = 290;
  let colors = ["red","yellow","blue","purple","orange","green","brown","black"];
  let n = 0;
  for(let row=0; row<5; row++){
    for(let col=0; col<=row; col++){
      balls.push({
        x: startX - row*ballRadius + col*2*ballRadius,
        y: startY - row*2*ballRadius*Math.cos(Math.PI/6),
        vx:0, vy:0,
        color: colors[n%colors.length],
        id:"ball"+n
      });
      n++;
    }
  }
}

function drawTable(){
  ctx.fillStyle="#176117";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // 🔽 Desenha imagem anexada no centro
  if (hasImage && centerImage.complete) {
    let logoSize = Math.min(canvas.width, canvas.height) * 0.5;
    ctx.drawImage(centerImage, (canvas.width - logoSize)/2, (canvas.height - logoSize)/2, logoSize, logoSize);
  }

  ctx.fillStyle="black";
  let pockets = [
    [0,0],[canvas.width,0],
    [0,canvas.height/2],[canvas.width,canvas.height/2],
    [0,canvas.height],[canvas.width,canvas.height]
  ];
  for(let p of pockets){
    ctx.beginPath();
    ctx.arc(p[0],p[1],pocketRadius,0,Math.PI*2);
    ctx.fill();
  }
}

function drawBalls(){
  for(let b of balls){
    ctx.beginPath();
    ctx.arc(b.x,b.y,ballRadius,0,Math.PI*2);
    ctx.fillStyle=b.color;
    ctx.fill();
    ctx.strokeStyle="black";
    ctx.stroke();
  }
}

function updateBalls(){
  for(let b of balls){
    b.x += b.vx; 
    b.y += b.vy;

    if(b.id==="cue"){ b.vx *= frictionCue; b.vy *= frictionCue; }
    else { b.vx *= frictionColored; b.vy *= frictionColored; }

    let speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
    if(speed > maxBallSpeed){ b.vx *= maxBallSpeed/speed; b.vy *= maxBallSpeed/speed; }

    if(Math.abs(b.vx) < 0.01) b.vx = 0;
    if(Math.abs(b.vy) < 0.01) b.vy = 0;

    if(b.x - ballRadius < 0){ b.x = ballRadius; b.vx *= -1 * collisionDamping; hitSound.play(); }
    if(b.x + ballRadius > canvas.width){ b.x = canvas.width - ballRadius; b.vx *= -1 * collisionDamping; hitSound.play(); }
    if(b.y - ballRadius < 0){ b.y = ballRadius; b.vy *= -1 * collisionDamping; hitSound.play(); }
    if(b.y + ballRadius > canvas.height){ b.y = canvas.height - ballRadius; b.vy *= -1 * collisionDamping; hitSound.play(); }

    for(let other of balls){
      if(b===other) continue;
      let dx = b.x - other.x;
      let dy = b.y - other.y;
      let dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < ballRadius*2){
        let angle = Math.atan2(dy, dx);
        let totalVx = b.vx - other.vx;
        let totalVy = b.vy - other.vy;
        let damping = (b.id==="cue"||other.id==="cue") ? collisionDamping : collisionDampingColored;

        b.vx -= Math.cos(angle)*totalVx*damping;
        b.vy -= Math.sin(angle)*totalVy*damping;
        other.vx += Math.cos(angle)*totalVx*damping;
        other.vy += Math.sin(angle)*totalVy*damping;

        let overlap = 2*ballRadius - dist;
        b.x += Math.cos(angle)*overlap/2;
        b.y += Math.sin(angle)*overlap/2;
        other.x -= Math.cos(angle)*overlap/2;
        other.y -= Math.sin(angle)*overlap/2;
        hitSound.play();
      }
    }

    let pockets = [
      [0,0],[canvas.width,0],
      [0,canvas.height/2],[canvas.width,canvas.height/2],
      [0,canvas.height],[canvas.width,canvas.height]
    ];
    for(let p of pockets){
      let dx = b.x - p[0];
      let dy = b.y - p[1];
      if(Math.sqrt(dx*dx + dy*dy) < pocketRadius){
        if(b.id==="cue"){ 
          cueBall.x = canvas.width/2; 
          cueBall.y = canvas.height - 60; 
          cueBall.vx = 0; 
          cueBall.vy = 0; 
        } else { 
          balls = balls.filter(ball => ball !== b); 
          pocketSound.play(); 
        }
      }
    }
  }
}

function drawCue(){
  if(!isAiming) return;
  ctx.strokeStyle="white";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(cueBall.x,cueBall.y);
  ctx.lineTo(cueBall.x - Math.cos(aimAngle)*shotPower*5, cueBall.y - Math.sin(aimAngle)*shotPower*5);
  ctx.stroke();
}

function startAim(x, y){ isAiming=true; shotPower=0; aimAngle = Math.atan2(y-cueBall.y, x-cueBall.x); }
function moveAim(x, y){ if(isAiming) aimAngle = Math.atan2(y-cueBall.y, x-cueBall.x); }
function endAim(){ isAiming=false; cueBall.vx = Math.cos(aimAngle)*(shotPower*shotMultiplierX); cueBall.vy = Math.sin(aimAngle)*(shotPower*shotMultiplierY); shotPower=0; }

canvas.addEventListener("mousedown", e => startAim(e.offsetX,e.offsetY));
canvas.addEventListener("mousemove", e => moveAim(e.offsetX,e.offsetY));
canvas.addEventListener("mouseup", e => endAim());

canvas.addEventListener("touchstart", e => { 
  e.preventDefault(); 
  let touch = e.touches[0];
  let rect = canvas.getBoundingClientRect();
  startAim(touch.clientX - rect.left, touch.clientY - rect.top);
});
canvas.addEventListener("touchmove", e => {
  e.preventDefault(); 
  let touch = e.touches[0];
  let rect = canvas.getBoundingClientRect();
  moveAim(touch.clientX - rect.left, touch.clientY - rect.top);
});
canvas.addEventListener("touchend", e => { e.preventDefault(); endAim(); });

setInterval(() => { if(isAiming && shotPower < maxPower) shotPower += 0.5; },30);
function resetGame(){ initBalls(); }
function loop(){ drawTable(); updateBalls(); drawBalls(); drawCue(); requestAnimationFrame(loop); }

initBalls();
loop();
