const id=new URLSearchParams(location.search).get('object');
if(['duck','chest','jz-458'].includes(id))await import('./collection-lab.js');
else await import('./object-lab.js');
