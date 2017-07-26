// -----------------------------------------------------------------------------
//    PartTable constructor
//    A PartTable contains a partlist associated with a tree
//      It provides methods to manipulate those parts within a <table> element
// -----------------------------------------------------------------------------

var PartTable = function() {
   this.partList     = new PartList();
   this.tree         = new Tree();
   this.editing      = null;
   this.shiftPressed = false;
   this.selectedPart = null;

   this.listenEvents();
};


// refresh the table with new values
PartTable.prototype.refresh = function() {
   // empty the table content
   $('.partTable tbody').empty();

   // init TableSorter on the empty table
   $('.partTable').tablesorter({sortList: [[0,0]]});

   var that = this;
   var niceid = 0;

   this.partList.forEachPart(function(part){
      // Init the total power
      let ptyp = 0;
      let pmax = 0;

      // Part characteristics
      let tr = `<tr data-partid='${part.id}'>
         <td class='td_charac' data-charac='id' data-value='${part.id}'>${niceid++}</td>
         <td class='td_charac td_editable' data-charac='name'>${part.characs.name}</td>
         <td class='td_charac td_editable' data-charac='ref'>${part.characs.ref}</td>
      `;

      // Part consumptions on each load
      // Can't use tree.forEachLoad() without creating an anonymous function in this loop
      for(let item of that.tree.item_list) {
         if(item !== undefined && item.isLoad()) {
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


   if(null !== this.selectedPart) this.selectPart(this.selectedPart);

   // Let TableSorter know that the table has changed
   $('.partTable').trigger('update');
};


// print a UI to edit a charac
PartTable.prototype.editCharac = function(part, charac) {
   // if a previous element whas in edition
   if ('current' === this.editing) {
      this.validateEdition();
   }
   else if ('charac' === this.editing) {
      // get the previous edited element
      let editedPart    = this.getEditedPart();
      let editedCharac  = this.getEditedCharac();

      // if the edited element is the same, do nothing
      if(part.id === editedPart.id && charac === editedCharac) {
         return;
      }
      // else, validate the edition and continue
      else {
         this.validateEdition();
      }
   }

   this.selectPart(part);

   // mark as editing
   this.editing = 'charac';

   // print an input element
   var value      = part.characs[charac];
   var html       = `<input class='edition' type='text' value='${value}' data-partid='${part.id}' />`;
   var selector   = `tr[data-partid=${part.id}] > .td_charac[data-charac=${charac}]`;
   $(selector).html(html);
   $('.edition').focus();
   $('.edition').get(0).setSelectionRange(0, value.length);
};


// print a UI to edit a current
PartTable.prototype.editCurrent = function(part, load, typmax) {
   // if a previous element whas in edition
   if ('charac' === this.editing) {
      this.validateEdition();
   }
   else if ('current' === this.editing) {
      // get the previous edited element
      let editedPart   = this.getEditedPart();
      let editedLoad   = this.getEditedLoad();
      let editedTypMax = this.getEditedTypMax();

      // if the edited element is the same, do nothing
      if(part.id === editedPart.id && load.id === editedLoad.id && typmax === editedTypMax) {
         return;
      }
      // else, validate the edition and continue
      else {
         this.validateEdition();
      }
   }

   this.selectPart(part);

   // mark as editing
   this.editing = 'current';

   // print an input element
   var value      = part.getConsumption(load,typmax).toString();
   var html       = `<input class='edition input_num' type='text' value='${value}' data-loadid='${load.id}' data-partid='${part.id}' data-typmax='${typmax}' />`;
   var selector   = `tr[data-partid=${part.id}] > .td_${typmax}[data-loadid=${load.id}]`;
   $(selector).html(html);
   $('.edition').focus();
   $('.edition').get(0).setSelectionRange(0, value.length);
};


// rempve the UI from editing by validating (or not) the data
PartTable.prototype.clearCharac = function(validate){
   // get datas from html elements
   var part    = this.getEditedPart();
   var charac  = this.getEditedCharac();

   // validate or not the data
   var value = validate ? this.getEditedValue() : part.characs[charac];

   // update the charac with the new value
   part.characs[charac] = value;

   // refresh the part table
   $('.edition').parent().html(value);
   $('.partTable').trigger('update');

   this.editing = null;
};


// rempve the UI from editing by validating (or not) the data
PartTable.prototype.clearCurrent = function(validate){
   // get datas from html elements
   var part    = this.getEditedPart();
   var load    = this.getEditedLoad();
   var typmax  = this.getEditedTypMax();
   var newval  = this.getEditedValue();
   var oldval  = part.getConsumption(load, typmax);

   // validate or not the data
   var value = (validate && !isNaN(newval)) ? newval : oldval;

   // update the consumption with the new value
   part.setConsumption(value, load, typmax);

   // refresh the part table
   $('.edition').parent().attr('data-value', value.toString());
   $('.edition').parent().html(round(value,3));
   var power = part.getPower(this.tree);
   $(`tr[data-partid=${part.id}] > td.td_power.td_typ`).html(round(power.typ,3));
   $(`tr[data-partid=${part.id}] > td.td_power.td_max`).html(round(power.max,3));
   $('.partTable').trigger('update');

   this.editing = null;
};


// validate the occuring edition
PartTable.prototype.validateEdition = function() {
   if ('charac' === this.editing) {
      this.clearCharac(true);
   }
   else if ('current' === this.editing) {
      this.clearCurrent(true);
   }
   this.unselectPart();
};


// cancel the occuring edition
PartTable.prototype.cancelEdition = function() {
   if ('charac' === this.editing) {
      this.clearCharac(false);
   }
   else if ('current' === this.editing) {
      this.clearCurrent(false);
   }
   this.unselectPart();
};


// get the edited part
PartTable.prototype.getEditedPart = function() {
   var partID = $('.edition').data('partid');
   var part = this.partList.getPart(partID);
   return part;
};


// get the edited load
PartTable.prototype.getEditedLoad = function() {
   var loadID = $('.edition').data('loadid');
   var load = this.tree.getItem(loadID);
   return load;
};


// get the edited TypMax
PartTable.prototype.getEditedTypMax = function() {
   return $('.edition').data('typmax');
};


// get the edited value
PartTable.prototype.getEditedValue = function() {
   var value = $('.edition').val();

   if ('current' === this.editing) {
      value = parseFloat(value);
   }

   return value;
};


// get the edited characteristic
PartTable.prototype.getEditedCharac = function() {
   return $('.edition').parent().data('charac');
};


// select the given part
PartTable.prototype.selectPart = function(part) {
   var selectedPart = this.selectedPart;

   this.validateEdition();

   if(null !== selectedPart) {
      this.unselectPart(false);
      $('.removePart').show();
   }
   else {
      $('.removePart').fadeIn(150);
   }

   this.selectedPart = part;
   $(`tr[data-partid=${part.id}]`).addClass('selected');

};


// deselect the actual part
PartTable.prototype.unselectPart = function(fade) {
   if(null !== this.selectedPart) {
      this.selectedPart = null;
      $('.selected').removeClass('selected');
      $('.removePart').fadeOut(fade?150:0);
   }
};


// Listen to all event on the page
PartTable.prototype.listenEvents = function() {
   var that = this;

   // send back data when the window is clossing
   window.onbeforeunload = function() {
      // request ipcRenderer to communicate with main.js
      const {ipcRenderer} = require('electron');
      // send data to main.js
      ipcRenderer.send('partTable-window-close',that.partList.toString());
   };

   // add a new empty part to the PartList
   $('.addPart').click(function(){
      that.partList.addPart();
      that.refresh();
   });

   // add a new empty part to the PartList
   $('.removePart').click(function(){
      var partToDelete = that.selectedPart;
      that.unselectPart(true);
      that.partList.deletePart(partToDelete);
      that.refresh();
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
      // open dialog
      const {dialog} = require('electron').remote;
      var paths = dialog.showOpenDialog({
         title: 'Open...',
         filters: [
            {name: 'Spreadsheet',   extensions: ['xls','xlsx','csv']},
            {name: 'All Files',     extensions: ['*']}
         ],
         properties: ['openFile']
      });

      // exit if the path is undefined (canceled)
      if(undefined === paths) return;

      // construct a workbook from the file
      var workbook   = XLSX.readFile(paths[0]);
      var sheetName  = workbook.SheetNames[0];
      var sheet      = workbook.Sheets[sheetName];
      var sheet_json = XLSX.utils.sheet_to_json(sheet, {header:1});

      // Check 1
      // compare the template with the header of the sheet and exit with an alert() if different
      var header_xlsx = XLSX.utils.table_to_book($('.partTable thead')[0]);
      var header_json = XLSX.utils.sheet_to_json(header_xlsx.Sheets[header_xlsx.SheetNames[0]], {header:1});
      // check the 2 first lines only
      for (let i=0; i<2; i++) {
         if(!sheet_json[i].equals(header_json[i])) {
            console.log(`Error one line ${i}.\nThe format of the file is not correct.\nPlease use the template to ordonate your values.`);
            return;
         }
      }


      // Check 2
      // check if the values of the sheet are numbers
      let line_id = 0;
      for(let sheet_line of sheet_json) {
         let cell_id = 0;
         for(let sheet_cell of sheet_line) {
            if (undefined !== sheet_cell) {
               if(cell_id > 2 && line_id > 1 && !$.isNumeric(sheet_cell)) {
                  alert(`Error on cell ${String.fromCharCode(65+cell_id)}${line_id}.\nA number is excpected but the following value was found :\n${sheet_cell}`);
                  return;
               }
            }
            cell_id++;
         }
         line_id++;
      }

      // Check 3
      // check if there is any line other than the header in the sheet
      if(sheet_json.length < 3) {
         alert('The file does not contain any value.');
         return;
      }

      // Add the values to the PartList
      line_id = 0;
      for(let sheet_line of sheet_json) {
         // skip the header (two first lines)
         if(line_id>1) {
            // create a part for each line
            let part = that.partList.addPart();

            // set the Text characs
            part.characs.name = sheet_line[1]; // cell B
            part.characs.ref  = sheet_line[2]; // cell C

            // parse each load (same order as the columns) to set the consumptions
            // the col number can be incremented with each load because each data is correctly ordered
            let col_id = 3;
            // can not use that.tree.forEachLoad() because it need an anonymous functions which is not permited in a loop
            for(let item of that.tree.item_list) {
               if(item !== undefined && item.isLoad()) {
                  part.setConsumption(sheet_line[col_id],   item, 'typ');
                  part.setConsumption(sheet_line[col_id+1], item, 'max');
                  col_id += 2;
               }
            }
         }
         line_id++;
      }

      // finally, refresh the table with the new values
      that.refresh();
   });

   // unselect any part when the emptyzone is clicked
   $('.emptyzone').click(function(){
      that.validateEdition();
      that.unselectPart(true);
   });

   // edit a charac
   $('.partTable').on('click', '.td_charac', function() {
      var charac  = $(this).data('charac');
      var partID  = $(this).parent().data('partid');
      var part    = that.partList.getPart(partID);

      if('id' === charac) {
         that.selectPart(part);
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

   // Global keydown
   $(document).keydown(function(e){
      // SHIFT
      if (16 === e.keyCode) {
         that.shiftPressed = true;
      }
      // ESCAPE (=> cancel)
      else if (27 === e.keyCode) {
         that.cancelEdition();
         that.unselectPart(true);
      }
   });

   // Global keyup
   $(document).keyup(function(e){
      // SHIFT
      if (16 === e.keyCode) {
         that.shiftPressed = false;
      }
   });

   // trig KEYDOWN and KEYUP on the edition of any value in the partTable
   $('.partTable').on('keydown', '.edition', function(e){
      // , (=> .)
      if("188" == event.which || "110" == event.which){
         event.preventDefault();
         $(this).val($(this).val() + '.');
      }
      // ENTER (=> validate)
      else if (13 === e.keyCode) {
         that.validateEdition();
      }
      // TAB (=> validate and edit next)
      else if (9 === e.keyCode) {
         event.preventDefault();
         let part    = that.getEditedPart();
         let load    = that.getEditedLoad();
         var typmax  = that.getEditedTypMax();
         var charac  = that.getEditedCharac();
         var editing = that.editing;

         that.validateEdition();

         // SHIFT+TAB = previous
         if(that.shiftPressed) {
            // if editing the ref, jump to name
            if('charac' === editing && 'ref' === charac) {
               that.editCharac(part, 'name');
            }
            // else if editing any cirrent
            else if ('current' === editing) {
               // if the current is a max, jump to the typ of the same load
               if('max' === typmax) {
                  that.editCurrent(part, load, 'typ');
               }
               // else, if the current is a typ
               else {
                  let prevload = that.tree.getPreviousLoad(load);
                  // if their is a previous load, jump to its max
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
            if('charac' === editing) {
               // if editing the name, jump to the ref
               if('name' === charac) {
                  that.editCharac(part, 'ref');
               }
               // if editing the ref, jump to the first load (if their is one)
               else if ('ref' === charac) {
                  let firstLoad = that.tree.getNextLoad(that.tree.getRoot());
                  if(null !== firstLoad) that.editCurrent(part, firstLoad, 'typ');
               }
            }
            // else if editing any current
            else if ('current' === editing) {
               // if the current is a typ, jump to the max of the same load
               if('typ' === typmax) {
                  that.editCurrent(part, load, 'max');
               }
               // else if the current is a max
               else {
                  // jump to the typ of the next load (if their is one)
                  let nextLoad = that.tree.getNextLoad(load);
                  if(null !== nextLoad) that.editCurrent(part, nextLoad, 'typ');
               }
            }
         }
      }
   });
};
