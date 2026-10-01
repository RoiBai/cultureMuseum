import * as THREE from './vendor/three.module.js';
import {toWGS,project,contains,polygonsOf,ringsOf} from './map-geography.js';

export const SURFACE_Y=.12;
export const HEIGHT_SCALE=.00105;
const EDGE_THICKNESS=.24;
// Quiet variations in limestone, sandstone and warm grey keep neighbouring
// regions legible without covering the archaeological objects in a green cast.
const stonePalette=['#3e4b3e','#424b3c','#434e45','#41493e','#464e3f','#445347','#51543e','#3f504e','#404a47','#444e3d','#4a5143','#40483c','#515549','#4e5141','#4b503f','#454c43','#475346'];

function boundsOf(ring){
 let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
 for(const [lon,lat] of ring){west=Math.min(west,lon);south=Math.min(south,lat);east=Math.max(east,lon);north=Math.max(north,lat)}
 return [west,south,east,north];
}
function inBounds([lon,lat],[west,south,east,north]){return lon>=west&&lon<=east&&lat>=south&&lat<=north}

// A district's top has its own indices and material. Every district uses the
// same DEM vertex positions and normals, so selecting one never moves its land.
export function createTerrain(atlas,{dem,boundaries,pointFor}){
 const {width:w,height:h,bounds:[west,south,east,north],elevations}=dem;
 const longitudeStep=(east-west)/(w-1),latitudeStep=(north-south)/(h-1);
 const position=new Float32Array(w*h*3),heights=new Float32Array(w*h);
 const coordinates=new Array(w*h);
 for(let row=0;row<h;row++)for(let col=0;col<w;col++){
  const i=row*w+col,coordinate=[west+longitudeStep*col,north-latitudeStep*row];
  const [x,z]=project(coordinate),elevation=Math.max(0,elevations[i]);
  coordinates[i]=coordinate;heights[i]=elevation;
  position[i*3]=x;position[i*3+1]=SURFACE_Y+elevation*HEIGHT_SCALE;position[i*3+2]=z;
 }
 const sharedPosition=new THREE.BufferAttribute(position,3);
 const districts=boundaries.features.map((feature,index)=>{
  const properties=feature.properties,group=new THREE.Group();
  group.name='terrain-area-'+properties.adcode;
  group.userData={area:properties.adcode,name:properties.name};
  const polygons=polygonsOf(feature.geometry).map(p=>p.map(r=>r.map(toWGS)));
  return {
   feature,polygons,polygonBounds:polygons.map(p=>boundsOf(p[0])),indices:[],outerEdges:[],
   area:{id:properties.adcode,name:properties.name,center:toWGS(properties.centroid||properties.center),group,mesh:null,borders:[],baseColor:new THREE.Color(stonePalette[index%stonePalette.length])},
  };
 });
 const ownerFor=coordinate=>{
  for(let i=0;i<districts.length;i++){
   const district=districts[i];
   for(let j=0;j<district.polygons.length;j++){
    const polygon=district.polygons[j];
    if(inBounds(coordinate,district.polygonBounds[j])&&contains(coordinate,polygon[0])&&!polygon.slice(1).some(ring=>contains(coordinate,ring)))return i;
   }
  }
  return -1;
 };
 const vertexOwner=coordinates.map(ownerFor),allIndices=[];
 const triangles=[];
 function assignTriangle(a,b,c){
  const ca=coordinates[a],cb=coordinates[b],cc=coordinates[c];
  const center=[(ca[0]+cb[0]+cc[0])/3,(ca[1]+cb[1]+cc[1])/3];
  let owner=ownerFor(center);
  // The boundary data is simpler than the DEM grid. Retain exterior triangles
  // with two land vertices, avoiding a missing row along the provincial edge.
  if(owner<0){
   const owners=[vertexOwner[a],vertexOwner[b],vertexOwner[c]];
   owner=owners.find(candidate=>candidate>=0&&owners.filter(value=>value===candidate).length>=2)??-1;
  }
  if(owner<0)return;
  const triangle={vertices:[a,b,c],center,owner};
  triangles.push(triangle);districts[owner].indices.push(a,b,c);allIndices.push(a,b,c);
 }
 for(let row=0;row<h-1;row++)for(let col=0;col<w-1;col++){
  const a=row*w+col,b=a+1,c=a+w,d=c+1;
  assignTriangle(a,b,c);assignTriangle(b,d,c);
 }
 // No district may disappear just because its boundary falls between samples.
 // For a sub-cell polygon, give its nearest shared DEM triangle to that area.
 for(let owner=0;owner<districts.length;owner++){
  const district=districts[owner];if(district.indices.length)continue;
  const center=district.area.center;
  let nearest=null,distance=Infinity;
  for(const triangle of triangles){
   if(districts[triangle.owner].indices.length<=3)continue;
   const dx=triangle.center[0]-center[0],dy=triangle.center[1]-center[1],d=dx*dx+dy*dy;
   if(d<distance){nearest=triangle;distance=d}
  }
  if(nearest){
   const oldIndices=districts[nearest.owner].indices,[a,b,c]=nearest.vertices;
   for(let i=0;i<oldIndices.length;i+=3)if(oldIndices[i]===a&&oldIndices[i+1]===b&&oldIndices[i+2]===c){oldIndices.splice(i,3);break}
   district.indices.push(a,b,c);nearest.owner=owner;
  }
 }
 // Only the provincial outline needs a cut side. Administrative borders share
 // one continuous relief; internal walls would protrude through sampled slopes.
 const edgeOwnership=new Map();
 for(const triangle of triangles){
  const [a,b,c]=triangle.vertices;
  for(const [from,to] of [[a,b],[b,c],[c,a]]){
   const key=from<to?from+':'+to:to+':'+from,edge=edgeOwnership.get(key);
   if(edge)edge.count++;
   else edgeOwnership.set(key,{from,to,owner:triangle.owner,count:1});
  }
 }
 for(const edge of edgeOwnership.values())if(edge.count===1)districts[edge.owner].outerEdges.push(edge);
 const normalGeometry=new THREE.BufferGeometry();
 normalGeometry.setAttribute('position',sharedPosition);normalGeometry.setIndex(allIndices);normalGeometry.computeVertexNormals();
 const sharedNormal=normalGeometry.getAttribute('normal');
 const low=new THREE.Color('#344134'),middle=new THREE.Color('#66715a'),high=new THREE.Color('#a0a78d');
 for(const district of districts){
  const {area}=district,color=new Float32Array(w*h*3);
  for(let i=0;i<w*h;i++){
   const elevation=heights[i];
   const tint=elevation<1000?low.clone().lerp(middle,elevation/1000):middle.clone().lerp(high,Math.min(1,(elevation-1000)/1800));
   tint.lerp(area.baseColor,.58);color[i*3]=tint.r;color[i*3+1]=tint.g;color[i*3+2]=tint.b;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',sharedPosition);geometry.setAttribute('normal',sharedNormal);
  geometry.setAttribute('color',new THREE.BufferAttribute(color,3));geometry.setIndex(district.indices);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.12,side:THREE.DoubleSide,emissive:'#000000',emissiveIntensity:0});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='terrain-mesh-'+area.id;mesh.receiveShadow=true;
  mesh.userData={area:area.id,name:area.name};area.mesh=mesh;area.group.add(mesh);

  // Each region owns its borders. Exterior cut faces follow the exact DEM mesh
  // edge, and meet the top without tall interior walls or sampling mismatch.
  const wallPositions=[],wallColors=[];
  const wallTop=area.baseColor.clone().multiplyScalar(.64),wallBottom=area.baseColor.clone().multiplyScalar(.31);
  const borderMaterial=new THREE.LineBasicMaterial({color:'#8b9475',transparent:true,opacity:.26,depthWrite:false});
  for(const sourceRing of ringsOf(district.feature.geometry)){
   const ring=sourceRing.map(toWGS),borderPositions=[];
   for(const coordinate of ring){const p=pointFor(coordinate);borderPositions.push(p.x,p.y+.075,p.z)}
   // DataV rings normally repeat the first coordinate; close open rings too.
   if(ring.length>1&&(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])){
    const p=pointFor(ring[0]);borderPositions.push(p.x,p.y+.075,p.z);
   }
   const borderGeometry=new THREE.BufferGeometry();borderGeometry.setAttribute('position',new THREE.Float32BufferAttribute(borderPositions,3));
   const border=new THREE.Line(borderGeometry,borderMaterial);
   border.name='terrain-border-'+area.id;border.userData={area:area.id};border.renderOrder=1;
   area.borders.push(border);area.group.add(border);
  }
  for(const edge of district.outerEdges){
   const ai=edge.from*3,bi=edge.to*3,ax=position[ai],ay=position[ai+1],az=position[ai+2],bx=position[bi],by=position[bi+1],bz=position[bi+2];
   wallPositions.push(ax,ay,az,bx,by,bz,ax,ay-EDGE_THICKNESS,az,bx,by,bz,bx,by-EDGE_THICKNESS,bz,ax,ay-EDGE_THICKNESS,az);
   for(const tint of [wallTop,wallTop,wallBottom,wallTop,wallBottom,wallBottom])wallColors.push(tint.r,tint.g,tint.b);
  }
  const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wallPositions,3));
  wallGeometry.setAttribute('color',new THREE.Float32BufferAttribute(wallColors,3));wallGeometry.computeVertexNormals();
  const walls=new THREE.Mesh(wallGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide}));
  walls.name='terrain-walls-'+area.id;area.group.add(walls);atlas.add(area.group);
 }
 return districts.map(district=>district.area);
}
