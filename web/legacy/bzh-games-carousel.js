(function () {
  let slideIndex = 0;
  const slides = Array.from(document.getElementsByClassName('slide'));

  function showSlide(index) {
    slides.forEach((slide) => slide.classList.remove('active'));
    slides[index]?.classList.add('active');
  }

  function changeSlide(step) {
    if (!slides.length) return;
    slideIndex += step;
    if (slideIndex < 0) slideIndex = slides.length - 1;
    if (slideIndex >= slides.length) slideIndex = 0;
    showSlide(slideIndex);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-slide-step]');
    if (!button) return;
    changeSlide(Number(button.dataset.slideStep || 0));
  });
})();
