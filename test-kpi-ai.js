import assert from 'node:assert';
import { buildKpiContext, formatKpiContext, buildKpiAutomationBrief } from './server/services/kpi-ai.js';

console.log('--- TEST KPI -> AI CONTEXT ---');

const context = buildKpiContext({
  brand: 'nidal-junior',
  targetsRecord: {
    targets: {
      followers: { current: 2500, target: 5000, eta: '2026-12-31', note: 'Objectif fin année' },
      views: { current: 12000, target: 50000, eta: '2026-11-30' }
    }
  },
  contents: [
    {
      id: 'real-1',
      platform: 'Instagram',
      sync_status: 'connected',
      data: {
        titre: 'Nounou chez les Coccinelles',
        format: 'reel',
        resultats: {
          portee: 3000,
          reactions: 200,
          commentaires: 30,
          partages: 40,
          enregistrements: 50,
          vues: 4200
        }
      }
    },
    {
      id: 'demo-1',
      platform: 'Instagram',
      sync_status: 'demo',
      data: {
        titre: 'Contenu démo',
        format: 'post',
        resultats: {
          portee: 99999,
          reactions: 9999,
          commentaires: 999,
          partages: 999,
          enregistrements: 999,
          vues: 99999
        }
      }
    }
  ],
  now: new Date('2026-09-24T12:00:00Z')
});

assert.strictEqual(context.brand, 'nidal-junior');
assert.strictEqual(context.dataQuality.realMeasuredContents, 1);
assert.strictEqual(context.dataQuality.demoMeasuredContents, 1);
assert.strictEqual(context.contentPerformance.totals.portee, 3000, 'La démo doit être exclue des agrégats réels');
assert.strictEqual(context.contentPerformance.totals.vues, 4200);
assert.strictEqual(context.contentPerformance.totals.interactions, 320);
assert.strictEqual(context.contentPerformance.topContent[0].title, 'Nounou chez les Coccinelles');

const followers = context.targets.find(item => item.name === 'followers');
assert(followers, 'Objectif followers présent');
assert.strictEqual(followers.current, 2500);
assert.strictEqual(followers.target, 5000);
assert.strictEqual(followers.remaining, 2500);
assert.strictEqual(followers.progressPct, 50);
assert(followers.requiredPerDay > 0, 'Rythme quotidien calculé');

const formatted = formatKpiContext(context);
assert(formatted.includes('CONTEXTE KPI NJKPI'));
assert(formatted.includes('Nounou chez les Coccinelles'));
assert(formatted.includes('démonstration'));
assert(formatted.includes('5000'));

const brief = buildKpiAutomationBrief({ event: 'kpi.daily.updated', brand: 'nidal-junior' });
assert(brief.includes('kpi.daily.updated'));
assert(brief.includes('validation humaine'));

console.log('✓ KPI réels agrégés, démo exclue, objectifs calculés et contexte IA formaté.');
