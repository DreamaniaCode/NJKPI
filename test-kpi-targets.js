import assert from 'node:assert';
import { getKpiTargets, saveKpiTargets } from './server/repository.js';

console.log('--- 1. TEST RÉCUPÉRATION DES OBJECTIFS KPI PAR DÉFAUT (Nidal Junior & Nidal) ---');

const juniorTargets = await getKpiTargets('nidal-junior');
assert.strictEqual(juniorTargets.brand_slug, 'nidal-junior');
assert.ok(juniorTargets.targets.followers, 'Doit avoir l’objectif followers');
assert.ok(juniorTargets.targets.views, 'Doit avoir l’objectif vues');
assert.ok(juniorTargets.targets.comments, 'Doit avoir l’objectif commentaires');
assert.ok(juniorTargets.targets.conversions, 'Doit avoir l’objectif conversions');
assert.ok(juniorTargets.targets.reach, 'Doit avoir l’objectif portée');
assert.strictEqual(juniorTargets.targets.followers.target, 5000);
assert.strictEqual(juniorTargets.targets.views.target, 50000);
assert.strictEqual(juniorTargets.targets.conversions.target, 120);
assert.ok(juniorTargets.targets.followers.eta, 'Doit avoir une date ETA');
console.log('✓ Objectifs par défaut Nidal Junior validés (Followers: 5000, Vues: 50000, Conversions: 120, ETA: ' + juniorTargets.targets.followers.eta + ')');

const nidalTargets = await getKpiTargets('nidal');
assert.strictEqual(nidalTargets.brand_slug, 'nidal');
assert.strictEqual(nidalTargets.targets.followers.target, 12000);
assert.strictEqual(nidalTargets.targets.conversions.target, 250);
console.log('✓ Objectifs par défaut GS Nidal validés (Followers: 12000, Conversions: 250, ETA: ' + nidalTargets.targets.conversions.eta + ')');

console.log('\n--- 2. TEST MISE À JOUR ET ENREGISTREMENT DES OBJECTIFS KPI & ETA ---');

const updatedJunior = await saveKpiTargets('nidal-junior', {
  followers: { current: 3100, target: 8000, eta: '2026-12-31', note: 'Nouvelle cible fin d’année' },
  views: { current: 22000, target: 60000, eta: '2026-11-30', note: 'Cap 60k vues vidéos' },
  comments: { current: 450, target: 1500, eta: '2026-11-30', note: 'Engagement familles' },
  conversions: { current: 65, target: 200, eta: '2026-10-31', note: 'Inscriptions maternelle 2026' }
});

assert.strictEqual(updatedJunior.targets.followers.current, 3100);
assert.strictEqual(updatedJunior.targets.followers.target, 8000);
assert.strictEqual(updatedJunior.targets.conversions.current, 65);
assert.strictEqual(updatedJunior.targets.conversions.target, 200);

const reloaded = await getKpiTargets('nidal-junior');
assert.strictEqual(reloaded.targets.followers.current, 3100);
assert.strictEqual(reloaded.targets.followers.target, 8000);
assert.strictEqual(reloaded.targets.conversions.current, 65);
assert.strictEqual(reloaded.targets.conversions.target, 200);
console.log('✓ Sauvegarde et rechargement des objectifs KPI réussis');

console.log('\n--- 3. TEST DE CALCUL DE L’ÉCHÉANCE (ETA) ET DU COMPTE À REBOURS ---');

function computeEtaInfo(etaDate, progressRatio) {
  if (!etaDate) return { status: 'none', label: 'Échéance à définir' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${etaDate}T00:00:00`);
  const diffTime = target.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (progressRatio >= 1) return { status: 'done', label: 'Objectif atteint !', daysLeft };
  if (daysLeft < 0) return { status: 'overdue', label: `Dépassé de ${Math.abs(daysLeft)} j`, daysLeft };
  if (daysLeft === 0) return { status: 'today', label: 'Échéance aujourd’hui !', daysLeft };
  return { status: 'ok', label: `J-${daysLeft}`, daysLeft };
}

const etaFuture = computeEtaInfo('2026-12-31', 0.5);
assert.strictEqual(etaFuture.status, 'ok');
assert.ok(etaFuture.daysLeft > 0);
console.log('✓ ETA future calculée correctement : ' + etaFuture.label + ' (' + etaFuture.daysLeft + ' jours restants)');

const etaDone = computeEtaInfo('2026-12-31', 1.05);
assert.strictEqual(etaDone.status, 'done');
console.log('✓ Objectif atteint correctement détecté : ' + etaDone.label);

const etaPast = computeEtaInfo('2020-01-01', 0.2);
assert.strictEqual(etaPast.status, 'overdue');
console.log('✓ Échéance dépassée correctement signalée : ' + etaPast.label);

console.log('\n=============================================');
console.log('TOUS LES TESTS KPI TARGETS & ETA ONT RÉUSSI ! 🎉');
console.log('=============================================\n');
