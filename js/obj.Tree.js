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


// get an item from its ID
Tree.prototype.getItem = function(item_id) {
	return this.item_list[item_id];
};


// return the root items
Tree.prototype.getRoot = function() {
	return this.getItem(0);
};


// Create an item : root, source or load, whithout any connection with the canvas
Tree.prototype.addItem = function(parent, type) {

	var newItem = new Item(this.item_index, parent, type, this);
	this.item_list[this.item_index++] = newItem;

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


// refresh the consumptions of each load of the tree view, based on the list view infos
Tree.prototype.refreshConsumptions = function() {
	this.forEachLoad(function(item){
		item.characs.ityp = 0;
		item.characs.imax = 0;

		/*// TODO
		powerTree.component.forEach(function(component) {
			if(null !== component && undefined !== component.characs.consumption[item.id])
			{
				item.characs.ityp += component.characs.consumption[item.id].typ;
				item.characs.imax += component.characs.consumption[item.id].max;
			}
		});*/
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
		tree.item_list[item.id] = item.toString();
	});

	return JSON.stringify(tree);
};


// Import a tree exported with .toString()
Tree.prototype.fromString = function(str) {
	// get all properties from the stringified object with items as strings
	var tree = JSON.parse(str);
	this.item_index = tree.item_index;

	// for each item in the list
	for(var item_str of tree.item_list) {
		if(null === item_str) continue;

		// get the properties of the item
		var item = JSON.parse(item_str);

		// create a new empty item
		this.item_list[item.id] = new Item(item.id, null, item.type, null);

		// for each property of the item
		for(let i in this.item_list[item.id]) {
			if(this.item_list[item.id].hasOwnProperty(i)) {
				// copy the property
				this.item_list[item.id][i] = item[i];
			}
		}

		// copy a reference of this Tree in the item
		this.item_list[item.id].tree = this;
	}
};


// loop on each item and process a given function
Tree.prototype.forEachItem = function(theFunction) {
	for(let i in this.item_list) {
		theFunction(this.item_list[i]);
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
