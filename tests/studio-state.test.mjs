import {test} from 'node:test';
import assert from 'node:assert/strict';
import {placement,clampPosition} from '../app/src/studio-state.js';
import {mechanismTypes} from '../app/src/mechanism-types.js';
test('all six pieces have distinct, usable mobile and desktop homes',()=>{
 for(const width of [320,390,700,701,1440,1920]){
  const homes=mechanismTypes.map(type=>placement(type,width));
  assert.equal(new Set(homes.map(p=>`${p.x}:${p.y}`)).size,6);
  for(const p of homes){assert.ok(p.x>.05&&p.x<.95);assert.ok(p.y>.1&&p.y<.9);assert.ok(p.scale>.1&&p.scale<2);}
 }
 const home=placement('gears',390);home.x=0;assert.notEqual(placement('gears',390).x,0,'moving a copy cannot corrupt reset placement');
 assert.notDeepEqual(placement('gears',390),placement('gears',1440));assert.throws(()=>placement('missing',390));
});
test('manual dragging stays within reach and rejects invalid coordinates',()=>{
 assert.deepEqual(clampPosition(-10,10),{x:.055,y:.88});assert.deepEqual(clampPosition(10,-10),{x:.945,y:.13});
 assert.deepEqual(clampPosition(.4,.6),{x:.4,y:.6});assert.throws(()=>clampPosition(NaN,.4));assert.throws(()=>clampPosition(.4,Infinity));
});
