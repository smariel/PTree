// -----------------------------------------------------------------------------
// Part constructor
// 	A part object contains the description of an electronic component,
//		its classification and its consumption on multiple loads of the tree
// -----------------------------------------------------------------------------


// Part object constructor
var Part = function(id, bom) {
	this.id = id;
	this.characs = {
		name				: 'name',
		ref				: 'part number',
		consumptions	: {},
		tagsID			: []
	};
	this.bom = bom;
};
