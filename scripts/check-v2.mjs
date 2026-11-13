import assert from 'node:assert/strict';
import {studyStreak,rateVocabulary} from '../dist/studio-v2.mjs';
assert.equal(studyStreak([],new Date(2026,10,13,12)),0);
assert.equal(studyStreak(['2026-11-11T12:00:00','2026-11-12T12:00:00'],new Date(2026,10,13,12)),2);
assert.equal(studyStreak(['2026-11-10T12:00:00'],new Date(2026,10,13,12)),0);
assert.equal(rateVocabulary(null,'again',0).due,600000);assert.equal(rateVocabulary(null,'hard',0).due,86400000);assert.equal(rateVocabulary(null,'good',0).due,86400000);assert.equal(rateVocabulary(null,'easy',0).due,4*86400000);
assert.equal(rateVocabulary({reviews:4,streak:3},'again',0).reviews,5);
console.log('V2 streak and four-rating schedule passed.');
