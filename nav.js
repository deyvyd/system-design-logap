/* ══════════════════════════════════════════
   System Design — Navigation Engine
   Usado por: system_design_sexta1.html, system_design_sexta2.html

   Uso:
     initNav({ agendaSlide: 1 });
   Opcional: agenda items com data-slide="N" se tornam clicáveis.
   ══════════════════════════════════════════ */

function initNav({ agendaSlide = 1 } = {}) {
  const slides = document.querySelectorAll('.slide');
  const total  = slides.length;
  let current     = 0;
  let currentStep = 0;

  // DOM API helper — avoids insertAdjacentHTML XSS sink
  function makeEl(tag, props) {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    });
    return el;
  }

  // Progress bar — colada no bottom
  const progWrap = makeEl('div', { id: 'bottom-progress' });
  const progFill = makeEl('div', { id: 'bottom-progress-fill' });
  progWrap.appendChild(progFill);
  document.body.appendChild(progWrap);

  // Nav arrows — flutuando acima da barra
  const btnPrev = makeEl('button', { class: 'nav-arrow prev', id: 'btn-prev', 'aria-label': 'Anterior', text: '←' });
  const btnNext = makeEl('button', { class: 'nav-arrow next', id: 'btn-next', 'aria-label': 'Próximo',  text: '→' });
  document.body.appendChild(btnPrev);
  document.body.appendChild(btnNext);

  // Top-right: home + counter
  const btnHome      = makeEl('button', { class: 'global-home',    id: 'btn-home',      title: 'Ir para a Agenda', text: '⌂' });
  const counter      = makeEl('div',    { class: 'global-counter', id: 'global-counter' });
  const btnSlidePrev = makeEl('button', { class: 'slide-jump',     id: 'btn-slide-prev', 'aria-label': 'Slide anterior', text: '‹' });
  const slideNum     = makeEl('span',   { id: 'slide-num' });
  const btnSlideNext = makeEl('button', { class: 'slide-jump',     id: 'btn-slide-next', 'aria-label': 'Próximo slide',  text: '›' });
  counter.appendChild(btnSlidePrev);
  counter.appendChild(slideNum);
  counter.appendChild(btnSlideNext);
  document.body.appendChild(btnHome);
  document.body.appendChild(counter);

  function pad(n) { return String(n).padStart(2, '0'); }

  function getMaxStep(idx) {
    const s = slides[idx !== undefined ? idx : current];
    let max = 0;
    s.querySelectorAll('[data-reveal]').forEach(el => {
      max = Math.max(max, parseInt(el.dataset.reveal, 10));
    });
    return max;
  }

  function updateReveal() {
    const slide   = slides[current];
    const maxStep = getMaxStep();
    const isComplete = currentStep >= maxStep;

    slide.classList.toggle('complete', isComplete);

    slide.querySelectorAll('[data-reveal]').forEach(el => {
      const step      = parseInt(el.dataset.reveal, 10);
      const undimAt    = el.dataset.undimAfter != null ? parseInt(el.dataset.undimAfter, 10) : null;
      const undimUntil = el.dataset.undimUntil != null ? parseInt(el.dataset.undimUntil, 10) : null;
      el.classList.remove('revealed', 'current');
      if (step < currentStep) {
        // past step — dimmed, unless undimAt threshold reached (and optionally before undimUntil)
        const inUndimWindow = undimAt !== null && currentStep >= undimAt &&
                              (undimUntil === null || currentStep < undimUntil);
        if (inUndimWindow) {
          el.classList.add('revealed', 'current');
        } else {
          el.classList.add('revealed');
        }
      } else if (step === currentStep) {
        el.classList.add('revealed', 'current');
      }
      // step > currentStep: no class → opacity 0
    });

    // data-hide-after: hide element when currentStep >= N
    slide.querySelectorAll('[data-hide-after]').forEach(el => {
      el.style.display = currentStep >= parseInt(el.dataset.hideAfter, 10) ? 'none' : '';
    });
  }

  function updateUI() {
    slideNum.textContent = pad(current + 1) + ' / ' + pad(total);
    progFill.style.width = ((current + 1) / total * 100) + '%';
    btnPrev.classList.toggle('disabled', current === 0 && currentStep === 0);
    btnNext.classList.toggle('disabled', current === total - 1 && currentStep >= getMaxStep());
    btnSlidePrev.classList.toggle('disabled', current === 0);
    btnSlideNext.classList.toggle('disabled', current === total - 1);
    updateReveal();
  }

  function activateSlide(n) {
    slides[current].classList.remove('active');
    slides[current].classList.add('exit');
    // clear reveal state on exited slide
    slides[current].querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.remove('revealed', 'current');
    });
    slides[current].classList.remove('complete');
    setTimeout(() => slides[current].classList.remove('exit'), 400);
    current = n;
    slides[current].classList.add('active');
    localStorage.setItem('sd-slide', n);
  }

  function go(dir) {
    if (dir === 1) {
      const maxStep = getMaxStep();
      if (currentStep < maxStep) {
        currentStep++;
        updateUI();
      } else if (current < total - 1) {
        activateSlide(current + 1);
        currentStep = 0;
        updateUI();
      }
    } else {
      if (currentStep > 0) {
        currentStep--;
        updateUI();
      } else if (current > 0) {
        const prevIdx = current - 1;
        activateSlide(prevIdx);
        currentStep = getMaxStep(prevIdx); // volta ao estado completo do slide anterior
        updateUI();
      }
    }
  }

  function goTo(n, { complete = false } = {}) {
    if (n < 0 || n >= total || n === current) return;
    activateSlide(n);
    currentStep = complete ? getMaxStep(n) : 0;
    updateUI();
  }

  // Button events
  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  btnHome.addEventListener('click', () => goTo(agendaSlide, { complete: true }));
  btnSlidePrev.addEventListener('click', () => { if (current > 0)          goTo(current - 1, { complete: true }); });
  btnSlideNext.addEventListener('click', () => { if (current < total - 1)  goTo(current + 1, { complete: true }); });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (['ArrowRight','ArrowDown',' '].includes(e.key)) { e.preventDefault(); go(1);  }
    if (['ArrowLeft', 'ArrowUp'      ].includes(e.key)) { e.preventDefault(); go(-1); }
  });

  // Touch / swipe
  let touchX = 0;
  document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; });
  document.addEventListener('touchend',   e => {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) go(dx > 0 ? 1 : -1);
  });

  // Agenda items with data-slide
  document.querySelectorAll('.agenda-item[data-slide]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      goTo(parseInt(el.dataset.slide, 10));
    });
  });

  // Restore last slide on reload
  const saved = parseInt(localStorage.getItem('sd-slide') || '0', 10);
  if (saved > 0 && saved < total) {
    slides[0].classList.remove('active');
    current = saved;
    slides[current].classList.add('active');
  }
  currentStep = getMaxStep();
  updateUI();
}
