// -----------------------------------------------------------------------------
// PartListEditor Class
//    A PartListEditor contains a partlist associated with a tree
//    It provides methods to manipulate those parts within a <table> element
// -----------------------------------------------------------------------------

const PartList = require('../js/class.PartList.js');
const Tree     = require('../js/class.Tree.js');
const Util     = require('../js/class.Util.js');

class PartListEditor {

  constructor(partList = new PartList(), tree = new Tree()) {
    this.partList      = partList;
    this.tree          = tree;
    this.editType      = null;
    this.selectedParts = [];
    this.history  = {
      list: [],
      index: 0
    };
    this.ctxMenu       = null;

    this.listenEvents();
    this.clearHistory();
  }


  // refresh the table with new values
  refresh() {
    // empty the table content
    $('.partlist tbody').empty();

    // unselect all parts
    this.unselectPart();

    // loop on each part
    this.partList.forEachPart((part) => {
      // Init the total power
      let ptyp = 0;
      let pmax = 0;

      // Part characteristics
      let tr = `<tr data-partid="${part.id}">
                  <td class="td_charac" data-charac="id"                   data-value="${part.id}"                            >${part.id}</td>
                  <td class="td_charac td_editable" data-charac="name"     data-value="${part.getCharac_formated('name')}"    >${part.getCharac_formated('name')}</td>
                  <td class="td_charac td_editable" data-charac="ref"      data-value="${part.getCharac_formated('ref')}"     >${part.getCharac_formated('ref')}</td>
                  <td class="td_charac td_editable" data-charac="function" data-value="${part.getCharac_formated('function')}">${part.getCharac_formated('function')}</td>
                  <td class="td_charac td_editable" data-charac="tags"     data-value="${part.characs.tags}"                  >${part.getCharac_formated('tags')}</td>
      `;

      // Part consumptions on each load
      // Can't use tree.forEachLoad() without creating an anonymous function in this loop
      for(let item of this.tree.item_list) {
        if(item !== undefined && item.isLoad() && item.isInPartlist()) {
          // get the consumption on this item
          let ityp = part.getConsumption(item, 'typ');
          let imax = part.getConsumption(item, 'max');
          // add this consumption to the total power (do NOT use part.getPower() because the code is redondant with this loop)
          ptyp += parseFloat(ityp) * item.getInputVoltage('typ');
          pmax += parseFloat(imax) * item.getInputVoltage('max');
          // add two table cells to the table line
          tr += `<td class='td_current td_typ td_editable' data-typmax='typ' data-loadid='${item.id}' data-value='${ityp}'>${Util.round(ityp,3)}</td><td class='td_current td_max td_editable' data-typmax='max' data-loadid='${item.id}' data-value='${imax}'>${Util.round(imax,3)}</td>`;
        }
      }

      // Part total power consumption
      tr += `<td class='td_power td_typ' data-value='${ptyp}'>${Util.round(ptyp,3)}</td><td class='td_power td_max' data-value='${pmax}'>${Util.round(pmax,3)}</td>`;

      // Print the line
      tr += `</tr>`;
      $('.partlist tbody').append(tr);
    });

    // sort the table
    this.sortTable();
  }


  // sort the part list
  sortTable(col) {
    // init sort direction
    let dir = 'asc';
    let toggle = true;

    if(undefined === col) {
      col = 0;
      toggle = false;
    }

    // if the th clicked is already sorted
    let th_elt = $(`thead > .tr_bottom > th:nth-child(${col+1})`);
    if(toggle && th_elt.hasClass('sort')) {
      // toggle direction
      th_elt.toggleClass('sortAsc sortDesc');
      if(th_elt.hasClass('sortDesc')) dir = 'desc';
    }
    // if the th clicked is not sorted
    else {
      // remove sorting to the precedent th
      $('.sort').removeClass('sort sortAsc sortDesc');
      // sort this by asc
      $(th_elt).addClass('sort sortAsc');
    }

    // prepare a compare function
    let compareParts = (partA, partB, col, dir) => {
      let a = $(partA).children().eq(col).data('value');
      let b = $(partB).children().eq(col).data('value');
      if      ('asc'  === dir) return a < b;
      else if ('desc' === dir) return a > b;
    };

    // Insertion sort... slightly modified
    let tr_elts = $('.partlist > tbody > tr');
    for(let i=1; i<tr_elts.length; i++) {
      let tr_i = tr_elts[i];
      for(let j=i-1; j>=0; j--) {
        let tr_j = $('.partlist > tbody > tr')[j];
        if(compareParts(tr_j,tr_i,col,dir)) {
          $(tr_i).insertAfter($(tr_j));
          break;
        }
        else if(j==0) {
          $(tr_i).insertBefore($(tr_j));
        }
      }
    }
  }


  // print a UI to edit a charac
  editCharac(part, charac) {
    // if a previous element whas in edition
    if ('charac' === this.editType) {
      // get the previous edited element
      let editedPart    = this.getEditedPart();
      let editedCharac  = this.getEditedCharac();

      // if the edited element is the same, do nothing
      if(part.id === editedPart.id && charac === editedCharac) {
        return;
      }
    }

    // validate the current edition and select the new part
    this.selectPart(part);

    // mark as editing
    this.editType = 'charac';

    // print an input element
    let value    = part.getCharac_raw(charac);
    let html     = `<input class='edition' type='text' value='${value}' data-partid='${part.id}' />`;
    let selector = `tr[data-partid=${part.id}] > .td_charac[data-charac=${charac}]`;
    $(selector).html(html);
    $('.edition').focus();
    $('.edition').get(0).setSelectionRange(0, value.length);
  }


  // print a UI to edit a current
  editCurrent(part, load, typmax) {
    // if a previous element whas in edition
    if ('current' === this.editType) {
      // get the previous edited element
      let editedPart   = this.getEditedPart();
      let editedLoad   = this.getEditedLoad();
      let editedTypMax = this.getEditedTypMax();

      // if the edited element is the same, do nothing
      if(part.id === editedPart.id && load.id === editedLoad.id && typmax === editedTypMax) {
        return;
      }
    }

    this.selectPart(part);

    // mark as editing
    this.editType = 'current';

    // print an input element
    let value    = part.getConsumption(load,typmax).toString();
    let html     = `<input class='edition input_num' type='text' value='${value}' data-loadid='${load.id}' data-partid='${part.id}' data-typmax='${typmax}' />`;
    let selector = `tr[data-partid=${part.id}] > .td_${typmax}[data-loadid=${load.id}]`;
    $(selector).html(html);
    $('.edition').focus();
    $('.edition').get(0).setSelectionRange(0, value.length);
  }


  // remove the UI from editing by validating (or not) the data
  clearCharac(validate){
    // get datas from html elements
    let part    = this.getEditedPart();
    let charac  = this.getEditedCharac();

    // validate or not the data
    let oldValue = part.getCharac_raw(charac);
    let newValue = this.getEditedValue();

    if(validate && oldValue != newValue) {
      // update the charac with the new value
      part.setCharac(charac, newValue);
      this.saveHistory();
    }

    // refresh the part list
    $('.edition').parent().html(part.getCharac_formated(charac));
    $('.partlist').trigger('update');

    this.editType = null;
  }


  // remove the UI from editing by validating (or not) the data
  clearCurrent(validate){
    // get datas from html elements
    let part     = this.getEditedPart();
    let load     = this.getEditedLoad();
    let typmax   = this.getEditedTypMax();
    let newValue = this.getEditedValue();
    let oldValue = part.getConsumption(load, typmax);

    // validate or not the data
    if(validate && !isNaN(newValue) && oldValue != newValue) {
      // update the consumption with the new value
      part.setConsumption(newValue, load, typmax);
      this.saveHistory();
    }

    // refresh the part list
    let value = part.getConsumption(load, typmax);
    let part$ = $('.edition').parent();
    part$.attr('data-value', value.toString());
    part$.html(Util.round(value,3));
    if('typ' === typmax) {
      let maxvalue = part.getConsumption(load, 'max');
      part$.next().attr('data-value', maxvalue.toString());
      part$.next().html(Util.round(maxvalue,3));
    }
    let power = part.getPower(this.tree);
    let ptyp = Util.round(power.typ,3);
    let pmax = Util.round(power.max,3);
    $(`tr[data-partid=${part.id}] > td.td_power.td_typ`).html(ptyp).attr('data-value', ptyp.toString());
    $(`tr[data-partid=${part.id}] > td.td_power.td_max`).html(pmax).attr('data-value', pmax.toString());
    $('.partlist').trigger('update');

    this.editType = null;
  }


  // validate the occuring edition
  validateEdition() {
    if ('charac' === this.editType) {
      this.clearCharac(true);
    }
    else if ('current' === this.editType) {
      this.clearCurrent(true);
    }
  }


  // cancel the occuring edition
  cancelEdition() {
    if ('charac' === this.editType) {
      this.clearCharac(false);
    }
    else if ('current' === this.editType) {
      this.clearCurrent(false);
    }
    this.unselectPart();
  }


  // get the edited part
  getEditedPart() {
    let partID = $('.edition').data('partid');
    let part = this.partList.getPart(partID);
    return part;
  }


  // get the edited load
  getEditedLoad() {
    let loadID = $('.edition').data('loadid');
    let load = this.tree.getItem(loadID);
    return load;
  }


  // get the edited TypMax
  getEditedTypMax() {
    return $('.edition').data('typmax');
  }


  // get the edited value
  getEditedValue() {
    let value = $('.edition').val();

    if ('current' === this.editType) {
      value = ('' === value) ? 0 : parseFloat(value);
    }

    return value;
  }


  // get the edited characteristic
  getEditedCharac() {
    return $('.edition').parent().data('charac');
  }


  // Return true if at least one part is selected
  selectionExist() {
    return (this.selectedParts.length > 0);
  }


  // select the given part (add to the selection)
  addToSelection(part) {
    // validate any editon before selection
    this.validateEdition();

    // show the remove button differently if there was a seletion or not
    if(this.selectionExist()) {
      $('.removePart').show();
    }
    else {
      $('.removePart').fadeIn(150);
    }

    this.selectedParts.push(part);
    $(`tr[data-partid=${part.id}]`).addClass('selected');
  }


  // select the given part (unselect other part)
  selectPart(part) {
    // validate any editon before selection
    this.validateEdition();

    // if there is a selection, unselect and show the remove button
    if(this.selectionExist()) {
      this.unselectPart(false);
      $('.removePart').show();
    }
    // if there is no selection, just fade the button
    else {
      $('.removePart').fadeIn(150);
    }

    this.selectedParts = [part];
    $(`tr[data-partid=${part.id}]`).addClass('selected');
  }


  // select all parts between the given and the selected
  selectToPart(part) {
    // if there is no selection, just select the part
    if(!this.selectionExist()) {
      return this.selectPart(part);
    }
    // if there are multiple selected parts, just add to the selection
    else if (this.selectedParts > 1) {
      return this.addToSelection(part);
    }
    // if there is only one part
    else {
      // loop on the user-ordered partlist
      let state = 0;
      $('.partlist tbody tr').each((index, elt) => {
        let partId = $(elt).data('partid');

        // STATE 0
        if(0 === state) {
          // DO NOTHING

          // Go to STATE1 if the partId is one of the two selected (the first)
          if(partId === part.id || partId === this.selectedParts[0].id) {
            this.addToSelection(this.partList.getPart(partId));
            state = 1;
            return;
          }
        }
        // STATE 1
        else if (1 === state) {
          this.addToSelection(this.partList.getPart(partId));
          // Go to STATE2 if the partId is one of the two selected (the second)
          if(partId === part.id || partId === this.selectedParts[0].id) {
            state = 2;
            return;
          }
        }
        // STATE 2
        else {
          // DO NOTHING
          return;
        }
      });
    }
  }


  // deselect the actual part
  unselectPart(fade) {
    if(null !== this.editType) {
      this.cancelEdition();
    }

    if(this.selectionExist()) {
      this.selectedParts.length = 0;
      $('.selected').removeClass('selected');
      $('.removePart').fadeOut(fade?150:0);
    }
  }


  // remove one or more parts
  removeParts(parts) {
    // if only one part given, make an array
    if(! Array.isArray(parts)) {
      parts = [parts];
    }

    this.unselectPart(true);
    for(let part of parts) {
      this.partList.deletePart(part);
    }
    this.refresh();
    this.saveHistory();
  }


  // empty the history and add only one data
  clearHistory() {
    // save the actual tree into the history
    let data = this.partList.export();
    this.history.list  = [data];
    this.history.index = 0;
    this.updateUndoRedoButtons();
  }


  // save the app data into the history
  saveHistory() {
    // save the actual partList into the history
    let data = this.partList.export();
    // if the index is not the last element, remove everything over index
    this.history.list.splice(this.history.index + 1, this.history.list.length - (this.history.index + 1));
    // save the element in the history at the last position
    this.history.list.push(data);
    // set the new index at the last element
    this.history.index = this.history.list.length - 1;
    // update the UI
    this.updateUndoRedoButtons();
  }


  // load data from the history at the given index (to undo/redo)
  loadHistory(index) {
    // unselect all part
    this.unselectPart();
    // restore the the part list from the history
    this.partList.import(this.history.list[index]);
    // update the UI
    this.refresh();
    this.updateUndoRedoButtons();
  }


  // undo an action
  undo() {
    // is there a previous part list ?
    if (this.history.index > 0) {
      // load the previous tree in the history
      --this.history.index;
      this.loadHistory(this.history.index);
    }
  }


  // redo un action
  redo() {
    // is there a next tree ?
    if(this.history.index < this.history.list.length - 1) {
      // load the next tree in the history
      ++this.history.index;
      this.loadHistory(this.history.index);
    }
  }


  // enable or disable the undo/redo buttons
  updateUndoRedoButtons() {
    // if there is no data to undo, hide the undo button
    if (0 === this.history.index) {
      $('.undo').fadeOut(200);
    }
    // else, show the undo button
    else {
      $('.undo').fadeIn(200);
    }

    // if there is no data to redo, hide the redo button
    if (this.history.index >= (this.history.list.length - 1)) {
      $('.redo').fadeOut(200);
    }
    // else, show the redo button
    else {
      $('.redo').fadeIn(200);
    }
  }


  // Import a part list from an XLSX sheet passed as JSON
  async fromSpreadsheet(sheet_json) {
    // check if the values of the sheet are numbers
    let line_id = 0;
    for(let sheet_line of sheet_json) {
      let cell_id = 0;
      for(let sheet_cell of sheet_line) {
        if (undefined !== sheet_cell) {
          if(cell_id > 4 && line_id > 1 && !$.isNumeric(sheet_cell)) {
            alert(`Error on cell ${String.fromCharCode(65+cell_id)}${line_id}.\nA number is expected but the following value was found :\n${sheet_cell}`);
            return false;
          }
        }
        cell_id++;
      }
      line_id++;
    }


    // check if there is any line other than the header in the sheet
    if(sheet_json.length < 3) {
      alert('The file does not contain any value.');
      return false;
    }


    // Ask the user if the file must replace or be added
    // And delete every part if the table has to be replaced
    let popupData = {
      title      : 'Merge or replace ?',
      width      : 500,
      height     : 135,
      sender     : 'partListEditor',
      content    : `Do you want to <strong>add</strong> those data to the table or <strong>replace</strong> everything ?`,
      btn_ok     : 'Add',
      btn_cancel : 'Replace'
    };
    let popupRet = await Util.popup(popupData, false, 'partListEditor');
    if(!popupRet) {
      this.partList.deleteAllParts();
    }


    // Add the values to the PartList
    line_id = 0;
    for(let sheet_line of sheet_json) {
      // skip the header (two first lines)
      if(line_id>1) {
        // create a part for each line
        let part = this.partList.addPart();

        // set the Text characs
        part.setCharac('name',     sheet_line[1]); // cell A
        part.setCharac('ref',      sheet_line[2]); // cell B
        part.setCharac('function', sheet_line[3]); // cell C
        part.setCharac('tags',     sheet_line[4]); // cell D

        // parse each load (same order as the columns) to set the consumptions
        // the col number can be incremented with each load because each data is correctly ordered
        let col_id = 5;
        // can not use this.tree.forEachLoad() because it need an anonymous functions which is not permited in a loop
        for(let item of this.tree.item_list) {
          if(item !== undefined && item.isLoad() && item.isInPartlist()) {
            part.setConsumption(sheet_line[col_id],   item, 'typ');
            part.setConsumption(sheet_line[col_id+1], item, 'max');
            col_id += 2;
          }
        }
      }
      line_id++;
    }

    return true;
  }

  // Listen to all event on the page
  listenEvents() {
    const Mousetrap = require('mousetrap');

    // send back data when the window is clossing
    window.onbeforeunload = () => {
      // Send an IPC async msg to main.js: return the PartList or null if not modified
      let returnData = (0 === this.history.index) ? null : this.partList.export();
      require('electron').ipcRenderer.send('PartListEditor-returnData', returnData);
    };

    // add a new empty part to the PartList
    $('.addPart').click(() => {
      this.unselectPart();
      let part = this.partList.addPart();
      this.refresh();
      this.saveHistory();
      window.scrollTo(window.scrollX, window.innerHeight);
      this.selectPart(part);
    });

    // remove parts from the PartList
    $('.removePart').click(() => {
      let partsToDelete = this.selectedParts.slice();
      this.removeParts(partsToDelete);
    });

    // export the table to excel
    $('.undo').click(() => {
      this.undo();
    });

    // export the table to excel
    $('.redo').click(() => {
      this.redo();
    });

    // export the table to excel
    $('.exportTable').click(() => {
      Util.downloadTable($('.partlist'), 'ptree.xlsx');
    });

    // export an empty pre-formated excel
    $('.exportTemplate').click(() => {
      Util.downloadTable($('.partlist thead'),'template.xlsx');
    });

    // import the data from the excel
    $('.importTable').click(async () => {
      // ask the user for a sheet
      let json_sheet = await Util.getSpreadsheet();
      if (null === json_sheet) return;

      // Import the file into the partlist
      let noerror = await this.fromSpreadsheet(json_sheet);

      // finally, refresh the table with the new values
      if(noerror) {
        this.refresh();
        this.saveHistory();
      }
    });

    // unselect any part when the emptyzone is clicked
    $('.emptyzone').click(() => {
      this.validateEdition();
      this.unselectPart(true);
    });

    // click on a charac
    $('.partlist').on('click', '.td_charac', (evt) => {
      let $td    = $(evt.currentTarget);
      let charac = $td.data('charac');
      let partID = $td.parent().data('partid');
      let part   = this.partList.getPart(partID);

      // click on the ID
      if('id' === charac) {
        // If ctrl is pressed : add to selection
        if(evt.ctrlKey || evt.metaKey) {
          this.addToSelection(part);
        }
        // if shift is pressed : multiple selection
        else if(evt.shiftKey) {
          this.selectToPart(part);
        }
        // Else, monoselection
        else {
          this.selectPart(part);
        }
      }
      else {
        this.editCharac(part, charac);
      }
    });

    // edit a current
    $('.partlist').on('click', '.td_current', (evt) => {
      let partID  = $(evt.currentTarget).parent().data('partid');
      let loadID  = $(evt.currentTarget).data('loadid');
      let typmax  = $(evt.currentTarget).data('typmax');
      let part    = this.partList.getPart(partID);
      let load    = this.tree.getItem(loadID);

      this.editCurrent(part, load, typmax);
    });


    // sort the table when clicking on TH elements
    $('.partlist').on('click','.tr_bottom > th', (evt) => {
      this.sortTable($(evt.currentTarget).index());
    });

    // any click on the first column (ID)
    $('.partlist').on('mousedown', 'td', (evt) => {
      let partID       = $(evt.currentTarget).parent().data('partid');
      let part_clicked = this.partList.getPart(partID);

      // right clock
      if(3 == evt.which && null !== part_clicked) {
        // creation of the partList submenu
        let partlist_submenu = [];
        this.partList.forEachPart((part) => {
          partlist_submenu.push({
            label  : `${part.id} - ${part.getCharac_formated('name')}`,
            enabled: (part_clicked.id != part.id),
            click  : () => {
              this.partList.movePartBefore(part_clicked, part);
              this.refresh();
              this.saveHistory();
            }
          });
        });

        // creation of the contextual menu
        let ctxMenuTemplate = [
          {label: 'Move before', submenu: partlist_submenu},
          {label: 'Remove',      click: () => {this.removeParts(part_clicked);}}
        ];

        // display the menu
        const { remote } = require('electron');
        const { Menu }   = remote;
        this.ctxMenu = Menu.buildFromTemplate(ctxMenuTemplate);
        this.ctxMenu.popup();
      }
    });

    // Undo
    Mousetrap.bind(['command+z', 'ctrl+z'], () => {
      this.undo();
      return false;
    });

    // Redo
    Mousetrap.bind(['command+y', 'ctrl+y', 'command+shift+z', 'ctrl+shift+z'], () => {
      this.redo();
      return false;
    });

    // Select all
    Mousetrap.bind(['command+a', 'ctrl+a'], () => {
      this.partList.forEachPart((part) => {
        this.addToSelection(part);
      });
      return false;
    });

    // Global keydown
    $(document).keydown((evt) => {
      // ESCAPE (=> cancel)
      if (27 === evt.keyCode) {
        this.cancelEdition();
        this.unselectPart(true);
      }
    });

    // trig KEYDOWN and KEYUP on the edition of any value in the partlist
    $('.partlist').on('keydown', '.edition', (evt) => {
      // , (replace , by .) if a number is edited
      if(188 == evt.keyCode || 110 == evt.keyCode){
        if(undefined !== this.getEditedLoad()) {
          evt.preventDefault();
          $(evt.currentTarget).val($(evt.currentTarget).val() + '.');
        }
      }
      // ENTER (=> validate)
      else if (13 === evt.keyCode) {
        this.validateEdition();
        this.unselectPart(true);
      }
      // TAB (=> validate and edit next)
      else if (9 === evt.keyCode) {
        evt.preventDefault();
        let part     = this.getEditedPart();
        let load     = this.getEditedLoad();
        let typmax   = this.getEditedTypMax();
        let charac   = this.getEditedCharac();
        let editType = this.editType;

        // SHIFT+TAB = previous
        if(evt.shiftKey) {
          // if editing the ref, jump to name
          if('charac' === editType) {
            if('tags' === charac) {
              this.editCharac(part, 'function');
            }
            else if('function' === charac) {
              this.editCharac(part, 'ref');
            }
            else if('ref' === charac) {
              this.editCharac(part, 'name');
            }
          }
          // else if editing any current, find what is the previous cell
          else if ('current' === editType) {
            // if the current is a max, jump to the typ of the same load
            if('max' === typmax) {
              this.editCurrent(part, load, 'typ');
            }
            // else, if the current is a typ
            else {
              let prevload = this.tree.getLoadInPartList(load, 'prev');

              // if there is a previous load, jump to its max
              if(null !== prevload) {
                this.editCurrent(part, prevload, 'max');
              }
              // else, jump to the ref
              else {
                this.editCharac(part, 'tags');
              }
            }
          }
        }
        // TAB = next
        else {
          // if editing a charac
          if('charac' === editType) {
            // if editing the name, jump to the ref
            if('name' === charac) {
              this.editCharac(part, 'ref');
            }
            // if editing the ref, jump to the function
            else if ('ref' === charac) {
              this.editCharac(part, 'function');
            }
            // if editing the function, jump to the tags
            else if ('function' === charac) {
              this.editCharac(part, 'tags');
            }
            // if editing the tags, jump to the first load (if their is one)
            else if ('tags' === charac) {
              let firstLoad = this.tree.getLoadInPartList(this.tree.getRoot(), 'next');
              if(null !== firstLoad) this.editCurrent(part, firstLoad, 'typ');
            }
          }
          // else if editing any current
          else if ('current' === editType) {
            // if the current is a typ, jump to the max of the same load
            if('typ' === typmax) {
              this.editCurrent(part, load, 'max');
            }
            // else if the current is a max
            else {
              // jump to the typ of the next load (if their is one)
              let nextLoad = this.tree.getLoadInPartList(load, 'next');
              if(null !== nextLoad) this.editCurrent(part, nextLoad, 'typ');
            }
          }
        }
      }
    });
  }
}

module.exports = PartListEditor;
