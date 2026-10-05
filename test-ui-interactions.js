import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const timers = [];
let renders = 0, editing = true, selected = false, modalOpen = false;
const panel = { focus() {} };
const context = vm.createContext({
 console, setTimeout: fn => { timers.push(fn); return timers.length; },
 document: {
  activeElement: { matches: () => editing },
  addEventListener() {}, querySelectorAll: () => [],
  querySelector: () => modalOpen ? { getClientRects: () => [1] } : null,
  getElementById: id => id === 'workspace-tabs' ? { querySelectorAll: () => [] } : panel
 },
 DashboardView: { render: () => renders++ }, PlanningView: { render: () => renders++ },
 announceToScreenReader() {}, window: null
});
context.window = context;
context.getSelection = () => ({ isCollapsed: !selected });
vm.runInContext(fs.readFileSync('js/app.js','utf8'),context);
const refresh = () => vm.runInContext('App.requestRefresh()',context);
const tick = () => { const fn = timers.shift(); assert.ok(fn); fn(); };
refresh(); refresh(); assert.equal(timers.length,1);
tick(); assert.equal(renders,0); // typing stays in the same DOM
editing = false; selected = true; tick(); assert.equal(renders,0);
selected = false; modalOpen = true; tick(); assert.equal(renders,0);
modalOpen = false; tick(); assert.equal(renders,1);
refresh(); vm.runInContext("App.navigateTo('planning',false)",context);
assert.equal(renders,2); tick(); assert.equal(renders,2); // old refresh cancelled

let copied = '', removed = false, restored = false;
const active = { selectionStart: 2, selectionEnd: 4, selectionDirection: 'forward', focus: () => { restored = true; }, setSelectionRange: (a,b) => { assert.equal(a,2); assert.equal(b,4); } };
const field = { style: {}, focus() {}, select() {}, remove: () => { removed = true; } };
const clip = vm.createContext({ navigator: { clipboard: { writeText: async text => { copied = text; } } }, window: { getSelection: () => null }, document: { activeElement: active, createElement: () => field, body: { appendChild() {} }, execCommand: () => { copied = field.value; return true; } } });
vm.runInContext(fs.readFileSync('js/utils.js','utf8'),clip);
await vm.runInContext("copyText('analyse العربية')",clip); assert.equal(copied,'analyse العربية');
clip.navigator.clipboard.writeText = async () => { throw new Error('blocked'); };
await vm.runInContext("copyText('fallback')",clip); assert.equal(copied,'fallback'); assert.ok(removed && restored);
clip.navigator.clipboard = undefined;
await vm.runInContext("copyText('HTTP')",clip); assert.equal(copied,'HTTP');
clip.document.execCommand = () => false;
await assert.rejects(vm.runInContext("copyText('failure')",clip), /Copie indisponible/);
const agent = fs.readFileSync('js/agent.js','utf8');
assert.equal((agent.match(/id="btn-copy-all"/g)||[]).length,1);
assert.equal((agent.match(/id="btn-copy-analysis"/g)||[]).length,1);
console.log('PASS: deferred refresh, navigation, selection, dialogs, clipboard and fallback');
