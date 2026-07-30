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
  // header) has landed; the intro only runs when the page opted in via
  // html.twp-intro (first visit this session) — repeats and
  // reduced-motion users get everything immediately
  var hasIntro = document.documentElement.classList.contains('twp-intro')
    && !!document.getElementById('dancers-stage');
  var introMs = (hasIntro && matchMedia('(prefers-reduced-motion: no-preference)').matches) ? 2600 : 0;
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

/* Newsletter signup.
   Set NEWSLETTER_ENDPOINT to the hosted list's form action (Buttondown,
   Mailchimp, ConvertKit …) and submissions POST straight to it. Until
   that exists, the form must not pretend: it hands the address to email
   so a signup reaches a person instead of being silently discarded. */
(function(){
  var NEWSLETTER_ENDPOINT = '';        // e.g. 'https://buttondown.email/api/emails/embed-subscribe/thosewhoplay'
  var NEWSLETTER_FIELD    = 'email';   // Mailchimp uses 'EMAIL'
  var INBOX = 'info@thosewhoplay.com';

  document.querySelectorAll('.news-form').forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var input = form.querySelector('input[type=email]');
      var btn = form.querySelector('button');
      var email = ((input && input.value) || '').trim();
      if(!email || !btn) return;
      var said = btn.textContent;

      if(NEWSLETTER_ENDPOINT){
        btn.textContent = 'Sending';
        var body = new FormData();
        body.append(NEWSLETTER_FIELD, email);
        fetch(NEWSLETTER_ENDPOINT, { method:'POST', body:body, mode:'no-cors' })
          .then(function(){ btn.textContent = 'Subscribed'; if(input) input.value = ''; })
          .catch(function(){ btn.textContent = 'Try again'; setTimeout(function(){ btn.textContent = said; }, 2500); });
        return;
      }

      // no backend: open the visitor's mail client with the signup ready
      btn.textContent = 'Opening email';
      window.location.href = 'mailto:' + INBOX
        + '?subject=' + encodeURIComponent('Newsletter signup')
        + '&body=' + encodeURIComponent('Please add this address to the Those Who Play list:\n\n' + email + '\n');
      setTimeout(function(){ btn.textContent = said; }, 4000);
    });
  });
})();
