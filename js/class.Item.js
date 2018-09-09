// -----------------------------------------------------------------------------
// Item Class
//    An Item object contains the non-graphical data of a source, load or root
//    and their relations with other items
//    Its prototype provides methods dedicated to manipulate the item
//    and compute electrical characteristics
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

    // set characs according to the type
    this.setCharacs(type);
    // parent unique ID in the tree
    this.parentID     = (null !== parent) ? parent.id : null;
    // represent the nth children of its parents
    this.child_index  = (null !== parent) ? parent.childrenID.length : 0;
  }


  setCharacs(type) {
    // Source specific datas
    if ('source' === type) {
      this.characs = {
        name        : 'Source name',
        regtype     : 0,
        /*
          regtypes :
          0: FixDCDC
          1: FixLDO
          2: FixOther (< v1.3.0),
          3: AdjDCDC
          4: AdjLDO
          5: AdjOther (< v1.3.0),
          6: Dummy    (>= 1.3.0)
          7: Perfect  (>= 1.3;0)
        */
        ref         : 'Part Number',
        custom1     : '',
        custom2     : '',
        vout_min    : '1.78',
        vout_typ    : '1.8',
        vout_max    : '1.82',
        r1          : '150000',
        r2          : '120000',
        rtol        : '1',
        vref_min    : '0.8',
        vref_typ    : '0.8',
        vref_max    : '0.8',
        efficiency  : [{i:'1', eff:'90'}], // must be kept ordered by ascending current
        iq_typ      : '0',
        iq_min      : '0',
        iq_max      : '0',
        color       : '#FF1744'
      };
    }
    // Load specific datas
    else if ('load' === type) {
      this.characs = {
        name       : 'Load name',
        custom1    : '',
        custom2    : '',
        ityp       : 0,
        imax       : 0,
        color      : '#00bfa5',
        loadtype   : 0,
        /*
          load types (v1.4.0) :
          0: partlist
          1: raw
          2: sync (associated with celltyp and cellmax)
        */
        celltyp    : 'A1',
        cellmax    : 'B1'
      };
    }
    // Root specific datas
    else if ('root' === type) {
      this.characs = {}; // nothing yet
    }
    // Default
    else {
      this.characs = {};
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


  // check if the item parent is root
  isChildOfRoot() {
    return (0 === this.parentID);
  }


  // Check if the item is a DC/DC reg
  isDCDC() {
    return this.isSource() && ('0' == this.characs.regtype || '3' == this.characs.regtype);
  }


  // Check if the item is a LDO reg
  isLDO() {
    return this.isSource() && ('1' == this.characs.regtype || '4' == this.characs.regtype);
  }


  // Check if the item is an adjustable regulator (DC/DC or LDO)
  isAdjReg() {
    return this.isSource() && ('3' == this.characs.regtype || '4' == this.characs.regtype);
  }


  // Check if the item is a fixed output regulator (DC/DC or LDO)
  isFixedReg() {
    return this.isSource() && ('0' == this.characs.regtype || '1' == this.characs.regtype);
  }


  // Check if the item is a Dummy reg
  isDummy() {
    return this.isSource() && ('6' == this.characs.regtype);
  }


  // Check if the item is a Perfect reg
  isPerfect() {
    return this.isSource() && ('7' == this.characs.regtype);
  }


  // Check if the item is a load with the current in the partlist
  isInPartlist() {
    return this.isLoad() && ('0' == this.characs.loadtype);
  }


  // Check if the item is a load with the current defined as raw data
  isRaw() {
    return this.isLoad() && ('1' == this.characs.loadtype);
  }


  // Check if the item is a load with the current synced
  isSynced() {
    return this.isLoad() && ('2' == this.characs.loadtype);
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
  getOutputVoltage(valType) {
    let v_out = 0.0;

    // only sources have output
    if (this.isSource()) {
      // Dummy : v_out = v_in
      if(this.isDummy()) {
        v_out = this.getInputVoltage(valType);
      }
      // DC/DC and LDOs : v_out is set by user
      else {
        v_out = parseFloat(this.characs['vout_' + valType]);
      }
    }

    return v_out;
  }


  // get the input current of an item
  getInputCurrent(valType) {
    let i_in = 0.0;

    // LDO: i_in = i_out + i_q
    if (this.isLDO()) {
      i_in = this.getOutputCurrent(valType) + parseFloat(this.characs['iq_' + valType]);
    }
    // DC/DC and perfect: i_in = p_in / v_in_typ
    else if (this.isDCDC() || this.isPerfect()) {
      i_in = (0 == this.getInputVoltage('typ')) ? 0.0 : this.getInputPower(valType) / this.getInputVoltage('typ');
    }
    // Loads: i_in is set by the partList
    else if (this.isLoad()) {
      i_in = parseFloat(this.characs['i' + valType]);
    }
    // Dummy: i_in = i_out
    else if (this.isDummy()) {
      i_in = this.getOutputCurrent(valType);
    }

    return i_in;
  }


  // get the output current of an item
  getOutputCurrent(valType) {
    let i_out = 0.0;

    // only sources have outout
    if (this.isSource()) {
      // i_out = sum of children i_in
      for (let childID of this.childrenID) {
        i_out += this.tree.getItem(childID).getInputCurrent(valType);
      }
    }
    // root output current represent the total currents of the project
    else if (this.isRoot()) {
      // i_out = sum of children i_out
      for (let childID of this.childrenID) {
        i_out += this.tree.getItem(childID).getOutputCurrent(valType);
      }
    }

    return i_out;
  }


  // get the input power of an item
  getInputPower(valType) {
    let p_in = 0.0;

    // if the item is a load or a LDO or a dummy item
    if (this.isLoad() || this.isLDO() || this.isDummy()) {
      // p_in = v_in_typ * i_in
      p_in = this.getInputVoltage('typ') * this.getInputCurrent(valType);
    }
    // if the item is perfect
    else if (this.isPerfect()) {
      // p_in = p_out
      p_in = this.getOutputPower(valType);
    }
    // if the item is a DC/DC
    else if (this.isDCDC()) {
      let efficiency = 1;

      // if the efficiency is an array (>= v1.1.0)
      if(typeof this.characs.efficiency === 'object') {
        // if no efficiency is set, consider 100%
        if(this.characs.efficiency.length == 0) {
          efficiency = 1;
        }
        // if only one efficiency is set, ignore the current
        else if (this.characs.efficiency.length == 1) {
          efficiency = parseFloat(this.characs.efficiency[0].eff) / 100;
        }
        // if there is multiple efficiency, use linear interpolation
        else {
          let itemCurrent = this.getOutputCurrent(valType);
          // if the current is <= of the min efficiency, use the min
          if(itemCurrent <= this.characs.efficiency[0].i) {
            efficiency = parseFloat(this.characs.efficiency[0].eff) / 100;
          }
          // if the current is >= of the max efficiency, use the max
          else if(itemCurrent >= this.characs.efficiency[this.characs.efficiency.length - 1].i) {
            efficiency = parseFloat(this.characs.efficiency[this.characs.efficiency.length - 1].eff) / 100;
          }
          // else, find two points and compute with linear interpolation (f(x)=ax+b)
          else {
            for(let n=0; n < this.characs.efficiency.length - 1; n++) {
              let eff_data      = this.characs.efficiency[n];
              let eff_nextData  = this.characs.efficiency[n+1];

              // if the current is equal to one of the point
              if(itemCurrent == eff_data.i) {
                efficiency = parseFloat(eff_data.eff) / 100;
                break;
              }
              // else, use linear interpolation to compute the efficiency
              else if(itemCurrent > eff_data.i && itemCurrent < eff_nextData.i) {
                // a = (y2-y1)/(x2-x1)
                let a = (parseFloat(eff_nextData.eff)/100 - parseFloat(eff_data.eff)/100) / (parseFloat(eff_nextData.i) - parseFloat(eff_data.i));

                // b = y1 - a * x1
                let b = parseFloat(eff_data.eff)/100 - a * parseFloat(eff_data.i);

                // y = ax+b
                efficiency = a * itemCurrent + b;
                break;
              }
            }
          }
        }
      }
      // if the efficiency is a single number (compatibility, < v1.1.0)
      else {
        efficiency = parseFloat(this.characs.efficiency) / 100;
      }

      // p_in = p_out / efficiency
      p_in = this.getOutputPower(valType) / efficiency;
    }

    return p_in;
  }


  // get the output power of an item
  getOutputPower(valType) {
    let p_out = 0.0;

    // only sources have output
    if (this.isSource()) {
      // p_out = v_out_typ * i_out
      p_out = this.getOutputVoltage('typ') * this.getOutputCurrent(valType);
    }
    // ROOT output power represent the total power of the project
    else if (this.isRoot()) {
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
  getVoltage(valType, inout, roundToSI, show_unit) {
    // init options
    if (undefined === roundToSI) roundToSI = false;
    if (undefined === show_unit) show_unit = false;

    // get voltage value
    let voltage = 0.0;
    if      ('in'  === inout) voltage = this.getInputVoltage (valType);
    else if ('out' === inout) voltage = this.getOutputVoltage(valType);

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
  getPowerLoss(valType) {
    let p_loss = 0.0;

    // In sources, p_loss = p_in - p_out
    if (this.isSource() && !this.isChildOfRoot()) {
      p_loss = this.getInputPower(valType) - this.getOutputPower(valType);
    }

    return p_loss;
  }


  // Open a new window to edit the item
  // wait for the modifications then edit the item values
  // Need a partlist to update the consumptions in some cases
  // Need the sync sheet to update other consumptions
  edit(partList, sheet) {
    // return a promise
    return new Promise(resolve => {
      const {ipcRenderer} = require('electron');

      // listen to the response from main.js and resolve the promise
      ipcRenderer.on('Item-editResp', (event, datastr) => {
        // import the new data
        if(null !== datastr) this.fromString(datastr);

        if(this.isLoad()) {
          // if the load is not in the part list
          // remove all consumptions on the parts
          if(!this.isInPartlist()) {
            partList.forEachPart((part) => {
              if(part.isConsuming(this)) {
                part.setConsumption(0, this, 'typ');
                part.setConsumption(0, this, 'max');
              }
            });
          }

          // refresh the consumption
          this.refreshConsumption(partList, sheet);
        }

        // resolve the promise
        resolve();
      });

      // Send an IPC async msg to main.js: request to edit this item
      ipcRenderer.send('Item-editReq', this.toString(), this.type);
    });
  }


  // Export the item as a string
  toString() {
    let tree  = this.tree;
    // remove the ref to the tree to avoid circular object
    this.tree = null;
    // stringify
    let str   = JSON.stringify(this);
    // set back the ref to the tree
    this.tree = tree;
    // return the string
    return str;
  }


  // Import an item previously exported with .toString()
  fromString(str) {
    // extract the data from the string
    let properties = JSON.parse(str);

    // init the characs
    this.setCharacs(properties.type);

    // for each property in this item, copy from the string
    for (let i in this) {
      // if the string and this item has the hasOwnProperty
      // and do not replace the tree
      if (this.hasOwnProperty(i) && properties.hasOwnProperty(i) && i !== 'tree') {
        // if the property is the characs, replace one by one
        if(i === 'characs') {
          // for each characs in this item, copy from the string
          for (let j in this.characs) {
            // if the charac exist in this item and in the string
            if (this.characs.hasOwnProperty(j) && properties.characs.hasOwnProperty(j)) {
              this.characs[j] = properties.characs[j];
            }
          }
        }
        // replace all the other properties
        else {
          this[i] = properties[i];
        }
      }
    }

    // compatibility with < v1.1.0
    // conversions of efficiency single number to array
    if(this.isDCDC() && !isNaN(this.characs.efficiency)) {
      this.characs.efficiency = [{i:1, eff:this.characs.efficiency}];
    }

    // compatibility with < v1.3.0
    // conversions of old reg types to Perfect Source
    if(this.isSource() && (2 == this.characs.regtype || 5 == this.characs.regtype)) {
      this.characs.regtype = 7;
    }

    // compatibility with < v1.4.0
    // conversions of old characs.isinpartlist to new characs.valtyp
    if(this.isLoad() && undefined === properties.characs.loadtype) {
      this.characs.loadtype = (properties.characs.inpartlist) ? 0 : 1;
    }
  }


  // Refresh the consumption whith the given partList
  refreshConsumption(partList, sheet) {
    if (this.isLoad()) {
      // if the cunsumptions of this loads are in the partlist
      // v < 1.4.0 compatibility: if the location do not exist, assume partlist
      if(undefined === this.characs.loadtype || 0 == this.characs.loadtype) {
        // skip if the partlist was not given
        if(undefined !== partList && null !== partList) {
          // reinit each current
          this.characs.ityp = 0;
          this.characs.imax = 0;

          // parcour all part to add all currents
          partList.forEachPart((part) => {
            this.characs.ityp += parseFloat(part.getConsumption(this, 'typ'));
            this.characs.imax += parseFloat(part.getConsumption(this, 'max'));
          });
        }
      }
      // if the consumptions are raw
      else if(1 == this.characs.loadtype) {
        // do nothing
      }
      // if the consumptions are in the spreadsheet
      else if(2 == this.characs.loadtype) {
        // if there is no sheet
        if(undefined === sheet || null === sheet) {
          // reinit values
          this.characs.ityp = 0;
          this.characs.imax = 0;
        }
        // if there is a sheet
        else {
          const XLSX = require('xlsx');
          for(let typmax of ['typ','max']) {
            // init current
            let i=0;
            // convert the cell adress to indexes, B8 -> {c:1,r:7}
            let cell_index = XLSX.utils.decode_cell(this.characs['cell'+typmax]);
            // if the cell exists
            if(undefined !== sheet[cell_index.r] && undefined !== sheet[cell_index.r][cell_index.c]) {
              // get the value from the sheet
              i = parseFloat(sheet[cell_index.r][cell_index.c]);
            }
            // check if the value is a number
            if(isNaN(i)) i = 0;
            // save the values
            this.characs['i'+typmax] = i;

          }
        }
      }
    }
  }
}

module.exports = Item;
