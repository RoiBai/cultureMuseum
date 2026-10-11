const id=new URLSearchParams(location.search).get('object');
if(['duck','chest','jz-458'].includes(id))await import('./collection-lab.js?v=20261011-review');
else await import('./object-lab.js?v=20261011-review');
