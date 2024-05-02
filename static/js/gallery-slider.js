(function () {
    "use strict";
    // gallery init
    GLightbox();

    const elementIsVisibleInViewport = (el, partiallyVisible = true) => {
        const { top, left, bottom, right } = el.getBoundingClientRect();
        const { innerHeight, innerWidth } = window;
        return partiallyVisible
            ? ((top > 0 && top < innerHeight) ||
                (bottom > 0 && bottom < innerHeight)) &&
            ((left > 0 && left < innerWidth) || (right > 0 && right < innerWidth))
            : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
    };


    // gallery slider
    var isGallerySlider = document.getElementsByClassName("gallery-slider");
    if (isGallerySlider.length > 0) {
        new Swiper(".gallery-slider", {
            slidesPerView: 1,
            loop: true,
            autoHeight: true,
            spaceBetween: 0,
            speed: 1500,
            autoplay: {
                delay: 5000,
            },
            navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
            },
        });
    }
})();