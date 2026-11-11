/* wrk. 3D viewer bridge. Runs inside a WebView (native) or an iframe (web). Commands in, events out, JSON both ways. */
(function () {
  'use strict';
  var WRK = window.WRK, el = document.getElementById('stage');
  var stage = null, inst = null, current = null, states = {}, personal = { name: 'نورة العتيبي', latin: 'Noura Alotaibi', date: '2026-12-06' };
  function send(m) {
    var s = JSON.stringify(m);
    try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); else if (window.parent && window.parent !== window) window.parent.postMessage(s, '*'); } catch (e) {}
  }
  function byId(id) { return WRK.products.filter(function (p) { return p.id === id; })[0]; }
  function actionsOf(p) { return (p.actions || []).map(function (a) { return { id: a.id, label: (a.label || {}).ar || '', labelOn: (a.labelOn || a.label || {}).ar || '', step: !!a.step, on: !!states[a.id] }; }); }
  function show(id) {
    var p = byId(id); if (!p) return;
    if (!stage) { stage = new WRK.Stage(el); el.addEventListener('pointerdown', function () { send({ type: 'touched' }); }); }
    if (stage.failed) { send({ type: 'failed' }); return; }
    states = {}; current = p;
    try { inst = stage.show(p, personal); stage.resize(); } catch (e) { inst = null; send({ type: 'failed', message: String(e) }); return; }
    send({ type: 'shown', id: id, actions: actionsOf(p) });
  }
  window.wrk = function (cmd) {
    if (typeof cmd === 'string') { try { cmd = JSON.parse(cmd); } catch (e) { return; } }
    if (!cmd || typeof cmd !== 'object') return;
    if (cmd.personal) {
      personal = { name: String(cmd.personal.name || '').trim() || 'نورة العتيبي', latin: String(cmd.personal.latin || '').trim() || 'Noura Alotaibi', date: cmd.personal.date || '2026-12-06' };
    }
    if (cmd.type === 'show') { ready.then(function () { show(cmd.id); }); }
    else if (cmd.type === 'personal') { if (inst && inst.setPersonal) { try { inst.setPersonal(personal); stage.dirty = true; } catch (e) {} } }
    else if (cmd.type === 'action' && inst && inst.setState && current) {
      var a = (current.actions || []).filter(function (x) { return x.id === cmd.id; })[0]; if (!a) return;
      if (a.step) { inst.setState(a.id, true, true); }
      else { var on = !states[a.id]; states[a.id] = on; inst.setState(a.id, on, true); }
      send({ type: 'actions', id: current.id, actions: actionsOf(current) });
    }
  };
  function onMsg(e) { if (typeof e.data === 'string' && e.data.charAt(0) === '{') window.wrk(e.data); }
  window.addEventListener('message', onMsg); document.addEventListener('message', onMsg);
  var ready = WRK.fontsReady.then(function () { send({ type: 'ready' }); });
})();
