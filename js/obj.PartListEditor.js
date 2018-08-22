// -----------------------------------------------------------------------------
// PartListEditor constructor
//    A PartListEditor contains a partlist associated with a tree
//    It provides methods to manipulate those parts within a <table> element
// -----------------------------------------------------------------------------

var PartListEditor = function() {
   this.partList      = new PartList();
   this.tree          = new Tree();
   this.editType      = null;
   this.selectedParts = [];
   this.history  = {
      list: [],
      index: 0
   };

   this.listenEvents();
};


// refresh the table with new values
PartListEditor.prototype.refresh = function() {
   // empty the table content
   $('.partTable tbody').empty();

   // unselect all parts
   this.unselectPart();

   // loop on each part
   var that = this;
   var niceid = 0;
   this.partList.forEachPart(function(part){
      // Init the total power
      let ptyp = 0;
      let pmax = 0;

      // Part characteristics
      let tr = `<tr data-partid="${part.id}">
         <td class="td_charac"             data-charac="id"       data-value="${part.id}"                            >${niceid++}</td>
         <td class="td_charac td_editable" data-charac="name"     data-value="${part.getCharac_formated('name')}"    >${part.getCharac_formated('name')}</td>
         <td class="td_charac td_editable" data-charac="ref"      data-value="${part.getCharac_formated('ref')}"     >${part.getCharac_formated('ref')}</td>
         <td class="td_charac td_editable" data-charac="function" data-value="${part.getCharac_formated('function')}">${part.getCharac_formated('function')}</td>
         <td class="td_charac td_editable" data-charac="tags"     data-value="${part.characs.tags}"                  >${part.getCharac_formated('tags')}</td>
      `;

      // Part consumptions on each load
      // Can't use tree.forEachLoad() without creating an anonymous function in this loop
      for(let item of that.tree.item_list) {
         if(item !== undefined && item.isLoad() && item.isInPartlist()) {
            // get the consumption on this item
            let ityp = part.getConsumption(item, 'typ');
            let imax = part.getConsumption(item, 'max');
            // add this consumption to the total power (do NOT use part.getPower() because the code is redondant with this loop)
            ptyp += parseFloat(ityp) * item.getInputVoltage('typ');
            pmax += parseFloat(imax) * item.getInputVoltage('max');
            // add two table cells to the table line
            tr += `<td class='td_current td_typ td_editable' data-typmax='typ' data-loadid='${item.id}' data-value='${ityp}'>${round(ityp,3)}</td><td class='td_current td_max td_editable' data-typmax='max' data-loadid='${item.id}' data-value='${imax}'>${round(imax,3)}</td>`;
         }
      }

      // Part total power consumption
      tr += `<td class='td_power td_typ' data-value='${ptyp}'>${round(ptyp,3)}</td><td class='td_power td_max' data-value='${pmax}'>${round(pmax,3)}</td>`;

      // Print the line
      tr += `</tr>`;
      $('.partTable tbody').append(tr);
   });

   // sort the table
   this.sortTable(0);
};


// sort the part table
PartListEditor.prototype.sortTable = function(col) {
   // init sort direction
   let dir = 'asc';

   // if th clicked th is already sorted
   let th_elt = $(`thead > .tr_bottom > th:nth-child(${col+1})`);
   if(th_elt.hasClass('sort')) {
      // toggle direction
      th_elt.toggleClass('sortAsc sortDesc');
      if(th_elt.hasClass('sortDesc')) dir = 'desc';
   }
   // if th clicked is not sorted
   else {
      // remove sorting to the precedent th
      $('.sort').removeClass('sort sortAsc sortDesc');
      // sort this by asc
      $(th_elt).addClass('sort sortAsc');
   }

   // prepare a compare function
   let compareParts = function(partA, partB, col, dir){
      let a = $(partA).children().eq(col).data('value');
      let b = $(partB).children().eq(col).data('value');
      if      ('asc'  === dir) return a < b;
      else if ('desc' === dir) return a > b;
   };

   // Insertion sort... slightly modified
   let tr_elts = $('.partTable > tbody > tr');
   for(let i=1; i<tr_elts.length; i++) {
      let tr_i = tr_elts[i];
      for(let j=i-1; j>=0; j--) {
         let tr_j = $('.partTable > tbody > tr')[j];
         if(compareParts(tr_j,tr_i,col,dir)) {
            $(tr_i).insertAfter($(tr_j));
            break;
         }
         else if(j==0) {
            $(tr_i).insertBefore($(tr_j));
         }
      }
   }
};


// print a UI to edit a charac
PartListEditor.prototype.editCharac = function(part, charac) {
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
   var value      = part.getCharac_raw(charac);
   var html       = `<input class='edition' type='text' value='${value}' data-partid='${part.id}' />`;
   var selector   = `tr[data-partid=${part.id}] > .td_charac[data-charac=${charac}]`;
   $(selector).html(html);
   $('.edition').focus();
   $('.edition').get(0).setSelectionRange(0, value.length);
};


// print a UI to edit a current
PartListEditor.prototype.editCurrent = function(part, load, typmax) {
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
   var value      = part.getConsumption(load,typmax).toString();
   var html       = `<input class='edition input_num' type='text' value='${value}' data-loadid='${load.id}' data-partid='${part.id}' data-typmax='${typmax}' />`;
   var selector   = `tr[data-partid=${part.id}] > .td_${typmax}[data-loadid=${load.id}]`;
   $(selector).html(html);
   $('.edition').focus();
   $('.edition').get(0).setSelectionRange(0, value.length);
};


// remove the UI from editing by validating (or not) the data
PartListEditor.prototype.clearCharac = function(validate){
   // get datas from html elements
   var part    = this.getEditedPart();
   var charac  = this.getEditedCharac();

   // validate or not the data
   let oldValue = part.getCharac_raw(charac);
   let newValue = this.getEditedValue();

   if(validate && oldValue != newValue) {
      // update the charac with the new value
      part.setCharac(charac, newValue);
      this.saveHistory();
   }

   // refresh the part table
   $('.edition').parent().html(part.getCharac_formated(charac));
   $('.partTable').trigger('update');

   this.editType = null;
};


// remove the UI from editing by validating (or not) the data
PartListEditor.prototype.clearCurrent = function(validate){
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

   // refresh the part table
   let value = part.getConsumption(load, typmax);
   let part$ = $('.edition').parent();
   part$.attr('data-value', value.toString());
   part$.html(round(value,3));
   if('typ' === typmax) {
      let maxvalue = part.getConsumption(load, 'max');
      part$.next().attr('data-value', maxvalue.toString());
      part$.next().html(round(maxvalue,3));
   }
   let power = part.getPower(this.tree);
   let ptyp = round(power.typ,3);
   let pmax = round(power.max,3);
   $(`tr[data-partid=${part.id}] > td.td_power.td_typ`).html(ptyp).attr('data-value', ptyp.toString());
   $(`tr[data-partid=${part.id}] > td.td_power.td_max`).html(pmax).attr('data-value', pmax.toString());
   $('.partTable').trigger('update');

   this.editType = null;
};


// validate the occuring edition
PartListEditor.prototype.validateEdition = function() {
   if ('charac' === this.editType) {
      this.clearCharac(true);
   }
   else if ('current' === this.editType) {
      this.clearCurrent(true);
   }
};


// cancel the occuring edition
PartListEditor.prototype.cancelEdition = function() {
   if ('charac' === this.editType) {
      this.clearCharac(false);
   }
   else if ('current' === this.editType) {
      this.clearCurrent(false);
   }
   this.unselectPart();
};


// get the edited part
PartListEditor.prototype.getEditedPart = function() {
   var partID = $('.edition').data('partid');
   var part = this.partList.getPart(partID);
   return part;
};


// get the edited load
PartListEditor.prototype.getEditedLoad = function() {
   var loadID = $('.edition').data('loadid');
   var load = this.tree.getItem(loadID);
   return load;
};


// get the edited TypMax
PartListEditor.prototype.getEditedTypMax = function() {
   return $('.edition').data('typmax');
};


// get the edited value
PartListEditor.prototype.getEditedValue = function() {
   var value = $('.edition').val();

   if ('current' === this.editType) {
      value = ('' === value) ? 0 : parseFloat(value);
   }

   return value;
};


// get the edited characteristic
PartListEditor.prototype.getEditedCharac = function() {
   return $('.edition').parent().data('charac');
};


// Return true if at least one part is selected
PartListEditor.prototype.selectionExist = function() {
   return (this.selectedParts.length > 0);
};


// select the given part (add to the selection)
PartListEditor.prototype.addToSelection = function(part) {
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
};


// select the given part (unselect other part)
PartListEditor.prototype.selectPart = function(part) {
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

};


// select all parts between the given and the selected
PartListEditor.prototype.selectToPart = function(part) {
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
      // save the context before entering tghe jQuery "each" method
      var that = this;
      // loop on the user-ordered partlist
      let partList = [];
      var state = 0;
      $('.partTable tbody tr').each(function(){
         partId = $(this).data('partid');

         // STATE 0
         if(0 === state) {
            // DO NOTHING

            // Go to STATE1 if the partId is one of the two selected (the first)
            if(partId === part.id || partId === that.selectedParts[0].id) {
               that.addToSelection(that.partList.getPart(partId));
               state = 1;
               return;
            }
         }
         // STATE 1
         else if (1 === state) {
            that.addToSelection(that.partList.getPart(partId));
            // Go to STATE2 if the partId is one of the two selected (the second)
            if(partId === part.id || partId === that.selectedParts[0].id) {
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
};



// deselect the actual part
PartListEditor.prototype.unselectPart = function(fade) {
   if(null !== this.editType) {
      this.cancelEdition();
   }

   if(this.selectionExist()) {
      this.selectedParts.length = 0;
      $('.selected').removeClass('selected');
      $('.removePart').fadeOut(fade?150:0);
   }
};


// empty the history and add only one data
PartListEditor.prototype.clearHistory = function() {
   // save the actual tree into the history
   var data = this.partList.toString();
   this.history.list  = [data];
   this.history.index = 0;
   this.updateUndoRedoButtons();
};


// save the app data into the history
PartListEditor.prototype.saveHistory = function() {
   // save the actual partList into the history
   var data = this.partList.toString();
   // if the index is not the last element, remove everything over index
   this.history.list.splice(this.history.index + 1, this.history.list.length - (this.history.index + 1));
   // save the element in the history at the last position
   this.history.list.push(data);
   // set the new index at the last element
   this.history.index = this.history.list.length - 1;
   // update the UI
   this.updateUndoRedoButtons();
};


// load data from the history at the given index (to undo/redo)
PartListEditor.prototype.loadHistory = function(index) {
   // unselect all part
   this.unselectPart();
   // restore the the part list from the history
   this.partList.fromString(this.history.list[index]);
   // update the UI
   this.refresh();
   this.updateUndoRedoButtons();
};


// undo an action
PartListEditor.prototype.undo = function() {
   // is there a previous part list ?
   if (this.history.index > 0) {
      // load the previous tree in the history
      --this.history.index;
      this.loadHistory(this.history.index);
   }
};


// redo un action
PartListEditor.prototype.redo = function() {
   // is there a next tree ?
   if(this.history.index < this.history.list.length - 1) {
      // load the next tree in the history
      ++this.history.index;
      this.loadHistory(this.history.index);
   }
};


// enable or disable the undo/redo buttons
PartListEditor.prototype.updateUndoRedoButtons = function() {
   // if there is no data to undo, hide the undo button
   if (0 === this.history.index) {
      $(".undo").fadeOut(200);
   }
   // else, show the undo button
   else {
      $(".undo").fadeIn(200);
   }

   // if there is no data to redo, hide the redo button
   if (this.history.index >= (this.history.list.length - 1)) {
      $(".redo").fadeOut(200);
   }
   // else, show the redo button
   else {
      $(".redo").fadeIn(200);
   }
};


// Import a part list from an XLSX sheet passed as JSON
PartListEditor.prototype.fromSpreadsheet = function(sheet_json) {
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
   if(!popup(popupData, false, 'partListEditor')) {
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
         // can not use that.tree.forEachLoad() because it need an anonymous functions which is not permited in a loop
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
};

// Listen to all event on the page
PartListEditor.prototype.listenEvents = function() {
   var that = this;

   // send back data when the window is clossing
   window.onbeforeunload = function() {
      // request ipcRenderer to communicate with main.js
      const {ipcRenderer} = require('electron');
      // send data to main.js
      ipcRenderer.send('partListEditor-window-close',that.partList.toString());
   };

   // add a new empty part to the PartList
   $('.addPart').click(function(){
      that.unselectPart();
      that.partList.addPart();
      that.refresh();
      that.saveHistory();
   });

   // remove parts from the PartList
   $('.removePart').click(function(){
      var partsToDelete = that.selectedParts.slice();
      that.unselectPart(true);
      for(let part of partsToDelete) {
         that.partList.deletePart(part);
      }
      that.refresh();
      that.saveHistory();
   });

   // export the table to excel
   $('.undo').click(function(){
      that.undo();
   });

   // export the table to excel
   $('.redo').click(function(){
      that.redo();
   });

   // export the table to excel
   $('.exportTable').click(function(){
      downloadTable($('.partTable'), 'ptree.xlsx');
   });

   // export an empty pre-formated excel
   $('.exportTemplate').click(function(){
      downloadTable($('.partTable thead'),'template.xlsx');
   });

   // import the data from the excel
   $('.importTable').click(function(){
      // ask the user for a sheet
      let json_sheet = getSpreadsheet();
      if (null === json_sheet) return;

      // Import the file into the partlist
      let noerror = that.fromSpreadsheet(json_sheet);

      // finally, refresh the table with the new values
      if(noerror) {
         that.refresh();
         that.saveHistory();
      }
   });

   // unselect any part when the emptyzone is clicked
   $('.emptyzone').click(function(){
      that.validateEdition();
      that.unselectPart(true);
   });

   // click on a charac
   $('.partTable').on('click', '.td_charac', function(event) {
      var charac  = $(this).data('charac');
      var partID  = $(this).parent().data('partid');
      var part    = that.partList.getPart(partID);

      // click on the ID
      if('id' === charac) {
         // If ctrl is pressed : add to selection
         if(event.ctrlKey || event.metaKey) {
            that.addToSelection(part);
         }
         // if shift is pressed : multiple selection
         else if(event.shiftKey) {
            that.selectToPart(part);
         }
         // Else, monoselection
         else {
            that.selectPart(part);
         }
      }
      else {
         that.editCharac(part, charac);
      }
   });

   // edit a current
   $('.partTable').on('click', '.td_current', function() {
      var partID  = $(this).parent().data('partid');
      var loadID  = $(this).data('loadid');
      var typmax  = $(this).data('typmax');
      var part    = that.partList.getPart(partID);
      var load    = that.tree.getItem(loadID);

      that.editCurrent(part, load, typmax);
   });


   // sort the table when clicking on TH elements
   $('.partTable').on('click','.tr_bottom > th', function(){
      that.sortTable($(this).index());
   });

   // Undo
   Mousetrap.bind(['command+z', 'ctrl+z'], function() {
      that.undo();
      return false;
   });

   // Redo
   Mousetrap.bind(['command+y', 'ctrl+y', 'command+shift+z', 'ctrl+shift+z'], function() {
      that.redo();
      return false;
   });

   // Select all
   Mousetrap.bind(['command+a', 'ctrl+a'], function() {
      that.partList.forEachPart(function(part){
         that.addToSelection(part);
      });
      return false;
   });

   // Global keydown
   $(document).keydown(function(e){
      // ESCAPE (=> cancel)
      if (27 === e.keyCode) {
         that.cancelEdition();
         that.unselectPart(true);
      }
   });

   // trig KEYDOWN and KEYUP on the edition of any value in the partTable
   $('.partTable').on('keydown', '.edition', function(e){
      // , (replace , by .) if a number is edited
      if("188" == event.which || "110" == event.which){
         if(undefined !== that.getEditedLoad()) {
            event.preventDefault();
            $(this).val($(this).val() + '.');
         }
      }
      // ENTER (=> validate)
      else if (13 === e.keyCode) {
         that.validateEdition();
         that.unselectPart(true);
      }
      // TAB (=> validate and edit next)
      else if (9 === e.keyCode) {
         event.preventDefault();
         let part     = that.getEditedPart();
         let load     = that.getEditedLoad();
         var typmax   = that.getEditedTypMax();
         var charac   = that.getEditedCharac();
         var editType = that.editType;

         // SHIFT+TAB = previous
         if(e.shiftKey) {
            // if editing the ref, jump to name
            if('charac' === editType && 'ref' === charac) {
               that.editCharac(part, 'name');
            }
            // else if editing any current, find what is the previous cell
            else if ('current' === editType) {
               // if the current is a max, jump to the typ of the same load
               if('max' === typmax) {
                  that.editCurrent(part, load, 'typ');
               }
               // else, if the current is a typ
               else {
                  let prevload = that.tree.getLoadInPartList(load, 'prev');

                  // if there is a previous load, jump to its max
                  if(null !== prevload) {
                     that.editCurrent(part, prevload, 'max');
                  }
                  // else, jump to the ref
                  else {
                     that.editCharac(part, 'ref');
                  }
               }
            }
         }
         // TAB = next
         else {
            // if editing a charac
            if('charac' === editType) {
               // if editing the name, jump to the ref
               if('name' === charac) {
                  that.editCharac(part, 'ref');
               }
               // if editing the ref, jump to the first load (if their is one)
               else if ('ref' === charac) {
                  let firstLoad = that.tree.getLoadInPartList(that.tree.getRoot(), 'next');
                  if(null !== firstLoad) that.editCurrent(part, firstLoad, 'typ');
               }
            }
            // else if editing any current
            else if ('current' === editType) {
               // if the current is a typ, jump to the max of the same load
               if('typ' === typmax) {
                  that.editCurrent(part, load, 'max');
               }
               // else if the current is a max
               else {
                  // jump to the typ of the next load (if their is one)
                  let nextLoad = that.tree.getLoadInPartList(load, 'next');
                  if(null !== nextLoad) that.editCurrent(part, nextLoad, 'typ');
               }
            }
         }
      }
   });
};