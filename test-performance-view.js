import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const contents = [
 { id:'old',titre:'Ancien post',datePublication:'2026-09-26',heure:'10:00',plateforme:'Instagram',statut:'publie',format:'post',resultats:{portee:10,commentaires:0}},
 { id:'new',titre:'Nouveau reel',datePublication:'2026-10-12',heure:'12:00',plateforme:'Facebook',statut:'publie',format:'reel',resultats:{portee:500,commentaires:5}},
 { id:'missing',titre:'Brouillon',plateforme:'Instagram',statut:'brouillon',format:'post',resultats:{portee:null}},
 { id:'zero',titre:'Zero',datePublication:'2026-10-10',plateforme:'Instagram',statut:'publie',format:'post',resultats:{portee:0,commentaires:0}}
];
const context = vm.createContext({ getActiveBrand:()=> 'nidal', NidalStore:{getAll:()=>contents,getInteractions:c=>c.resultats.commentaires ?? null} });
const source=fs.readFileSync('js/performance.js','utf8').replace('return { render, openKpiTargetsModal };','return { render, openKpiTargetsModal, visible: _visibleContents, filters: _filters };');
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context);
const ids=()=>Array.from(run('PerformanceView.visible()'), c=>c.id);
assert.deepEqual(ids(),['new','zero','old','missing']);
run("PerformanceView.filters.sort='oldest'");assert.deepEqual(ids(),['old','zero','new','missing']);
run("PerformanceView.filters.sort='portee'");assert.deepEqual(ids(),['new','old','zero','missing']);
run("PerformanceView.filters.search='REEL'");assert.deepEqual(ids(),['new']);
run("PerformanceView.filters.search=''; PerformanceView.filters.platform='Instagram'; PerformanceView.filters.status='publie'");assert.deepEqual(ids(),['old','zero']);
assert.deepEqual(contents.map(c=>c.id),['old','new','missing','zero']);
console.log('PASS: performance date sorting, metric sorting, missing values, search, combined filters');
