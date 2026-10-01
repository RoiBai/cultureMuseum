// DataV boundary coordinates are GCJ-02. DEM coordinates are WGS84.
const pi=Math.PI,a=6378245,ee=0.006693421622965943;
function latDelta(x,y){let n=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x));n+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;n+=(20*Math.sin(y*pi)+40*Math.sin(y/3*pi))*2/3;n+=(160*Math.sin(y/12*pi)+320*Math.sin(y*pi/30))*2/3;return n}
function lonDelta(x,y){let n=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x));n+=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;n+=(20*Math.sin(x*pi)+40*Math.sin(x/3*pi))*2/3;n+=(150*Math.sin(x/12*pi)+300*Math.sin(x/30*pi))*2/3;return n}
function toGCJ(lon,lat){const r=lat*pi/180,magic=1-ee*Math.sin(r)**2,s=Math.sqrt(magic);return [lon+lonDelta(lon-105,lat-35)*180/(a/s*Math.cos(r)*pi),lat+latDelta(lon-105,lat-35)*180/(a*(1-ee)/(magic*s)*pi)]}
export function toWGS([lon,lat]){let x=lon,y=lat;for(let i=0;i<4;i++){const p=toGCJ(x,y);x-=p[0]-lon;y-=p[1]-lat}return [x,y]}
export function project([lon,lat]){return [(lon-112.22)*15*Math.cos(31.15*pi/180),-(lat-31.15)*15]}
export function ringsOf(geometry){return geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat()}
export function polygonsOf(geometry){return geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates}
export function contains([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside}return inside}

// City/county anchors are display locations, never archaeological excavation coordinates.
export const regions=[
 {id:'荆州',label:'荆州',subtitle:'楚墓与汉墓',coordinate:[112.2397,30.3352],lead:'hb-4694'},
 {id:'随州',label:'随州',subtitle:'曾侯乙墓',coordinate:[113.3825,31.6902],lead:'hb-4695'},
 {id:'天门',label:'天门',subtitle:'石家河与肖家屋脊',coordinate:[113.1665,30.6634],lead:'jz-474'},
 {id:'荆门',label:'荆门',subtitle:'包山与车桥楚墓',coordinate:[112.2043,31.0354],lead:'hb-5143'},
 {id:'枣阳',label:'枣阳',subtitle:'九连墩楚墓',coordinate:[112.7719,32.1284],lead:'drum'},
 {id:'云梦',label:'云梦',subtitle:'睡虎地秦墓',coordinate:[113.7535,31.0209],lead:'spoon'},
 {id:'武汉',label:'武汉',subtitle:'盘龙城',coordinate:[114.3055,30.5928],lead:'hb-5520'},
 {id:'襄阳',label:'襄阳',subtitle:'山湾',coordinate:[112.1224,32.009],lead:'hb-5113'},
 {id:'钟祥',label:'钟祥',subtitle:'郢靖王墓',coordinate:[112.5881,31.1682],lead:'hb-4696'},
 {id:'崇阳',label:'崇阳',subtitle:'铜鼓的来处',coordinate:[114.0394,29.5556],lead:'hb-6916'},
];
export function normalizedSite(place){
 return place.replace(/^湖北(?:省)?/,'').replace(/^(荆州|江陵|随州|武汉|天门|云梦|荆门|枣阳|钟祥)/,'').replace(/\s/g,'').replace(/二/g,'2').replace(/一/g,'1').replace(/三/g,'3').replace('楚墓','墓').replace('湖北','');
}
