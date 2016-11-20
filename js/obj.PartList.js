// -----------------------------------------------------------------------------
// PartList constructor
// 	A PartList object contains all the parts, orders and classifications
// -----------------------------------------------------------------------------


var PartList = function() {
	this.part_list		= [];
	this.part_index	= 0;
	this.part_order	= [];
};


// return the part corresponding to the id
PartList.prototype.getPart = function(id) {
	return this.part_list[id];
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
	var partList = new PartList();
	partList.part_index	= this.part_index;
	partList.part_order	= this.part_order;
	partList.tag_list		= this.tag_list;
	partList.tag_index	= this.tag_index;

	this.forEachPart(function(part){
		partList.part_list[part.id] = part.toString();
	});

	return JSON.stringify(partList);
};


// Import a partlist from a string and reconstruct all references
PartList.prototype.fromString = function(str) {
	// get all properties from the stringified object where parts are strings
	var partList = JSON.parse(str);
	this.part_index = partList.part_index;

	// for each part in the list
	for(var part_str of partList.part_list) {
		if(null === part_str) continue;

		// get the properties of the part
		var part = JSON.parse(part_str);

		// create a new empty part (without giving a ref to partList yet)
		this.part_list[part.id] = new Part(part.id, null);

		// for each property of the part
		for(let i in this.part_list[part.id]) {
			if(this.part_list[part.id].hasOwnProperty(i)) {
				// copy the property
				this.part_list[part.id][i] = part[i];
			}
		}

		// copy a reference of this PartList in the part
		this.part_list[part.id].partList = this;
	}
};


// loop on each part and process a given function
PartList.prototype.forEachPart = function(theFunction) {
	// use for..of instead of for..in to respect the array order if needed
	for(let part of this.part_list) {
		if(undefined !== part) {
			theFunction(part);
		}
	}
};
