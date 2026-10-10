/* =========================================================
   催眠APP — 交互逻辑
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var HEART_SVG =
    '<svg viewBox="0 0 32 30" aria-hidden="true">' +
    '<path fill="currentColor" d="M16 29C16 29 1 19 1 10.3 1 5.2 5.2 1 10.3 1c3.1 0 5.3 1.6 5.7 3.6C16.4 2.6 18.6 1 21.7 1 26.8 1 31 5.2 31 10.3 31 19 16 29 16 29z"/>' +
    '</svg>';

  /* ---------------- 原生桥 ---------------- */
  var ANDROID = (typeof window.Android !== 'undefined') ? window.Android : null;

  function bridge(fn, arg) {
    try {
      if (ANDROID && typeof ANDROID[fn] === 'function') { ANDROID[fn](arg); return true; }
    } catch (e) { /* 忽略 */ }
    return false;
  }
  function haptic(ms) {
    ms = ms || 12;
    if (!bridge('vibrate', ms) && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }
  function setImmersive(on)  { bridge('setImmersive', !!on); }
  function setKeepAwake(on)  { bridge('setKeepScreenOn', !!on); }

  /* ---------------- 轻提示 ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 1900);
  }

  /* ---------------- 字段定义 ---------------- */
  var FIELDS = [
    { key: 'cn-name',     section: '对象修改', label: '称呼' },
    { key: 'gender',      section: '对象修改', label: '性别' },
    { key: 'cn-age',      section: '对象修改', label: '年龄' },
    { key: 'cn-height',   section: '对象修改', label: '身高' },
    { key: 'cn-weight',   section: '对象修改', label: '体重' },
    { key: 'cn-body',     section: '对象修改', label: '体形' },
    { key: 'cn-type',     section: '对象修改', label: '分类' },
    { key: 'cn-pers',     section: '对象修改', label: '性格' },
    { key: 'cn-hair',     section: '对象修改', label: '发色' },
    { key: 'cn-hairlen',  section: '对象修改', label: '发型' },
    { key: 'cn-eye',      section: '对象修改', label: '瞳色' },
    { key: 'cn-voice',    section: '对象修改', label: '声线' },
    { key: 'cn-note',     section: '对象修改', label: '附加设定' },

    { key: 'hy-target',   section: '催眠', label: '对象' },
    { key: 'hy-text',     section: '催眠', label: '台词' },
    { key: 'hy-voice',    section: '催眠', label: '自定义语音' },
    { key: 'hy-strength', section: '催眠', label: '强度' },

    { key: 'cm-target',   section: '常识改写', label: '对象' },
    { key: 'cm-what',     section: '常识改写', label: '改写' },
    { key: 'cm-text',     section: '常识改写', label: '备注' },

    { key: 'se-mood',     section: '感觉调整', label: '心情' },
    { key: 'se-sense',    section: '感觉调整', label: '敏感度' },
    { key: 'se-warm',     section: '感觉调整', label: '体温' },
    { key: 'se-heart',    section: '感觉调整', label: '心跳' }
  ];

  var FIELD_KEYS = {};
  FIELDS.forEach(function (f) { FIELD_KEYS[f.key] = true; });

  var TARGET_KEYS = ['cn-name', 'hy-target', 'cm-target'];
  var PREFIX = { change: 'cn-', hypno: 'hy-', common: 'cm-', sense: 'se-' };

  var touched = {};

  /* ---------------- 读取 ---------------- */
  function readField(key) {
    var el = document.querySelector('[data-key="' + key + '"]');
    if (!el) return '';
    if (el.classList.contains('chips')) {
      return $$('.chip.on', el).map(function (c) {
        return c.textContent.trim();
      }).join('・');
    }
    if (el.type === 'range') return el.value + (el.dataset.unit || '');
    return (el.value || '').trim();
  }

  function collect() {
    var out = [];
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (!touched[f.key]) continue;
      var v = readField(f.key);
      if (v) out.push({ key: f.key, section: f.section, label: f.label, val: v });
    }
    return out;
  }

  function countByPrefix(prefix) {
    var n = 0;
    for (var k in touched) {
      if (touched[k] && k.indexOf(prefix) === 0 && readField(k)) n++;
    }
    return n;
  }

  /* ---------------- 变身预览 ---------------- */
  var MORPH_ORDER = ['gender','cn-age','cn-height','cn-weight','cn-body',
                     'cn-type','cn-pers','cn-hair','cn-hairlen','cn-eye','cn-voice'];

  function refreshMorph() {
    var who = $('#morphWho'), to = $('#morphTo');
    if (!who || !to) return;

    var name = readField('cn-name');
    if (name) { who.textContent = name; who.classList.remove('empty'); }
    else      { who.textContent = '还没指定是谁'; who.classList.add('empty'); }

    var tags = [];
    MORPH_ORDER.forEach(function (k) {
      if (!touched[k]) return;
      var v = readField(k);
      if (v) tags.push(v);
    });

    to.innerHTML = '';
    if (!tags.length) {
      to.classList.add('empty');
      to.textContent = '还没设定会变成什么样';
      return;
    }
    to.classList.remove('empty');
    tags.slice(0, 9).forEach(function (t) {
      var sp = document.createElement('span');
      sp.className = 'tk';
      sp.textContent = t;
      to.appendChild(sp);
    });
    if (tags.length > 9) {
      var m = document.createElement('span');
      m.className = 'tk';
      m.textContent = '+' + (tags.length - 9);
      to.appendChild(m);
    }
  }

  /* ---------------- 刷新界面 ---------------- */
  function refresh() {
    var items = collect();
    var n = items.length;

    refreshMorph();

    $('#ovCount').textContent = n;
    $('#ovRing').style.setProperty('--p', Math.min(1, n / 12).toFixed(3));

    var t = null;
    for (var i = 0; i < items.length; i++) {
      if (TARGET_KEYS.indexOf(items[i].key) >= 0) { t = items[i]; break; }
    }
    var ov = $('#ovTarget');
    if (t) { ov.textContent = t.val; ov.classList.remove('empty'); }
    else   { ov.textContent = '尚未指定'; ov.classList.add('empty'); }

    Object.keys(PREFIX).forEach(function (screen) {
      var el = document.getElementById(screen + 'Count');
      if (!el) return;
      var c = countByPrefix(PREFIX[screen]);
      el.textContent = c ? c + ' 项' : '';
    });

    var btn = $('#startBtn');
    btn.classList.toggle('ready', n > 0);
    var hint = $('#dockHint');
    hint.classList.remove('warn');
    hint.textContent = n > 0 ? (n + ' 项已设置 · 可以开始了') : '还没有设置任何项目';
  }

  var bumpTimer = null;
  function bumpDock() {
    var dock = $('#dock');
    dock.classList.remove('bump');
    void dock.offsetWidth;
    dock.classList.add('bump');
    var hint = $('#dockHint');
    hint.textContent = '先设置至少一项内容吧 ♡';
    hint.classList.add('warn');
    clearTimeout(bumpTimer);
    bumpTimer = setTimeout(refresh, 2400);
  }

  /* ---------------- 导航 ---------------- */
  function goScreen(id) {
    var next = document.querySelector('.screen[data-screen="' + id + '"]');
    if (!next) return;
    var cur = $('.screen.active');
    if (cur === next) return;
    if (cur) cur.classList.remove('active');
    next.scrollTop = 0;
    next.classList.add('active');
    haptic(8);
  }

  /* ---------------- 水波纹 ---------------- */
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest ? e.target.closest('.rip') : null;
    if (!el) return;
    var r = el.getBoundingClientRect();
    var size = Math.max(r.width, r.height);
    var s = document.createElement('span');
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top  = (e.clientY - r.top  - size / 2) + 'px';
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 640);
  }, { passive: true });

  /* ---------------- 全局点击 ---------------- */
  document.addEventListener('click', function (e) {
    var target = e.target;

    var goBtn = target.closest('[data-go]');
    if (goBtn) { goScreen(goBtn.dataset.go); return; }

    var backBtn = target.closest('[data-back]');
    if (backBtn) { goScreen('home'); return; }

    var chip = target.closest('.chip');
    if (chip) {
      var group = chip.closest('.chips');
      if (group.hasAttribute('data-single')) {
        $$('.chip', group).forEach(function (c) {
          c.classList.toggle('on', c === chip);
        });
      } else {
        chip.classList.toggle('on');
      }
      var key = group.dataset.key;
      if (key && FIELD_KEYS[key]) touched[key] = true;
      haptic(10);
      refresh();
      return;
    }

    var sw = target.closest('.switch');
    if (sw) {
      sw.classList.toggle('on');
      haptic(14);
      return;
    }
  });

  /* ---------------- 文本输入 ---------------- */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.dataset || !el.dataset.key) return;
    var key = el.dataset.key;

    if (el.type === 'range') {
      syncRange(el);
      tickHaptic(el);
    }
    if (FIELD_KEYS[key]) touched[key] = true;
    refresh();
  });

  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('txt')) {
      setTimeout(function () {
        try { el.scrollIntoView({ block: 'nearest' }); } catch (err) {}
      }, 320);
    }
  });

  /* ---------------- 滑杆 ---------------- */
  function syncRange(input) {
    var wrap = input.closest('[data-range]');
    if (!wrap) return;
    var min = parseFloat(input.min), max = parseFloat(input.max), v = parseFloat(input.value);
    var p = (max - min) ? (v - min) / (max - min) : 0;
    wrap.style.setProperty('--p', p.toFixed(4));
    var b = wrap.querySelector('.bubble');
    if (b) b.textContent = v + (input.dataset.unit || '');
  }

  function tickHaptic(input) {
    if (input._last === undefined) { input._last = input.value; return; }
    if (input._last !== input.value) {
      input._last = input.value;
      haptic(5);
    }
  }

  /* ---------------- 假装录音 ---------------- */
  var recState = 'idle';
  var recTicker = null;
  var recSeconds = 0;

  function fmt(s) {
    var m = Math.floor(s / 60), x = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x;
  }

  function startRec() {
    recState = 'recording';
    recSeconds = 0;
    $('#recTime').textContent = '00:00';
    $('#recLabel').textContent = '停止';
    $('#recBtn').classList.add('recording');
    $('#recWave').classList.add('on');
    $('#voiceClip').hidden = true;
    haptic(18);
    recTicker = setInterval(function () {
      recSeconds++;
      $('#recTime').textContent = fmt(recSeconds);
      if (recSeconds >= 60) stopRec();
    }, 1000);
  }

  function stopRec() {
    clearInterval(recTicker);
    recState = 'done';
    $('#recBtn').classList.remove('recording');
    $('#recWave').classList.remove('on');
    $('#recLabel').textContent = '重录';
    var dur = Math.max(1, recSeconds);
    $('#vcInfo').textContent = fmt(dur) + ' · 已录制';
    $('#voiceClip').hidden = false;
    $('#hyVoice').value = fmt(dur);
    touched['hy-voice'] = true;
    haptic(18);
    refresh();
  }

  $('#recBtn').addEventListener('click', function () {
    if (recState === 'recording') stopRec(); else startRec();
  });

  $('#vcDel').addEventListener('click', function () {
    $('#voiceClip').hidden = true;
    recState = 'idle';
    $('#recLabel').textContent = '录音';
    recSeconds = 0;
    $('#recTime').textContent = '00:00';
    $('#hyVoice').value = '';
    delete touched['hy-voice'];
    refresh();
  });

  $('#vcPlay').addEventListener('click', function () {
    var btn = $('#vcPlay');
    var text = ($('[data-key="hy-text"]').value || '').trim()
             || '你现在很放松，只能听见我的声音。';
    btn.classList.add('playing');
    $('#recWave').classList.add('on');

    function finish() {
      btn.classList.remove('playing');
      $('#recWave').classList.remove('on');
    }

    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 0.85;
        u.pitch = 1.05;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
        setTimeout(finish, Math.min(20000, text.length * 260 + 2600));
      } catch (e) { setTimeout(finish, 2400); }
    } else {
      setTimeout(finish, 2400);
    }
  });

  /* ---------------- 催眠演出 ---------------- */
  var showEl   = $('#show');
  var heartsEl = $('#hearts');
  var rotEl    = $('#hypnoRot');
  var coreEl   = $('#coreHeart');
  var showRunning = false;
  var spawnTimer = null, loopTimer = null, tunnelTimer = null;

  /* 中心那颗心先蹦出来 */
  function popCore() {
    coreEl.innerHTML = HEART_SVG;
    coreEl.classList.remove('pop');
    void coreEl.offsetWidth;
    coreEl.classList.add('pop');
  }

  /* 然后一层层向外扩张的心形隧道 */
  function buildTunnel() {
    rotEl.innerHTML = '';
    var N = 10, DUR = 3.4;
    for (var i = 0; i < N; i++) {
      var d = document.createElement('div');
      d.className = 'h-layer';
      d.style.setProperty('--w', '190px');
      d.style.setProperty('--hue', (322 - i * 12).toFixed(0));
      d.style.setProperty('--dur', DUR + 's');
      d.style.setProperty('--delay', (-(i * DUR / N)).toFixed(2) + 's');
      d.innerHTML = HEART_SVG;
      rotEl.appendChild(d);
    }
  }

  /* 飞散的碎心（点缀） */
  function spawnWave(n) {
    var wave = document.createElement('div');
    wave.className = 'wave';

    var rect = $('#app').getBoundingClientRect();
    var maxD = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 0.55;
    var count = 5 + Math.floor(Math.random() * 4) + Math.min(5, n);

    for (var i = 0; i < count; i++) {
      var wh = document.createElement('div');
      wh.className = 'wh';

      var angle = (360 / count) * i + (Math.random() * 26 - 13);
      var dist  = maxD * (0.28 + Math.random() * 1.0);
      var size  = 9 + Math.random() * 20;

      wh.style.setProperty('--a', angle.toFixed(1) + 'deg');
      wh.style.setProperty('--d', dist.toFixed(0) + 'px');
      wh.style.setProperty('--s', size.toFixed(1) + 'px');
      wh.style.setProperty('--hue', (300 + Math.random() * 80).toFixed(0));
      wh.style.setProperty('--dur', (2.3 + Math.random() * 1.9).toFixed(2) + 's');
      wh.style.setProperty('--delay', (Math.random() * 0.3).toFixed(2) + 's');
      wh.innerHTML = '<div class="wh-in">' + HEART_SVG + '</div>';

      wave.appendChild(wh);
    }
    heartsEl.appendChild(wave);
    setTimeout(function () { if (wave.parentNode) wave.parentNode.removeChild(wave); }, 5400);
  }

  function pulse() {
    var p = $('#pulse');
    p.classList.remove('go');
    void p.offsetWidth;
    p.classList.add('go');
  }

  function renderResult(items) {
    var ul = $('#resultList');
    ul.innerHTML = '';
    items.slice(0, 7).forEach(function (it) {
      var li = document.createElement('li');
      var s = document.createElement('span'); s.className = 'sec'; s.textContent = it.section;
      var b = document.createElement('b');   b.className = 'lab'; b.textContent = it.label;
      var v = document.createElement('span'); v.className = 'val'; v.textContent = it.val;
      li.appendChild(s); li.appendChild(b); li.appendChild(v);
      ul.appendChild(li);
    });
    if (items.length > 7) {
      var more = document.createElement('li');
      more.className = 'more';
      more.textContent = '其他 ' + (items.length - 7) + ' 项…';
      ul.appendChild(more);
    }
  }

  function clearTimers() {
    clearInterval(spawnTimer);
    clearTimeout(loopTimer);
    clearTimeout(tunnelTimer);
    spawnTimer = loopTimer = tunnelTimer = null;
  }

  function startShow() {
    if (showRunning) return;
    var items = collect();
    if (!items.length) { bumpDock(); toast('先设置至少一项内容吧'); return; }

    showRunning = true;
    showEl.classList.add('on');
    showEl.classList.add('psy');
    $('#result').classList.remove('on');
    heartsEl.innerHTML = '';
    rotEl.innerHTML = '';

    setImmersive(true);
    setKeepAwake(true);
    haptic(26);

    // ① 中间蹦出一颗心
    popCore();
    pulse();

    // ② 700ms 后，边缘开始一层层向外扩张
    tunnelTimer = setTimeout(function () {
      if (!showRunning) return;
      buildTunnel();
      var n = 0;
      spawnTimer = setInterval(function () { n++; spawnWave(n); pulse(); }, 420);
    }, 700);

    // ③ 七秒后结算
    setTimeout(function () {
      if (!showRunning) return;
      clearInterval(spawnTimer); spawnTimer = null;
      renderResult(items);
      rotEl.innerHTML = '';
      coreEl.classList.remove('pop');
      setTimeout(function () {
        if (!showRunning) return;
        $('#result').classList.add('on');
        var loopOn = $('[data-key="hy-loop"]').classList.contains('on');
        if (loopOn) {
          loopTimer = setTimeout(function () {
            closeShow();
            setTimeout(startShow, 300);
          }, 4200);
        }
      }, 420);
    }, 7000);
  }

  function closeShow() {
    clearTimers();
    showEl.classList.remove('on');
    showEl.classList.remove('psy');
    heartsEl.innerHTML = '';
    rotEl.innerHTML = '';
    coreEl.classList.remove('pop');
    coreEl.innerHTML = '';
    $('#result').classList.remove('on');
    showRunning = false;
    setImmersive(false);
    setKeepAwake(false);
  }

  $('#startBtn').addEventListener('click', startShow);

  $('#againBtn').addEventListener('click', function () {
    closeShow();
    setTimeout(startShow, 300);
  });

  $('#closeBtn').addEventListener('click', function () {
    closeShow();
    haptic(12);
  });

  /* ---------------- 返回键由原生调用 ---------------- */
  window.__androidBack = function () {
    if (showEl.classList.contains('on')) { closeShow(); return true; }
    var cur = $('.screen.active');
    if (cur && cur.dataset.screen !== 'home') { goScreen('home'); return true; }
    return false;
  };

  /* ---------------- 初始化 ---------------- */
  $$('input[type=range]').forEach(function (r) {
    syncRange(r);
    r._last = r.value;
  });

  refresh();

  /* 首帧后重算一次，确保布局稳定 */
  window.addEventListener('load', function () {
    $$('input[type=range]').forEach(syncRange);
    refresh();
  });
})();
