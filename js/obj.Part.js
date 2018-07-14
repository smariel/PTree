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
      function     : '',
      tags         : '',
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
   let consumption = 0;
   // if the part is consuming on the given load
   if(this.isConsuming(load)) {
      // get the consumption
      consumption = this.characs.consumptions[load.id][typmax];
      // if max is wanted but = 0, return the typ
      if('max' === typmax && 0 === consumption) {
         consumption = this.characs.consumptions[load.id].typ;
      }
   }
   return consumption;
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
      if (item !== undefined && item.isLoad() && item.characs.inpartlist) {
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


// Return a string of tags
Part.prototype.getTags_formated = function() {
   let formatedTags = '';
   for(let tag of this.characs.tags.split(/[\s]/)) {
      formatedTags += `<span class="label label-default">${tag}</span> `;
   }
   return formatedTags.substr(0,formatedTags.length-1);
};


// Get any charac, eventualy formated
Part.prototype.getCharac_formated = function(charac_name) {
   if('tags' === charac_name) {
      return this.getTags_formated();
   }
   else {
      return this.getCharac_raw(charac_name);
   }
};


// Get any raw charac
Part.prototype.getCharac_raw = function(charac_name) {
   return this.characs[charac_name];
};


// Set the tags from a formated string
Part.prototype.setTags = function(formatedTags) {
   this.characs.tags = '';
   for(let tag of formatedTags.split(/\s*[#\s,;]\s*/)) {
      if(0 === tag.length) continue;
      else if('#' !== tag[0]) tag = '#'+tag;
      this.characs.tags += tag+' ';
   }
   this.characs.tags = this.characs.tags.substr(0,this.characs.tags.length-1);
};


// Set any formated value to the characs
Part.prototype.setCharac = function(charac_name, charac_value) {
   if('tags' === charac_name) {
      if('string' === typeof charac_value)
      this.setTags(charac_value);
   }
   else {
      if('string' !== typeof charac_value) charac_value = '';
      this.characs[charac_name] = charac_value;
   }
};


// return true if the current on the given load is not zero
Part.prototype.isConsuming = function(load) {
   var consumptions = this.characs.consumptions[load.id];
   return (null !== consumptions && undefined !== consumptions && (consumptions.typ != 0 || consumptions.max != 0));
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
