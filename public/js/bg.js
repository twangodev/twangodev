function generateParticles(n, maxX, maxY) {
  let value = `${getRandom(maxX)}px ${getRandom(maxY)}px #000`;
  for (let i = 2; i <= n; i++) {
    value += `, ${getRandom(maxX)}px ${getRandom(maxY)}px #000`;
  }
  return value;
}

function generateStars(n, maxX, maxY) {
  let value = `${getRandom(maxX)}px ${getRandom(maxY)}px #fff`;
  for (let i = 2; i <= n; i++) {
    value += `, ${getRandom(maxX)}px ${getRandom(maxY)}px #fff`;
  }
  return value;
}

function getRandom(max) {
  return Math.floor(Math.random() * max);
}

function initBG() {
  const maxX = Math.max(window.innerWidth, 2560);
  const maxY = Math.max(window.innerHeight, 2560);

  const particlesSmall = generateParticles(1000, maxX, maxY);
  const particlesMedium = generateParticles(500, maxX, maxY);
  const particlesLarge = generateParticles(250, maxX, maxY);
  const particles1 = document.getElementById("particles1");
  const particles2 = document.getElementById("particles2");
  const particles3 = document.getElementById("particles3");

  if (particles1) {
    particles1.style.cssText = `
      width: 1px;
      height: 1px;
      border-radius: 50%;
      box-shadow: ${particlesSmall};
      animation: animateParticle 50s linear infinite;
      `;
  }

  if (particles2) {
    particles2.style.cssText = `
      width: 1.5px;
      height: 1.5px;
      border-radius: 50%;
      box-shadow: ${particlesMedium};
      animation: animateParticle 100s linear infinite;
      `;
  }

  if (particles3) {
    particles3.style.cssText = `
      width: 2px;
      height: 2px;
      border-radius: 50%;
      box-shadow: ${particlesLarge};
      animation: animateParticle 150s linear infinite;
      `;
  }

  const starsSmall = generateStars(1000, maxX, maxY);
  const starsMedium = generateStars(500, maxX, maxY);
  const starsLarge = generateStars(250, maxX, maxY);
  const stars1 = document.getElementById("stars1");
  const stars2 = document.getElementById("stars2");
  const stars3 = document.getElementById("stars3");

  if (stars1) {
    stars1.style.cssText = `
      width: 1px;
      height: 1px;
      border-radius: 50%;
      box-shadow: ${starsSmall};
      animation: animateParticle 150s linear infinite;
      `;
  }

  if (stars2) {
    stars2.style.cssText = `
      width: 1.5px;
      height: 1.5px;
      border-radius: 50%;
      box-shadow: ${starsMedium};
      animation: animateParticle 200s linear infinite;
      `;
  }

  if (stars3) {
    stars3.style.cssText = `
      width: 2px;
      height: 2px;
      border-radius: 50%;
      box-shadow: ${starsLarge};
      animation: animateParticle 250s linear infinite;
      `;
  }
}

document.addEventListener("astro:after-swap", initBG);
initBG();
