// -----------------------------------------------------------------------------
// PartList constructor
// 	A PartList object contains all the parts, orders and classifications
// -----------------------------------------------------------------------------


var PartList = function() {
	this.part_list		= [];
	this.part_index	= 0;
	this.part_order	= [];
	this.tag_list		= [];
	this.tag_index		= 1;
};


// add a part to the BOM
PartList.prototype.addPart = function() {
	var part = new Part(this.part_index, this);
	this.part_list[this.part_index++] = part;
	this.part_order.push(part.id);
	return part;
};


// Export the partlist content as a string by deletin all reference to itself
PartList.prototype.toString = function() {
	return '';
};


// Import a partlist from a string and reconstruct all references
PartList.prototype.fromString = function(str) {
	
};
