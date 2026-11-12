// Captions are stored as character codes in production, not plain text.
// This is lightweight presentation obfuscation, not a security boundary.
const captions=[
 [71,97,109,101,115],
 [65,114,99,97,100,101],
 [67,104,97,116],
 [83,101,97,114,99,104,32,116,104,101,32,97,114,99,97,100,101],
 [65,82,67,65,68,69,32,76,73,66,82,65,82,89],
 [65,114,99,97,100,101,32,115,111,117,114,99,101,115]
];
export const uiLabel=index=>String.fromCharCode(...captions[index]);

// Navigation keys remain semantic in JS; DOM markers are opaque.
export const viewId=id=>id==='games'?'_v84ae39':id;
