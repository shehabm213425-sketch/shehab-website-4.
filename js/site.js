(() => {
  'use strict';

  const categories = window.SHEHAB_CATALOG || [];
  const byId = id => document.getElementById(id);
  const filters = byId('filters');
  const grid = byId('foldersGrid');
  const overlay = byId('galleryOverlay');
  const stage = byId('imageStage');
  const stageImage = byId('stageImage');
  const mobileNav = byId('mobileNav');
  const menuToggle = byId('menuToggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = ['الكل', 'باكيجنج', 'دروع', 'لافتات', 'ملابس', 'مطبوعات', 'أعلام'];
  const services = ['طباعة', 'باكيجنج', 'علب أدوية', 'دروع خشبية', 'دروع مستوردة', 'دروع قطيفة', 'تيشرتات', 'تيشرتات بولو وتطريز', 'تيشرتات تخرج', 'أطقم تخرج', 'بنر', 'واجهات كلادينج', 'استيكرات', 'روشتات', 'شهادات تقدير', 'أعلام ريشة', 'أعلام مكتب', 'بوكس أكريليك مضيء', 'استاند مكتب مستورد', 'Design'];
  const safe = str => String(str).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let activeGroup = 'الكل';
  let activeCategory = null;
  let photoIndex = 0;
  let previousFocus = null;
  let swapToken = 0;
  let openTimeout = null;
  let revealObserver = null;

  byId('categoryTotal').textContent = categories.length;
  byId('year').textContent = new Date().getFullYear();

  function setupMarquee() {
    const items = services.map(s => `<span>${safe(s)} <i>✦</i></span>`).join('');
    byId('marqueeTrack').innerHTML = items + items;
  }

  function setupFilters() {
    filters.innerHTML = groups.map((name, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-group="${safe(name)}" aria-pressed="${i === 0}">${safe(name)}</button>`).join('');
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-group]');
      if (!button || activeGroup === button.dataset.group) return;
      activeGroup = button.dataset.group;
      filters.querySelectorAll('button').forEach(item => {
        const current = item === button;
        item.classList.toggle('active', current);
        item.setAttribute('aria-pressed', String(current));
      });
      renderFolders();
    });
  }

  function reveal() {
    if (revealObserver) revealObserver.disconnect();
    if (reducedMotion || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, {threshold: 0.08, rootMargin: '0px 0px -12px 0px'});
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
  }

  function renderFolders() {
    const list = categories.filter(cat => activeGroup === 'الكل' || cat.group === activeGroup);
    grid.innerHTML = list.map(cat => `
      <button type="button" class="folder-card reveal" data-id="${safe(cat.id)}" aria-label="افتح فولدر ${safe(cat.title)} ويحتوي ${cat.images.length} صور">
        <span class="folder-photo">
          <img src="${safe(cat.images[0].thumb)}" alt="${safe(cat.title)}" loading="lazy" decoding="async">
          <span class="folder-tab" aria-hidden="true"></span>
          <span class="folder-lid" aria-hidden="true"></span>
          <span class="photo-count">${cat.images.length} ${cat.images.length === 1 ? 'صورة' : 'صور'}</span>
        </span>
        <span class="folder-info"><span><h3>${safe(cat.title)}</h3><p>اضغط لعرض الأعمال</p></span><span class="folder-arrow" aria-hidden="true">↗</span></span>
      </button>`).join('') || '<div class="no-results">مفيش أعمال في القسم ده حاليًا.</div>';
    reveal();
  }

  function updateSlideDetails() {
    if (!activeCategory) return;
    const image = activeCategory.images[photoIndex];
    const total = activeCategory.images.length;
    byId('slideCounter').textContent = String(photoIndex + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    byId('imageTitle').textContent = image.label;
    stage.style.setProperty('--slide-progress', ((photoIndex + 1) / total * 100) + '%');
    byId('thumbGrid').querySelectorAll('.thumb').forEach(thumb => {
      const selected = Number(thumb.dataset.index) === photoIndex;
      thumb.classList.toggle('active', selected);
      thumb.setAttribute('aria-current', String(selected));
    });
  }

  function clearPhotoEffects() {
    stageImage.classList.remove('slide-in');
    stageImage.getAnimations().forEach(effect => effect.cancel());
  }

  // Image loading is asynchronous and the last tap wins; no blurred ghosts or 3D effects.
  function setPhoto(index, animated = true) {
    if (!activeCategory) return;
    const photos = activeCategory.images;
    photoIndex = (index + photos.length) % photos.length;
    const photo = photos[photoIndex];
    const token = ++swapToken;
    updateSlideDetails();
    clearPhotoEffects();
    if (!animated || reducedMotion) {
      stageImage.src = photo.src;
      stageImage.alt = photo.label;
      return;
    }
    // Continue showing the current image while the next one loads; then switch promptly.
    const preloaded = new Image();
    preloaded.onload = () => {
      if (token !== swapToken || !activeCategory) return;
      stageImage.src = photo.src;
      stageImage.alt = photo.label;
      void stageImage.offsetWidth;
      stageImage.classList.add('slide-in');
    };
    preloaded.onerror = () => {
      if (token !== swapToken || !activeCategory) return;
      stageImage.src = photo.src;
      stageImage.alt = photo.label;
    };
    preloaded.src = photo.src;
  }

  function openCategory(id, card) {
    const category = categories.find(item => item.id === id);
    if (!category) return;
    previousFocus = document.activeElement;
    activeCategory = category;
    photoIndex = 0;

    overlay.classList.toggle('is-single', category.images.length === 1);
    byId('dialogTitle').textContent = category.title;
    byId('categoryTitle').textContent = category.title;
    byId('categoryDescription').textContent = category.description;
    byId('dialogGroup').textContent = category.group;
    byId('photoCount').textContent = category.images.length + ' صور';
    byId('categoryWhatsapp').href = 'https://wa.me/201503200115?text=' + encodeURIComponent('مرحبًا، محتاج أستفسر عن ' + category.title + ' من معرض الشهاب.');
    byId('thumbGrid').innerHTML = category.images.map((photo, i) => `
      <button type="button" class="thumb ${i === 0 ? 'active' : ''}" style="--i:${i}" data-index="${i}" aria-current="${i === 0}" title="${safe(photo.label)}" aria-label="اعرض ${safe(photo.label)}">
        <img src="${safe(photo.thumb)}" alt="${safe(photo.label)}" loading="lazy">
      </button>`).join('');
    setPhoto(0, false);
    document.body.classList.add('locked');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    byId('closeGallery').focus({preventScroll: true});
  }

  function closeCategory() {
    clearTimeout(openTimeout);
    swapToken++;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    activeCategory = null;
    clearPhotoEffects();
    grid.querySelectorAll('.is-opening').forEach(card => card.classList.remove('is-opening'));
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus({preventScroll: true});
  }

  function next(step) {
    if (activeCategory) setPhoto(photoIndex + step, true, step);
  }

  grid.addEventListener('click', event => {
    const card = event.target.closest('.folder-card');
    if (!card || activeCategory) return;
    card.classList.add('is-opening');
    openCategory(card.dataset.id, card);
  });

  byId('thumbGrid').addEventListener('click', event => {
    const thumb = event.target.closest('.thumb');
    if (!thumb || !activeCategory) return;
    const index = Number(thumb.dataset.index);
    if (index !== photoIndex) setPhoto(index, true, index > photoIndex ? 1 : -1);
  });
  byId('prevImage').addEventListener('click', () => next(-1));
  byId('nextImage').addEventListener('click', () => next(1));
  byId('closeGallery').addEventListener('click', closeCategory);
  overlay.querySelector('.gallery-backdrop').addEventListener('click', closeCategory);

  document.addEventListener('keydown', event => {
    if (!activeCategory) return;
    if (event.key === 'Escape') { closeCategory(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); next(-1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); next(1); }
    if (event.key !== 'Tab') return;
    const focusables = [...overlay.querySelectorAll('button,a[href]')].filter(el => el.getClientRects().length);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  let touchStartX = 0, touchStartY = 0;
  stage.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, {passive: true});
  stage.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) next(dx > 0 ? -1 : 1);
  }, {passive: true});

  let dragStart = null;
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.target.closest('button')) return;
    dragStart = event.clientX;
  });
  stage.addEventListener('pointerup', event => {
    if (dragStart === null || event.pointerType !== 'mouse') return;
    const dx = event.clientX - dragStart;
    dragStart = null;
    if (Math.abs(dx) > 65) next(dx > 0 ? -1 : 1);
  });

  menuToggle.addEventListener('click', () => {
    const opening = mobileNav.hidden;
    mobileNav.hidden = !opening;
    menuToggle.setAttribute('aria-expanded', String(opening));
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
  let scrollScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      byId('progress').style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
      scrollScheduled = false;
    });
  }, {passive: true});

  setupMarquee();
  setupFilters();
  renderFolders();
  reveal();
})();
