// -----------------------------------------------------------------------------
// Tree constructor
//		Tree object contains a simple array of items
//		Its prototype provides methods to manipulate this list
// -----------------------------------------------------------------------------


// Tree object constructor
var Tree = function() {
	this.item_list		= [];
	this.item_index	= 0;
	this.clear();
};


// Init the tree with a root item
Tree.prototype.clear = function() {
	this.item_list		= [new Item(0, null, 'root', this)];
	this.item_index	= 1;
};


// delete an item into the array
Tree.prototype.deleteItem = function(id) {
	delete this.item_list[id];
};


// set an item at the given id
Tree.prototype.setItem = function(id, data) {
	this.item_list[id] = data;
	return this.item_list[id];
};


// get an item from its ID
Tree.prototype.getItem = function(item_id) {
	return this.item_list[item_id];
};


// return the root items
Tree.prototype.getRoot = function() {
	return this.getItem(0);
};


// return the next load in the list
Tree.prototype.getNextLoad = function(load) {
	for(let id = load.id+1; id < this.item_list.length; id++) {
		let nextItem = this.getItem(id);
		if(null !== nextItem && undefined !== nextItem && nextItem.isLoad()) {
			return nextItem;
		}
	}

	return null;
};


// return the previous load in the list
Tree.prototype.getPreviousLoad = function(load) {
	for(let id = load.id-1; id >= 0; id--) {
		let previousItem = this.getItem(id);
		if(null !== previousItem && undefined !== previousItem && previousItem.isLoad()) {
			return previousItem;
		}
	}

	return null;
};


// Create an item : root, source or load, whithout any connection with the canvas
Tree.prototype.addItem = function(parent, type) {

	var newItem = new Item(this.item_index, parent, type, this);
	this.setItem(this.item_index++, newItem);

	// If it as a parent (if it is not the root...)
	if(null !== parent) {
		// set the child index
		newItem.child_index = parent.childrenID.length;

		// add a reference to its parent
		parent.childrenID.push(newItem.id);

		// if the new source is not the first child of its parent
		if(parent.childrenID.length > 1) {
			// increment the offset of all parents (recursively)
			parent.nextOffsetIncrement(1);
		}
	}

	return newItem;
};


// Create a source with the addItem method
Tree.prototype.addSource = function(parent) {
	return this.addItem(parent,'source');
};


// Create a source with the Root as parent
Tree.prototype.addSourceToRoot = function() {
	return this.addSource(this.getRoot());
};


// Create a load with the addItem method
Tree.prototype.addLoad = function(parent) {
	return this.addItem(parent,'load');
};


// refresh the consumptions of each load based on the given partList
Tree.prototype.refreshConsumptions = function(partList) {
	this.forEachLoad(function(load){
		load.refreshConsumption(partList);
	});
};


// Remove the reference to this tree from each item
// Caution! Call .convertToCircular() before calling any other method
Tree.prototype.convertToUncircular = function() {
	this.forEachItem(function(item){
		item.tree = null;
	});
};

// Replace the reference to this tree in each item
// This method is only usefull after .convertToUncircular()
Tree.prototype.convertToCircular = function() {
	var that = this;
	this.forEachItem(function(item){
		item.tree = that;
	});
};


// Convert this tree to a string
Tree.prototype.toString = function() {
	var tree = new Tree();
	tree.item_index = this.item_index;

	this.forEachItem(function(item){
		tree.setItem(item.id, item.toString());
	});

	return JSON.stringify(tree);
};


// Import a tree exported with .toString()
Tree.prototype.fromString = function(str) {
	// get all properties from the stringified object with items as strings
	var treeProp = JSON.parse(str);

	// reinit the tree with new values
	this.item_list = [];
	this.item_index = treeProp.item_index;

	// for each item in the list
	for(var item_str of treeProp.item_list) {
		if(null === item_str) continue;

		// get the properties of the item
		var itemProp = JSON.parse(item_str);

		// create a new empty item (without giving a ref to Tree yet)
		var newItem = new Item(itemProp.id, null, itemProp.type, null);
		this.setItem(itemProp.id, newItem);

		// for each property of the item
		for(let i in newItem) {
			if(newItem.hasOwnProperty(i)) {
				// copy the property
				newItem[i] = itemProp[i];
			}
		}

		// copy a reference of this Tree in the item
		newItem.tree = this;
	}
};


// loop on each item and process a given function
Tree.prototype.forEachItem = function(theFunction) {
	// use for..of instead of for..in to respect the array order if needed
	for(let item of this.item_list) {
		if(undefined !== item) {
			theFunction(item);
		}
	}
};


// loop on each source and process a given function
Tree.prototype.forEachSource = function(theFunction) {
	this.forEachItem(function(item){
		if(item.isSource()) {
			theFunction(item);
		}
	});
};


// loop on each load and process a given function
Tree.prototype.forEachLoad = function(theFunction) {
	this.forEachItem(function(item){
		if(item.isLoad()) {
			theFunction(item);
		}
	});
};
