// -----------------------------------------------------------------------------
// PartList Class
//    A PartList object contains all the parts, orders and classifications
// -----------------------------------------------------------------------------


let PartList = function() {
   this.part_list  = [];
   this.part_index = 0;
};


// set a part at the given id
PartList.prototype.setPart = function(id, data) {
   this.part_list[id] = data;
   return this.part_list[id];
};


// return the part corresponding to the id
PartList.prototype.getPart = function(id) {
   return this.part_list[id];
};


// return the next part in the list
PartList.prototype.getNextPart = function(part) {
   for (let id = part.id + 1; id < this.part_list.length; id++) {
      let nextPart = this.getPart(id);
      if (null !== nextPart && undefined !== nextPart) {
         return nextPart;
      }
   }

   return null;
};


// return the previous part in the list
PartList.prototype.getPreviousPart = function(part) {
   for (let id = part.id - 1; id >= 0; id--) {
      let previousPart = this.getPart(id);
      if (null !== nextPart && undefined !== nextPart) {
         return previousPart;
      }
   }

   return null;
};


// add a part to the BOM
PartList.prototype.addPart = function() {
   let part = new Part(this.part_index, this);
   this.part_list[this.part_index++] = part;
   return part;
};


// remove a part from the BOM
PartList.prototype.deletePart = function(part) {
   delete this.part_list[part.id];
};


// remove all parts from the BOM
PartList.prototype.deleteAllParts = function() {
   this.part_list.length = 0;
   this.part_index = 0;
};


// Export the partlist content as a string by deletin all reference to itself
PartList.prototype.toString = function() {
   let partList = new PartList();
   partList.part_index = this.part_index;

   this.forEachPart((part) => {
      partList.part_list[part.id] = part.toString();
   });

   return JSON.stringify(partList);
};


// Import a partlist from a string and reconstruct all references
PartList.prototype.fromString = function(str) {
   // get all properties from the stringified object where parts are strings
   let partListProp = JSON.parse(str);

   // reinit the partlist data
   this.part_index = partListProp.part_index;
   this.part_list  = [];

   // for each part in the list
   for (let part_str of partListProp.part_list) {
      if (null === part_str) continue;

      // get the properties of the part
      let partProp = JSON.parse(part_str);

      // create a new empty part (without giving a ref to partList yet)
      let newPart = new Part(partProp.id, null);
      this.setPart(partProp.id, newPart);

      // for each property of the part
      for (let i in newPart) {
         if (newPart.hasOwnProperty(i)) {
            // copy the property
            newPart[i] = partProp[i];
         }
      }

      // copy a reference of this PartList in the part
      newPart.partList = this;
   }
};


// loop on each part and process a given function
PartList.prototype.forEachPart = function(theFunction) {
   // use for..of instead of for..in to respect the array order if needed
   for (let part of this.part_list) {
      if (undefined !== part) {
         theFunction(part);
      }
   }
};
