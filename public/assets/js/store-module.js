/* THOSE WHO PLAY — store module (embeddable strip)
   Drop-in featured-products strip for any page:

     <section class="twp-store-module" data-count="4"></section>
     <script src="/assets/js/store-module.js" defer></script>

   Renders up to data-count featured products (falls back to the
   first N) from /assets/data/products.json using the shared store
   card styles in twp.css. Buy = link to the product page. */
(function(){
  "use strict";
  var hosts = document.querySelectorAll('.twp-store-module');
  if(!hosts.length) return;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  fetch('/assets/data/products.json')
    .then(function(r){ return r.json(); })
    .then(function(products){
      hosts.forEach(function(host){
        var n = parseInt(host.dataset.count || '4', 10);
        var picks = products.filter(function(p){ return p.featured; });
        products.forEach(function(p){
          if(picks.length < n && picks.indexOf(p) < 0) picks.push(p);
        });
        picks = picks.slice(0, n);
        host.innerHTML =
          '<div class="inner">' +
            '<h2>' + esc(host.dataset.title || 'From the store') + '</h2>' +
            '<div class="strip">' +
              picks.map(function(p){
                return '<a class="prod-card" href="/product.html?slug=' + esc(p.slug) + '">' +
                  '<div class="frame"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.name) + '" loading="lazy"></div>' +
                  '<div class="meta"><p class="name">' + esc(p.name) + '</p><p class="price">$' + p.price + '</p></div></a>';
              }).join('') +
            '</div>' +
          '</div>';
      });
    })
    .catch(function(){ /* strip stays empty — page copy is unaffected */ });
})();
