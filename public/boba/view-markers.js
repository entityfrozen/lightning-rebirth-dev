// Stable non-semantic identifiers used only in rendered markup. Internal
// navigation and saved preferences retain their original keys.
const coded={home:'s0',browser:'s1',games:'s2',chat:'s3',ai:'s4',
 settings:'s5',admin:'s6',account:'s7'};
const decoded=Object.fromEntries(Object.entries(coded).map(([name,key])=>[key,name]));
export const viewMarker=id=>coded[id]??id;
export const originalView=key=>decoded[key]??key;
