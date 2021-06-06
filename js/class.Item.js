// -----------------------------------------------------------------------------
// Item Class
//    An Item object contains the non-graphical data of a component of the PTree
//    and their relations with other items
//    This class provides generic methods dedicated to manipulate the item
//    and compute electrical characteristics
//
//    This class is inherited by Load and Source
//
//    Check the summary of the formulas : ../docs/equations.pdf
// -----------------------------------------------------------------------------

const Util = require('../js/class.Util.js');

class Item {

  constructor(id, parent, type, tree) {
    // Construction datas
    this.id           = id;    // item unique ID in the tree
    this.type         = type;  // item type (source or load)
    this.tree         = tree;  // reference to the tree (circular object, by the way)
    this.nextOffset   = 0;     // offset for the next adjacent element, init 0
    this.childrenID   = [];    // list of references of children, init empty
    this.characs      = {};    // list of item specific characteristics
    // this.parentID;    --> init below
    // this.child_index; --> init below

    // if a parent is specified
    if (null !== parent) {
      // set parent unique ID
      this.parentID = parent.id;

      // represent the nth children of its parents
      this.child_index = parent.childrenID.length;

      // add a reference of this item to its parent
      parent.childrenID.push(this.id);

      // if the new source is not the first child of its parent
      if (parent.childrenID.length > 1) {
        // increment the offset of all parents (recursively)
        parent.nextOffsetIncrement(1);
      }
    }
    else {
      this.parentID    = null;
      this.child_index = 0;
    }
  }


  // check if the item is a source
  isSource() {
    return ('source' === this.type);
  }


  // check if the item is a load
  isLoad() {
    return ('load' === this.type);
  }


  // check if the item is a source
  isRoot() {
    return ('root' === this.type);
  }


  // Check if the item has to be displayed
  isVisible() {
    // compatibility with < v1.6.0
    return (undefined === this.characs.hidden) ? true : !this.characs.hidden;
  }


  // check if the item parent is root
  isChildOfRoot() {
    return (0 === this.parentID);
  }


  // recursively test if this item is a child of 'potentialParent'
  isChildOf(potentialParent) {
    // test if this item is a child of potentialParent
    if (-1 !== potentialParent.childrenID.indexOf(this.id)) {
      return true;
    }
    // if the item is not a child of potentialParent and if potentialParent is a source
    else if (potentialParent.isSource()) {
      // recursively test if THIS is child of potentialParent children
      for (let childID of potentialParent.childrenID) {
        let child = this.tree.getItem(childID);
        // if the child of potentialParent is the parent of the item, return true
        if (this.isChildOf(child)) return true;
        // else, continue to the next child
      }
    }

    return false;
  }


  // return the parent of the item
  getParent() {
    return (null === this.parentID) ? null : this.tree.getItem(this.parentID);
  }


  // increment the nextOffset of the item and all its parents
  nextOffsetIncrement(amount) {
    // increment the offset of the item
    this.nextOffset += amount;
    // increment the item offset, recursively to the last parent (root)
    if (!this.isRoot()) {
      this.getParent().nextOffsetIncrement(amount);
    }
  }


  // Decrement the nextOffset of the item and all its parents
  nextOffsetDecrement(amount) {
    // Decrement the offset of the item
    this.nextOffset = (this.nextOffset < amount) ? 0 : this.nextOffset - amount;
    // Decrement the item offset, recursively to the last parent (root)
    if (!this.isRoot()) {
      this.getParent().nextOffsetDecrement(amount);
    }
  }


  // get an array with all the descendants IDs of the item
  getDescendants() {
    let ids = this.childrenID.slice();

    for (let childID of this.childrenID) {
      let moreIds = this.tree.getItem(childID).getDescendants();
      ids = ids.concat(moreIds);
    }

    return ids;
  }


  // remove all the children of the item
  removeChildren() {
    let descendants = this.getDescendants();

    for (let i = 0; i < descendants.length; ++i) {
      this.tree.deleteItem(descendants[i]);
    }
  }


  // remove the item from its parent
  detach() {
    let parent = this.getParent();

    // decrement the index of the next children
    for (let i = this.child_index + 1; i < parent.childrenID.length; ++i) {
      this.tree.getItem(parent.childrenID[i]).child_index--;
    }
    // remove from parents the amount of offset that was due to this item
    let amount = (parent.childrenID.length > 1) ? this.nextOffset + 1 : this.nextOffset;
    parent.nextOffsetDecrement(amount);

    // remove from the parent
    parent.childrenID.splice(this.child_index, 1);
  }


  // remove the item from its tree
  remove() {
    // remove the item from its parent
    this.detach();
    // remove all the children
    this.removeChildren();
    // delete the item from its tree
    // cannot splice because indexes must not change
    this.tree.deleteItem(this.id);
  }


  // Move up or down an item by inverting it with the next or prev item
  move(direction) {
    if (!this.isRoot()) {
      let parent = this.getParent();
      if ('up' == direction && this.child_index > 0) {
        parent.childrenID[this.child_index]     = parent.childrenID[this.child_index - 1];
        parent.childrenID[this.child_index - 1] = this.id;

        this.tree.getItem(parent.childrenID[this.child_index]).child_index++;
        this.child_index--;
      }
      else if ('down' == direction && this.child_index < parent.childrenID.length - 1) {
        parent.childrenID[this.child_index]     = parent.childrenID[this.child_index + 1];
        parent.childrenID[this.child_index + 1] = this.id;

        this.tree.getItem(parent.childrenID[this.child_index]).child_index--;
        this.child_index++;
      }
    }
  }


  // Move up an item in its parent list
  moveUp() {
    this.move('up');
  }


  // Move down an item in its parent list
  moveDown() {
    this.move('down');
  }


  // Move an item under a newparent
  moveTo(newparent) {
    // remove the item from its parent but keep it in the global list
    this.detach();

    // add the item to the newparent :
    this.parentID    = newparent.id;
    this.child_index = newparent.childrenID.length;
    newparent.childrenID.push(this.id);

    // increment the offset of all parents (recursively)
    let increment = this.nextOffset;
    if (newparent.childrenID.length > 1) increment += 1;
    newparent.nextOffsetIncrement(increment);
  }


  // get the input voltage of the item
  getInputVoltage(valType) {
    let v_in = 0.0;

    // item v_in = parent v_out
    if (!this.isChildOfRoot()) {
      v_in = parseFloat(this.getParent().getOutputVoltage(valType));
    }

    return v_in;
  }


  // get the output voltage of an item
  getOutputVoltage() {
    return 0.0;
  }


  // get the input current of an item
  getInputCurrent() {
    return 0.0;
  }


  // get the output current of an item
  getOutputCurrent(valType) {
    let i_out = 0.0;

    // root output current represent the total currents of the project
    if (this.isRoot()) {
      // i_out = sum of children i_out
      for (let childID of this.childrenID) {
        i_out += this.tree.getItem(childID).getOutputCurrent(valType);
      }
    }

    return i_out;
  }


  // get the input power of an item
  getInputPower() {
    return 0.0;
  }


  // get the output power of an item
  getOutputPower(valType) {
    let p_out = 0.0;

    // ROOT output power represent the total power of the project
    if (this.isRoot()) {
      // p_out = sum of children p_out
      for (let childID of this.childrenID) {
        p_out += this.tree.getItem(childID).getOutputPower(valType);
      }
    }

    return p_out;
  }


  // get the input or output current, eventualy formated
  getCurrent(valType, inout, roundToSI, show_unit) {
    // init options
    if (undefined === roundToSI) roundToSI = false;
    if (undefined === show_unit) show_unit = false;

    // get current value
    let current = 0.0;
    if      ('in'  === inout) current = this.getInputCurrent (valType);
    else if ('out' === inout) current = this.getOutputCurrent(valType);

    // format value
    if ($.isNumeric(roundToSI)) current = Util.numberToSi(current, roundToSI);
    if (show_unit) current += 'A';

    return current;
  }


  // get the input or output voltage, eventualy formated
  getVoltage(valType, inout, roundToSI, show_unit, ignoreDrop=false) {
    // init options
    if (undefined === roundToSI) roundToSI = false;
    if (undefined === show_unit) show_unit = false;

    // get voltage value
    let voltage = 0.0;
    if      ('in'  === inout) voltage = this.getInputVoltage (valType);
    else if ('out' === inout) voltage = this.getOutputVoltage(valType, ignoreDrop);

    // format value
    if ($.isNumeric(roundToSI)) voltage = Util.numberToSi(voltage, roundToSI);
    if (show_unit) voltage += 'V';

    return voltage;
  }


  // get the input or output power, eventualy formated
  getPower(valType, inoutloss, roundToSI, show_unit) {
    // init options
    if (undefined === roundToSI) roundToSI = false;
    if (undefined === show_unit) show_unit = false;

    // get power value
    let power = 0.0;
    if      ('in'   === inoutloss) power = this.getInputPower (valType);
    else if ('out'  === inoutloss) power = this.getOutputPower(valType);
    else if ('loss' === inoutloss) power = this.getPowerLoss  (valType);

    // format value
    if ($.isNumeric(roundToSI)) power = Util.numberToSi(power, roundToSI);
    if (show_unit) power += 'W';

    return power;
  }


  // get the power loss in an item
  getPowerLoss() {
    return 0.0;
  }


  // get the reg or load type
  getType() {
    return '';
  }


  // get the Fabric template used to render this item
  getFabricTemplate() {
    // init the template
    let template = {
      selectable    : false,
      fill          : this.characs.color,
    };

    // rect
    if(0 == this.characs.shape) {
      // nothing special but a simple rectangle
    }
    // rounded rect
    else if (1 == this.characs.shape) {
      template.rx = 20;
      template.ry = 20;
    }
    // parallelogram
    else if (2 == this.characs.shape) {
      template.skewX = -20;
    }

    return template;
  }


  // get all the alerts
  getAlerts() {
    return [];
  }


  // Open a new window to edit the item
  // wait for the modifications then edit the item values
  // Need a partlist to update the consumptions in some cases
  // Need the sync sheet to update other consumptions
  edit() {
    // return a promise
    return new Promise(resolve => {
      const {ipcRenderer} = require('electron');

      // listen to the response from main.js and resolve the promise
      ipcRenderer.once('Item-editResp', (event, data) => {
        // import the new data
        if(null !== data) {
          this.import(data);
        }

        // resolve the promise
        resolve();
      });

      // Send an IPC async msg to main.js: request to edit this item
      ipcRenderer.send('Item-editReq', this.export(), this.type);
    });
  }


  // toggle the item visibility
  toggle() {
    if(this.isRoot()) {
      throw 'can not toggle the Root item';
    }
    else {
      // compatibility with < v1.6.0: !undefined == true
      this.characs.hidden = !this.characs.hidden;
    }
  }

  // return item data
  export() {
    let item = new Item(0, null, null, null);
    Object.assign(item, this);
    item.tree = null;
    return item;
  }

  // Import item data
  import(data) {
    // compatibility with < v2.1.0
    if('string' === typeof data) {
      data = JSON.parse(data);
    }
    // for each property in this item, copy from provided data
    for (let i in this) {
      // if both provided data and this item have the property
      if (Object.prototype.hasOwnProperty.call(this, i) && Object.prototype.hasOwnProperty.call(data, i)) {
        // if the property is characs, replace one by one
        if(i === 'characs') {
          // for each characs in this item, copy from provided data
          for (let j in this.characs) {
            // if the charac exist in both this item and provided data
            if (Object.prototype.hasOwnProperty.call(this.characs, j) && Object.prototype.hasOwnProperty.call(data.characs, j)) {
              this.characs[j] = data.characs[j];
            }
          }
        }
        // replace all the other properties (except the tree)
        else if (i !== 'tree') {
          this[i] = data[i];
        }
      }
    }

    return data;
  }
}

module.exports = Item;
