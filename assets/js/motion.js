// Motion across the page (the hero's map is demo.js). Everything here is extra: the page reads the
// same without it, and with "reduce motion" only the parts that aren't movement stay (the steps are
// shown as reached, the FAQ opens normally).
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ---- 13. scroll progress line ----
  var bar = document.querySelector('.progress-bar');

  // ---- 4/5. a dot walks the steps' line; each step's icon reacts when it arrives ----
  var stepsList = document.querySelector('.steps');
  var stepsDot = document.querySelector('.steps-dot');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0) + ')';

    if (stepsList && stepsDot) {
      var top = stepsList.getBoundingClientRect().top;
      var vh = window.innerHeight;
      // from the steps entering the lower part of the screen to reaching its upper third
      var p = reduce ? 1 : clamp((vh * 0.85 - top) / (vh * 0.5), 0, 1);
      stepsList.style.setProperty('--p', p.toFixed(3));
      steps.forEach(function (step, i) {
        if (p >= i / (steps.length - 1) - 0.001) step.classList.add('is-reached');
      });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---- 1. the map tilts towards the pointer, with a soft light following it ----
  var demo = document.querySelector('.demo');
  if (demo && fineHover && !reduce) {
    demo.addEventListener('mousemove', function (e) {
      var r = demo.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width; // 0..1
      var y = (e.clientY - r.top) / r.height;
      demo.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
      demo.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
      demo.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      demo.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      demo.classList.add('is-tilting');
    });
    demo.addEventListener('mouseleave', function () {
      demo.style.setProperty('--ry', '0deg');
      demo.style.setProperty('--rx', '0deg');
      demo.classList.remove('is-tilting');
    });
  }

  // ---- 10. FAQ: answers slide open and closed ----
  Array.prototype.forEach.call(document.querySelectorAll('.faq details'), function (details) {
    var summary = details.querySelector('summary');
    var running = null;
    summary.addEventListener('click', function (e) {
      if (reduce || !details.animate) return;
      e.preventDefault();
      if (running) running.cancel();
      var from = details.offsetHeight;
      var opening = !details.open;
      if (opening) details.open = true;
      var to = opening ? details.scrollHeight : summary.offsetHeight;
      details.style.overflow = 'hidden';
      running = details.animate({ height: [from + 'px', to + 'px'] }, { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      details.classList.toggle('is-closing', !opening);
      running.onfinish = function () {
        if (!opening) details.open = false;
        details.classList.remove('is-closing');
        details.style.overflow = '';
        running = null;
      };
    });
  });

  // ---- 11. the logo's dots burst out of "Get notified" buttons ----
  var DOTS = ['#edb724', '#82d3e0', '#ef5350', '#15b794'];
  function burst(x, y) {
    for (var i = 0; i < 14; i++) {
      var dot = document.createElement('span');
      dot.className = 'confetti';
      dot.style.background = DOTS[i % DOTS.length];
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      document.body.appendChild(dot);
      var angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      var dist = 50 + Math.random() * 60;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      var anim = dot.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx * 0.8 + 'px), calc(-50% + ' + dy * 0.8 + 'px)) scale(1)', opacity: 1, offset: 0.55 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + (dy + 30) + 'px)) scale(0.5)', opacity: 0 },
        ],
        { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)' }
      );
      anim.onfinish = (function (d) { return function () { d.remove(); }; })(dot);
    }
  }
  if (!reduce) {
    Array.prototype.forEach.call(document.querySelectorAll('.btn--primary'), function (btn) {
      btn.addEventListener('click', function (e) {
        var x = e.clientX;
        var y = e.clientY;
        // keyboard clicks have no pointer position: burst from the middle of the button
        if (!x && !y) {
          var r = btn.getBoundingClientRect();
          x = r.left + r.width / 2;
          y = r.top + r.height / 2;
        }
        burst(x, y);
      });
    });
  }
})();
