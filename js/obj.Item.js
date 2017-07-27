// -----------------------------------------------------------------------------
// Item constructor
//    An Item object contains the non-graphical data of a source, load or root
//    and their relations with other items
//    Its prototype provides methods dedicated to manipulate the item
//    and compute electrical characteristics
//    Check the summary of the formulas : ../docs/equations.pdf
// -----------------------------------------------------------------------------


// Item object constructor
var Item = function(id, parent, type, tree) {
   // Construction datas
   this.id       = id;
   this.type     = type;
   this.parentID = (null !== parent) ? parent.id : null;
   this.tree     = tree;

   // Default inits
   this.nextOffset   = 0;  // the offset for the next adjacent element, init 0
   this.childrenID   = []; // list of references of children, init empty
   this.child_index  = 0;  // represent the nth children of its parents
   this.col          = 0;  // the col in the canvas saw as a grid
   this.line         = 1;  // the line in the canvas saw as a grid

   // Source specific datas
   if ('source' === type) {
      this.characs = {
         name        : 'Source name',
         regtype     : 0, // [FixDCDC, FixLDO, FixOther, AdjDCDC, AdjLDO, AdjOther]
         ref         : 'Part Number',
         vout_min    : '1.78',
         vout_typ    : '1.8',
         vout_max    : '1.82',
         r1          : '150000',
         r2          : '120000',
         rtol        : '1',
         vref        : '0.8',
         efficiency  : '90',
         iq_typ      : '0',
         iq_min      : '0',
         iq_max      : '0',
         color       : '#FF1744'
      };
   }
   // Load specific datas
   else if ('load' === type) {
      this.characs = {
         name  : 'Load name',
         ityp  : 0,
         imax  : 0,
         color : '#00bfa5'
      };
   }
   // Root specific datas
   else if ('root' === type) {
      this.characs = {}; // nothing yet
   }
   else {
      this.characs = {}; // other datas specific of the item type
   }
};


// check if the item is a source
Item.prototype.isSource = function() {
   return ("source" === this.type);
};


// check if the item is a load
Item.prototype.isLoad = function() {
   return ("load" === this.type);
};


// check if the item is a source
Item.prototype.isRoot = function() {
   return ("root" === this.type);
};


// check if the item parent is root
Item.prototype.isChildOfRoot = function() {
   return (0 === this.parentID);
};


// Check if the item is a DC/DC
Item.prototype.isDCDC = function() {
   return this.isSource() && ('0' == this.characs.regtype || '3' == this.characs.regtype);
};


// Check if the item is a LDO
Item.prototype.isLDO = function() {
   return this.isSource() && ('1' == this.characs.regtype || '4' == this.characs.regtype);
};


// recursively test if this item is a child of "potentialParent"
Item.prototype.isChildOf = function(potentialParent) {
   // test if this item is a child of potentialParent
   if (-1 !== potentialParent.childrenID.indexOf(this.id)) {
      return true;
   }
   // if the item is not a child of potentialParent and if potentialParent is a source
   else if (potentialParent.isSource()) {
      // recursively test if THIS is child of potentialParent children
      for (let childID of potentialParent.childrenID) {
         var child = this.tree.getItem(childID);
         // if the child of potentialParent is the parent of the item, return true
         if (this.isChildOf(child)) return true;
         // else, continue to the next child
      }
   }

   return false;
};


// return the parent of the item
Item.prototype.getParent = function() {
   return (null === this.parentID) ? null : this.tree.getItem(this.parentID);
};


// increment the nextOffset of the item and all its parents
Item.prototype.nextOffsetIncrement = function(amount) {
   // increment the offset of the item
   this.nextOffset += amount;
   // increment the item offset, recursively to the last parent (root)
   if (!this.isRoot()) {
      this.getParent().nextOffsetIncrement(amount);
   }
};


// Decrement the nextOffset of the item and all its parents
Item.prototype.nextOffsetDecrement = function(amount) {
   // Decrement the offset of the item
   this.nextOffset = (this.nextOffset < amount) ? 0 : this.nextOffset - amount;
   // Decrement the item offset, recursively to the last parent (root)
   if (!this.isRoot()) {
      this.getParent().nextOffsetDecrement(amount);
   }
};


// get an array with all the descendants IDs of the item
Item.prototype.getDescendants = function() {
   var ids = this.childrenID.slice();

   for (let childID of this.childrenID) {
      var moreIds = this.tree.getItem(childID).getDescendants();
      ids = ids.concat(moreIds);
   }

   return ids;
};


// remove all the children of the item
Item.prototype.removeChildren = function() {
   var descendants = this.getDescendants();

   for (var i = 0; i < descendants.length; ++i) {
      this.tree.deleteItem(descendants[i]);
   }
};


// remove the item from its parent
Item.prototype.detach = function() {
   var parent = this.getParent();

   // decrement the index of the next children
   for (let i = this.child_index + 1; i < parent.childrenID.length; ++i) {
      this.tree.getItem(parent.childrenID[i]).child_index--;
   }
   // remove from parents the amount of offset that was due to this item
   var amount = (parent.childrenID.length > 1) ? this.nextOffset + 1 : this.nextOffset;
   parent.nextOffsetDecrement(amount);

   // remove from the parent
   parent.childrenID.splice(this.child_index, 1);
};


// remove the item from its tree
Item.prototype.remove = function() {
   // remove the item from its parent
   this.detach();
   // remove all the children
   this.removeChildren();
   // delete the item from its tree
   // cannot splice because indexes must not change
   this.tree.deleteItem(this.id);
};


// Move up or down an item by inverting it with the next or prev item
Item.prototype.move = function(direction) {
   if (!this.isRoot()) {
      var parent = this.getParent();
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
};


// Move up an item in its parent list
Item.prototype.moveUp = function() {
   this.move('up');
};


// Move down an item in its parent list
Item.prototype.moveDown = function() {
   this.move('down');
};


// Move an item under a newparent
Item.prototype.moveTo = function(newparent) {
   // remove the item from its parent but keep it in the global list
   this.detach();

   // add the item to the newparent :
   this.parentID    = newparent.id;
   this.child_index = newparent.childrenID.length;
   newparent.childrenID.push(this.id);
   // if the item is not the first child of its newparent
   if (newparent.childrenID.length > 1) {
      // increment the offset of all parents (recursively)
      newparent.nextOffsetIncrement(this.nextOffset + 1);
   }
};


// get the input voltage of the item
Item.prototype.getInputVoltage = function(valType) {
   var v_in = 0.0;

   // item v_in = parent v_out
   if (!this.isChildOfRoot()) {
      v_in = parseFloat(this.getParent().characs['vout_' + valType]);
   }

   return v_in;
};


// get the output voltage of an item
Item.prototype.getOutputVoltage = function(valType) {
   var v_out = 0.0;

   // only sources have output
   if (this.isSource()) {
      // v_out is set by user
      v_out = parseFloat(this.characs['vout_' + valType]);
   }

   return v_out;
};


// get the input current of an item
Item.prototype.getInputCurrent = function(valType) {
   var i_in = 0.0;

   // for LDO, i_in = i_out + i_q
   if (this.isLDO()) {
      i_in = this.getOutputCurrent(valType) + parseFloat(this.characs['iq_' + valType]);
   }
   // for DC/DC, i_in = p_in / v_in_typ
   else if (this.isDCDC()) {
      i_in = (0 == this.getInputVoltage('typ')) ? 0.0 : this.getInputPower(valType) / this.getInputVoltage('typ');
   }
   // for loads, i_in is set by the partList
   else if (this.isLoad()) {
      i_in = parseFloat(this.characs['i' + valType]);
   }

   return i_in;
};


// get the output current of an item
Item.prototype.getOutputCurrent = function(valType) {
   var i_out = 0.0;

   // only sources have outout
   if (this.isSource()) {
      // i_out = sum of children i_in
      for (let childID of this.childrenID) {
         i_out += this.tree.getItem(childID).getInputCurrent(valType);
      }
   }

   return i_out;
};


// get the input power of an item
Item.prototype.getInputPower = function(valType) {
   var p_in = 0.0;

   // if the item is a load or a LDO
   if (this.isLoad() || this.isLDO()) {
      // p_in = v_in_typ * i_in
      p_in = this.getInputVoltage('typ') * this.getInputCurrent(valType);
   }
   // if the item is a DC/DC
   else if (this.isDCDC()) {
      // p_in = p_out / efficiency
      var efficiency = parseFloat(this.characs.efficiency) / 100;
      p_in = this.getOutputPower(valType) / efficiency;
   }

   return p_in;
};


// get the output power of an item
Item.prototype.getOutputPower = function(valType) {
   var p_out = 0.0;

   // only sources have output
   if (this.isSource()) {
      // p_out = v_out_typ * i_out
      p_out = this.getOutputVoltage('typ') * this.getOutputCurrent(valType);
   }

   return p_out;
};


// get the input or output current, eventualy formated
Item.prototype.getCurrent = function(valType, inout, roundToSI, show_unit) {
   // init options
   if (undefined === roundToSI) roundToSI = false;
   if (undefined === show_unit) show_unit = false;

   // get current value
   var current = 0.0;
   if      ("in"  === inout) current = this.getInputCurrent (valType);
   else if ("out" === inout) current = this.getOutputCurrent(valType);

   // format value
   if ($.isNumeric(roundToSI)) current = numberToSi(current, roundToSI);
   if (show_unit) current += "A";

   return current;
};


// get the input or output voltage, eventualy formated
Item.prototype.getVoltage = function(valType, inout, roundToSI, show_unit) {
   // init options
   if (undefined === roundToSI) roundToSI = false;
   if (undefined === show_unit) show_unit = false;

   // get voltage value
   var voltage = 0.0;
   if      ("in"  === inout) voltage = this.getInputVoltage (valType);
   else if ("out" === inout) voltage = this.getOutputVoltage(valType);

   // format value
   if ($.isNumeric(roundToSI)) voltage = numberToSi(voltage, roundToSI);
   if (show_unit) voltage += "V";

   return voltage;
};


// get the input or output power, eventualy formated
Item.prototype.getPower = function(valType, inoutloss, roundToSI, show_unit) {
   // init options
   if (undefined === roundToSI) roundToSI = false;
   if (undefined === show_unit) show_unit = false;

   // get power value
   var power = 0.0;
   if      ("in"   === inoutloss) power = this.getInputPower (valType);
   else if ("out"  === inoutloss) power = this.getOutputPower(valType);
   else if ("loss" === inoutloss) power = this.getPowerLoss  (valType);

   // format value
   if ($.isNumeric(roundToSI)) power = numberToSi(power, roundToSI);
   if (show_unit) power += "W";

   return power;
};


// get the power loss in an item
Item.prototype.getPowerLoss = function(valType) {
   var p_loss = 0.0;

   // In sources, p_loss = p_in - p_out
   if (this.isSource() && !this.isChildOfRoot()) {
      p_loss = this.getInputPower(valType) - this.getOutputPower(valType);
   }

   return p_loss;
};


// Open a new window to edit the item, wait for the modifications, then edit the item values
Item.prototype.edit = function() {
   // require ipcRenderer to send/receive message with main.js
   const {
      ipcRenderer
   } = require('electron');

   // prepare datas to be sent to the edit window
   var requestData = {
      id     : this.id,
      type   : this.type,
      characs: this.characs
   };

   // ask main.js to edit the item with the given data and wait for a response
   var resultData = JSON.parse(ipcRenderer.sendSync('edit-request', JSON.stringify(requestData)));

   // update the item
   for (let charac in resultData.characs) {
      // no need to check hasOwnProperty on the parsed object
      if (typeof resultData.characs[charac] !== 'function') {
         this.characs[charac] = resultData.characs[charac];
      }
   }
};


// Export the item as a string
Item.prototype.toString = function() {
   var tree  = this.tree;
   // remove the ref to the tree to avoid circular object
   this.tree = null;
   // stringify
   var str   = JSON.stringify(this);
   // set back the ref to the tree
   this.tree = tree;
   // return the string
   return str;
};


// Refresh the consumption whith the given partList
Item.prototype.refreshConsumption = function(partList) {
   if (this.isLoad()) {
      // reinit each current
      this.characs.ityp = 0;
      this.characs.imax = 0;

      var that = this;

      // parcour all part to add all currents
      partList.forEachPart(function(part) {
         that.characs.ityp += part.getConsumption(that, 'typ');
         that.characs.imax += part.getConsumption(that, 'max');
      });
   }
};
