// -----------------------------------------------------------------------------
// Tree Class
//    Tree object contains a simple array of items
//    Its prototype provides methods to manipulate this list
// -----------------------------------------------------------------------------

const Item   = require('../js/class.Item.js');
const Source = require('../js/class.Item.Source.js');
const Load   = require('../js/class.Item.Load.js');

class Tree {

  constructor(init=true) {
    this.item_list  = [];
    this.item_index = 0;

    if(init) this.clear();
  }


  // Init the tree with a root item
  clear() {
    this.item_list  = [new Item(0, null, 'root', this)];
    this.item_index = 1;
  }


  // delete an item into the array
  deleteItem(id) {
    delete this.item_list[id];
  }


  // set an item at the given id
  setItem(id, data) {
    this.item_list[id] = data;
    return this.item_list[id];
  }


  // get an item from its ID
  getItem(item_id) {
    return this.item_list[item_id];
  }


  // return the root items
  getRoot() {
    return this.getItem(0);
  }


  // return the next load in the list
  getNextLoad(load) {
    for (let id = load.id + 1; id < this.item_list.length; id++) {
      let nextItem = this.getItem(id);
      if (nextItem && nextItem.isLoad()) {
        return nextItem;
      }
    }

    return null;
  }


  // return the previous load in the list
  getPreviousLoad(load) {
    for (let id = load.id - 1; id >= 0; id--) {
      let previousItem = this.getItem(id);
      if (previousItem && previousItem.isLoad()) {
        return previousItem;
      }
    }

    return null;
  }


  // return the previous or next load allowed in the part list (recursve search)
  getLoadInPartList(load, direction) {
    let method = {next: 'getNextLoad', prev: 'getPreviousLoad'};
    let newload = this[method[direction]](load);

    // if there is no load, return null
    if(null === newload) {
      return null;
    }
    else {
      // if the load is allowed in the partlist, return it
      if(newload.isInPartlist()) {
        return newload;
      }
      // if the  load is not allowed, got an other one... recursively
      else {
        return this.getLoadInPartList(newload,direction);
      }
    }
  }


  // Create an item : root, source or load, whithout any connection with the canvas
  addItem(parent, type) {
    let newItem;
    if      ('source' == type) newItem = this.addSource(parent);
    else if ('load'   == type) newItem = this.addLoad(parent);
    else                       return;
    return newItem;
  }


  // Create a source with the addItem method
  addSource(parent) {
    let newItem = new Source(this.item_index, parent, this);
    this.setItem(this.item_index++, newItem);
    return newItem;
  }


  // Create a source with the Root as parent
  addSourceToRoot() {
    return this.addSource(this.getRoot());
  }


  // Create a load with the addItem method
  addLoad(parent) {
    let newItem = new Load(this.item_index, parent, this);
    this.setItem(this.item_index++, newItem);
    return newItem;
  }


  // Create a copy of the given item
  copyItem(parent, itemToCopy) {
    // create a new empty item of the same type, with the given parent
    let newItem = this.addItem(parent, itemToCopy.type);

    // clone the characs
    newItem.characs = Object.assign({},itemToCopy.characs);

    return newItem;
  }


  // refresh the consumptions of each load based on the given partList and sheet
  refreshConsumptions(partList, sheet) {
    this.forEachLoad((load) => {
      load.refreshConsumption(partList, sheet);
    });
  }


  // return the total power of the tree
  getTotalPower(typmax='both') {
    const totalpower = {
      typ: this.getRoot().getOutputPower('typ'),
      max: this.getRoot().getOutputPower('max')
    };

    // return the typ or max or both
    if('both' === typmax) return totalpower;
    else return totalpower[typmax];
  }


  // get the total efficiency = load_power / total_power
  getTotalEfficiency(typmax='both') {
    // get the total usefull power
    let loadpower = {typ:0, max:0};
    this.forEachLoad((load) => {
      loadpower.typ += load.getInputPower('typ');
      loadpower.max += load.getInputPower('max');
    });

    // refresh the total efficiency
    let totalpower = this.getTotalPower();
    const efficiency = {
      typ: (0 == totalpower.typ) ? 100 : (loadpower.typ / totalpower.typ) * 100,
      max: (0 == totalpower.max) ? 100 : (loadpower.max / totalpower.max) * 100
    };

    // return the typ or max or both
    if('both' === typmax) return efficiency;
    else return efficiency[typmax];
  }


  // return the loss of all DCDC
  getTotalDCDCloss(typmax='both') {
    let totalloss = {typ:0, max:0};
    this.forEachSource((source) => {
      if(source.isDCDC()) {
        totalloss.typ += source.getPowerLoss('typ');
        totalloss.max += source.getPowerLoss('max');
      }
    });

    // return the typ or max or both
    if('both' === typmax) return totalloss;
    else return totalloss[typmax];
  }


  // return the loss of all LDO
  getTotalLDOloss(typmax='both') {
    let totalloss = {typ:0, max:0};
    this.forEachSource((source) => {
      if(source.isLDO()) {
        totalloss.typ += source.getPowerLoss('typ');
        totalloss.max += source.getPowerLoss('max');
      }
    });

    // return the typ or max or both
    if('both' === typmax) return totalloss;
    else return totalloss[typmax];
  }


  // Remove the reference to this tree from each item
  // Caution! Call .convertToCircular() before calling any other method
  convertToUncircular() {
    this.forEachItem((item) => {
      item.tree = null;
    });
  }

  // Replace the reference to this tree in each item
  // This method is only usefull after .convertToUncircular()
  convertToCircular() {
    this.forEachItem((item) => {
      item.tree = this;
    });
  }

  // return tree data
  export() {
    let tree = new Tree(false);
    tree.item_index = this.item_index;

    this.forEachItem((item) => {
      tree.setItem(item.id, item.export());
    });
    return tree;
  }

  // import tree data
  import(data) {
    // compatibility with < v2.1.0
    if('string' === typeof data) {
      data = JSON.parse(data);
    }
    // reinit the tree with new values
    this.item_list  = [];
    this.item_index = data.item_index;
    // compatibility with < v2.1.0 (again)
    let item_list = data.item_list;
    if('string' === typeof item_list) {
      item_list = JSON.parse(item_list);
    }
    // for each item in the list
    for (let newItem_properties of item_list) {
      // compatibility with < v2.1.0 (yet again)
        if('string' === typeof newItem_properties) {
          newItem_properties = JSON.parse(newItem_properties);
        }
      // if there is no data, continue to the next item
      if (!newItem_properties) continue;
      // create a new empty Item
      let newItem;
      if('source' == newItem_properties.type) {
        newItem = new Source(0, null, this);
      }
      else if('load' == newItem_properties.type) {
        newItem = new Load(0, null, this);
      }
      else {
        newItem = new Item(0, null, null, this);
      }
      // import the item data
      newItem.import(newItem_properties);

      // insert the new item in the tree
      this.setItem(newItem.id, newItem);
    }
  }

  // loop on each item and process a given function
  forEachItem(theFunction) {
    // use for..of instead of for..in to respect the array order if needed
    for (let item of this.item_list) {
      if (undefined !== item) {
        theFunction(item);
      }
    }
  }


  // loop on each source and process a given function
  forEachSource(theFunction) {
    this.forEachItem((item) => {
      if (item.isSource()) {
        theFunction(item);
      }
    });
  }


  // loop on each load and process a given function
  forEachLoad(theFunction) {
    this.forEachItem((item) => {
      if (item.isLoad()) {
        theFunction(item);
      }
    });
  }
}

module.exports = Tree;
