import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
 MIN_SHIPYARD_DPR, preferredShipyardPixelRatio, adjustedShipyardPixelRatio
} from '../src/shipyard-render-budget.ts';

test('mobile shipyard has bounded resolution, desktop retains quality',()=>{
 assert.equal(preferredShipyardPixelRatio(390,3),1.15);
 assert.equal(preferredShipyardPixelRatio(820,2),1.15);
 assert.equal(preferredShipyardPixelRatio(1024,2),1.5);
 assert.equal(preferredShipyardPixelRatio(390,1),1);
 assert.equal(preferredShipyardPixelRatio(390,0),1);
 assert.equal(preferredShipyardPixelRatio(0,Number.NaN),1);
});

test('sustained slow frames reduce ONLY the isolated editor ratio',()=>{
 assert.equal(adjustedShipyardPixelRatio(1.15,1.15,34,17),1);
 assert.equal(adjustedShipyardPixelRatio(1.15,1.15,20,25),1);
 assert.equal(adjustedShipyardPixelRatio(1,1.15,40,27),.9);
 assert.equal(adjustedShipyardPixelRatio(MIN_SHIPYARD_DPR,1.15,60,40),MIN_SHIPYARD_DPR);
});

test('good frames recover sharpness slowly and never exceed viewport cap',()=>{
 assert.equal(adjustedShipyardPixelRatio(.9,1.15,16,8),1);
 assert.equal(adjustedShipyardPixelRatio(1,1.15,16,8),1.1);
 assert.equal(adjustedShipyardPixelRatio(1.1,1.15,16,8),1.15);
 assert.equal(adjustedShipyardPixelRatio(1.15,1.15,16,8),1.15);
 assert.equal(adjustedShipyardPixelRatio(1.4,1.15,22,16),1.15);
});

test('midrange and invalid samples do not cause sudden quality oscillation',()=>{
 assert.equal(adjustedShipyardPixelRatio(1.15,1.15,23,16),1.15);
 assert.equal(adjustedShipyardPixelRatio(1.05,1.15,29,23),1.05);
 assert.equal(adjustedShipyardPixelRatio(1.05,1.15,Number.NaN,2),1.05);
 assert.equal(adjustedShipyardPixelRatio(1.05,1.15,20,-1),1.05);
});
