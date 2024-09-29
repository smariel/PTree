// -----------------------------------------------------------------------------
// SequenceList Class
// -----------------------------------------------------------------------------

class SequenceList {
  constructor() {
    this.sequences = [];

    Object.defineProperties(this, {
      length: {
        get: function() {
          return this.sequences.length;
        },
      }
    });
  }

  // add an existing sequence to the list
  addSequence(sequence) {
    sequence.id = this.length;
    this.sequences.push(sequence);
  }

  // add an empty sequence to the list
  createSequence(name='sequence') {
    let sequence = new Sequence(0, name);
    this.addSequence(sequence);
    return sequence;
  }

  // add a default sequence to the list
  createDefaultSequence(tree, name='sequence') {
    let sequence = Sequence.fromTree(tree, name);
    this.addSequence(sequence);
    return sequence;
  }

  // remove the given sequence (or sequence ID)
  removeSequence(sequenceToRemove) {
    // if sequence is a number (an ID), get the sequence
    if('number' == typeof sequenceToRemove && undefined !== this.sequences[sequenceToRemove]) sequenceToRemove = this.getSequence[sequenceToRemove];
    // remove the sequence
    this.sequences.splice(sequenceToRemove.id,1);
    // decrement the upper IDs
    this.forEachSequence((sequence) => {
      if(sequence.id > sequenceToRemove.id) sequence.id --;
    });
  }

  // return the sequence with the given ID
  getSequence(id) {
    return this.sequences[id];
  }

  // execute the given function for each sequence of the list
  forEachSequence(func) {
    for(let sequence of this.sequences) {
      func(sequence);
    }
  }

  // return true if the list has zero sequence
  isEmpty() {
    return (0 === this.length);
  }

  // return this object as a string
  toString() {
    let json = {
      sequences: [],
    };
    this.forEachSequence((sequence) => {
      json.sequences.push(sequence.toString());
    });
    return JSON.stringify(json);
  }

  // return a SequenceList object from a string created with .toString()
  static fromString(str) {
    let json = JSON.parse(str);
    let list = new SequenceList();
    for(let sequenceStr of json.sequences) {
      let sequence = Sequence.fromString(sequenceStr);
      sequence.id = list.sequences.length;
      list.sequences.push(sequence);
    }
    return list;
  }
}





// -----------------------------------------------------------------------------
// Sequence Class
// -----------------------------------------------------------------------------

class Sequence {
  constructor(id, name='sequence') {
    this.id    = id;
    this.name  = name;
    this.steps = [];
    this.onoff = 1; // 1 = ON, 0 = 0FF
    this.dataName = [];
    Object.defineProperties(this, {
      length: {
        get: function() {
          return this.steps.length;
        },
      }
    });
  }

  // add an empty step to the sequence
  addStep(name = `STEP ${this.length}`) {
    let newStep = new SequenceStep(this.length, name, this.dataName.length);
    this.steps.push(newStep);
    return newStep;
  }

  // remove the given step (or step ID)
  removeStep(stepToRemove) {
    // if step is a number (an ID), get the step
    if('number' == typeof stepToRemove && undefined !== this.steps[stepToRemove]) stepToRemove = this.getStep[stepToRemove];
    // remove the step
    this.steps.splice(stepToRemove.id,1);
    // decrement the upper IDs
    this.forEachStep((step) => {
      if(step.id > stepToRemove.id) step.id --;
    });
  }

  // return the step with the given ID
  getStep(stepID) {
    return this.steps[stepID];
  }

  // permut the given step with the previous step in the list
  moveStepUp(step) {
    let stepID     = step.id;
    let prevStepID = stepID - 1;
    if(prevStepID < 0) return;
    let prevStep = this.getStep(prevStepID);

    this.steps[prevStepID] = step;
    this.steps[stepID] = prevStep;

    step.id--;
    prevStep.id++;
  }

  // permut the given step with the next step in the list
  moveStepDown(step) {
    let stepID     = step.id;
    let nextStepID = stepID + 1;
    if(nextStepID >= this.length) return;
    let nextStep = this.getStep(nextStepID);

    this.steps[nextStepID] = step;
    this.steps[stepID] = nextStep;

    step.id++;
    nextStep.id--;
  }

  // check if the sequence has the given signal in one of its step
  hasSignal(name) {
    // for each step of the selected sequence
    let hasSignal = false;
    this.forEachStep((step) => {
      // check if the step has the signal
      if(step.hasSignal(name)) {
        hasSignal = true;
      }
    });

    return hasSignal;
  }

  // add a new step data with a given name
  addStepData(name='', value='') {
    // first, add the name
    this.dataName.push(name);

    // then, add the value to each step
    this.forEachStep((step) => {
      step.data.push(value);
    });   
  }

  // remove a step data from all step
  removeStepData(stepdataid) {
    // first, remove the data name
    this.dataName.splice(stepdataid,1);
    
    // then, remove the data from each step
    this.forEachStep((step) => {
      step.data.splice(stepdataid,1);
    });    
  }

  // generate a JSON object using WaveDrom synthax
  toWavedromObject(config = {}) {
    // init the wavedrom object
    let wavedromObj = {signal:[], config};

    // get the wavedrom representation of each step of the sequenceEditor
    // and add it to the wavedrom object (+empty line)
    this.forEachStep((step) => {
      let signals = step.toWavedromSignal(this.length+1, this.onoff);
      wavedromObj.signal = wavedromObj.signal.concat(signals);
      wavedromObj.signal.push({});
    });

    return wavedromObj;
  }

  // execute the given function foreach step of the sequence
  forEachStep(func) {
    for(let step of this.steps) {
      func(step);
    }
  }

  // return true if the sequence has no step
  isEmpty() {
    return (0 === this.length);
  }

  // clone this sequence and return it
  clone() {
    let clone = Sequence.fromString(this.toString());
    clone.name = this.name + ' copy';
    return clone;
  }

  // return this object as a string
  toString() {
    let json = {
      name:  this.name,
      onoff: this.onoff,
      steps: [],
      dataName: this.dataName
    };
    this.forEachStep((step) => {
      json.steps.push(step.toString());
    });
    return JSON.stringify(json);
  }

  // return a Sequence object from a string created with .toString()
  static fromString(seqstr) {
    let json = JSON.parse(seqstr);
    let sequence = new Sequence();
    sequence.name = json.name;
    if(undefined !== json.onoff && null !== json.onoff) {
      sequence.onoff = parseInt(json.onoff);
    }
    for(let step of json.steps) {
      sequence.steps.push(SequenceStep.fromString(step));
    }

    // import data (>= v2.3)
    if (undefined !== json.dataName) {
      sequence.dataName = json.dataName;
    }
    
    // import tmin/tmax (< v2.3)
    if(sequence.steps.length > 0 && sequence.steps[0].data.length == 2 && sequence.dataName.length == 0) {
      sequence.dataName = ['tmin', 'tmax'];
    }

    return sequence;
  }


  // create a default sequence from a tree
  static fromTree(tree, name='default') {
    let sequence = new Sequence(0, name);

    // create a recursive function called for each step
    let createStep = (itemIDs) => {
      let step = sequence.addStep();
      let nextIDs = [];
      for(let itemID of itemIDs) {
        let item = tree.getItem(itemID);
        if(!item.isSource()) {
          continue;
        }

        if(item.characs.sequence.enable.exist) {
          step.addSignal(item.characs.sequence.enable.sigName, item.characs.sequence.enable.activeLevel, item.id, 'asserted');
        }
        if(item.characs.sequence.pgood.exist) {
          step.addSignal(item.characs.sequence.pgood.sigName,  item.characs.sequence.pgood.activeLevel,  item.id, 'awaited');
        }

        nextIDs = [...nextIDs, ...item.childrenID];
      }

      if(0 === step.length) {
        sequence.removeStep(step);
      }

      if(nextIDs.length > 0) createStep(nextIDs);
    };

    createStep(tree.getRoot().childrenID);

    return sequence;
  }
}





// -----------------------------------------------------------------------------
// SequenceStep Class
// -----------------------------------------------------------------------------

class SequenceStep {
  constructor(id, name=`STEP ${id}`, datalength=0) {
    this.id      = id;
    this.name    = name;
    this.signals = [];
    this.data = [];

    Object.defineProperties(this, {
      length: {
        get: function() {
          return this.signals.length;
        },
      }
    });

    for(let i=0; i<datalength; i++) {
      this.data.push('data value');
    }
  }

  // add a signal to the step
  addSignal(signalName='SIGNAME', activeLevel=1, itemID=null, type='asserted') {
    let signal = {
      id:     this.signals.length,
      name:   signalName,
      active: activeLevel,
      itemID: itemID,
      type:   type
    };
    this.signals.push(signal);
    return signal;
  }

  // remove the given signal or signalID
  removeSignal(signalToRemove) {
    // if signal is a number (an ID), get the signal
    if('number' == typeof signalToRemove && undefined !== this.signals[signalToRemove]) signalToRemove = this.signals[signalToRemove];
    // remove the signal
    this.signals.splice(signalToRemove.id,1);
    // decrement the upper IDs
    this.forEachSignal((signal) => {
      if(signal.id > signalToRemove.id) signal.id --;
    });
  }

  // check if the given signal name is in the step
  hasSignal(name) {
    // for each  signal of the step
    let hasSignal = false;
    this.forEachSignal((signal) => {
      // check if the signal name is the same has the given one
      if(signal.name == name) {
        hasSignal = true;
      }
    });

    return hasSignal;
  }


  // refresh the signal name / active Level / existence from the given item
  refreshSignals(item) {
    // prepare a function to be executed two times for enable and pgood
    // because removing the signal inside forEachSignal may cause strange behevior
    let refreshSignal = (signal, sigType) => {
      signal.name   = item.characs.sequence[sigType].sigName;
      signal.active = item.characs.sequence[sigType].activeLevel;
      if(!item.characs.sequence[sigType].exist) {
        this.removeSignal(signal);
      }
    };

    // update the enable
    this.forEachSignal((signal) => {
      if(item.id === signal.itemID && signal.type == 'asserted') {
        refreshSignal(signal, 'enable');
        return;
      }
    });

    // update the pgood
    this.forEachSignal((signal) => {
      if(item.id === signal.itemID && signal.type == 'awaited') {
        refreshSignal(signal, 'pgood');
        return;
      }
    });
  }

  // execute the given function foreach  signal
  forEachSignal(func) {
    for(let signal of this.signals) {
      func(signal);
    }
  }

  // execute the given function foreach asserted signal
  forEachAsserted(func) {
    this.forEachSignal((signal) => {
      if('asserted' === signal.type) {
        func(signal);
      }
    });
  }

  // execute the given function foreach awaited signal
  forEachAwaited(func) {
    this.forEachSignal((signal) => {
      if('awaited' === signal.type) {
        func(signal);
      }
    });
  }

  // move up the given signal in the step
  moveUpSignal(signal) {
    // search the previous signal of the same type
    // for each signal, starting from the previous one, decrement
    let prevSignal = null;
    for(let i=signal.id-1; i>=0; i--) {
      if(this.signals[i].type == signal.type) {
        prevSignal = this.signals[i];
        break;
      }
    }

    // if a previous signal was found, permut
    if(null !== prevSignal) {
      // permut the signals in the list
      this.signals[signal.id]     = prevSignal;
      this.signals[prevSignal.id] = signal;

      // permut the IDs
      let prevID = prevSignal.id;
      prevSignal.id = signal.id;
      signal.id = prevID;
    }
  }

  // move dowb the given signal in the step
  moveDownSignal(signal) {
    // search the next signal of the same type
    // for each signal, starting from the next one, increment
    let nextSignal = null;
    for(let i=signal.id+1; i<this.length; i++) {
      if(this.signals[i].type == signal.type) {
        nextSignal = this.signals[i];
        break;
      }
    }

    // if a previous signal was found, permut
    if(null !== nextSignal) {
      // permut the signals in the list
      this.signals[signal.id]     = nextSignal;
      this.signals[nextSignal.id] = signal;

      // permut the IDs
      let nextID = nextSignal.id;
      nextSignal.id = signal.id;
      signal.id = nextID;
    }
  }

  // return an array of "signal" object using WaveDrom synthax
  toWavedromSignal(length, onoff) {
    const stepColor    = '4';
    const nonStepColor = '9';

    // init with a fake signal as the title of the sequence
    let signals = [{
      wave: nonStepColor + '.'.repeat(this.id) + stepColor + nonStepColor + '.'.repeat((length-1)-(this.id+1)),
      data: ['', this.name]
    }];

    // process all asserted signal (outputs) and awaited signals (inputs)
    let groupOUT = ['OUT'];
    let groupIN  = ['IN'];
    this.forEachSignal((signal) => {
      if('asserted' === signal.type) {
        groupOUT.push({
          name: signal.name,
          wave: (signal.active^onoff).toString() + '.'.repeat(this.id) + (signal.active^onoff^1).toString() + '.'.repeat(length  - (this.id+1))
        });
      }
      else if('awaited' === signal.type) {
        groupIN.push({
          name: signal.name,
          wave: (signal.active^onoff).toString() + '.'.repeat(this.id) + 'x' + (signal.active^onoff^1).toString() + '.'.repeat((length - 1) - (this.id+1))
        });
      }
    });
    if(groupOUT.length > 1) signals.push(groupOUT);
    if(groupIN.length  > 1) signals.push(groupIN);

    return signals;
  }

  // return this object as a string
  toString() {
    let json = {
      id:      this.id,
      name:    this.name,
      signals: this.signals,
      data:    this.data
    };
    return JSON.stringify(json);
  }

  // return a SequenceStep object from a string created with .toString()
  static fromString(stepstr) {
    let json = JSON.parse(stepstr);        
    let step = new SequenceStep(json.id, json.name);
    step.signals = json.signals;

    // import data (>= v2.3) 
    if (undefined !== json.data) {
      step.data = json.data;
    }

    // import tmin/tmax (< v2.3)   
    if(undefined !== json.tmin) {
      step.data.push(json.tmin);
    }
    if(undefined !== json.tmax) {
      step.data.push(json.tmax);
    }    

    return step;
  }
}

module.exports = {SequenceList, Sequence, SequenceStep};
