export class LumoBackground {
  constructor(type) {
    this.type = type;
    this.canvas = null;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  mount(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lumo-bg-canvas';
    this.container.appendChild(this.canvas);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    if (this.type === 'blocks') this.initBlocks();
    else if (this.type === 'dots') this.initDots();
    else this.initGradient();
  }

  resize() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
  }

  initGradient() {
    const ctx = this.canvas.getContext('2d');
    const loop = () => {
      const grad = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
      grad.addColorStop(0, 'var(--bg-color)');
      grad.addColorStop(1, 'var(--text-color)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      requestAnimationFrame(loop);
    };
    loop();
  }

  initBlocks() {
    if (typeof p5 === 'undefined') return console.warn('p5.js required for blocks background');
    new p5((p) => {
      let boxes = [], bsize, amx, amy;
      p.setup = () => {
        bsize = this.isMobile ? 60 : 40;
        amx = Math.ceil(p.windowWidth / bsize) + 1;
        amy = Math.ceil(p.windowHeight / bsize) + 1;
        boxes = new Array(amx * amy).fill(400);
        p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL).parent(this.container);
        p.rectMode(p.CENTER);
        p.ortho(-p.width/2, p.width/2, -p.height/2, p.height/2, 10, 2000);
      };
      p.draw = () => {
        p.background(100);
        p.directionalLight(255,255,255,-p.PI*0.3,p.PI*0.3,-p.PI*0.6);
        p.translate(0, -10, 250);
        p.rotateX(-0.2);
        p.rotateY(0.2);
        for (let x = 0; x < p.width; x += bsize) {
          for (let y = 0; y < p.height; y += bsize) {
            let h = p.noise(p.frameCount*0.01,x/ p.width*10,y/p.height*10)*250;
            p.push();
            p.translate(-p.width/2+x, -p.height/2+y);
            p.box(bsize,bsize,h);
            p.pop();
          }
        }
      };
      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
    });
  }

  initDots() {
    if (typeof p5 === 'undefined') return console.warn('p5.js required for dots background');
    new p5((p) => {
      let particles = [], numParticles, baseHue = 200;
      p.setup = () => {
        p.createCanvas(p.windowWidth,p.windowHeight).parent(this.container);
        p.colorMode(p.HSB,360,100,100,1);
        numParticles = this.isMobile ? 50 : 200;
        for (let i=0;i<numParticles;i++){
          particles.push({x:p.random(p.width),y:p.random(p.height),z:p.random(p.TWO_PI),hue:baseHue+p.random(-20,20)});
        }
      };
      p.draw = () => {
        p.background(220,0,10);
        p.noStroke();
        particles.forEach(particle=>{
          let angle = particle.z + p.frameCount*0.01;
          let displacement = p.map(Math.sin(angle),-1,1,-20,20);
          let yOffset = p.map(p.noise(particle.x*0.01,particle.y*0.01,p.frameCount*0.005),0,1,-50,50);
          particle.y += displacement + yOffset;
          p.fill(particle.hue,80,80,0.7);
          p.ellipse(particle.x,particle.y,5,5);
          particle.z+=0.02;
        });
      };
      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
    });
  }
}
