// -----------------------------------------------------------------------------
// Source Class
//    A Source is a specific Item
//    It inherit from the Item class
//
//    Check the summary of the formulas : ../docs/equations.pdf
// -----------------------------------------------------------------------------

const Item = require('./class.Item.js');
const Util = require('./class.Util.js');

class Source extends Item {

  constructor(id, parent, tree) {
    // call the constructor of the parent class
    super(id, parent, 'source', tree);

    // set the specific characs of a source
    this.characs = {
      name        : 'Source name',
      regtype     : '0',
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
      //custom2     : '', <v1.7.0
      vout_min    : '1.78',
      vout_typ    : '1.8',
      vout_max    : '1.82',
      r1          : '150000',
      r2          : '120000',
      rtol        : '1',
      vref_min    : '0.8',
      vref_typ    : '0.8',
      vref_max    : '0.8',
      efficiency  : [{i:'0.1', eff:'80'}, {i:'0.5', eff:'88'}, {i:'1', eff:'90'}, {i:'2', eff:'88'}], // must be kept ordered by ascending current
      iq_typ      : '0',
      iq_min      : '0',
      iq_max      : '0',
      dropout     : [{i:'0', drop:'0'}, {i:'0.01', drop:'0.1'}, {i:'0.05', drop:'0.2'}, {i:'0.2', drop:'0.3'}], // must be kept ordered by ascending current
      color       : '#FF1744',
      hidden      : false,
      shape       : '0', // v1.7.0
      badge_in    : '',  // v1.7.0
      badge_out   : '',  // v1.7.0
    };
  }


  // check if the item is a source
  isSource() {
    return true;
  }


  // Check if the item is a DC/DC reg
  isDCDC() {
    return ('0' == this.characs.regtype || '3' == this.characs.regtype);
  }


  // Check if the item is a LDO reg
  isLDO() {
    return ('1' == this.characs.regtype || '4' == this.characs.regtype);
  }


  // Check if the item is an adjustable regulator (DC/DC or LDO)
  isAdjReg() {
    return ('3' == this.characs.regtype || '4' == this.characs.regtype);
  }


  // Check if the item is a fixed output regulator (DC/DC or LDO)
  isFixedReg() {
    return ('0' == this.characs.regtype || '1' == this.characs.regtype);
  }


  // Check if the item is a Dummy reg
  isDummy() {
    return ('6' == this.characs.regtype);
  }


  // Check if the item is a Perfect reg
  isPerfect() {
    return ('7' == this.characs.regtype);
  }


  // getInputVoltage() from the parent class


  // get the output voltage of an item
  getOutputVoltage(valType, ignoreDropout=false) {
    let v_out = 0.0;

    // Dummy : v_out = v_in
    if(this.isDummy()) {
      v_out = this.getInputVoltage(valType);
    }
    // DC/DC and LDOs : v_out is set by user
    else {
      v_out = parseFloat(this.characs['vout_' + valType]);

      // LDO: v_out < v_in - v_drop
      if(this.isLDO() && !ignoreDropout) {
        let v_out_max = this.getInputVoltage(valType) - this.getDroupout(valType);
        if(v_out > v_out_max) {
          v_out = v_out_max;
        }
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
    // Dummy: i_in = i_out
    else if (this.isDummy()) {
      i_in = this.getOutputCurrent(valType);
    }

    return i_in;
  }


  // get the output current of an item
  getOutputCurrent(valType) {
    let i_out = 0.0;

    // i_out = sum of children i_in
    for (let childID of this.childrenID) {
      i_out += this.tree.getItem(childID).getInputCurrent(valType);
    }

    return i_out;
  }


  // get the input power of an item
  getInputPower(valType) {
    let p_in = 0.0;

    // if the item is a LDO or a dummy item
    if (this.isLDO() || this.isDummy()) {
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
      // p_in = p_out / efficiency
      let efficiency = this.getEfficiency(valType);
      p_in = (0 == efficiency) ? Infinity : this.getOutputPower(valType) / efficiency;
    }

    return p_in;
  }


  // get the output power of an item
  getOutputPower(valType) {
    // p_out = v_out_typ * i_out
    return this.getOutputVoltage('typ') * this.getOutputCurrent(valType);
  }


  // get the power loss in an item
  getPowerLoss(valType) {
    // In sources, p_loss = p_in - p_out
    if (!this.isChildOfRoot()) {
      return this.getInputPower(valType) - this.getOutputPower(valType);
    }
    else {
      return 0;
    }
  }


  // get the efficiency of the item, optionaly for the given output current
  getEfficiency(valType, outputCurrent) {
    let efficiency = 1;

    if(this.isLDO()) {
      // efficiency = p_out / p_in
      let inputPower = this.getInputPower(valType);
      efficiency = (0 == inputPower) ? 0 : this.getOutputPower(valType) / inputPower;
    }
    else if(this.isDCDC()) {
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
          let itemCurrent = (undefined === outputCurrent) ? this.getOutputCurrent(valType) : outputCurrent;
          // if the current is <= of the min efficiency
          if(itemCurrent <= this.characs.efficiency[0].i) {
            // use linear interpolation to compute the efficiency (y = ax+b)
            // based on the two first efficiencies of the array
            let x1 = parseFloat(this.characs.efficiency[0].i);
            let y1 = parseFloat(this.characs.efficiency[0].eff)/100;
            let x2 = parseFloat(this.characs.efficiency[1].i);
            let y2 = parseFloat(this.characs.efficiency[1].eff)/100;
            efficiency = Util.linearInterpol(x1, y1, x2, y2, itemCurrent);
          }
          // if the current is >= of the max efficiency
          else if(itemCurrent >= this.characs.efficiency[this.characs.efficiency.length - 1].i) {
            // use linear interpolation to compute the efficiency (y = ax+b)
            // based on the two last efficiencies of the array
            let x1 = parseFloat(this.characs.efficiency[this.characs.efficiency.length - 2].i);
            let y1 = parseFloat(this.characs.efficiency[this.characs.efficiency.length - 2].eff)/100;
            let x2 = parseFloat(this.characs.efficiency[this.characs.efficiency.length - 1].i);
            let y2 = parseFloat(this.characs.efficiency[this.characs.efficiency.length - 1].eff)/100;
            efficiency = Util.linearInterpol(x1, y1, x2, y2, itemCurrent);
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
              // else, use linear interpolation to compute the efficiency (y = ax+b)
              else if(itemCurrent > eff_data.i && itemCurrent < eff_nextData.i) {
                let x1 = parseFloat(eff_data.i);
                let y1 = parseFloat(eff_data.eff)/100;
                let x2 = parseFloat(eff_nextData.i);
                let y2 = parseFloat(eff_nextData.eff)/100;
                efficiency = Util.linearInterpol(x1, y1, x2, y2, itemCurrent);
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
    }

    // prevent incoherant values outside 0 to 1
    if (efficiency < 0) {
      efficiency = 0;
    }
    else if (efficiency > 1) {
      efficiency = 1;
    }

    return efficiency;
  }


  // get the dropout voltage of a LDO, optionaly for the given output current
  getDroupout(valType, outputCurrent) {
    let dropout = 0;

    // if not LDO: error
    if(!this.isLDO()) {
      console.error('This type of regulator does not have dropout');
    }
    // if no dropout, may be an old project
    else if(undefined == this.characs.dropout) {
      dropout = 0;
    }
    // if no dropout is set, consider 0
    else if(this.characs.dropout.length == 0) {
      dropout = 0;
    }
    else {
      // if only one dropout is set, ignore the current
      if (this.characs.dropout.length == 1) {
        dropout = parseFloat(this.characs.dropout[0].drop);
      }
      // if there is multiple dropout, use linear interpolation
      else {
        let itemCurrent = (undefined === outputCurrent) ? this.getOutputCurrent(valType) : outputCurrent;
        // if the current is <= of the min dropout
        if(itemCurrent <= this.characs.dropout[0].i) {
          // use linear interpolation to compute the dropout (y = ax+b)
          // based on the two first dropouts of the array
          let x1 = parseFloat(this.characs.dropout[0].i);
          let y1 = parseFloat(this.characs.dropout[0].drop);
          let x2 = parseFloat(this.characs.dropout[1].i);
          let y2 = parseFloat(this.characs.dropout[1].drop);
          dropout = Util.linearInterpol(x1, y1, x2, y2, itemCurrent);
        }
        // if the current is >= of the max dropout
        else if(itemCurrent >= this.characs.dropout[this.characs.dropout.length - 1].i) {
          // use linear interpolation to compute the dropout (y = ax+b)
          // based on the two last dropouts of the array
          let x1 = parseFloat(this.characs.dropout[this.characs.dropout.length - 2].i);
          let y1 = parseFloat(this.characs.dropout[this.characs.dropout.length - 2].drop);
          let x2 = parseFloat(this.characs.dropout[this.characs.dropout.length - 1].i);
          let y2 = parseFloat(this.characs.dropout[this.characs.dropout.length - 1].drop);
          dropout = Util.linearInterpol(x1, y1, x2, y2, itemCurrent);
        }
        // else, find two points and compute with linear interpolation (f(x)=ax+b)
        else {
          for(let n=0; n < this.characs.dropout.length - 1; n++) {
            let drop_data      = this.characs.dropout[n];
            let drop_nextData  = this.characs.dropout[n+1];

            // if the current is equal to one of the point
            if(itemCurrent == drop_data.i) {
              dropout = parseFloat(drop_data.drop) / 100;
              break;
            }
            // else, use linear interpolation to compute the dropout (y = ax+b)
            else if(itemCurrent > drop_data.i && itemCurrent < drop_nextData.i) {
              let x1 = parseFloat(drop_data.i);
              let y1 = parseFloat(drop_data.dropout)/100;
              let x2 = parseFloat(drop_nextData.i);
              let y2 = parseFloat(drop_nextData.dropout)/100;
              dropout = Util.linearInterpol(x1, y1, x2, y2, itemCurrent);
              break;
            }
          }
        }
      }

      // prevent incoherant values below 0
      if (dropout < 0) {
        dropout = 0;
      }
    }

    return dropout;
  }


  // add a new data to chart_type (efficiency or dropout)
  addToChart(chart_datas, new_data) {
    // add the data to the array, keeping ordered by ascending currend
    let new_index = null;
    if(chart_datas.length === 0)
    {
      // no efficiency, first point in the empty chart
      new_index = 0;
      chart_datas.push(new_data);
    }
    else if(new_data.i <= chart_datas[0].i) {
      // lowest Amp, first point in the chart
      new_index = 0;
      chart_datas.splice(new_index,0,new_data);
    }
    else if (new_data.i >= chart_datas[chart_datas.length-1].i) {
      // Highest Amp, last point in the chart
      new_index = chart_datas.length - 1;
      chart_datas.push(new_data);
    }
    else {
      // Somwhere in the midle of the chart
      for(let n=1; n<chart_datas.length; n++) {
        if(new_data.i >= chart_datas[n-1].i && new_data.i < chart_datas[n].i) {
          new_index = n;
          chart_datas.splice(new_index,0,new_data);
          break;
        }
      }
    }

    // convert datas to string
    if(null !== new_index) {
      for(let prop in chart_datas[new_index]) {
        chart_datas[new_index][prop] = chart_datas[new_index][prop].toString();
      }
    }
  }


  // add a new efficiency
  addEfficiency(eff, i) {
    let new_data = {eff, i};

    // if the new datas are numbers
    if(!isNaN(new_data.eff) && !isNaN(new_data.i)) {
      // keep the efficiency value between 0 and 100%
      if(new_data.eff > 100) {
        new_data.eff = 100;
      }
      else if(new_data.eff < 0) {
        new_data.eff = 0;
      }

      this.addToChart(this.characs.efficiency, new_data);
    }
  }


  // add a new dropout
  addDropout(drop, i) {
    let new_data = {drop, i};

    // if the new datas are numbers
    if(!isNaN(new_data.drop) && !isNaN(new_data.i)) {
      // keep the dropout value above 0
      if(new_data.eff < 0) {
        new_data.eff = 0;
      }

      this.addToChart(this.characs.dropout, new_data);
    }
  }


  // get the reg or load type
  getType() {
    if     (this.isDCDC())     return 'DC/DC';
    else if(this.isLDO())      return 'LDO';
    else if(this.isPerfect())  return 'Perfect';
    else if(this.isDummy())    return 'Dummy';
    else                       return 'Other';
  }


  // get all the alerts
  getAlerts() {
    let alerts = [];

    // Check negative output power (sinking instead of sourcing)
    for(let valType of ['typ', 'max']) {
      let pout = this.getOutputPower(valType);
      if(pout < 0) {
        alerts.push(`P<sub>OUT ${valType.toUpperCase()}</sub> is negative (${pout}W): the regulator is sinking instead of sourcing.`);
      }
    }

    // Check 0% efficiency
    for(let valType of ['typ', 'max']) {
      let eff = this.getEfficiency(valType);
      if(0 == eff) {
        alerts.push(`The efficiency for I<sub>OUT ${valType.toUpperCase()}</sub>=${this.getOutputPower(valType)}A is 0%.`);
      }
    }
    // Check LDO dropout
    if(this.isLDO()) {
      for(let valType of ['typ', 'max']) {
        let v_out = parseFloat(this.characs['vout_' + valType]);
        let v_out_max = this.getInputVoltage(valType) - this.getDroupout(valType);
        if(v_out > v_out_max) {
          alerts.push(`V<sub>OUT ${valType.toUpperCase()}</sub> limited because of Dropout.`);
        }
      }
    }

    return alerts;
  }


  // Import an item previously exported with .toString()
  import(properties) {
    // natively importy the item with the parent method
    properties = super.import(properties);

    // compatibility with < v1.1.0
    // conversions of efficiency single number to array
    if(this.isDCDC() && !isNaN(this.characs.efficiency)) {
      this.characs.efficiency = [{i:1, eff:this.characs.efficiency}];
    }

    // compatibility with < v1.3.0
    // conversions of old reg types to Perfect Source
    if(2 == this.characs.regtype || 5 == this.characs.regtype) {
      this.characs.regtype = 7;
    }

    // compatibility with < v1.8.0
    // init LDO dropout to 0 to avoid unwanted modifications, regardless of the application default dropout
    if(this.isLDO() && undefined == properties.characs.dropout) {
      this.characs.dropout = [{i:'0', drop:'0'}, {i:'1', drop:'0'}];
    }

    return properties;
  }
}

module.exports = Source;
