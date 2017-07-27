// -----------------------------------------------------------------------------
// Part constructor
//    A part object contains the description of an electronic component,
//    its classification and its consumption on multiple loads of the tree
// -----------------------------------------------------------------------------


// Part object constructor
var Part = function(id, partlist) {
   this.id = id;
   this.characs = {
      name         : 'name',
      ref          : 'part number',
      consumptions : []
   };
   this.partList = partlist;
};


// Set a consumption, typ or max, for the specified load
Part.prototype.setConsumption = function(value, load, typmax) {
   // if the part has no consumption for this load, create a new one
   var consumption = this.characs.consumptions[load.id];
   if (undefined === consumption || null === consumption) {
      this.characs.consumptions[load.id] = {
         'typ': 0,
         'max': 0
      };
   }

   // fill the value
   this.characs.consumptions[load.id][typmax] = value;
};


// return the current in ampere on the given load
Part.prototype.getConsumption = function(load, typmax) {
   return (this.isConsuming(load)) ? this.characs.consumptions[load.id][typmax] : 0;
};


// return the total power in watt on a specified tree
Part.prototype.getPower = function(tree) {
   var that = this;
   var power = {
      'typ': 0,
      'max': 0
   };

   // Can't use tree.forEachLoad() without creating an anonymous function in this loop
   for (let item of tree.item_list) {
      if (item !== undefined && item.isLoad()) {
         // get the consumption on this item
         let ityp = that.getConsumption(item, 'typ');
         let imax = that.getConsumption(item, 'max');
         // add this consumption to the total power
         power.typ += parseFloat(ityp) * item.getInputVoltage('typ');
         power.max += parseFloat(imax) * item.getInputVoltage('max');
      }
   }

   return power;
};


// return true if the current on the given load is not zero
Part.prototype.isConsuming = function(load) {
   var consumptions = this.characs.consumptions[load.id];
   return (null !== consumptions && undefined !== consumptions && (consumptions.typ > 0 || consumptions.max > 0));
};


// Export the part as a string
Part.prototype.toString = function() {
   // save a ref to the partList
   var partList  = this.partList;
   // remove the ref to the tree to avoid circular object
   this.partList = null;
   // stringify
   var str       = JSON.stringify(this);
   // set back the ref to the tree
   this.partList = partList;
   // return the string
   return str;
};
