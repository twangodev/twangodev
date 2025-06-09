import Globe from 'globe.gl';

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
    "YellowGreen"
]

function getRandomColor() {
    return arcColors[Math.floor(Math.random() * arcColors.length)];
}

function generateColorPair() {
    return [getRandomColor(), getRandomColor()];
}


const MIN_ALTITUDE = 1.75;    // fully zoomed-in at top of the page
const MAX_ALTITUDE = 5;    // fully zoomed-out when you leave the hero

function calculateScrollAltitude() {
    const hero = document.getElementById('hero');
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(Math.max(-rect.top / rect.height, 0), );
    return MIN_ALTITUDE + (MAX_ALTITUDE - MIN_ALTITUDE) * progress;
}

function determineGlobeImageUrl() {
    const theme = localStorage.theme

    if (theme === "light") {
        return "//twango.dev/globe/light.jpg"
    }
    return "//twango.dev/globe/dark.jpg"
}


async function initGlobe() {
    const container = document.getElementById('planetcont');
    if (!container) return;

    let arcsData = await (await fetch('/globe-arcs.json')).json()

    arcsData.forEach((element) => {
        element.color = generateColorPair()
    })

    const globe = new Globe(container)
        .globeImageUrl(determineGlobeImageUrl())
        .arcsData(arcsData)
        .arcColor('color')
        .arcStroke(0.65)
        .arcDashLength(() => Math.random())
        .arcDashGap(() => Math.random())
        .backgroundColor( "rgba(0,0,0,0)")
        .arcDashAnimateTime(() => Math.random() * 4000 + 500)
        .pointOfView(
            { lat: 37, lng: -122, altitude: calculateScrollAltitude() },
            1000  // transition duration in ms
        );


    const globeControls= globe.controls()

    globeControls.autoRotate = true
    globeControls.autoRotateSpeed = -1.5
    globeControls.enableZoom = false

    window.addEventListener('resize', (event) => {
        globe.width(event.target.innerWidth)
        globe.height(event.target.innerHeight)
    });


    window.addEventListener('scroll', e => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                onScroll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    document.documentElement.addEventListener("theme-changed", refreshGlobeTexture)

    return globe

}

const globe = await initGlobe();

function refreshGlobeTexture() {
    globe.globeImageUrl(determineGlobeImageUrl())
}

function onScroll() {
    let altitude = calculateScrollAltitude();
    globe.pointOfView({ altitude }, 5);
}

