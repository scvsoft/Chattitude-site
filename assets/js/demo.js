// The hero's animation: someone walks a loop between four places. Each place has an area (a
// geofence); entering it joins its Slack channel and leaving it leaves, checked every frame against
// the real distance, the way the app does it. Stays still with "reduce motion" (the HTML already
// shows that moment: at the office, in #office), and pauses while it's off screen.
(function () {
  var demo = document.querySelector('.demo');
  if (!demo || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SPEED = 85; // map units per second
  var STOP_MS = 1900; // how long the walk pauses at each place
  var TOAST_MS = 2800;

  // the loop; `stop` marks the places, the other points just bend the route along the streets
  var ROUTE = [
    { x: 95, y: 105, stop: true },
    { x: 175, y: 165 },
    { x: 255, y: 215, stop: true },
    { x: 340, y: 150 },
    { x: 430, y: 100, stop: true },
    { x: 470, y: 210 },
    { x: 415, y: 320, stop: true },
    { x: 300, y: 350 },
    { x: 190, y: 300 },
    { x: 130, y: 200 },
  ];

  var walker = demo.querySelector('.walker');
  var list = demo.querySelector('.channels-list');
  var toasts = demo.querySelector('.toasts');
  var route = demo.querySelector('.route');
  var places = Array.prototype.map.call(demo.querySelectorAll('.place'), function (el) {
    return {
      el: el,
      channel: el.dataset.channel,
      x: +el.dataset.x,
      y: +el.dataset.y,
      r: +el.dataset.r,
      inside: false,
    };
  });

  route.setAttribute(
    'd',
    ROUTE.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join('') + 'Z'
  );

  // ---- the hero's chips light up with the map ----

  function lightChip(place, on) {
    var chip = document.querySelector('.lead .chip[data-channel="' + place.channel + '"]');
    if (!chip) return;
    chip.style.setProperty('--c', getComputedStyle(place.el).getPropertyValue('--c'));
    chip.classList.toggle('is-live', on);
  }

  // ---- notifications and the channel list ----

  function toast(verb, channel) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML =
      '<span class="toast-icon"><img src="assets/img/favicon.svg" alt="" width="32" height="32"></span>' +
      '<span class="toast-body"><span class="toast-title">Chattitude <span class="toast-time">now</span></span>' +
      '<span class="toast-text">You ' + verb + ' <strong>' + channel + '</strong></span></span>';
    toasts.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-shown'); });
    // one at a time: the newest replaces the last, so they never cover the map
    Array.prototype.forEach.call(toasts.querySelectorAll('.toast:not(.is-leaving)'), function (old) {
      if (old !== el) dismiss(old);
    });
    setTimeout(function () { dismiss(el); }, TOAST_MS);
  }

  function dismiss(el) {
    if (el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    el.classList.remove('is-shown');
    setTimeout(function () { el.remove(); }, 400);
  }

  function join(place) {
    place.el.classList.add('is-in');
    var li = document.createElement('li');
    li.className = 'ch ch--place';
    li.dataset.channel = place.channel;
    li.textContent = place.channel;
    list.appendChild(li);
    requestAnimationFrame(function () { li.classList.add('is-in'); });
    toast('joined', place.channel);
    lightChip(place, true);
  }

  function leave(place) {
    place.el.classList.remove('is-in');
    var li = list.querySelector('.ch--place[data-channel="' + place.channel + '"]');
    if (li) {
      li.classList.remove('is-in');
      li.classList.add('is-out');
      setTimeout(function () { li.remove(); }, 450);
    }
    toast('left', place.channel);
    lightChip(place, false);
  }

  // start from a clean slate: the HTML's still moment is replaced by the live one
  Array.prototype.forEach.call(list.querySelectorAll('.ch--place'), function (li) { li.remove(); });
  toasts.innerHTML = '';
  places.forEach(function (p) { p.el.classList.remove('is-in'); });

  // ---- the walk ----

  var seg = 0; // walking from ROUTE[seg] to ROUTE[seg + 1]
  var along = 0; // distance walked on this segment
  var pausedFor = 0; // ms left at a stop
  var running = false;
  var last = 0;

  function point(i) { return ROUTE[i % ROUTE.length]; }

  function step(dt) {
    if (pausedFor > 0) {
      pausedFor -= dt;
      return;
    }
    var a = point(seg);
    var b = point(seg + 1);
    var len = Math.hypot(b.x - a.x, b.y - a.y);
    along += (SPEED * dt) / 1000;
    if (along >= len) {
      along = 0;
      seg = (seg + 1) % ROUTE.length;
      if (point(seg).stop) pausedFor = STOP_MS;
    }
  }

  function position() {
    var a = point(seg);
    var b = point(seg + 1);
    var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    var t = Math.min(1, along / len);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function check(pos) {
    places.forEach(function (p) {
      var inside = Math.hypot(pos.x - p.x, pos.y - p.y) < p.r;
      if (inside && !p.inside) join(p);
      if (!inside && p.inside) leave(p);
      p.inside = inside;
    });
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(50, now - last);
    last = now;
    step(dt);
    var pos = position();
    walker.setAttribute('transform', 'translate(' + pos.x.toFixed(1) + ' ' + pos.y.toFixed(1) + ')');
    walker.classList.toggle('is-walking', pausedFor <= 0);
    check(pos);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  // only while it's on screen and the tab is visible
  var visible = true;
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    visible && !document.hidden ? start() : stop();
  }).observe(demo);
  document.addEventListener('visibilitychange', function () {
    visible && !document.hidden ? start() : stop();
  });

  pausedFor = 900; // a beat at home before the first walk
  start();
})();
