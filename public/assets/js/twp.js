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

/* Mobile menu.
   Built from the header's own markup rather than hard-coded, so the
   panel gains items automatically whenever the nav links (currently
   hidden pending section content) are un-hidden. No markup changes
   needed on any page. */
(function(){
  var head = document.querySelector('.site-head');
  if(!head) return;
  var nav = head.querySelector('.head-nav');
  var contact = head.querySelector(':scope > .contact-btn');
  var links = nav ? nav.querySelectorAll('.nav-link') : [];
  if(!links.length && !contact) return;          // nothing to put in a menu

  var btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'mobile-menu');
  btn.appendChild(document.createElement('span'));   // the three bars are CSS

  var panel = document.createElement('nav');
  panel.className = 'mobile-menu';
  panel.id = 'mobile-menu';
  panel.setAttribute('aria-label', 'Menu');
  var scroller = document.createElement('div');
  var inner = document.createElement('div');
  inner.className = 'inner';
  Array.prototype.forEach.call(links, function(a){ inner.appendChild(a.cloneNode(true)); });
  if(contact) inner.appendChild(contact.cloneNode(true));
  scroller.appendChild(inner);
  panel.appendChild(scroller);

  head.appendChild(btn);
  head.parentNode.insertBefore(panel, head.nextSibling);
  document.body.classList.add('has-menu');

  function setOpen(open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.classList.toggle('open', open);
  }
  btn.addEventListener('click', function(){
    setOpen(btn.getAttribute('aria-expanded') !== 'true');
  });
  panel.addEventListener('click', function(e){
    if(e.target.closest('a')) setOpen(false);      // navigating closes it
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true'){
      setOpen(false); btn.focus();
    }
  });
  // leaving the mobile breakpoint must not strand it open
  matchMedia('(min-width:769px)').addEventListener('change', function(e){
    if(e.matches) setOpen(false);
  });
})();
