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
    const defaultName = `REG${id}`;
    this.characs = {
      name        : defaultName,
      regtype     : '0',
      /*
        regtypes :
        0: FixDCDC
        1: FixLDO
        2: FixOther (< v1.3.0)
        3: AdjDCDC
        4: AdjLDO
        5: AdjOther (< v1.3.0)
        6: Dummy    (>= 1.3.0)
        7: Perfect  (>= 1.3.0)
        8: Resistor (>= 2.0.2)
      */
      ref         : '',
      custom1     : '',
      //custom2     : '', <v1.7.0
      vout_min    : '1.78',
      vout_typ    : '1.8',
      vout_max    : '1.82',
      vin_limit   : '0', // v1.8.0, 0=no limit
      iout_limit  : '0', // v1.8.0, 0=no limit
      ploss_limit : '0', // v2.0.2, 0=no limit
      r1          : '150000',
      r2          : '120000',
      rtol        : '1',
      vref_min    : '0.8',
      vref_typ    : '0.8',
      vref_max    : '0.8',
      efficiency  : [{i:'1', eff:'90'}, {i:'2', eff:'90'}], // must be kept ordered by ascending current
      iq_typ      : '0',
      iq_min      : '0',
      iq_max      : '0',
      dropout     : [{i:'1', drop:'0'}, {i:'2', drop:'0'}], // must be kept ordered by ascending current
      color       : '#FF1744',
      hidden      : false,
      shape       : '0', // v1.7.0
      badge_in    : '',  // v1.7.0
      badge_out   : '',  // v1.7.0
      resistor    : '0', // v2.0.2
      quantity    : '1', // v2.1.3
      sequence    : {    // v2.0.0
        enable: {
          exist:       true,
          sigName:     `EN_${defaultName}`,
          activeLevel: 1,
        },
        pgood: {
          exist:       true,
          sigName:     `PGOOD_${defaultName}`,
          activeLevel: 1,
        }
      },
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
    return ('6' == this.characs.regtype || '8' == this.characs.regtype);
  }


  // Check if the item is a Perfect reg
  isPerfect() {
    return ('7' == this.characs.regtype);
  }


  // Check if the item is Resistive Element
  isResistive() {
    return false;
  }


  // getInputVoltage() from the parent class


  // get the output voltage of an item
  getOutputVoltage(valType, ignoreDropout=false) {
    let v_out = 0.0;

    // Dummy : v_out = v_in
    if(this.isDummy()) {
      v_out = this.getInputVoltage(valType);
    }
    // Resistive Element : v_out = v_in - r * i_out
    else if(this.isResistive()) {
      v_out = this.getInputVoltage(valType) - this.getOutputCurrent(valType) * parseFloat(this.characs.resistor);
    }
    // DC/DC and LDOs : v_out is set by user
    else {
      v_out = parseFloat(this.characs['vout_' + valType]);

      // LDO: v_out < v_in - v_drop
      if(this.isLDO() && !ignoreDropout) {
        // can't use dropout, to avoid infinite loop
        let v_out_max = this.getInputVoltage(valType)/* - this.getDropout(valType)*/;
        if((v_out > 0 && v_out > v_out_max) || (v_out < 0 && v_out < v_out_max)) {
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
    // DC/DC and perfect: i_in = p_in / v_in
    else if (this.isDCDC() || this.isPerfect()) {
      i_in = (0 == this.getInputVoltage(valType)) ? 0.0 : this.getInputPower(valType) / this.getInputVoltage(valType);
    }
    // Dummy or Resistive Element : i_in = i_out
    else if (this.isDummy() || this.isResistive()) {
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

    // if the item is a LDO or a dummy item or a resistive element
    if (this.isLDO() || this.isDummy() || this.isResistive()) {
      // p_in = v_in_typ * i_in
      p_in = Math.abs(this.getInputVoltage(valType)) * Math.abs(this.getInputCurrent(valType));
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
    let p_out = 0.0;

    // p_out = v_out_typ * i_out
    p_out = Math.abs(this.getOutputVoltage(valType)) * Math.abs(this.getOutputCurrent(valType));

    return p_out;
  }


  // get the power loss in an item
  getPowerLoss(valType) {
    let p_loss = 0.0;

    // Resistive Element : p_loss = r * i_out^2
    if (this.isResistive()) {
      p_loss = parseFloat(this.characs.resistor) * Math.pow(this.getOutputCurrent(valType), 2);
    }
    // In sources, p_loss = p_in - p_out
    else if (!this.isChildOfRoot() && !this.isDummy() && !this.isPerfect()) {
      p_loss = this.getInputPower(valType) - this.getOutputPower(valType);
    }

    return p_loss;
  }


  // get the efficiency of the item, optionaly for the given output current
  getEfficiency(valType, outputCurrent) {
    let efficiency = 1;

    if(this.isLDO() || this.isResistive()) {
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
          itemCurrent = Math.abs(itemCurrent);
          
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
  getDropout(valType, outputCurrent) {
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
              let y1 = parseFloat(drop_data.drop)/100;
              let x2 = parseFloat(drop_nextData.i);
              let y2 = parseFloat(drop_nextData.drop)/100;
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



  // return the power of all load 
  getLoadPower(typmax='both') {
    // get the total usefull power
    let loadpower = {typ:0, max:0};
    let itemIDs = this.getDescendants();
    this.tree.forEachLoad((load) => {
      if(itemIDs.includes(load.id)) {
        loadpower.typ += load.getInputPower('typ');
        loadpower.max += load.getInputPower('max');
      }
    });

    // return the typ or max or both
    if('both' === typmax) return loadpower;
    else return loadpower[typmax];
  }


  // get the total efficiency = load_power / input_power
  getNodeEfficiency(typmax='both') {
    // refresh the total efficiency
    let totalpower = {typ: this.getInputPower('typ'), max:this.getInputPower('max')}; 
    let loadpower = this.getLoadPower();
    const efficiency = {
      typ: (0 == totalpower.typ) ? 100 : (loadpower.typ / totalpower.typ) * 100,
      max: (0 == totalpower.max) ? 100 : (loadpower.max / totalpower.max) * 100
    };

    // return the typ or max or both
    if('both' === typmax) return efficiency;
    else return efficiency[typmax];
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
    let new_data = {eff, i:Math.abs(i)};

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

    // Check 0% efficiency (only if Iout > 0)
    for(let valType of ['typ', 'max']) {
      let eff = this.getEfficiency(valType);
      let outputCurrent = this.getOutputCurrent(valType);

      if(0 == eff && outputCurrent > 0) {
        alerts.push(`The efficiency for I<sub>OUT ${valType.toUpperCase()}</sub>=${this.getOutputPower(valType)}A is 0%.`);
      }
    }

    // Check if Vin < vin_limit
    let vin_limit = parseFloat(this.characs.vin_limit);
    if(vin_limit !== 0) {
      for(let valType of ['typ', 'max']) {
        let vin = this.getInputVoltage(valType);
        if((vin > 0 && vin > vin_limit) || (vin < 0 && vin < vin_limit)) {
          alerts.push(`V<sub>IN ${valType.toUpperCase()}</sub> (${vin}V) exceeds the input voltage limit (${vin_limit}V).`);
        }
      }
    }

    // Check if Iout < iout_limit
    let iout_limit = parseFloat(this.characs.iout_limit);
    if(iout_limit !== 0) {
      for(let valType of ['typ', 'max']) {
        let iout = this.getOutputCurrent(valType);
        if((iout > 0 && iout > iout_limit) || (iout < 0 && iout < iout_limit)) {
          alerts.push(`I<sub>OUT ${valType.toUpperCase()}</sub> (${iout}A) exceeds the output current limit (${iout_limit}A).`);
        }
      }
    }

    // Check LDO dropout
    if(this.isLDO()) {
      for(let valType of ['typ', 'max']) {
        let v_out     = parseFloat(this.characs['vout_' + valType]);
        let dropout   = this.getDropout(valType);
        let v_out_max = (v_out >= 0) ? this.getInputVoltage(valType) - dropout : this.getInputVoltage(valType) + dropout;
        if((v_out > 0 && v_out > v_out_max) || (v_out < 0 && v_out < v_out_max)) {
          alerts.push(`V<sub>OUT ${valType.toUpperCase()}</sub> limited to ${Util.numberToSi(v_out_max, 2)}V because of ${Util.numberToSi(dropout,2)}V dropout.`);
        }
      }
    }

    // Check if Iout < iout_limit
    let ploss_limit = parseFloat(this.characs.ploss_limit);
    if(ploss_limit !== 0) {
      for(let valType of ['typ', 'max']) {
        let ploss = this.getPowerLoss(valType);
        if(ploss > 0 && ploss > ploss_limit) {
          alerts.push(`P<sub>LOSS ${valType.toUpperCase()}</sub> (${ploss}A) exceeds the power dissipation limit (${ploss_limit}W).`);
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

    // compatibility with < v1.9.0
    if(undefined == properties.characs.sequence) {
      this.characs.sequence = {
        enable: {
          exist:       true,
          sigName:     `EN_${this.characs.name.replace(/\s/g,'_').toUpperCase()}`,
          activeLevel: 1,
        },
        pgood: {
          exist:       true,
          sigName:     `PGOOD_${this.characs.name.replace(/\s/g,'_').toUpperCase()}`,
          activeLevel: 1,
        }
      };
    }

    // compatibility with < v2.1.0
    // conversions of (deleted) resistor to dummy
    if(8 == this.characs.regtype) {
      this.characs.regtype = 6;
    }


    // compatibility with <v2.2.0
    // Set all efficiency positive & re ordered
    let efficiency_reOrdered = [];
    for(let eff of this.characs.efficiency) {
      eff.i = Math.abs(eff.i);
      this.addToChart(efficiency_reOrdered, eff);
    }
    this.characs.efficiency = efficiency_reOrdered;


    return properties;
  }
}

module.exports = Source;
