import * as THREE from 'three';

export const mechanismTypes = ['gears', 'crank', 'turbine', 'differential', 'gimbal', 'robot'];

// Visual teaching models: kinematic relationships are illustrative, not engineering solvers.
export function createMechanism(type) {
  const root = new THREE.Group();
  const materials = {
    metal: new THREE.MeshStandardMaterial({ color: 0xb4c9da, metalness: .75, roughness: .32 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x168ed1, metalness: .6, roughness: .3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x264b69, metalness: .65, roughness: .4 }),
    light: new THREE.MeshStandardMaterial({ color: 0x9edbff, metalness: .4, roughness: .25 }),
  };
  const moving = [];
  const mesh = (geometry, material = materials.metal, parent = root) => {
    const m = new THREE.Mesh(geometry, material);parent.add(m);return m;
  };
  const cylinder = (radius, depth, material = materials.metal, parent = root) => mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material, parent);
  const box = (x, y, z, material = materials.metal, parent = root) => mesh(new THREE.BoxGeometry(x, y, z), material, parent);
  const torus = (r, tube, material = materials.metal, parent = root) => mesh(new THREE.TorusGeometry(r, tube, 10, 56), material, parent);
  function gear(radius, teeth, material, parent = root) {
    const shape = new THREE.Shape();
    for (let i=0;i<=teeth*4;i++) {
      const a=i/(teeth*4)*Math.PI*2;const r=radius+([1,2].includes(i%4)?.095:0);
      if(i)shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);else shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    const hole=new THREE.Path();hole.absarc(0,0,radius*.3,0,Math.PI*2,true);shape.holes.push(hole);
    const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:24}),material,parent);
    const hub=cylinder(radius*.22,.48,materials.dark,m);hub.rotation.x=Math.PI/2;hub.position.z=.1;
    for(let i=0;i<4;i++){const spoke=box(radius*1.52,.095,.16,material,m);spoke.rotation.z=i*Math.PI/2;spoke.position.z=.1;}
    return m;
  }
  function beam(a, b, radius=.09, material=materials.metal, parent=root) {
    const m=cylinder(radius,1,material,parent);
    const update=(from,to)=>{const delta=new THREE.Vector3().subVectors(to,from);m.position.copy(from).add(to).multiplyScalar(.5);m.scale.y=delta.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());};
    update(a,b);return {mesh:m,update};
  }
  let update=()=>{};
  if(type==='gears') {
    const a=gear(.84,16,materials.blue),b=gear(1.26,24,materials.metal),c=gear(.63,12,materials.light);
    a.position.set(-1.5,.1,0);b.position.set(.7,.1,0);c.position.set(1.05,2.12,0);
    root.position.y=-.85;
    const backing=box(4.1,3.5,.14,materials.dark);backing.position.set(.1,.9,-.35);
    update=(phase,spread)=>{a.rotation.z=phase;b.rotation.z=-phase*16/24+Math.PI/24;c.rotation.z=phase*16/12;a.position.z=spread*.6;b.position.z=spread*1.1;c.position.z=spread*.8;};
  } else if(type==='crank') {
    const wheel=gear(.8,22,materials.blue);wheel.position.set(-1.2,0,0);
    const pin=cylinder(.13,.4,materials.light);pin.rotation.x=Math.PI/2;
    const piston=box(.65,.8,.65,materials.metal);
    const rod=beam(new THREE.Vector3(),new THREE.Vector3(1,0,0),.1,materials.light);
    for(const y of [-.65,.65]){const rail=box(2.9,.12,.14,materials.dark);rail.position.set(1.2,y,.03);}
    const center=new THREE.Vector3(-1.2,0,.45),end=new THREE.Vector3();
    update=(phase,spread)=>{wheel.rotation.z=phase;pin.position.set(center.x+.67*Math.cos(phase),.67*Math.sin(phase),.45+spread*.6);const x=center.x+.67*Math.cos(phase)+Math.sqrt(2.2**2-(.67*Math.sin(phase))**2);end.set(x,0,.45+spread*.6);piston.position.set(x,0,spread*.6);rod.update(pin.position,end);};
  } else if(type==='turbine') {
    const rotor=new THREE.Group();root.add(rotor);
    const shaft=cylinder(.2,2.4,materials.dark);shaft.rotation.x=Math.PI/2;
    const rim=torus(1.43,.065,materials.dark);rim.position.z=-.25;
    const hub=cylinder(.42,.58,materials.blue,rotor);hub.rotation.x=Math.PI/2;
    for(let i=0;i<16;i++){const blade=box(.22,1.13,.16,i%2?materials.metal:materials.light,rotor);const a=i/16*Math.PI*2;blade.position.set(Math.cos(a)*.96,Math.sin(a)*.96,0);blade.rotation.set(.45,0,a-Math.PI/2+.26);moving.push(blade);}
    const nose=mesh(new THREE.ConeGeometry(.38,.55,32),materials.blue,rotor);nose.rotation.x=Math.PI/2;nose.position.z=.45;
    update=(phase,spread)=>{rotor.rotation.z=phase;moving.forEach((b,i)=>b.position.z=(i%2?1:-1)*spread*.5);nose.position.z=.45+spread*.55;};
  } else if(type==='differential') {
    const carrier=new THREE.Group();root.add(carrier);
    const crown=gear(1.15,28,materials.blue,carrier);crown.rotation.y=Math.PI/2;
    const ring=torus(.8,.12,materials.metal,carrier);ring.rotation.y=Math.PI/2;ring.position.x=.5;
    for(const side of [-1,1]){const shaft=cylinder(.14,2.1,materials.metal);shaft.rotation.z=Math.PI/2;shaft.position.x=side*1.1;}
    const left=gear(.7,16,materials.light),right=gear(.7,16,materials.metal);left.rotation.y=right.rotation.y=Math.PI/2;left.position.x=-1.65;right.position.x=1.65;
    const satellite=gear(.35,10,materials.dark,carrier);satellite.rotation.x=Math.PI/2;satellite.position.set(.3,.65,0);
    update=(phase,spread)=>{carrier.rotation.x=phase;left.rotation.x=phase*.65;right.rotation.x=phase*1.35;left.position.x=-1.65-spread*.5;right.position.x=1.65+spread*.5;satellite.rotation.z=phase*.35;};
  } else if(type==='gimbal') {
    const outer=new THREE.Group(),middle=new THREE.Group(),inner=new THREE.Group();root.add(outer);outer.add(middle);middle.add(inner);
    torus(1.48,.085,materials.dark,outer);torus(1.14,.085,materials.blue,middle);torus(.81,.08,materials.light,inner);
    const rotor=cylinder(.56,.13,materials.metal,inner);rotor.rotation.x=Math.PI/2;
    const axis=box(.1,3.2,.1,materials.blue);axis.position.z=-.12;
    const stand=box(2.1,.15,.8,materials.dark);stand.position.y=-1.75;
    update=(phase,spread)=>{outer.rotation.y=phase*.3;middle.rotation.x=phase*.6;inner.rotation.y=phase;inner.position.z=spread*.5;rotor.rotation.z=phase*2;};
  } else {
    const base=cylinder(.65,.24,materials.dark);base.position.y=-1.1;
    const shoulder=new THREE.Vector3(-.45,-.8,0),elbow=new THREE.Vector3(),wrist=new THREE.Vector3();
    const upper=beam(shoulder,new THREE.Vector3(0,.5,0),.18,materials.blue);
    const forearm=beam(new THREE.Vector3(0,.5,0),new THREE.Vector3(1,1,0),.14,materials.metal);
    const joints=[0,1,2].map(()=>{const joint=cylinder(.25,.45,materials.light);joint.rotation.x=Math.PI/2;return joint;});
    const claw=new THREE.Group();root.add(claw);for(const sign of [-1,1]){const finger=box(.1,.4,.15,materials.blue,claw);finger.position.x=sign*.19;}
    update=(phase,spread)=>{const a=.95+Math.sin(phase)*.55,b=-.6+Math.sin(phase*.8)*.8;elbow.set(shoulder.x+Math.cos(a)*1.3,shoulder.y+Math.sin(a)*1.3,spread*.3);wrist.set(elbow.x+Math.cos(a+b)*1.2,elbow.y+Math.sin(a+b)*1.2,spread*.6);upper.update(shoulder,elbow);forearm.update(elbow,wrist);[shoulder,elbow,wrist].forEach((p,i)=>joints[i].position.copy(p));claw.position.copy(wrist);claw.rotation.z=a+b-Math.PI/2;};
    root.position.y=-.25;
  }
  update(.65,0);
  return {root,update,materials};
}
