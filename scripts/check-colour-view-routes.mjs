import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COLOUR_HUE_ENABLED,DEFAULT_COLOUR_VIEW,resolveColourView} from '../dist/colour-view-config.js';

assert.equal(COLOUR_HUE_ENABLED,false);
assert.equal(DEFAULT_COLOUR_VIEW,'colour');
// Existing links and saved 2D-colour sessions must lead into the current 3D view.
assert.equal(resolveColourView('hue'),'colour');
assert.equal(resolveColourView('colour'),'colour');
for(const view of ['2d','3d','map','catalogue'])assert.equal(resolveColourView(view),view);
// Restoring the feature must not require recovering deleted source or assets.
assert.equal(resolveColourView('hue',true),'hue');
for(const file of ['colour-hue.js','colour-hue.css','colour-cluster-legacy.js']){
 assert(fs.existsSync(new URL('../dist/'+file,import.meta.url)),file+' must remain restorable');
}
console.log('Colour routes: 3D default, previous 2D-colour links redirected, 2D source retained for restore.');
