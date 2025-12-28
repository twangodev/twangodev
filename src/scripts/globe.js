import Globe from "globe.gl";

let ticking = false;

const arcColors = [
  "Aqua",
  "Aquamarine",
  "Black",
  "Blue",
  "BlueViolet",
  "Brown",
  "CadetBlue",
  "Chartreuse",
  "Chocolate",
  "Coral",
  "CornflowerBlue",
  "Crimson",
  "Cyan",
  "DarkBlue",
  "DarkCyan",
  "DarkGoldenRod",
  "DarkGreen",
  "DarkKhaki",
  "DarkMagenta",
  "DarkOliveGreen",
  "DarkOrange",
  "DarkOrchid",
  "DarkRed",
  "DarkSalmon",
  "DarkSeaGreen",
  "DarkSlateBlue",
  "DarkSlateGray",
  "DarkSlateGrey",
  "DarkTurquoise",
  "DarkViolet",
  "DeepPink",
  "DeepSkyBlue",
  "DimGray",
  "DimGrey",
  "DodgerBlue",
  "FireBrick",
  "ForestGreen",
  "Fuchsia",
  "Gold",
  "GoldenRod",
  "Green",
  "GreenYellow",
  "HotPink",
  "IndianRed",
  "Indigo",
  "LawnGreen",
  "LightBlue",
  "LightCoral",
  "LightGreen",
  "LightPink",
  "LightSalmon",
  "LightSeaGreen",
  "LightSkyBlue",
  "LightSteelBlue",
  "Lime",
  "LimeGreen",
  "Magenta",
  "Maroon",
  "MediumAquaMarine",
  "MediumBlue",
  "MediumOrchid",
  "MediumPurple",
  "MediumSeaGreen",
  "MediumSlateBlue",
  "MediumSpringGreen",
  "MediumTurquoise",
  "MediumVioletRed",
  "MidnightBlue",
  "Navy",
  "Olive",
  "OliveDrab",
  "Orange",
  "OrangeRed",
  "Orchid",
  "PaleGoldenRod",
  "PaleGreen",
  "PaleTurquoise",
  "PaleVioletRed",
  "PeachPuff",
  "Peru",
  "Pink",
  "Plum",
  "Purple",
  "RebeccaPurple",
  "Red",
  "RosyBrown",
  "RoyalBlue",
  "SaddleBrown",
  "Salmon",
  "SandyBrown",
  "SeaGreen",
  "Sienna",
  "SkyBlue",
  "SlateBlue",
  "SpringGreen",
  "SteelBlue",
  "Tan",
  "Teal",
  "Thistle",
  "Tomato",
  "Turquoise",
  "Violet",
  "Yellow",
  "YellowGreen",
];

function getRandomColor() {
  return arcColors[Math.floor(Math.random() * arcColors.length)];
}

function generateColorPair() {
  return [getRandomColor(), getRandomColor()];
}

const MIN_ALTITUDE = 1.75; // fully zoomed-in at top of the page
const MAX_ALTITUDE = 5; // fully zoomed-out when you leave the hero

function calculateScrollAltitude() {
  const hero = document.getElementById("hero");
  const rect = hero.getBoundingClientRect();
  const progress = Math.min(Math.max(-rect.top / rect.height, 0));
  return MIN_ALTITUDE + (MAX_ALTITUDE - MIN_ALTITUDE) * progress;
}

function determineGlobeImageUrl() {
  const theme = localStorage.theme;

  if (theme === "light") {
    return "//twango.dev/globe/light.jpg";
  }
  return "//twango.dev/globe/dark.jpg";
}

async function initGlobe() {
  const container = document.getElementById("planetcont");
  if (!container) return;

  let data = await (await fetch("/globe-arcs.json")).json();

  // Handle both old format (array) and new format (object with arcs/airports)
  let arcsData = Array.isArray(data) ? data : data.arcs;
  let airportsData = data.airports || [];

  arcsData.forEach((element) => {
    element.color = generateColorPair();
  });

  // Calculate min/max flight counts for dynamic text sizing
  const minCount = Math.min(...airportsData.map(a => a.count));
  const maxCount = Math.max(...airportsData.map(a => a.count));
  const minFontSize = 8;
  const maxFontSize = 18;

  function calculateFontSize(count) {
    if (maxCount === minCount) return minFontSize;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minFontSize + ratio * (maxFontSize - minFontSize);
  }

  function calculateOpacity(count) {
    if (maxCount === minCount) return 0.7;
    const ratio = (count - minCount) / (maxCount - minCount);
    return 0.7 + ratio * 0.3; // 70% to 100%
  }

  // Spread out nearby airport labels
  function separateNearbyLabels(airports) {
    // Start with labels offset slightly below the dots
    const result = airports.map(a => ({
      ...a,
      labelLat: a.lat - 0.8, // offset below the dot
      labelLng: a.lng
    }));
    const minDistance = 3; // degrees apart

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];

        const dLat = b.lat - a.lat;
        const dLng = b.lng - a.lng;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);

        if (distance < minDistance && distance > 0) {
          const overlap = minDistance - distance;
          const angle = Math.atan2(dLat, dLng);
          const pushLat = Math.cos(angle) * overlap * 0.5;
          const pushLng = Math.sin(angle) * overlap * 0.5;

          a.labelLat -= pushLng;
          a.labelLng -= pushLat;
          b.labelLat += pushLng;
          b.labelLng += pushLat;
        }
      }
    }

    return result;
  }

  const labelData = separateNearbyLabels(airportsData);

  // Create combined data: dots at actual position + labels at separated positions
  const dotsData = airportsData.map(a => ({ ...a, type: 'dot' }));
  const labelsData = labelData.map(a => ({ ...a, type: 'label' }));
  const combinedData = [...dotsData, ...labelsData];

  const globe = new Globe(container)
    .globeImageUrl(determineGlobeImageUrl())
    .arcsData(arcsData)
    .arcColor("color")
    .arcStroke(0.65)
    .arcDashLength(() => Math.random())
    .arcDashGap(() => Math.random())
    .backgroundColor("rgba(0,0,0,0)")
    .arcDashAnimateTime(() => Math.random() * 4000 + 500)
    .htmlElementsData(combinedData)
    .htmlLat(d => d.type === 'label' ? d.labelLat : d.lat)
    .htmlLng(d => d.type === 'label' ? d.labelLng : d.lng)
    .htmlElement(d => {
      const el = document.createElement('div');

      if (d.type === 'dot') {
        // Just the dot at actual airport location
        el.innerHTML = `<div class="airport-dot"></div>`;
        el.style.transition = 'opacity 250ms';
        el.dataset.baseOpacity = '0.5';
      } else {
        // Just the label at adjusted position
        const fontSize = calculateFontSize(d.count);
        const opacity = calculateOpacity(d.count);
        el.innerHTML = `<div class="airport-label" style="font-size: ${fontSize}px">${d.iata}</div>`;
        el.style.transition = 'opacity 250ms';
        el.dataset.baseOpacity = opacity;
      }

      el.style.color = 'white';
      el.style.pointerEvents = d.type === 'dot' ? 'auto' : 'none';
      el.style.cursor = d.type === 'dot' ? 'pointer' : 'default';
      return el;
    })
    .htmlElementVisibilityModifier((el, isVisible) => {
      const baseOpacity = parseFloat(el.dataset.baseOpacity) || 1;
      el.style.opacity = isVisible ? baseOpacity : 0;
    })
    .pointOfView(
      { lat: 37, lng: -122, altitude: calculateScrollAltitude() },
      1000, // transition duration in ms
    );

  const globeControls = globe.controls();

  globeControls.autoRotate = true;
  globeControls.autoRotateSpeed = -1.0;
  globeControls.enableZoom = false;

  window.addEventListener("resize", (event) => {
    globe.width(event.target.innerWidth);
    globe.height(event.target.innerHeight);
  });

  window.addEventListener(
    "scroll",
    (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );

  document.documentElement.addEventListener(
    "theme-changed",
    refreshGlobeTexture,
  );

  return globe;
}

let globe = null;

function destroy() {
  if (!globe) return;
  globe.pauseAnimation();
  globe.renderer().dispose();
  globe.controls().dispose();
  document.getElementById("planetcont")?.replaceChildren();
  globe = null;
}

async function setup() {
  destroy();
  globe = await initGlobe();
}

document.addEventListener("astro:page-load", setup);
document.addEventListener("astro:before-swap", destroy);

function refreshGlobeTexture() {
  globe?.globeImageUrl(determineGlobeImageUrl());
}

function onScroll() {
  globe?.pointOfView({ altitude: calculateScrollAltitude() }, 5);
}
