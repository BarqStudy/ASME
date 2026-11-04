import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMechanism,mechanismTypes} from '../app/src/mechanisms.js';
const state=root=>{root.updateMatrixWorld(true);const result=[];root.traverse(node=>result.push(...node.matrixWorld.elements));return result;};
for(const type of mechanismTypes)test(`${type}: drag phases and exploded positions produce finite, visible, moving geometry`,()=>{
 const {root,update,materials}=createMechanism(type);assert.ok(root.children.length>0);
 update(0,0);const start=state(root);
 for(const phase of [-100,-Math.PI,0,.8,Math.PI,Math.PI*8,100])for(const spread of [0,.5,1]){
  update(phase,spread);const matrix=state(root);assert.ok(matrix.every(Number.isFinite));
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());assert.ok(size.length()>.5&&size.length()<15,`${type} stays framed`);
 }
 update(.8,0);assert.notDeepEqual(state(root),start,'mechanism visibly moves with drive angle');
 update(.8,1);const exploded=state(root);update(.8,0);assert.notDeepEqual(state(root),exploded,'exploded mode changes spatial geometry');
 update(0,0);assert.deepEqual(state(root),start,'reset is deterministic');
 const geometries=new Set();root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);});geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());
});
