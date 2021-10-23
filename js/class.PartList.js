// -----------------------------------------------------------------------------
// PartList Class
//    A PartList object contains all the parts, orders and classifications
// -----------------------------------------------------------------------------

const Part = require('../js/class.Part.js');

class PartList {

  constructor() {
    this.part_list  = [];
    this.part_index = 0;
  }


  // set a part at the given id
  setPart(id, data) {
    this.part_list[id] = data;
    return this.part_list[id];
  }


  // return the part corresponding to the id
  getPart(id) {
    return this.part_list[id];
  }


  // return the next part in the list
  getNextPart(part) {
    for (let id = part.id + 1; id < this.part_list.length; id++) {
      let nextPart = this.getPart(id);
      if (nextPart) {
        return nextPart;
      }
    }

    return null;
  }


  // return the previous part in the list
  getPreviousPart(part) {
    for (let id = part.id - 1; id >= 0; id--) {
      let previousPart = this.getPart(id);
      if (previousPart) {
        return previousPart;
      }
    }

    return null;
  }


  // add a part to the BOM
  addPart() {
    let part = new Part(this.part_index, this);
    this.part_list[this.part_index++] = part;
    return part;
  }

  
  // move a part before an other one in the list
  movePartBefore(partToMove, partTargeted) {
    // remove the part to move frome the list
    this.part_list.splice(partToMove.id, 1);

    // guess the new ID
    let newID = (partToMove.id < partTargeted.id) ? partTargeted.id - 1 : partTargeted.id;

    // re introduce the part
    this.part_list.splice(newID, 0, partToMove);

    // re set the id of all parts
    let id = 0;
    this.forEachPart((part) => {
      part.id = id++;
    });
  }


  // remove a part from the BOM
  deletePart(part) {
    for(let i=part.id+1; i<this.part_list.length; i++) {
      this.part_list[i].id -= 1;
    }

    //delete this.part_list[part.id];
    this.part_list.splice(part.id, 1);

  }


  // remove all parts from the BOM
  deleteAllParts() {
    this.part_list.length = 0;
    this.part_index = 0;
  }

  // return partlist data (all self-references are removed)
  export() {
    let partList = new PartList();
    partList.part_index = this.part_index;

    this.forEachPart((part) => {
      partList.part_list[part.id] = part.export();
    });

    return partList;
  }

  // Load partlist data
  import(data) {
    // compatibility with < v2.1.0
    if('string' === typeof data) {
      data = JSON.parse(data);
    }

    // reinit the partlist data
    this.part_list  = [];

    // for each part in the list
    let new_id = 0;
    for (let partProp of data.part_list) {
      // compatibility with < v2.1.0 (again)
      if('string' === typeof partProp) {
        partProp = JSON.parse(partProp);
      }
      
      if (!partProp) continue;

      // create a new empty part (without giving a ref to partList yet)
      let newPart = new Part(new_id, null);
      this.setPart(new_id, newPart);
      new_id++;

      // for each property of the part
      for (let i in newPart) {
        if (Object.prototype.hasOwnProperty.call(newPart, i) && 'id' !== i) {
          // copy the property, except the id
          newPart[i] = partProp[i];
        }
      }

      // copy a reference of this PartList in the part
      newPart.partList = this;
    }

    this.part_index = new_id;
  }

  // loop on each part and process a given function
  forEachPart(theFunction) {
    // use for..of instead of for..in to respect the array order if needed
    for (let part of this.part_list) {
      if (undefined !== part) {
        theFunction(part);
      }
    }
  }
}

module.exports = PartList;
