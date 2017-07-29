// -----------------------------------------------------------------------------
// PTree constructor
//    A PTree object represent the whole PowerTree application
//    It contains every methods, data, UI and sub-objects
//    It only needs a selector on the Canvas HTML item
//    See synop.jpg for more informations
// -----------------------------------------------------------------------------

var PTree = function(canvas_selector) {
   this.tree     = new Tree();
   this.partList = new PartList();
   this.canvas   = new Canvas(canvas_selector, this.tree, this.partList);
   this.filePath = null;
   this.unsaved  = true;
   this.history  = {
      list: [],
      index: 0
   };

   this.listenCanvas();
   this.listenTreeMenu();
   this.listenDOM();
   this.clearHistory();
   this.canvas.refresh();
   this.setUnsaved();
   this.updateClearButtons();

   window.document.title = "Untitled";
};


// load the app data from a file
PTree.prototype.open = function() {
   var that = this;
   const {
      dialog
   } = require('electron').remote;
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

   // read the content of the file
   const fs = require('fs');
   fs.readFile(this.filePath, 'utf8', function(err, datastr) {
      if (null !== err) {
         alert(err);
      }
      else {
         var data = JSON.parse(datastr);
         that.tree.fromString(data.tree);
         that.partList.fromString(data.partList);
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
PTree.prototype.save = function(saveas) {

   // if the app as no file to work on
   // or if the app data must be save as a new file
   if (saveas || null === this.filePath) {
      // prompt the user
      const {
         dialog
      } = require('electron').remote;
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
      else return;
   }

   // save a reference to this PTree object
   var that = this;

   // open the file or create it if it does not exist
   const fs = require('fs');
   fs.open(this.filePath, 'w+', function(err, fd) {
      if (null === err) {
         // write the data
         var data = {
            version  : require('../package.json').version,
            tree     : that.tree.toString(),
            partList : that.partList.toString()
         };
         fs.write(fd, JSON.stringify(data));

         // mark the workspace as saved
         that.setSaved();

         // update the window title
         window.document.title = that.filePath;
      }
      else {
         alert(err);
      }
   });
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


// undo an action
PTree.prototype.undo = function() {
   // unselect any item in the canvas
   this.canvas.unselectItem();
   // restore the previous tree in the history
   var readIndex = (0 === this.history.index) ? 0 : --this.history.index;
   this.tree.fromString(this.history.list[readIndex]);
   this.canvas.refresh();
   // mark the workspace as unsaved
   this.setUnsaved();
   // update the UI
   this.updateUndoRedoButtons();
};


// redo un action
PTree.prototype.redo = function() {
   // restore the next tree in the history
   var readIndex = (this.history.index == this.history.list.length - 1) ? this.history.list.length - 1 : ++this.history.index;
   this.tree.fromString(this.history.list[readIndex]);
   this.canvas.refresh();
   // mark the workspace as unsaved
   this.setUnsaved();
   // update the UI
   this.updateUndoRedoButtons();
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


// listen to all events on canvas
PTree.prototype.listenCanvas = function() {
   // save 'this' to use into event callbacks
   var that = this;

   // click (mouse button pressed) on an object in the canvas
   this.canvas.fabricCanvas.on('mouse:down', function(e) {
      var fabric_obj = e.target;
      // if the fabric obj is an "item"
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
         that.canvas.selectItem(fabric_obj.item);
         that.updateUpDownButtons();
         that.canvas.fabricCanvas.dragedItem = fabric_obj.item;
         that.canvas.fabricCanvas.defaultCursor = "move";
      }
      else {
         that.canvas.unselectItem(true);
      }
   });

   // mouse button released (click or drop) on an object in the canvas
   this.canvas.fabricCanvas.on('mouse:up', function(e) {
      var fabric_obj = e.target;
      var dragedItem = that.canvas.fabricCanvas.dragedItem;

      // if the event occured on a fabric obj (on an "item")
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
         var receiverItem = fabric_obj.item;
         // if the receiver item is different than the dragged item
         if (receiverItem.id !== dragedItem.id) {
            // if the receiver item is a source
            if (receiverItem.isSource()) {
               // if the receiver item is not a child of the dragged items
               if (!receiverItem.isChildOf(dragedItem)) {
                  // mobe the item into the receiver
                  dragedItem.moveTo(receiverItem);
                  that.canvas.refresh();
                  that.saveHistory();
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
               $(".item_info").fadeOut(200);
            }
         }
         else {
            $(".item_info").fadeOut(100);
         }
      }
   });


   // Edit item on double click
   $(that.canvas.canvas$).parent().dblclick(function() {
      if (null !== that.canvas.getSelectedItem()) {
         that.canvas.getSelectedItem().edit();
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
};


// listen to all events on the top-menu of the Tree view
PTree.prototype.listenTreeMenu = function() {
   var that = this;


   // open a new window to manipulate the part list
   $('#bt_partTable').click(function() {
      // require ipcRenderer to send/receive message with main.js
      const {
         ipcRenderer
      } = require('electron');

      // ask main.js to edit the item with the given data and wait for a response
      var partListString = ipcRenderer.sendSync('partTable-request', that.tree.toString(), that.partList.toString());

      // update the partList
      that.partList.fromString(partListString);

      // update consumptions
      that.tree.refreshConsumptions(that.partList);
      that.canvas.refresh();
      that.setUnsaved();
   });


   // open a new window to see stats
   $('#bt_stats').click(function() {

   });


   // create a new tree within the same project
   $('#bt_clear').click(function() {
      if (!$(this).hasClass('disabled')) {
         that.canvas.unselectItem();
         that.tree.clear();
         that.canvas.refresh();
         that.updateClearButtons();
         that.saveHistory();
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
   });


   // show the correct modal for edition
   $('#bt_edit').click(function() {
      that.canvas.getSelectedItem().edit();
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
      if (!$(this).hasClass('disabled')) {
         that.undo();
         that.updateClearButtons();
      }
   });


   // redo action
   $('#bt_redo').click(function() {
      if (!$(this).hasClass('disabled')) {
         that.redo();
         that.updateClearButtons();
      }
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


   // export the canvas as an Image
   $('#bt_export_img').click(function() {
      downloadDataURL(that.canvas.toJPEGdataURL(), 'ptree.jpg');
   });


   // toggle the config bar
   $('#bt_config').click(function() {
      $('#bottom_menu').slideToggle(500, 'swing');

      $('.config_checkbox').each(function() {
         $(this).prop('checked', that.canvas.config[$(this).data('config')]);
      });

      $('.config_range').each(function() {
         $(this).val(that.canvas.config[$(this).data('config')]);
      });
   });
};
