const id=new URLSearchParams(location.search).get('object');
if(['duck','chest','jz-458'].includes(id))await import('./collection-lab.js?v=20261012-black-red');
else await import('./object-lab.js?v=20261012-black-red');
