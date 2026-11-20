import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from 'three';
import { releaseShipyardResources } from '../src/shipyard-resources.ts';

test('leaving 3D shipyard frees its unique GPU resources while preserving battle buffers', () => {
 const scene = new T.Scene();
 const battleGeometry = new T.BoxGeometry(1,1,1);
 const battleTexture = new T.Texture();
 const battleMaterial = new T.MeshStandardMaterial({map:battleTexture});
 const battle = new T.Mesh(battleGeometry,battleMaterial);
 scene.add(battle);

 const preview = new T.Group();
 scene.add(preview);
 preview.add(new T.Mesh(battleGeometry,battleMaterial)); // shared cache: NEVER free
 const spareGeometry = new T.SphereGeometry(1,6,4);
 const spareMaterial = new T.MeshStandardMaterial({map:new T.Texture()});
 preview.add(new T.Mesh(spareGeometry,spareMaterial));
 // A private material can still refer to a texture retained by the battle.
 const secondaryGeometry = new T.ConeGeometry(1,2,6);
 const secondaryMaterial = new T.MeshStandardMaterial({map:battleTexture});
 preview.add(new T.Mesh(secondaryGeometry,secondaryMaterial));

 let battleGeoDisposals=0,battleMaterialDisposals=0,battleTextureDisposals=0;
 let spareGeoDisposals=0,spareMaterialDisposals=0,spareTextureDisposals=0,secondaryMaterialDisposals=0;
 battleGeometry.addEventListener('dispose',()=>battleGeoDisposals++);
 battleMaterial.addEventListener('dispose',()=>battleMaterialDisposals++);
 battleTexture.addEventListener('dispose',()=>battleTextureDisposals++);
 spareGeometry.addEventListener('dispose',()=>spareGeoDisposals++);
 spareMaterial.addEventListener('dispose',()=>spareMaterialDisposals++);
 (spareMaterial.map as T.Texture).addEventListener('dispose',()=>spareTextureDisposals++);
 secondaryMaterial.addEventListener('dispose',()=>secondaryMaterialDisposals++);

 const released=releaseShipyardResources(scene,preview);
 assert.equal(preview.parent,null);
 assert.equal(scene.children.length,1);
 assert.deepEqual(released,{geometries:2,materials:2,textures:1});
 assert.equal(battleGeoDisposals,0);
 assert.equal(battleMaterialDisposals,0);
 assert.equal(battleTextureDisposals,0);
 assert.equal(spareGeoDisposals,1);
 assert.equal(spareMaterialDisposals,1);
 assert.equal(spareTextureDisposals,1);
 assert.equal(secondaryMaterialDisposals,1);
 assert.equal(battle.geometry,battleGeometry);
 assert.equal(battle.material,battleMaterial);
});

test('shared assets used by two live scene objects remain valid after closing shipyard', () => {
 const scene=new T.Scene(),root=new T.Group();
 const geo=new T.BoxGeometry(1,1,1),material=new T.MeshStandardMaterial();
 scene.add(new T.Mesh(geo,material));
 scene.add(root);
 root.add(new T.Mesh(geo,material));
 let disposals=0;
 geo.addEventListener('dispose',()=>disposals++);
 const result=releaseShipyardResources(scene,root);
 assert.deepEqual(result,{geometries:0,materials:0,textures:0});
 assert.equal(disposals,0);
});

test('all editor exits call the release path without changing the battle simulation', () => {
 const source=readFileSync(new URL('../src/scene.ts',import.meta.url),'utf8');
 assert.match(source,/private releaseShipyardPreview\(\)/);
 assert.match(source,/releaseShipyardResources\(this\.scene,this\.shipyardArt\.root\)/);
 assert.match(source,/showHarbour\(\)[\s\S]*?this\.releaseShipyardPreview\(\)/);
 assert.match(source,/showBattle\(\)[\s\S]*?this\.releaseShipyardPreview\(\)/);
 assert.match(source,/inspectShip\(\)[\s\S]*?this\.releaseShipyardPreview\(\)/);
 assert.match(source,/if\(this\.cameraMode==='battle'\|\|this\.cameraMode==='deck'\)\{this\.battle\.tick\(dt\)/);
});
