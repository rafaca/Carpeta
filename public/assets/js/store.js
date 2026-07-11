/* THOSE WHO PLAY — store
   All client-side: renders the index grid, filters/search/sort, and
   the product detail page from /assets/data/products.json.
   Buying is Stripe Payment Links — the Buy button is a plain link to
   Stripe-hosted checkout; an empty stripePaymentLink renders a
   disabled "Coming soon" button. No keys, no SDK, no backend. */
(function(){
  "use strict";
  var grid = document.getElementById('store-grid');
  var detail = document.getElementById('product-root');
  if(!grid && !detail) return;

  fetch('/assets/data/products.json')
    .then(function(r){ return r.json(); })
    .then(function(products){
      if(grid) storeIndex(products);
      if(detail) productPage(products);
    })
    .catch(function(e){
      var host = grid || detail;
      host.innerHTML = '<div class="store-empty">The shelves are being restocked — try a refresh.</div>';
    });

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ============================================================
     INDEX — sidebar filters + search + sort + grid
     ============================================================ */
  function storeIndex(products){
    var state = {
      q: '',
      sort: 'new',
      keywords: {},   // keyword -> on/off (chips)
      colors: {},
      sizes: {},
      cats: {},
      priceMax: 100
    };
    // union of facets across the catalogue
    var allKeywords = [], allColors = [], allSizes = [], allCats = [];
    products.forEach(function(p){
      (p.keywords||[]).forEach(function(k){ if(allKeywords.indexOf(k)<0) allKeywords.push(k); });
      ((p.options||{}).Color||[]).forEach(function(c){ if(allColors.indexOf(c)<0) allColors.push(c); });
      ((p.options||{}).Size||[]).forEach(function(s){ if(allSizes.indexOf(s)<0) allSizes.push(s); });
      if(p.tag && allCats.indexOf(p.tag)<0) allCats.push(p.tag);
    });
    allKeywords.forEach(function(k){ state.keywords[k] = true; });

    /* ---- sidebar ---- */
    var side = document.getElementById('store-side');
    var html = '<h3>Keywords</h3><div class="chips" id="kw-chips">';
    allKeywords.forEach(function(k){
      html += '<button class="chip" type="button" data-kw="'+esc(k)+'">'+esc(k)+' <span class="x" aria-hidden="true">×</span></button>';
    });
    html += '</div>';
    if(allCats.length){
      html += '<h3>Label</h3>';
      allCats.forEach(function(c){
        html += '<label class="check"><input type="checkbox" data-cat="'+esc(c)+'"> <span>'+esc(c)+'<span class="desc">Products tagged '+esc(c.toLowerCase())+'</span></span></label>';
      });
    }
    html += '<h3>Price</h3><div class="price-row"><span>$0</span><span id="price-out">$100</span></div>';
    html += '<input type="range" id="price-max" min="0" max="100" value="100" step="1" aria-label="Maximum price">';
    if(allColors.length){
      html += '<h3>Color</h3>';
      allColors.forEach(function(c){
        html += '<label class="check"><input type="checkbox" data-color="'+esc(c)+'"> <span>'+esc(c)+'</span></label>';
      });
    }
    if(allSizes.length){
      html += '<h3>Size</h3>';
      allSizes.forEach(function(s){
        html += '<label class="check"><input type="checkbox" data-size="'+esc(s)+'"> <span>'+esc(s)+'</span></label>';
      });
    }
    side.innerHTML = html;

    /* ---- events ---- */
    side.addEventListener('click', function(e){
      var chip = e.target.closest('.chip');
      if(chip){
        var k = chip.dataset.kw;
        state.keywords[k] = !state.keywords[k];
        chip.classList.toggle('off', !state.keywords[k]);
        render();
      }
    });
    side.addEventListener('change', function(e){
      var t = e.target;
      if(t.dataset.color != null) state.colors[t.dataset.color] = t.checked;
      if(t.dataset.size != null) state.sizes[t.dataset.size] = t.checked;
      if(t.dataset.cat != null) state.cats[t.dataset.cat] = t.checked;
      render();
    });
    var priceEl = document.getElementById('price-max');
    priceEl.addEventListener('input', function(){
      state.priceMax = +priceEl.value;
      document.getElementById('price-out').textContent = '$' + priceEl.value;
      render();
    });
    document.getElementById('store-q').addEventListener('input', function(e){
      state.q = e.target.value.trim().toLowerCase();
      render();
    });
    document.querySelectorAll('.sort-pill').forEach(function(b){
      b.addEventListener('click', function(){
        state.sort = b.dataset.sort;
        document.querySelectorAll('.sort-pill').forEach(function(x){ x.classList.toggle('on', x === b); });
        render();
      });
    });

    /* ---- filtering + sorting ---- */
    function anyChecked(map){ for(var k in map) if(map[k]) return true; return false; }
    function visible(p){
      if(p.price > state.priceMax) return false;
      if(state.q && (p.name + ' ' + p.description).toLowerCase().indexOf(state.q) < 0) return false;
      // keyword chips: product passes if it has at least one active keyword
      var kws = p.keywords || [];
      if(kws.length && !kws.some(function(k){ return state.keywords[k]; })) return false;
      if(anyChecked(state.cats) && !state.cats[p.tag]) return false;
      var col = ((p.options||{}).Color)||[];
      if(anyChecked(state.colors) && !col.some(function(c){ return state.colors[c]; })) return false;
      var siz = ((p.options||{}).Size)||[];
      if(anyChecked(state.sizes) && !siz.some(function(s){ return state.sizes[s]; })) return false;
      return true;
    }
    function sorted(list){
      var l = list.slice();
      if(state.sort === 'asc') l.sort(function(a,b){ return a.price - b.price; });
      if(state.sort === 'desc') l.sort(function(a,b){ return b.price - a.price; });
      if(state.sort === 'rating') l.sort(function(a,b){ return (b.rating||0) - (a.rating||0); });
      if(state.sort === 'new') l.sort(function(a,b){ return (b.tag==='NEW') - (a.tag==='NEW'); });
      return l;
    }

    function card(p){
      return '<a class="prod-card' + (p.featured ? ' wide' : '') + '" href="/product.html?slug=' + esc(p.slug) + '">' +
        '<div class="frame"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.name) + '" loading="lazy"></div>' +
        '<div class="meta"><p class="name">' + esc(p.name) + '</p><p class="price">$' + p.price + '</p></div></a>';
    }
    function render(){
      var list = sorted(products.filter(visible));
      if(!list.length){
        grid.innerHTML = '<div class="store-empty">Nothing matches — loosen a filter or two.</div>';
        return;
      }
      // standard cards first, featured wides after (2-up row), per the frame
      var std = list.filter(function(p){ return !p.featured; });
      var wide = list.filter(function(p){ return p.featured; });
      grid.innerHTML = std.map(card).join('') + wide.map(card).join('');
    }
    render();
  }

  /* ============================================================
     PRODUCT DETAIL — ?slug=
     ============================================================ */
  function productPage(products){
    var slug = new URLSearchParams(location.search).get('slug') || products[0].slug;
    var p = products.find(function(x){ return x.slug === slug; }) || products[0];
    document.title = p.name + ' — Those Who Play Store';

    var optHtml = '';
    var optNames = Object.keys(p.options || {});
    if(optNames.length){
      optHtml = '<div class="opt-row">' + optNames.map(function(n){
        return '<label class="opt">' + esc(n) + '<select data-opt="' + esc(n) + '">' +
          p.options[n].map(function(v){ return '<option>' + esc(v) + '</option>'; }).join('') +
          '</select></label>';
      }).join('') + '</div>';
    }

    var faqHtml = '';
    if((p.faq||[]).length){
      faqHtml = '<div class="faq">' + p.faq.map(function(f){
        return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>';
      }).join('') + '</div>';
    }

    var buy = p.stripePaymentLink
      ? '<a class="buy-btn" id="buy-btn" href="' + esc(p.stripePaymentLink) + '" target="_blank" rel="noopener">Buy</a>'
      : '<a class="buy-btn" id="buy-btn" aria-disabled="true" role="link" href="#">Coming soon</a>';

    detail.innerHTML =
      '<div class="product-media">' +
        '<div class="frame"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.name) + '"></div>' +
        '<button class="wishlist" type="button" aria-label="Add to wishlist" aria-pressed="false">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="product-info">' +
        '<h1>' + esc(p.name) + '</h1>' +
        (p.tag ? '<span class="tag-chip">' + esc(p.tag) + '</span>' : '') +
        '<p class="price">$' + p.price + '</p>' +
        '<p class="desc">' + esc(p.description) + '</p>' +
        optHtml + buy + faqHtml +
      '</div>';

    // options ride into Stripe as client_reference_id (Payment Links
    // ignore unknown params safely)
    function refreshBuyHref(){
      var a = document.getElementById('buy-btn');
      if(!p.stripePaymentLink) return;
      var parts = [p.slug];
      detail.querySelectorAll('select[data-opt]').forEach(function(s){
        parts.push(s.value.toLowerCase().replace(/[^a-z0-9]+/g, ''));
      });
      var url = new URL(p.stripePaymentLink);
      url.searchParams.set('client_reference_id', parts.join('-').slice(0, 200));
      a.href = url.toString();
    }
    detail.querySelectorAll('select[data-opt]').forEach(function(s){
      s.addEventListener('change', refreshBuyHref);
    });
    refreshBuyHref();

    var wish = detail.querySelector('.wishlist');
    wish.addEventListener('click', function(){
      var on = wish.classList.toggle('on');
      wish.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
})();
