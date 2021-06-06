// -----------------------------------------------------------------------------
// Sequence Editor
//   Display a Sequence in a timing diagram and handle a form to edit the Sequence
//   The form is partially generated from a Tree (lists of sources)
//   The Timing Diagram is based on WaveDrom but rendered in a Fabric Canvas instead of SVG.
//   SVG is not directly used because WaveDrom embed inline <style> in it,
//   which does not comply with Content Security Policy.
//   Instead, Fabric can parse the SVG and recreate fabric objects.
//   This method has been chosen only because Fabric is already used in PTree.
// -----------------------------------------------------------------------------

const {fabric}   = require('fabric');
const Util       = require('../js/class.Util.js');

class SequenceEditor {
  constructor(selector, tree, sequenceList) {
    this.tree             = tree;
    this.sequenceList     = sequenceList;
    this.selectedSequence = null;
    this.diagramScale     = 2;
    this.fabricCanvas     = new fabric.Canvas(selector, {
      backgroundColor: '#FFFFFF',
      selection: false
    });

    this.listenEvents();
  }

  // refresh the sequence list form
  refreshSequenceList() {
    let seqListHTML = '';
    this.sequenceList.forEachSequence((sequence) => {
      seqListHTML += `<option value="${sequence.id}">${sequence.name}</option>`;
    });

    $('#sequence_select').html(seqListHTML).show();

    if(0 == this.sequenceList.length) {
      $('#sequence_select').hide();
    }

    if(this.selectedSequence !== null) {
      $(`#sequence_select option[value=${this.selectedSequence.id}]`).prop('selected', true);
      $('#sequence_control').show();
    }
    else {
      $('#sequence_control').hide();
    }
  }

  // refresh the step table of the selected sequence
  refreshStepTable() {
    // only process if a sequence is selected
    if(null == this.selectedSequence) {
      return;
    }

    // show the step table (hidden by default in css)
    $('#sequence_edition, #sequence_display').show();

    // for each step of the selected sequence
    let id=0;
    let stepHTML;
    this.selectedSequence.forEachStep((step) => {
      stepHTML += `<tr data-stepid="${step.id}">
      <td>${id}</td>
      <td class="stepname">${step.name}</td>
      <td><ul>`;
      step.forEachAsserted((signal) => {
        stepHTML += `<li data-signalid="${signal.id}">
          <span class="signal ${'custom'==signal.itemID ? 'signal-custom':''}">${signal.name}</span>
          <button type="button" class="signal-up"    ><span class="fa fa-arrow-up"   aria-hidden="true"></span></button>
          <button type="button" class="signal-down"  ><span class="fa fa-arrow-down" aria-hidden="true"></span></button>
          <button type="button" class="signal-remove"><span class="fa fa-times"      aria-hidden="true"></span></button>
        </li>`;
      });
      stepHTML += `</ul><button type="button" class="asserted-add"><span class="fa fa-plus" aria-hidden="true"></span></button></td><td><ul>`;
      step.forEachAwaited((signal) => {
        stepHTML += `<li - data-signalid="${signal.id}">
          <span class="signal ${'custom'==signal.itemID ? 'signal-custom':''}">${signal.name}</span>
          <button type="button" class="signal-up"    ><span class="fa fa-arrow-up"   aria-hidden="true"></span></button>
          <button type="button" class="signal-down"  ><span class="fa fa-arrow-down" aria-hidden="true"></span></button>
          <button type="button" class="signal-remove"><span class="fa fa-times"      aria-hidden="true"></span></button>
        </li>`;
      });
      stepHTML += `</ul><button type="button" class="awaited-add"><span class="fa fa-plus" aria-hidden="true"></span></button></td>
        <td>
          <button type="button" class="step-up  "  ><span class="fa fa-arrow-up"   aria-hidden="true"></span></button>
          <button type="button" class="step-down"  ><span class="fa fa-arrow-down" aria-hidden="true"></span></button>
          <button type="button" class="step-remove"><span class="fa fa-times"      aria-hidden="true"></span></button>
        </td>`;
      id++;
    });
    stepHTML += '<tr><td colspan="5"><button type="button" class="step-add"><span class="fa fa-plus" aria-hidden="true"></span> add step</button></td></tr>';
    $('#step_table>tbody').html(stepHTML);
  }


  // cancel any edition of the step name
  cancelStepNameEdition() {
    if($('.stepname-edited').length <= 0) return;
    let step = $('.stepname-edited').data('step');
    $('.stepname-edited').removeClass('stepname-edited').html(step.name);
  }


  // validate the current edition of the step name and redraw
  validateStepNameEdition() {
    if($('.stepname-edited').length <= 0) return;
    let step  = $('.stepname-edited').data('step');
    step.name = $('.stepname-edited input').val();
    this.cancelStepNameEdition();
    this.drawWavedromDiagram();
  }


  // cancel any edition of signal
  cancelSignalEdition() {
    if($('.signal-edited').length <= 0) return;
    let signal = $('.signal-edited').data('signal');
    $('.signal-edited').removeClass('signal-edited').text(signal.name);
  }


  // validate the current edition of a signal and redraw
  validateSignalEdition() {
    if($('.signal-edited').length <= 0) return;
    let signal = $('.signal-edited').data('signal');
    signal.name = $('.signal-edited input').val();
    this.cancelSignalEdition();
    this.drawWavedromDiagram();
  }


  // cancel the edition of the sequence name
  cancelSeqNameEdition() {
    if($('#sequence_edit input').length <= 0) return;
    $('#sequence_edit').html('');
    $('#sequence_select').show();
  }


  // validate the edition of the sequence name
  validateSeqNameEdition() {
    if($('#sequence_edit input').length <= 0) return;
    this.selectedSequence.name = $('#sequence_edit input').val();
    this.cancelSeqNameEdition();
    this.refreshSequenceList();
  }


  // ask user to select an available asserted or awaited signal and add it to the given step
  async addSignalToStep(step, type) {
    let signal_list = [];

    // for each item of the tree
    this.tree.forEachSource((item) => {
      // if the item has an enable or pgood signal (depending on type: asserted or awaited)
      // and if this signal is not already in the sequence
      let itemSignal = ('asserted' == type) ? item.characs.sequence.enable : item.characs.sequence.pgood;
      if(itemSignal.exist && !this.selectedSequence.hasSignal(itemSignal.sigName)) {
        // pre-format the signal data
        let signal = {
          signalName:  itemSignal.sigName,
          activeLevel: itemSignal.activeLevel,
          itemID:      item.id
        };

        // add the signal to the selection list
        signal_list.push({val:JSON.stringify(signal), text:itemSignal.sigName});
      }
    });

    // add the possibility of custom signals in the list
    signal_list.push({val:JSON.stringify({signalName:'CUSTOM', activeLevel:1, itemID:'custom'}), text:'CUSTOM (active high)'});
    signal_list.push({val:JSON.stringify({signalName:'CUSTOM', activeLevel:0, itemID:'custom'}), text:'CUSTOM (active low)'});

    // prepare the popup with a list of signal
    let popupData = {
      type       : 'list',
      title      : `Select an ${type} signal`,
      width      : 420,
      height     : 130,
      sender     : 'sequenceEditor',
      content    : `Add an ${type} signal to a step of the sequence:<br /><select id="list"><option value="none"></option></select>`,
      btn_ok     : 'Select',
      list       : signal_list
    };

    // show the popup
    let popupReturn = await Util.popup(popupData);
    // if the user has selected a signal
    if ('none' != popupReturn) {
      // add this signal to the sequence step
      let signal = JSON.parse(popupReturn);
      step.addSignal(signal.signalName, signal.activeLevel, signal.itemID, type);
    }
  }

  // draw the given wavedrom object to the fabric canvas
  drawWavedromDiagram() {
    return new Promise(resolve => {
      const wavedrom = require('wavedrom');
      let wavedromSkin = require('../img/sequence_skin/sequence_skin.js');

      let wavedromObject = this.selectedSequence.toWavedromObject({
        hscale: this.diagramScale,
        skin:   'sequence_skin'
      });

      // convert the wavedrom object to SVG string
      let drom = wavedrom.renderAny(0, wavedromObject, wavedromSkin);
      let svgstr = wavedrom.onml.stringify(drom);

      // insert the SVG string in the canvas
      // this method takes a long CPU time
      fabric.loadSVGFromString(svgstr, (objects, options) => {
        const newColor = '#333'; // Bootstrap #333, PTree #424242

        for(let object of objects) {
          if(undefined !== object.text) {
            // step title
            if(object.id.match(/^wavelane_draw/)) {
              object.set({fill: 'white'});
            }
            // signal name
            else if (object.id.match(/^wavelane_/) && '' !== object.text) {
              object.set({fill: newColor});
            }
            // other text
            else if ('' !== object.text) {
              object.set({fill: newColor});
            }
          }
          else {
            if(object.id.match(/^group/)) {
              object.set({stroke: newColor});
            }
          }
        }

        // create a fabric object
        let fabricObj = fabric.util.groupSVGElements(objects, options);
        fabricObj.selectable = false;
        fabricObj.eventable = false;

        this.fabricCanvas.clear();
        this.fabricCanvas.setDimensions({width:fabricObj.width, height:fabricObj.height});
        this.fabricCanvas.add(fabricObj);
        this.fabricCanvas.calcOffset();
        this.fabricCanvas.renderAll();

        resolve();
      });
    });
  }


  // export the selected sequence to a jpg image (async function)
  exportWavedromToJpg() {
    if(null === this.selectedSequence) return;
    // set the canvas background color
    this.fabricCanvas.setBackgroundColor('#FFFFFF', this.fabricCanvas.renderAll.bind(this.fabricCanvas));
    // set the file name
    let name = `${this.selectedSequence.name}.png`;
    // export the HTML canvas to blob
    $('#sequence')[0].toBlob((blob) => {
      // convert the blob to ObjectURL
      let dataURL = URL.createObjectURL(blob);
      // download the objectURL in a file
      Util.downloadDataURL(dataURL, name);
    }, 'image/png', 1);
  }


  // select the given sequence in the form
  selectSequence(sequence) {
    this.selectedSequence = sequence;
    if(null == sequence) return;
    $('#sequence_name').text(sequence.name);
    $(`#sequence_select option[value=${sequence.id}]`).prop('selected', true);
    $('#sequence_control').show();
    this.refreshStepTable();
    this.drawWavedromDiagram();
  }


  // create a default sequence from the tree
  createDefaultSequence(name='Default Sequence') {
    return this.sequenceList.createDefaultSequence(this.tree, name);
  }


  // listen DOM events
  listenEvents() {
    // send back data when the window is clossing
    window.onbeforeunload = () => {
      // Send an IPC async msg to main.js: return the PartList or null if not modified
      let returnData = this.sequenceList.export();
      require('electron').ipcRenderer.send('SequenceEditor-returnData', returnData);
    };

    // Add a new step to the sequence
    $('#step_table').on('click', '.step-add', () => {
      this.selectedSequence.addStep();
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // Remove a step from the sequence
    $('#step_table').on('click', '.step-remove', (event) => {
      let stepid = $(event.target).parents('tr').data('stepid');
      let step   = this.selectedSequence.getStep(stepid);
      this.selectedSequence.removeStep(step);
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // move up a step in the sequence
    $('#step_table').on('click', '.step-up', (event) => {
      let stepid = $(event.target).parents('tr').data('stepid');
      let step   = this.selectedSequence.getStep(stepid);
      this.selectedSequence.moveStepUp(step);
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // movedown a step in the sequence
    $('#step_table').on('click', '.step-down', (event) => {
      let stepid = $(event.target).parents('tr').data('stepid');
      let step   = this.selectedSequence.getStep(stepid);
      this.selectedSequence.moveStepDown(step);
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // add a new asserted signal to a step
    $('#step_table').on('click', '.asserted-add', async (event) => {
      let stepid = $(event.target).parents('tr').data('stepid');
      let step   = this.selectedSequence.getStep(stepid);

      await this.addSignalToStep(step, 'asserted');

      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // add a new awaited signal to a step
    $('#step_table').on('click', '.awaited-add', async (event) => {
      let stepid = $(event.target).parents('tr').data('stepid');
      let step   = this.selectedSequence.getStep(stepid);
      await this.addSignalToStep(step, 'awaited');

      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // remove a signal from a step
    $('#step_table').on('click', '.signal-remove', (event) => {
      let stepid   = $(event.target).parents('tr').data('stepid');
      let step     = this.selectedSequence.getStep(stepid);
      let signalid = $(event.target).parents('li').data('signalid');
      step.removeSignal(signalid);
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // edit the name of a step (only if not already edited) and cancel other edition
    $('#step_table').on('click', '.stepname:not(.stepname-edited)', (event) => {
      let stepid   = $(event.target).parents('tr').data('stepid');
      let step     = this.selectedSequence.getStep(stepid);
      $(event.target).addClass('stepname-edited').data('step',step).html(`<input type="text" value="${step.name}" />`).children('input').focus().select();
    });

    // cancel or validate the edition of the step name depending on the pressed key
    $('#step_table').on('keypress', '.stepname-edited input', (event) => {
      // ESCAPE
      if (27 == event.keyCode) {
        this.cancelStepNameEdition();
        // TODO: Escape not working ???
      }
      // ENTER
      else if (13 == event.keyCode) {
        this.validateStepNameEdition();
      }
    });

    // end the edition of the step name when exiting the input
    $('#step_table').on('focusout', '.stepname-edited input', () => {
      this.validateStepNameEdition();
    });

    // edit the name of a custom signal
    $('#step_table').on('click', '.signal:not(.signal-edited)', (event) => {
      let stepid   = $(event.target).parents('tr').data('stepid');
      let step     = this.selectedSequence.getStep(stepid);
      let signal   = step.signals[$(event.target).parent('li').data('signalid')];

      if('custom' === signal.itemID) {
        $(event.target).addClass('signal-edited').data('signal', signal).html(`<input type="text" value="${signal.name}" />`).children('input').focus().select();
      }
    });

    // cancel or validate the edition of a custom signal depending on the pressed key
    $('#step_table').on('keypress', '.signal-edited input', (event) => {
      // ESCAPE
      if (27 == event.keyCode) {
        this.cancelSignalEdition();
        // TODO: Escape not working ???
      }
      // ENTER
      else if (13 == event.keyCode) {
        this.validateSignalEdition();
      }
    });

    // end the edition of a custom signal when exiting the input
    $('#step_table').on('focusout', '.signal-edited input', () => {
      this.validateSignalEdition();
    });

    // move up a signal in the step
    $('#step_table').on('click', '.signal-up', (event) => {
      let stepid   = $(event.target).parents('tr').data('stepid');
      let step     = this.selectedSequence.getStep(stepid);
      let signalid = $(event.target).parents('li').data('signalid');
      let signal   = step.signals[signalid];

      step.moveUpSignal(signal);
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // movedown a signal in the step
    $('#step_table').on('click', '.signal-down', (event) => {
      let stepid   = $(event.target).parents('tr').data('stepid');
      let step     = this.selectedSequence.getStep(stepid);
      let signalid = $(event.target).parents('li').data('signalid');
      let signal   = step.signals[signalid];

      step.moveDownSignal(signal);
      this.refreshStepTable();
      this.drawWavedromDiagram();
    });

    // create a new empty sequence
    $('#sequence_add').click(() => {
      let sequence = this.sequenceList.createSequence(`Sequence ${this.sequenceList.length}`);
      this.refreshSequenceList();
      this.selectSequence(sequence);
    });

    // create a new sequence from the tree
    $('#sequence_add_default').click(() => {
      let sequence = this.sequenceList.createDefaultSequence(this.tree, `Sequence ${this.sequenceList.length}`);
      this.refreshSequenceList();
      this.selectSequence(sequence);
    });

    // Select a sequence when the option change
    $('#sequence_select').change(() => {
      let sequence = this.sequenceList.getSequence($('#sequence_select option:selected').val());
      this.selectSequence(sequence);
    });

    // edit the sequence name
    $('#sequence_rename').click(() => {
      $('#sequence_edit').html(`<input type="text" value="${this.selectedSequence.name}" />`).children('input').focus().select();
      $('#sequence_select').hide();
    });

    // clone the selected sequence
    $('#sequence_clone').click(() => {
      let clone = this.selectedSequence.clone();
      this.sequenceList.addSequence(clone);
      this.refreshSequenceList();
      this.selectSequence(clone);
    });

    // remove the selected sequence
    $('#sequence_remove').click(() => {
      this.sequenceList.removeSequence(this.selectedSequence);
      this.refreshSequenceList();
      if(this.sequenceList.length > 0) {
        this.selectSequence(this.sequenceList.getSequence(0));
      }
      else {
        $('#sequence_edition, #sequence_display').hide();
        $('#sequence_control').hide();
      }
    });

    // cancel or validate the edition of a custom signal depending on the pressed key
    $('#sequence_edit').on('keypress', 'input', (event) => {
      // ESCAPE
      if (27 == event.keyCode) {
        this.cancelSeqNameEdition();
        // TODO: Escape not working ???
      }
      // ENTER
      else if (13 == event.keyCode) {
        this.validateSeqNameEdition();
      }
    });

    // end the edition of a custom signal when exiting the input
    $('#sequence_edit').on('focusout', 'input', () => {
      this.validateSeqNameEdition();
    });

    // export the diagram to jpg
    $('#sequence_export_img').click(() => {
      this.exportWavedromToJpg();
    });

    // change the diagram scale
    $('#diagramScale').change((event) => {
      this.diagramScale = (parseInt($(event.target).val()));
      this.drawWavedromDiagram();
    });
  }
}

module.exports = SequenceEditor;
