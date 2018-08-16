// -----------------------------------------------------------------------------
// PTree constructor
//    A PTree object represent the whole PowerTree application
//    It contains every methods, data, UI and sub-objects
//    It only needs a selector on the Canvas HTML item
//    See synop.jpg for more informations
// -----------------------------------------------------------------------------

var PTree = function(canvas_selector) {
   this.tree         = new Tree();
   this.partList     = new PartList();
   this.canvas       = new Canvas(canvas_selector, this.tree, this.partList);
   this.statsAreOpen = false;
   this.filePath     = null;
   this.unsaved      = true;
   this.history      = {list: [], index: 0};

   this.setSheet(null);
   this.listenCanvas();
   this.listenTreeMenu();
   this.listenDOM();
   this.listenKeyboard();
   this.listenMessages();
   this.clearHistory();
   this.canvas.refresh();
   this.setUnsaved();
   this.updateClearButtons();

   window.document.title = "Untitled";

   this.checkUpdate();
};


// Reset the PTree object
PTree.prototype.reset = function() {
   // create new data
   this.tree.fromString(new Tree().toString());
   this.partList.fromString(new PartList().toString());
   this.canvas.setDefaultConfig();
   this.statsAreOpen = false;
   this.filePath     = null;
   this.unsaved      = true;
   this.history      = {list: [], index: 0};

   // update the app environement
   this.canvas.unselectItem(true);
   this.clearHistory();
   this.canvas.refresh();
   this.setUnsaved();
   this.updateClearButtons();

   // update the window title
   window.document.title = "Untitled";
};


// load the app data from a file
PTree.prototype.open = function() {
   var that = this;
   const {dialog} = require('electron').remote;
   var paths = dialog.showOpenDialog({
      title: 'Open...',
      filters: [{
            name: 'JSON',
            extensions: ['json']
         },
         {
            name: 'All Files',
            extensions: ['*']
         }
      ],
      properties: ['openFile']
   });

   // save the new path only if its not undefined (canceled)
   if (undefined !== paths) this.filePath = paths[0];
   else return;

   // read the content of the file using node.js fs module
   const fs = require('fs');
   fs.readFile(this.filePath, 'utf8', function(err, datastr) {
      if (null !== err) {
         alert(err);
      }
      else {
         // reconstruct the tree from the data
         that.fromString(datastr);

         // update the app environement
         that.clearHistory();
         that.canvas.refresh();
         that.setSaved();
         that.updateClearButtons();

         // update the window title
         window.document.title = that.filePath;
      }
   });
};


// save the app data into a file
PTree.prototype.save = function(saveas = false) {
   // do not try a simple save if it's not needed
   if(!saveas && !this.unsaved) {
      return false;
   }

   // if the app as no file to work on
   // or if the app data must be save as a new file
   if (saveas || null === this.filePath) {
      // prompt the user
      const {dialog} = require('electron').remote;
      var path = dialog.showSaveDialog({
         title: 'Save as...',
         defaultPath: 'tree.json',
         filters: [{
               name: 'JSON',
               extensions: ['json']
            },
            {
               name: 'All Files',
               extensions: ['*']
            }
         ]
      });

      // save the new path only if its not undefined (canceled)
      if (undefined !== path) this.filePath = path;
      else return false;
   }

   // save a reference to this PTree object
   var that = this;

   // open the file or create it if it does not exist using node.js fs module
   const fs = require('fs');
   fs.open(this.filePath, 'w+', function(err, fd) {
      if (null === err) {
         // write the data
         let extradata = {version: require('../package.json').version};
         let data = that.toString(extradata);
         fs.write(fd, data);

         // mark the workspace as saved
         that.setSaved();

         // update the window title
         window.document.title = that.filePath;
      }
      else {
         alert(err);
      }
   });

   return true;
};


// set the workspace as unsaved
PTree.prototype.setUnsaved = function() {
   this.unsaved = true;
   $('#bt_save').removeClass('disabled');
};


// set the workspace as unsaved
PTree.prototype.setSaved = function() {
   this.unsaved = false;
   $('#bt_save').addClass('disabled');
};


// empty the history and add only one data
PTree.prototype.clearHistory = function() {
   // save the actual tree into the history
   var data = this.tree.toString();
   this.history.list  = [data];
   this.history.index = 0;
   this.updateUndoRedoButtons();
};


// save the app data into the history
PTree.prototype.saveHistory = function() {
   // save the actual tree into the history
   var data = this.tree.toString();
   // if the index is not the last element, remove everything over index
   this.history.list.splice(this.history.index + 1, this.history.list.length - (this.history.index + 1));
   // save the element in the history at the last position
   this.history.list.push(data);
   // set the new index at the last element
   this.history.index = this.history.list.length - 1;
   // mark the workspace as unsaved
   this.setUnsaved();
   // update the UI
   this.updateUndoRedoButtons();
};


// load data from the history at the given index (to undo/redo)
PTree.prototype.loadHistory = function(index) {
   // unselect any item in the canvas
   this.canvas.unselectItem();
   // if stats are open, unselect the item
   this.updateStats(null);
   // restore the tree
   this.tree.fromString(this.history.list[index]);
   this.canvas.refresh();
   // mark the workspace as unsaved
   this.setUnsaved();
   // update the UI
   this.updateUndoRedoButtons();
   this.updateClearButtons();
};


// undo an action
PTree.prototype.undo = function() {
   // is there a previous tree ?
   if (this.history.index > 0) {
      // load the previous tree in the history
      --this.history.index;
      this.loadHistory(this.history.index);
   }
};


// redo un action
PTree.prototype.redo = function() {
   // is there a next tree ?
   if(this.history.index < this.history.list.length - 1) {
      // load the next tree in the history
      ++this.history.index;
      this.loadHistory(this.history.index);
   }
};


// Set the spreadsheet to sync with
PTree.prototype.setSheet = function(usersheet) {
   // default value
   if(undefined === usersheet || null === usersheet) {
      usersheet = {sheet:null, path:null};
   }
   // set the usersheet given as {path, json_sheet}
   this.usersheet = usersheet;
   // update the bottom menu
   if(usersheet.path !== null) {
      $('#sheetpath').text(usersheet.path);
      $('#bt_refresh_sheet').show();
      $('#bt_remove_sheet').show();
   }
   else {
      $('#sheetpath').text('No spreadsheet selected:');
      $('#bt_refresh_sheet').hide();
      $('#bt_remove_sheet').hide();
   }
};


// reload data from the spreadsheet
PTree.prototype.reloadSheet = function() {
   // if the file exist
   const fs = require('fs');
   if(fs.existsSync(this.usersheet.path)) {
      // reload the Spreadsheet from the file
      this.usersheet.sheet = getSpreadsheet(this.usersheet.path);
   }
};


// Return the PTree as a string
// add extra properties to the string if needed
PTree.prototype.toString = function(extra={}) {
   var data = {
      tree     : this.tree.toString(),
      partList : this.partList.toString(),
      usersheet: this.usersheet,
      config   : this.canvas.config
   };

   Object.assign(data, extra);

   return JSON.stringify(data);
};


PTree.prototype.fromString = function(datastr) {
   // Try to parse the string
   var data = {};
   try {
      data = JSON.parse(datastr);
   }
   catch(parseError) {
      console.log(parseError);
      alert ('Impossible to open this file.');
      return false;
   }

   // if the version number does not exist; prompt the user
   if(undefined === data.version) {
      let popupData = {
         title      : 'Incorrect file',
         width      : 500,
         height     : 135,
         sender     : 'tree',
         content    : `<strong>This file does not appear to be a valid Power Tree.</strong><br />
                      This could result in an unexpected behavior. <br />
                      Do you still want to proceed ? `,
         btn_ok     : 'Proceed',
         btn_cancel : 'Cancel'
      };
      if(!popup(popupData)) return false;
   }

   // comapare the version of PTree with the version of the file
   let packagejson = require('../package.json');
   let comp = compareVersions(packagejson.version, data.version);

   // The file was made with an older PTree
   if(comp === 1) {
      let popupData = {
         title      : 'Incorrect file',
         width      : 520,
         height     : 225,
         sender     : 'tree',
         content    : `<strong>This file was made with an older version of PTree.</strong><br />
                      This could result in an unexpected behavior. <br />
                      Do you still want to proceed ?<br />
                      <br />
                      <em>File: ${data.version}<br />
                      PTree: ${packagejson.version}</em>`,
         btn_ok     : 'Proceed',
         btn_cancel : 'Cancel'
      };
      if(!popup(popupData)) return false;
   }
   // The file was made with a newer PTree
   else if(comp === -1) {
      let popupData = {
         title      : 'Incorrect file',
         width      : 520,
         height     : 245,
         sender     : 'tree',
         content    : `<strong>This file was made with a newer version of PTree.</strong><br />
                      This could result in an unexpected behavior. <br />
                      Do you still want to proceed ?<br />
                      You could also download the new version of PTree.<br />
                      <br />
                      <em>File: ${data.version}<br />
                      PTree: ${packagejson.version}</em>`,
         btn_ok     : 'Proceed',
         btn_cancel : 'Cancel'
      };

      if(!popup(popupData)) return false;
   }
   // sould not occur
   else if(null === comp) {
      alert('Unexpected error');
      return false;
   }

   // copy the new data in this tree
   this.tree.fromString(data.tree);
   this.partList.fromString(data.partList);
   this.setSheet(data.usersheet);
   this.canvas.setConfig(data.config);
};


// Check GitHub for update
PTree.prototype.checkUpdate = function() {
   // get informations about the latest release using GitHub API
   $.get('https://api.github.com/repos/smariel/ptree/releases/latest', function(github_data){
      // get the version of the latest release
      let latest_version = github_data.tag_name.substr(1);

      // get the current version
      const packagejson = require('../package.json');
      let this_version = packagejson.version;

      // if this version is not equal to the latest on github
      if(this_version != latest_version) {
         // open a popup and propose the user to download
         let popupData = {
            title      : 'New version available',
            width      : 350,
            height     : 160,
            sender     : 'tree',
            content    : `<strong>A new version of PTree is available !</strong><br />
                          You are using PTree v${this_version}. <br />
                          Would you like to download v${latest_version}?`,
            btn_ok     : 'Yes',
            btn_cancel : 'Not now'
         };
         // if the user clicked on "download"
         if(popup(popupData)) {
            // open the PTree home page in an external browser
            const {shell} = require('electron');
            shell.openExternal(packagejson.homepage);
         }
      }
   });
};


// enable or disable the undo/redo buttons
PTree.prototype.updateUndoRedoButtons = function() {
   if (0 === this.history.index) {
      $("#bt_undo").addClass("disabled");
   }
   else {
      $("#bt_undo").removeClass("disabled");
   }

   if (this.history.index >= (this.history.list.length - 1)) {
      $("#bt_redo").addClass("disabled");
   }
   else {
      $("#bt_redo").removeClass("disabled");
   }
};


// enable or disable the clear buttons
PTree.prototype.updateClearButtons = function() {
   if (0 === this.tree.getRoot().childrenID.length) {
      $("#bt_clear").addClass("disabled");
   }
   else {
      $("#bt_clear").removeClass("disabled");
   }
};


// Show/Hide up & down button depending on the position of the selected item
PTree.prototype.updateUpDownButtons = function() {
   var item = this.canvas.getSelectedItem();

   if (null === item || 0 === item.child_index)
      $('#bt_up').addClass('disabled');
   else
      $('#bt_up').removeClass('disabled');
   if (null === item || item.getParent().childrenID.length - 1 == item.child_index)
      $('#bt_down').addClass('disabled');
   else
      $('#bt_down').removeClass('disabled');
};


// Show stats in the stat window (if it is open) for the given itemID
PTree.prototype.updateStats = function(itemID) {
   if(this.statsAreOpen) {
      const {ipcRenderer} = require('electron');
      ipcRenderer.send('stats-selectItem', {
         itemID:       itemID,
         treeData:     this.tree.toString(),
         partListData: this.partList.toString()
      });
   }
};


// Toggle the option panel
PTree.prototype.toggleOptions = function() {
   let that = this;

   $('#bottom_menu').slideToggle(300, 'swing');

   $('.config_checkbox').each(function() {
      $(this).prop('checked', that.canvas.config[$(this).data('config')]);
   });

   $('.config_range').each(function() {
      $(this).val(that.canvas.config[$(this).data('config')]);
   });
};


// export the canvas as a JPEG Image
PTree.prototype.exportImg = function() {
   downloadDataURL(this.canvas.toJPEGdataURL(), 'ptree.jpg');
};


// listen to all events on canvas
PTree.prototype.listenCanvas = function() {
   // save 'this' to use into event callbacks
   var that = this;

   // click (mouse button pressed) on an object in the canvas
   this.canvas.fabricCanvas.on('mouse:down', function(e) {
      var fabric_obj = e.target;
      // if the fabric obj is an "item", select it
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
         // select the item
         that.canvas.selectItem(fabric_obj.item);
         that.updateUpDownButtons();
         that.canvas.fabricCanvas.dragedItem = fabric_obj.item;
         that.canvas.fabricCanvas.defaultCursor = "move";
         // show stats if they are already open
         that.updateStats(fabric_obj.item.id);
      }
      else {
         that.canvas.unselectItem(true);
         that.updateStats(null);
      }

      $('#bottom_menu').slideUp(300, 'swing');
   });

   // mouse button released (click or drop) on an object in the canvas
   this.canvas.fabricCanvas.on('mouse:up', function(e) {
      var fabric_obj = e.target;
      var dragedItem = that.canvas.fabricCanvas.dragedItem;

      // if the event occured on a fabric obj (on an "item")
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item && null !== dragedItem) {
         var receiverItem = fabric_obj.item;
         // if the receiver item is different than the dragged item
         if (receiverItem.id !== dragedItem.id) {
            // if the receiver item is a source
            if (receiverItem.isSource()) {
               // if the receiver item is not a child of the dragged items
               if (!receiverItem.isChildOf(dragedItem)) {
                  // move the item into the receiver and refresh the Tree
                  dragedItem.moveTo(receiverItem);
                  that.canvas.refresh();
                  that.saveHistory();
                  that.updateUpDownButtons();
               }
            }
         }
      }
      // else if the event occured outside an item
      else {
         // if an item is draged and is a source
         if (null !== dragedItem && dragedItem.isSource()) {
            // move the item to the root
            dragedItem.moveTo(dragedItem.tree.getRoot());
            that.canvas.refresh();
            that.saveHistory();
         }
      }

      // in every cases, change the cursor to default and forget the dragedItem
      that.canvas.fabricCanvas.defaultCursor = "default";
      that.canvas.fabricCanvas.dragedItem = null;
   });


   // mouse enter in an object on the canvas
   this.canvas.fabricCanvas.on('mouse:over', function(e) {
      var fabric_obj = e.target;
      // if the fabric obj is an "item"
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
         var receiverItem = fabric_obj.item;
         var dragedItem = that.canvas.fabricCanvas.dragedItem;
         // if an item is being draged
         if (null !== dragedItem) {
            // change the receiver style if it can receive the dragged item
            if (fabric_obj.item.id !== dragedItem.id && receiverItem.isSource() && !receiverItem.isChildOf(dragedItem)) {
               fabric_obj.rect.set(fabric_template.receiver);
               that.canvas.fabricCanvas.renderAll();
            }
         }
         // if no item is dragged, show the item infos
         else  {
            that.canvas.displayInfo(receiverItem);
         }
      }
   });


   // mouse exit from an object on the canvas
   this.canvas.fabricCanvas.on('mouse:out', function(e) {
      var fabric_obj = e.target;
      // if the fabric obj is an "item"
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
         // if an item is being dragged
         if (null !== that.canvas.fabricCanvas.dragedItem) {
            // if the draged item is different than the exited item, reset the style
            if (fabric_obj.item.id !== that.canvas.fabricCanvas.dragedItem.id) {
               fabric_obj.rect.set(fabric_template.deselected);
               that.canvas.fabricCanvas.renderAll();
            }
            // if the draged item IS the exited one, fadeOut the item infos
            else {
               $(".item_info").fadeOut(0);
            }
         }
         else {
            $(".item_info").fadeOut(0);
         }
      }
   });


   // Edit item on double click
   $(that.canvas.canvas$).parent().dblclick(function() {
      if (null !== that.canvas.getSelectedItem()) {
         that.canvas.getSelectedItem().edit(that.partList, that.usersheet.sheet);
         that.canvas.refresh();
         that.saveHistory();
      }
   });
};


// listen DOM events (except for the top menu)
PTree.prototype.listenDOM = function() {
   var that = this;

   // refresh the canvas when the window is resized
   // could be slow, may be recoded
   $(window).resize(function() {
      that.canvas.refresh();
   });

   // refresh the config when inputs changed
   $('.config_input').change(function() {
      if ("checkbox" == $(this).attr("type")) {
         that.canvas.config[$(this).data('config')] = $(this).prop("checked");
      }
      else if ("range" == $(this).attr("type")) {
         that.canvas.config[$(this).data('config')] = parseInt($(this).val());
      }
      else {
         return;
      }

      that.canvas.refresh();
   });

   // set the config to default
   $('.mybtn-defaultConfig').click(function() {
      that.canvas.setDefaultConfig();
      that.canvas.refresh();
   });

   // select a sheet to sync with
   $('#bt_select_sheet').click(function() {
      // ask the user for a sheet
      let usersheet = getSpreadsheet(null, true);
      if (null === usersheet.sheet) return;
      // save the sheet and refresh Consumptions
      that.setSheet(usersheet);
      that.tree.refreshConsumptions(null, that.usersheet.sheet);
      that.canvas.refresh();
      that.setUnsaved();
   });

   // refresh the sheet to sync with
   $('#bt_refresh_sheet').click(function() {
      that.reloadSheet();
      that.tree.refreshConsumptions(null, that.usersheet.sheet);
      that.canvas.refresh();
      that.setUnsaved();
   });

   // refresh the sheet to sync with
   $('#bt_remove_sheet').click(function() {
      that.setSheet(null);
      that.tree.refreshConsumptions(null, that.usersheet.sheet);
      that.canvas.refresh();
      that.setUnsaved();
   });

   // close the config menu when click on the cross
   $('#bottom_close').click(function(){
      that.toggleOptions();
   });
};


// listen to all events on the top-menu of the Tree view
PTree.prototype.listenTreeMenu = function() {
   var that = this;


   // open a new window to manipulate the part list
   $('#bt_partTable').click(function() {
      // require ipcRenderer to send/receive message with main.js
      const {ipcRenderer} = require('electron');

      // ask main.js to edit the item with the given data and wait for a response
      var partListString = ipcRenderer.sendSync('partListEditor-request', that.tree.toString(), that.partList.toString());

      // update the partList
      that.partList.fromString(partListString);

      // update consumptions
      that.tree.refreshConsumptions(that.partList, that.usersheet.sheet);
      that.canvas.refresh();
      that.setUnsaved();
   });


   // open a new window to see stats
   $('#bt_stats').click(function() {
      // require ipcRenderer to send/receive message with main.js
      const {ipcRenderer} = require('electron');

      // ask main.js open the stats window
      ipcRenderer.send('stats-request', {
         itemID:       (null === that.canvas.getSelectedItem()) ? null : that.canvas.getSelectedItem().id,
         treeData:     that.tree.toString(),
         partListData: that.partList.toString()
      });
      that.statsAreOpen = true;
   });


   // create a new project
   $('#bt_new').click(function() {
      // if current project is unsaved, popup
      if(that.unsaved) {
         let popupData = {
            title      : 'Save before continue?',
            width      : 500,
            height     : 135,
            sender     : 'tree',
            content    : `<strong>You have made changes which were not saved.</strong><br />
            Are you sure you want to continue?`,
            btn_ok     : 'Cancel',
            btn_cancel : 'Continue without saving'
         };

         // Cancel was clicked
         if(popup(popupData)) return;
      }

      that.reset();
   });


   // create a new tree within the same project
   $('#bt_clear').click(function() {
      if (!$(this).hasClass('disabled')) {
         that.canvas.unselectItem(true);
         that.tree.clear();
         that.canvas.refresh();
         that.updateClearButtons();
         that.saveHistory();
         that.updateStats(null);
      }
   });


   // add a source to the root when the button is clicked
   $('#bt_addrootsource').click(function() {
      that.canvas.tree.addSourceToRoot();
      that.canvas.refresh();
      that.updateClearButtons();
      that.saveHistory();
   });


   // remove the item when clicked
   $('#bt_remove').click(function() {
      that.canvas.getSelectedItem().remove();
      that.canvas.unselectItem(true);
      that.canvas.refresh();
      that.updateClearButtons();
      that.saveHistory();
      that.updateStats(null);
   });


   // show the correct modal for edition
   $('#bt_edit').click(function() {
      that.canvas.getSelectedItem().edit(that.partList, that.usersheet.sheet);
      that.canvas.refresh();
      that.saveHistory();
   });


   // Add a child source to the selected item
   $('#bt_addsource').click(function() {
      that.canvas.tree.addSource(that.canvas.getSelectedItem());
      that.canvas.refresh();
      that.saveHistory();
   });


   // Add a child load to the selected item
   $('#bt_addload').click(function() {
      that.canvas.tree.addLoad(that.canvas.getSelectedItem());
      that.canvas.refresh();
      that.saveHistory();
   });


   // invert the item position with the previous one
   $('#bt_up').click(function() {
      var item = that.canvas.getSelectedItem();
      item.moveUp();
      that.canvas.refresh();
      that.updateUpDownButtons();
      that.saveHistory();
   });


   // invert the item position with the next one
   $('#bt_down').click(function() {
      var item = that.canvas.getSelectedItem();
      item.moveDown();
      that.canvas.refresh();
      that.updateUpDownButtons();
      that.saveHistory();
   });


   // undo action
   $('#bt_undo').click(function() {
      that.undo();
   });


   // redo action
   $('#bt_redo').click(function() {
      that.redo();
   });


   // open a tree from a filename
   $('#bt_open').click(function() {
      that.open();
   });


   // save the tree into a file
   $('#bt_save').click(function() {
      that.save(false);
   });


   // save the tree into a file
   $('#bt_saveas').click(function() {
      that.save(true);
   });


   // exportImg the canvas as an Image
   $('#bt_exportImg_img').click(function() {
      that.exportImg();
   });


   // toggle the config bar
   $('#bt_config').click(function() {
      that.toggleOptions();
   });
};


// listen to all keyboard shortcuts
PTree.prototype.listenKeyboard = function() {
   let that = this;
   // Mousetrap: return false to prevent default browser behavior and stop event from bubbling

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

   // Open
   Mousetrap.bind(['command+o', 'ctrl+o'], function() {
      that.open();
      return false;
   });

   // Save
   Mousetrap.bind(['command+s', 'ctrl+s'], function() {
      that.save(false);
      return false;
   });

   // Save as
   Mousetrap.bind(['command+shift+s', 'ctrl+shift+s'], function() {
      that.save(true);
      return false;
   });


   // exportImg
   Mousetrap.bind(['command+e', 'ctrl+e'], function() {
      that.exportImg();
      return false;
   });

   // Options
   Mousetrap.bind(['command+,', 'ctrl+,'], function() {
      that.toggleOptions();
      return false;
   });

   // Cut / Delete
   Mousetrap.bind(['command+x', 'ctrl+x', 'backspace', 'del'], function() {
      if(null !== that.canvas.getSelectedItem()) {
         that.canvas.getSelectedItem().remove();
         that.canvas.unselectItem(true);
         that.canvas.refresh();
         that.updateClearButtons();
         that.saveHistory();
         that.updateStats(null);
      }
      return false;
   });

   // Copy
   Mousetrap.bind(['command+c', 'ctrl+c'], function() {
      if(null !== that.canvas.getSelectedItem()) {
         that.canvas.copiedItem = that.canvas.getSelectedItem();
      }
      return false;
   });

   // Paste
   Mousetrap.bind(['command+v', 'ctrl+v'], function() {
      let selectedItem = that.canvas.getSelectedItem();
      let copiedItem = that.canvas.getCopiedItem();

      // if there is something to copy
      if(null !== copiedItem) {
         // if copy of any item into a source
         if(null !== selectedItem && selectedItem.isSource()) {
            that.tree.copyItem(selectedItem, copiedItem);
         }
         // else if copy of a source in the root
         else if(null === selectedItem && copiedItem.isSource()) {
            that.tree.copyItem(that.tree.getRoot(), copiedItem);
         }
         else {
            return false;
         }
      }

      that.canvas.refresh();
      that.updateClearButtons();
      that.saveHistory();
      that.updateStats(null);

      return false;
   });
};


// listen to all events (messages) from main.js
PTree.prototype.listenMessages = function() {
   let that = this;
   // use ipcRenderer to communicate with main main process
   const {ipcRenderer} = require('electron');

   // update the chart every time a message is received from main.js
   ipcRenderer.on('tree-selectItem', function(event, itemID){
      that.canvas.selectItem(that.tree.getItem(itemID));
      that.updateUpDownButtons();
   });

   // main.js want to close the window
   ipcRenderer.on('close', function(event) {
      // if the project is not saved
      if(that.unsaved) {
         // ask the user to save
         let popupData = {
            title      : 'Save before exit?',
            width      : 500,
            height     : 135,
            sender     : 'tree',
            content    : `<strong>You have made changes which were not saved.</strong><br />
            Do you want to save them before exit?`,
            btn_ok     : 'Save and exit',
            btn_cancel : 'Exit without saving'
         };
         let saveBeforeExit = popup(popupData);

         // if the user want to save, save the project
         if (saveBeforeExit) {
            // if the user canceled the save
            if(!that.save()) {
               // do not exit
               return;
            }
         }
      }

      // ask main.js to quit the app
      ipcRenderer.send('quit');
   });
};
