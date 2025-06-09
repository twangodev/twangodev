import Globe from 'globe.gl';

function determineGlobeImageUrl() {
    const theme = localStorage.theme

    if (theme === "light") {
        return "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg"
    }
    return "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
}


function initGlobe() {
    const container = document.getElementById('planetcont');
    if (!container) return;

    const N = 20;
    const arcsData = [...Array(N).keys()].map(() => ({
        startLat: (Math.random() - 0.5) * 180,
        startLng: (Math.random() - 0.5) * 360,
        endLat: (Math.random() - 0.5) * 180,
        endLng: (Math.random() - 0.5) * 360,
        color: [['red', 'white', 'blue', 'green'][Math.round(Math.random() * 3)], ['red', 'white', 'blue', 'green'][Math.round(Math.random() * 3)]]
    }));

    const globe = new Globe(container)
        .globeImageUrl(determineGlobeImageUrl())
        .arcsData(arcsData)
        .arcColor('color')
        .arcStroke(0.75)
        .arcDashLength(() => Math.random())
        .arcDashGap(() => Math.random())
        .backgroundColor( "rgba(0,0,0,0)")
        .arcDashAnimateTime(() => Math.random() * 4000 + 500);

    const globeControls= globe.controls()

    globeControls.autoRotate = true
    globeControls.autoRotateSpeed = -1.0

    globe.pointOfView(
        { lat: 37, lng: -122 },
        1000  // transition duration in ms
    );

    window.addEventListener('resize', (event) => {
        globe.width(event.target.innerWidth)
        globe.height(event.target.innerHeight)
    });

    document.documentElement.addEventListener("theme-changed", refreshGlobeTexture)

    return globe

}

const globe = initGlobe();

function refreshGlobeTexture(e) {
    globe.globeImageUrl(determineGlobeImageUrl())
}