/* THOSE WHO PLAY — booking scheduler (rc-*)
   Replicated from rafacastello.com; skinned by the .rc-sched CSS
   block in twp.css. Self-contained: include this file on any page
   that carries the .rc-sched markup. */

(function(){
  "use strict";
  if(!document.getElementById('cal-grid')) return;   // no widget on this page

  /* ============================================================
     BACKEND SEAMS — the only two things a live version needs.
     Right now they run on mock data so the whole flow is
     clickable. To go live, replace the bodies with fetches to
     your Cloudflare Worker (Google Calendar) or Cal.com.
     ============================================================ */

  // ─── SWAP POINT 1 · availability ─────────────────────────────
  // Return open 30-min start times for a given day.
  // LIVE: return fetch('/api/availability?date='+dateISO).then(r=>r.json())
  //   → Worker calls Google Calendar freebusy.query, subtracts busy
  //     blocks + buffers from your working hours, returns ISO strings.
  // ── Point this at your deployed Worker to go live. Empty string = built-in demo data. ──
  const API_BASE = "https://rc-booking.rafacastello.workers.dev";   // live Worker → Google Calendar (empty string = built-in demo data); verified e2e 2026-07-11

  async function getAvailability(day){
    if(API_BASE){                                     // LIVE: Worker → Google Calendar free/busy
      try{
        var r=await fetch(API_BASE+'/api/availability?date='+day.toLocaleDateString('en-CA'));
        if(r.ok) return (await r.json()).slots || [];
      }catch(e){}
      return [];
    }
    await wait(260);                                  // demo data (no backend configured yet)
    var out=[], now=new Date(), minNotice=new Date(now.getTime()+3*3600*1000);
    if(day.getDay()===0 || day.getDay()===6) return out;
    if(seededDayFull(day)) return out;                // whole day already booked (demo)
    for(var h=10; h<=16; h++){
      for(var m=0; m<60; m+=30){
        if(h===16 && m>30) break;
        var t=new Date(day.getFullYear(),day.getMonth(),day.getDate(),h,m,0,0);
        if(t < minNotice) continue;
        if(seededTaken(t)) continue;
        out.push(t.toISOString());
      }
    }
    return out;
  }

  // ─── SWAP POINT 2 · create booking ───────────────────────────
  // Persist the booking + send the invite/Meet link.
  // LIVE: return fetch('/api/book',{method:'POST',body:JSON.stringify(payload)})
  //   → Worker calls Google Calendar events.insert with conferenceData
  //     (Meet) + attendee, returns {ok:true}. Or Cal.com booking API.
  async function createBooking(payload){
    if(API_BASE){                                     // LIVE: Worker → Google Calendar events.insert (+ Meet)
      try{
        var r=await fetch(API_BASE+'/api/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        return await r.json();                          // { ok, meetLink, htmlLink } or { error }
      }catch(e){ return {ok:false, error:String(e)}; }
    }
    await wait(900);                                  // demo (no backend)
    console.log('[demo booking]', payload);
    return {ok:true};
  }

  /* ---- deterministic "already taken" so a day looks consistent ---- */
  function seededTaken(t){
    var s=(t.getFullYear()*1000 + (t.getMonth()+1)*40 + t.getDate())*100 + t.getHours()*2 + (t.getMinutes()?1:0);
    s=(s*2654435761)>>>0;
    return (s % 10) < 3;               // ~30% of slots taken
  }
  /* ---- deterministic "day fully booked" so some whole days are unavailable ---- */
  function seededDayFull(d){
    var s=((d.getFullYear()*10000 + (d.getMonth()+1)*50 + d.getDate())*3266489917)>>>0;
    return (s % 10) < 3;               // ~30% of weekdays fully booked
  }
  function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}

  /* ============================================================
     STATE + FORMATTERS
     ============================================================ */
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your timezone';
  var tzShort = shortZone();
  var tzCity = (tz.split('/').pop()||tz).replace(/_/g,' ');

  var state={ month:new Date(new Date().getFullYear(),new Date().getMonth(),1),
              day:null, slotISO:null };
  var WINDOW_DAYS=28;   // only 4 weeks ahead
  var today=stripTime(new Date());
  var lastDay=addDays(today,WINDOW_DAYS);

  var fmtDayLong = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'});
  var fmtDayShort= new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'});
  var fmtTime    = new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
  var fmtMonth   = new Intl.DateTimeFormat(undefined,{month:'long'});
  var fmtClock   = new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});
  function tickClock(){ var el=document.getElementById('tz-clock'); if(el){ el.textContent=fmtClock.format(new Date()); } }
  setInterval(tickClock,1000);

  /* ---- elements ---- */
  var grid=document.getElementById('cal-grid'),
      monthLbl=document.getElementById('cal-month'),
      vDate=document.getElementById('view-date'),
      vTime=document.getElementById('view-time'),
      vDetails=document.getElementById('view-details'),
      vDone=document.getElementById('view-done'),
      slotList=document.getElementById('slot-list'),
      timeHeading=document.getElementById('time-heading'),
      timeTz=document.getElementById('time-tz'),
      stDate=document.getElementById('st-date'),
      stTime=document.getElementById('st-time'),
      stDetails=document.getElementById('st-details'),
      sepDT=document.getElementById('sep-dt'),
      sepTD=document.getElementById('sep-td'),
      stepBack=document.getElementById('step-back'),
      stepBackLabel=document.getElementById('step-back-label');

  /* ============================================================
     STEP CONTROL
     ============================================================ */
  function show(step){
    [vDate,vTime,vDetails,vDone].forEach(function(v){v.classList.add('rc-hidden')});
    var order=['date','time','details'];
    var idx = step==='done' ? 3 : order.indexOf(step);
    [stDate,stTime,stDetails].forEach(function(el,i){
      el.style.color='';                                    // all steps stay gray (--rc-faint)
      el.style.fontWeight = (i===idx) ? '500' : '';         // active keeps a subtle weight cue
    });
    // progressive breadcrumb — drop the steps already completed
    var onDate=step==='date', onTimeOrBefore=(step==='date'||step==='time');
    stDate.style.display = onDate ? '' : 'none';
    sepDT.style.display  = onDate ? '' : 'none';
    stTime.style.display = onTimeOrBefore ? '' : 'none';
    sepTD.style.display  = onTimeOrBefore ? '' : 'none';
    stDetails.style.display = step==='done' ? 'none' : '';   // no breadcrumb on the confirmation screen
    // left slot of the steps row: month on the date step, otherwise the back link (same line as the breadcrumb)
    monthLbl.style.display = onDate ? '' : 'none';
    if(step==='time'){ stepBackLabel.textContent='Change date'; stepBack.dataset.to='date'; stepBack.hidden=false; }
    else if(step==='details'){ stepBackLabel.textContent='Change time'; stepBack.dataset.to='time'; stepBack.hidden=false; }
    else { stepBack.hidden=true; }
    if(step==='date'){ vDate.classList.remove('rc-hidden'); }
    if(step==='time'){ vTime.classList.remove('rc-hidden'); }
    if(step==='details'){ vDetails.classList.remove('rc-hidden'); }
    if(step==='done'){ vDone.classList.remove('rc-hidden'); }
  }
  function mark(el){ el.style.fontWeight='500'; }   // active step: weight only, color stays weekday gray

  /* ============================================================
     CALENDAR
     ============================================================ */
  function dayIsOpen(d){
    var s=stripTime(d);
    if(s<today || s>lastDay) return false;
    if(d.getDay()===0 || d.getDay()===6) return false; // weekdays only (mock rule)
    if(!API_BASE && seededDayFull(d)) return false;    // demo: some weekdays already fully booked
    return true;
  }
  function mondayOfWeek(d){ var x=stripTime(d), g=x.getDay(); x.setDate(x.getDate()+(g===0?-6:1-g)); return x; }
  // Availability marker: little stars, varied shape but fixed size (9px). Shape is
  // deterministic per date so it doesn't reshuffle on re-render.
  function rcStarPoints(N,R,r){
    var p=[];
    for(var i=0;i<2*N;i++){ var a=Math.PI*i/N - Math.PI/2, rad=(i%2?r:R); p.push((12+rad*Math.cos(a)).toFixed(2)+','+(12+rad*Math.sin(a)).toFixed(2)); }
    return p.join(' ');
  }
  var RC_STAR_POINTS=rcStarPoints(8,11,6.5);   // one shape: chunky 8-point star
  function rcStarSVG(){
    return '<svg class="rc-star" viewBox="0 0 24 24" aria-hidden="true"><polygon points="'+RC_STAR_POINTS+'"/></svg>';
  }
  function renderMonth(){   // rolling weekday view: from this week through the end of the booking window (spans month boundaries)
    grid.innerHTML='';
    var startMon=mondayOfWeek(today);
    while(addDays(startMon,4)<today) startMon=addDays(startMon,7);   // skip any fully-past leading week
    var months=[];
    for(var wk=0; ; wk++){
      var weekMon=addDays(startMon, wk*7);
      if(stripTime(weekMon)>lastDay) break;                          // stop once the whole window is covered
      for(var di=0; di<5; di++){                                     // Mon … Fri
        var date=addDays(weekMon, di), s=stripTime(date);
        if(s>=today && s<=lastDay) months.push(date.getMonth());     // label reflects only the bookable range
        var open=dayIsOpen(date);
        var cell=document.createElement(open?'button':'div');
        cell.className='rc-day '+(open?'open':'closed');
        cell.innerHTML='<span class="rc-num">'+date.getDate()+'</span>';
        if(open){
          cell.setAttribute('type','button');
          cell.insertAdjacentHTML('beforeend', rcStarSVG(date));   // little star marker
          cell.setAttribute('aria-label',fmtDayLong.format(date));
          if(state.day && sameDay(state.day,date)) cell.classList.add('sel');
          (function(dt){ cell.addEventListener('click',function(){ pickDay(dt); }); })(date);
        }
        grid.appendChild(cell);
      }
    }
    var uniq=months.filter(function(m,i){ return months.indexOf(m)===i; });   // month(s) on screen → "July" or "July – August"
    monthLbl.textContent=uniq.map(function(m){ return fmtMonth.format(new Date(2000,m,1)); }).join(' – ');
  }

  /* ============================================================
     PICK DAY → LOAD SLOTS
     ============================================================ */
  async function pickDay(date){
    state.day=date; state.slotISO=null;
    renderMonth();
    show('time');
    timeHeading.textContent=fmtDayLong.format(date);
    timeHeading.style.color='';       // default: #007644 (from #time-heading rule) while slots load
    timeTz.innerHTML='Time zone: '+tzCity+' • <time id="tz-clock"></time>';
    timeTz.style.display='';
    tickClock();
    slotList.innerHTML='<div class="rc-empty-slots">Loading times…</div>';
    var slots=await getAvailability(date);
    if(slots.length>8) slots=slots.slice(0,8);   // cap: at most 8 available times per day
    if(!slots.length){
      slotList.innerHTML='<div class="rc-empty-slots">Nothing available.<br>Please try another day.</div>';
      timeHeading.style.color='var(--rc-ink)';   // dead-end day → date goes black, not red
      timeTz.style.display='none';   // hide the timezone/clock line when there are no openings
      return;
    }
    slotList.innerHTML='';
    slots.forEach(function(iso){
      var t=new Date(iso);
      var b=document.createElement('button');
      b.className='rc-slot'; b.type='button';
      b.textContent=fmtTime.format(t);
      b.addEventListener('click',function(){ pickSlot(iso,b); });
      slotList.appendChild(b);
    });
  }

  function pickSlot(iso,btn){
    state.slotISO=iso;
    Array.prototype.forEach.call(slotList.children,function(c){c.classList.remove('sel')});
    btn.classList.add('sel');
    var t=new Date(iso);
    document.getElementById('sum-big').textContent=fmtDayLong.format(t);
    document.getElementById('sum-sm').textContent=fmtTime.format(t)+' '+tzShort+' · 30 minutes · Google Meet';
    setTimeout(function(){ document.querySelectorAll('#view-details .rc-field.invalid').forEach(function(f){f.classList.remove('invalid');}); show('details'); document.getElementById('f-name').focus(); },160);
  }

  document.getElementById('step-back').addEventListener('click',function(){ show(this.dataset.to || 'date'); });

  /* ============================================================
     CONFIRM
     ============================================================ */
  var confirmBtn=document.getElementById('confirm-btn'),
      errEl=document.getElementById('form-err'),
      nameEl=document.getElementById('f-name'),
      emailEl=document.getElementById('f-email');
  function fieldOf(el){ return el.closest('.rc-field'); }
  nameEl.addEventListener('input',function(){ fieldOf(nameEl).classList.remove('invalid'); });
  emailEl.addEventListener('input',function(){ fieldOf(emailEl).classList.remove('invalid'); });
  confirmBtn.addEventListener('click',async function(){
    var name=nameEl.value.trim(),
        email=emailEl.value.trim(),
        note=document.getElementById('f-note').value.trim();
    errEl.textContent='';
    var nameBad=!name, emailBad=!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    fieldOf(nameEl).classList.toggle('invalid', nameBad);
    fieldOf(emailEl).classList.toggle('invalid', emailBad);
    if(nameBad || emailBad){ (nameBad?nameEl:emailEl).focus(); return; }

    confirmBtn.disabled=true; confirmBtn.classList.add('busy');
    confirmBtn.innerHTML='<span class="rc-spin"></span> Booking…';

    var titleH=document.querySelector('.rc-rail h1');
    var meetingTitle='〰️ ' + ((titleH && titleH.dataset.title) || 'Intro with Those Who Play');   // 〰️ prefix on the calendar invite only
    var res=await createBooking({ start:state.slotISO, name:name, email:email, note:note, title:meetingTitle });

    if(res && res.ok){
      var t=new Date(state.slotISO);
      document.getElementById('done-when').textContent=fmtDayShort.format(t)+' · '+fmtTime.format(t)+' '+tzShort;
      document.getElementById('done-email').textContent=email;
      var cl=calendarLinks(state.slotISO, note, res.meetLink, meetingTitle);
      document.getElementById('cal-google').href=cl.google;
      document.getElementById('cal-apple').href=cl.apple;
      document.getElementById('cal-outlook').href=cl.outlook;
      document.getElementById('cal-office').href=cl.office;
      document.getElementById('cal-yahoo').href=cl.yahoo;
      document.getElementById('cal-menu').setAttribute('hidden','');
      document.getElementById('cal-add-btn').setAttribute('aria-expanded','false');
      show('done');
    }else{
      errEl.textContent='Something jammed. Try again.';
    }
    confirmBtn.disabled=false; confirmBtn.classList.remove('busy');
    confirmBtn.textContent='Confirm booking';
  });

  document.getElementById('cal-add-btn').addEventListener('click',function(){
    var m=document.getElementById('cal-menu'), open=m.hasAttribute('hidden');
    if(open){ m.removeAttribute('hidden'); this.setAttribute('aria-expanded','true'); }
    else{ m.setAttribute('hidden',''); this.setAttribute('aria-expanded','false'); }
  });


  /* ============================================================
     HELPERS
     ============================================================ */
  function icsZ(d){ return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''); }
  function calendarLinks(startISO, note, meetLink, title){
    var start=new Date(startISO), end=new Date(start.getTime()+30*60000);
    title=title||'Intro with Those Who Play';
    var loc=meetLink||'Google Meet';
    var desc='30-minute intro with Those Who Play.'+(meetLink?(' Join: '+meetLink):'');
    var sZ=icsZ(start), eZ=icsZ(end), enc=encodeURIComponent, sISO=start.toISOString(), eISO=end.toISOString();
    var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//thosewhoplay.com//booking//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+sZ+'-rc@thosewhoplay.com','DTSTAMP:'+icsZ(new Date()),'DTSTART:'+sZ,'DTEND:'+eZ,'SUMMARY:'+title,'DESCRIPTION:'+desc.replace(/,/g,'\\,'),'LOCATION:'+loc.replace(/,/g,'\\,'),'END:VEVENT','END:VCALENDAR'].join('\r\n');
    return {
      google:'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+enc(title)+'&dates='+sZ+'/'+eZ+'&details='+enc(desc)+'&location='+enc(loc),
      apple:'data:text/calendar;charset=utf-8,'+enc(ics),
      outlook:'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject='+enc(title)+'&startdt='+enc(sISO)+'&enddt='+enc(eISO)+'&body='+enc(desc)+'&location='+enc(loc),
      office:'https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject='+enc(title)+'&startdt='+enc(sISO)+'&enddt='+enc(eISO)+'&body='+enc(desc)+'&location='+enc(loc),
      yahoo:'https://calendar.yahoo.com/?v=60&title='+enc(title)+'&st='+sZ+'&et='+eZ+'&desc='+enc(desc)+'&in_loc='+enc(loc)
    };
  }
  function shortZone(){
    try{
      var p=new Intl.DateTimeFormat(undefined,{timeZoneName:'short'}).formatToParts(new Date());
      var z=p.find(function(x){return x.type==='timeZoneName'});
      return z?z.value:'local';
    }catch(e){ return 'local'; }
  }
  function stripTime(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function addDays(d,n){ var c=new Date(d); c.setDate(c.getDate()+n); return c; }
  function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

  /* ---- boot ---- */
  renderMonth();
  show('date');
})();

/* ---------- Book-a-call: expand the scheduler from the button ---------- */
(function(){
  var btn=document.getElementById('bookToggle'), panel=document.getElementById('bookPanel');
  if(!btn||!panel) return;
  var titleEl=panel.querySelector('.rc-rail h1');
  var RC_TITLES=["Mapping Atmospheres","Harvesting Auroras","Sparking Geysers","Gazing Flocks","Seeking Sparks","Charting Coastlines","Hatching Ecosystems","Transforming Dunes","Kindling Embers","Channeling Torrents","Blooming Gardens","Envisioning Habitats","Roaming Microcosms","Unearthing Valleys","Trekking Glaciers","Navigating Comets","Harvesting Stars","Sculpting Clouds","Shining Caves","Chasing Horizons","Brewing Nebulae","Igniting Supernovas","Weaving Currents","Chasing Eclipses","Shining Caves","Cultivating Coral","Lighting Abysses","Gathering Stardust","Decoding Winds","Sifting Deserts","Anchoring Islands","Awakening Volcanoes","Traversing Tundras","Bottling Thunders"];
  var rcLastTitle=-1;
  function rcRotateTitle(){
    if(!titleEl) return;
    var i; do { i=Math.floor(Math.random()*RC_TITLES.length); } while(RC_TITLES.length>1 && i===rcLastTitle);
    rcLastTitle=i;
    titleEl.dataset.title=RC_TITLES[i]+' with Those Who Play';   // plain title → carried into the calendar invite
    titleEl.innerHTML='<span>'+RC_TITLES[i]+'</span><span class="rc-with">with Those Who Play</span>';
    // shrink-to-fit: long titles scale down just enough to stay on one line
    var line=titleEl.querySelector('span:first-child');
    var max=parseFloat(getComputedStyle(line).fontSize);
    if(line.scrollWidth>titleEl.clientWidth){
      line.style.fontSize=Math.floor(max*titleEl.clientWidth/line.scrollWidth)+'px';
    }
    titleEl.classList.remove('rc-flash'); void titleEl.offsetWidth; titleEl.classList.add('rc-flash');
  }
  rcRotateTitle();   // never show the static "Project Discovery"
  btn.addEventListener('click', function(){
    var open=panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', open?'true':'false');
    panel.setAttribute('aria-hidden', open?'false':'true');
    if(open){ rcRotateTitle(); setTimeout(function(){
      var mod=panel.querySelector('.rc-module');
      if(mod && window.matchMedia('(max-width:720px)').matches){
        // mobile: land the module's top stroke 20px below the fixed header
        var header=document.querySelector('.site-header');
        var hh=header?header.getBoundingClientRect().height:0;
        window.scrollTo({top:mod.getBoundingClientRect().top + window.scrollY - hh - 20, behavior:'smooth'});
      }else{
        panel.scrollIntoView({behavior:'smooth', block:'nearest'});
      }
    }, 280); }
  });
})();

