// Missing evidence is record metadata, never a selectable or comparable feature.
export const isKnownFeature=value=>typeof value==='string'&&value.trim().length>0&&!/待补|待核|未知|未确认|未归类|不详/.test(value);
export const featureValues=(artifact,key)=>(Array.isArray(artifact[key])?artifact[key]:[artifact[key]]).filter(isKnownFeature);
