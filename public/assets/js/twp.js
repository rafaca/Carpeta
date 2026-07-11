/* THOSE WHO PLAY — shared page behaviours */
/* Scroll reveals with per-group stagger */
(function(){
  var groups = [
    ['.bigtext .copy', '.book-call'],
    ['.caps .col'],
    ['.tile'],
    ['.newsletter h2', '.news-form-wrap'],
    ['.foot-main']
  ];
  var els = [];
  groups.forEach(function(sels){
    var i = 0;
    sels.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        el.classList.add('reveal');
        el.style.transitionDelay = (i++ % 4) * 90 + 'ms';
        els.push(el);
      });
    });
  });
  if (!('IntersectionObserver' in window)) { els.forEach(function(el){ el.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
  // hold anything visible at load until the intro (dancers → headline →
  // header) has landed; reduced-motion users get everything immediately
  var hasIntro = !!document.getElementById('dancers-stage');
  var introMs = (hasIntro && matchMedia('(prefers-reduced-motion: no-preference)').matches) ? 4600 : 0;
  setTimeout(function(){ els.forEach(function(el){ io.observe(el); }); }, introMs);
})();

/* Video band: optional privacy-friendly embeds + reduced-motion poster */
(function(){
  document.querySelectorAll('.video-band').forEach(function(band){
    var yt = band.dataset.youtube, vm = band.dataset.vimeo;
    if(yt || vm){
      var src = yt
        ? 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?rel=0'
        : 'https://player.vimeo.com/video/' + encodeURIComponent(vm) + '?dnt=1';
      var f = document.createElement('iframe');
      f.src = src;
      f.allow = 'fullscreen; picture-in-picture';
      f.title = band.getAttribute('aria-label') || 'Video';
      band.innerHTML = '';
      band.appendChild(f);
      return;
    }
    var v = band.querySelector('video');
    if(v && matchMedia('(prefers-reduced-motion: reduce)').matches){
      v.removeAttribute('autoplay');
      v.removeAttribute('loop');
      v.pause();
      v.controls = true;   // still watchable, just not moving on its own
    }
  });
})();
