
var BOM = function() {
	this.part_list		= [];
	this.part_index	= 0;
	this.part_order	= [];
	this.tag_list		= [];
	this.tag_index		= 1;
};

BOM.prototype.addPart = function() {
	var part = new Part(this.part_index, this);
	this.part_list[this.part_index++] = part;
	this.part_order.push(part.id);
	return part;
};
