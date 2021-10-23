// -----------------------------------------------------------------------------
// Part Class
//    A part object contains the description of an electronic component,
//    its classification and its consumption on multiple loads of the tree
// -----------------------------------------------------------------------------

class Part {

  constructor(id, partlist) {
    this.id = id;
    this.characs = {
      name         : 'name',
      ref          : 'part number',
      function     : '',
      tags         : '',
      consumptions : []
    };
    this.partList = partlist;
  }


  // Set a consumption, typ or max, for the specified load
  setConsumption(value, load, typmax) {
    // if the part has no consumption for this load, create a new one
    let consumption = this.characs.consumptions[load.id];
    if (undefined === consumption || null === consumption) {
      this.characs.consumptions[load.id] = {
        'typ': 0,
        'max': 0
      };
    }

    // fill the value
    this.characs.consumptions[load.id][typmax] = value;
  }


  // return the current in ampere on the given load
  getConsumption(load, typmax) {
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
  }


  // return the total power in watt on a specified tree
  getPower(tree) {
    let power = {
      'typ': 0,
      'max': 0
    };

    // Can't use tree.forEachLoad() without creating an anonymous function in this loop
    for (let item of tree.item_list) {
      if (item !== undefined && item.isLoad() && item.isInPartlist()) {
        // get the consumption on this item
        let ityp = this.getConsumption(item, 'typ');
        let imax = this.getConsumption(item, 'max');
        // add this consumption to the total power
        power.typ += parseFloat(ityp) * item.getInputVoltage('typ');
        power.max += parseFloat(imax) * item.getInputVoltage('max');
      }
    }

    return power;
  }


  // Return a string of tags
  getTags_formated() {
    let formatedTags = '';
    for(let tag of this.characs.tags.split(/[\s]/)) {
      formatedTags += `<span class="label label-default">${tag}</span> `;
    }
    return formatedTags.substr(0,formatedTags.length-1);
  }


  // Get any charac, eventualy formated
  getCharac_formated(charac_name) {
    if('tags' === charac_name) {
      return this.getTags_formated();
    }
    else {
      return this.getCharac_raw(charac_name);
    }
  }


  // Get any raw charac
  getCharac_raw(charac_name) {
    return this.characs[charac_name];
  }


  // Set the tags from a formated string
  setTags(formatedTags) {
    this.characs.tags = '';
    for(let tag of formatedTags.split(/\s*[#\s,;]\s*/)) {
      if(0 === tag.length) continue;
      else if('#' !== tag[0]) tag = '#'+tag;
      this.characs.tags += tag+' ';
    }
    this.characs.tags = this.characs.tags.substr(0,this.characs.tags.length-1);
  }


  // Set any formated value to the characs
  setCharac(charac_name, charac_value) {
    if('tags' === charac_name) {
      if('string' === typeof charac_value) this.setTags(charac_value);
    }
    else {
      if('string' !== typeof charac_value) charac_value = '';
      this.characs[charac_name] = charac_value;
    }
  }


  // return true if the current on the given load is not zero
  isConsuming(load) {
    let consumptions = this.characs.consumptions[load.id];
    return (consumptions && (consumptions.typ != 0 || consumptions.max != 0));
  }

  // export part data
  export() {
    let part = new Part(0, null);
    Object.assign(part, this);
    part.partList = null;
    return part;
  }
}

module.exports = Part;
