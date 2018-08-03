// -----------------------------------------------------------------------------
// Tree constructor
//    Tree object contains a simple array of items
//    Its prototype provides methods to manipulate this list
// -----------------------------------------------------------------------------


// Tree object constructor
var Tree = function(init=true) {
   this.item_list  = [];
   this.item_index = 0;

   if(init) this.clear();
};


// Init the tree with a root item
Tree.prototype.clear = function() {
   this.item_list  = [new Item(0, null, 'root', this)];
   this.item_index = 1;
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
   for (let id = load.id + 1; id < this.item_list.length; id++) {
      let nextItem = this.getItem(id);
      if (null !== nextItem && undefined !== nextItem && nextItem.isLoad()) {
         return nextItem;
      }
   }

   return null;
};


// return the previous load in the list
Tree.prototype.getPreviousLoad = function(load) {
   for (let id = load.id - 1; id >= 0; id--) {
      let previousItem = this.getItem(id);
      if (null !== previousItem && undefined !== previousItem && previousItem.isLoad()) {
         return previousItem;
      }
   }

   return null;
};


// return the previous or next load allowed in the part list (recursve search)
Tree.prototype.getLoadInPartList = function(load, direction) {
   let method = {next: 'getNextLoad', prev: 'getPreviousLoad'};
   let newload = this[method[direction]](load);

   // if there is no load, return null
   if(null === newload) {
      return null;
   }
   else {
      // if the load is allowed in the partlist, return it
      if(newload.characs.inpartlist) {
         return newload;
      }
      // if the  load is not allowed, got an other one... recursively
      else {
         return this[method[direction]](newload);
      }
   }
};


// Create an item : root, source or load, whithout any connection with the canvas
Tree.prototype.addItem = function(parent, type) {

   var newItem = new Item(this.item_index, parent, type, this);
   this.setItem(this.item_index++, newItem);

   // If it as a parent (if it is not the root...)
   if (null !== parent) {
      // add a reference to its parent
      parent.childrenID.push(newItem.id);

      // if the new source is not the first child of its parent
      if (parent.childrenID.length > 1) {
         // increment the offset of all parents (recursively)
         parent.nextOffsetIncrement(1);
      }
   }

   return newItem;
};


// Create a source with the addItem method
Tree.prototype.addSource = function(parent) {
   return this.addItem(parent, 'source');
};


// Create a source with the Root as parent
Tree.prototype.addSourceToRoot = function() {
   return this.addSource(this.getRoot());
};


// Create a load with the addItem method
Tree.prototype.addLoad = function(parent) {
   return this.addItem(parent, 'load');
};


// Create a copy of the given item
Tree.prototype.copyItem = function(parent, itemToCopy) {
   // create a new empty item of the same type, with the given parent
   let newItem = this.addItem(parent, itemToCopy.type);

   // clone the characs
   newItem.characs = Object.assign({},itemToCopy.characs);

   return newItem;
};


// refresh the consumptions of each load based on the given partList
Tree.prototype.refreshConsumptions = function(partList) {
   this.forEachLoad(function(load) {
      load.refreshConsumption(partList);
   });
};


// Remove the reference to this tree from each item
// Caution! Call .convertToCircular() before calling any other method
Tree.prototype.convertToUncircular = function() {
   this.forEachItem(function(item) {
      item.tree = null;
   });
};

// Replace the reference to this tree in each item
// This method is only usefull after .convertToUncircular()
Tree.prototype.convertToCircular = function() {
   var that = this;
   this.forEachItem(function(item) {
      item.tree = that;
   });
};


// Convert this tree to a string
Tree.prototype.toString = function() {
   var tree = new Tree(false);
   tree.item_index = this.item_index;

   this.forEachItem(function(item) {
      tree.setItem(item.id, item.toString());
   });

   return JSON.stringify(tree);
};


// Import a tree exported with .toString()
Tree.prototype.fromString = function(str) {
   // get all properties from the stringified object with items as strings
   var treeProp = JSON.parse(str);

   // reinit the tree with new values
   this.item_list  = [];
   this.item_index = treeProp.item_index;

   // for each item in the list
   for (var item_str of treeProp.item_list) {
      // if there is no data, continue to the next item
      if (null === item_str) continue;

      // create a new item and import the data from the string
      let newItem = new Item(0,null,null,this);
      newItem.fromString(item_str);

      // insert the new item in the tree
      this.setItem(newItem.id, newItem);
   }
};


// loop on each item and process a given function
Tree.prototype.forEachItem = function(theFunction) {
   // use for..of instead of for..in to respect the array order if needed
   for (let item of this.item_list) {
      if (undefined !== item) {
         theFunction(item);
      }
   }
};


// loop on each source and process a given function
Tree.prototype.forEachSource = function(theFunction) {
   this.forEachItem(function(item) {
      if (item.isSource()) {
         theFunction(item);
      }
   });
};


// loop on each load and process a given function
Tree.prototype.forEachLoad = function(theFunction) {
   this.forEachItem(function(item) {
      if (item.isLoad()) {
         theFunction(item);
      }
   });
};
