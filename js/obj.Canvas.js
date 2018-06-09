// -----------------------------------------------------------------------------
// Canvas constructors
//    Describes the canvas item (using Fabric.js) associated with a Tree Item
//    Provides method to manipulate the Canvas with the Tree data
//    Events on the Fabric item are also listen in the constructor
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Template definitions for canvas elements
// -----------------------------------------------------------------------------

// Default values for canvas
const app_template = {
   canvas: {
      margin_top    : 30,
      margin_left   : 30,
      margin_bottom : 70,
   },
   cell: {
      width  : 280,
      height : 90
   },
   item: {
      width_coef  : 0.45,
      height_coef : 0.75,
   },
   nodeNet: {
      left_coef : 0.9
   },
   text: {
      margin_x : 10,
      margin_y : 3
   }
};

// Default values for fabric items
const fabric_template = {
   canvas: {
      backgroundColor: '#FFFFFF'
   },
   root: {
      width      : 0,
      height     : 0,
      fill       : 'rgba(0,0,0,0)',
      selectable : false
   },
   source: {
      fill       : '#FF1744', // materialze red accent-3
      width      : app_template.cell.width * app_template.item.width_coef,
      height     : app_template.cell.height * app_template.item.height_coef,
      selectable : false
   },
   load: {
      fill       : '#00bfa5', // materializ teal accent-4
      width      : app_template.cell.width * app_template.item.width_coef,
      height     : app_template.cell.height * app_template.item.height_coef,
      rx         : 20,
      ry         : 20,
      selectable : false
   },
   group: {
      selectable : false
   },
   net: {
      stroke        : '#424242',
      strokeWidth   : 2,
      strokeLineCap : 'square',
      selectable    : false
   },
   text: {
      fontSize   : 14,
      fontFamily : 'Arial',
      selectable : false
   },
   selected: {
      strokeWidth : 5,
      stroke      : '#616161'
   },
   deselected: {
      strokeWidth : 0
   },
   receiver: {
      strokeWidth     : 7,
      stroke          : 'rgba(100,100,100,1)',
      strokeDashArray : [15, 8]
   }
};


// -----------------------------------------------------------------------------
// Tree canvas object constructor
// -----------------------------------------------------------------------------

var Canvas = function(html_id, tree, partList) {
   this.tree         = tree;              // a reference to the tree
   this.partList     = partList;          // a reference to the partlist
   this.html_id      = html_id;           // the html ID of the canvas
   this.canvas$      = $('#' + html_id);  // reference to the jquery object
   this.selectedItem = null;              // by default, no selected item
   this.copiedItem   = null;              // by default, no copied item
   this.config       = {};                // config will be set below

   // canvas main characs that will be updated by the user
   this.setDefaultConfig();

   // Create the canvas with Fabric
   this.fabricCanvas = new fabric.Canvas(this.html_id, fabric_template.canvas);
   this.fabricCanvas.dragedItem = null;
   this.fabricCanvas.selection = false;
};


// Set the canvas config to default
// update v1.2.0: add show_V, I & P
Canvas.prototype.setDefaultConfig = function() {
   this.config = {
      show_vtyp    : true,
      show_ityp    : true,
      show_ptyp    : true,
      show_vmax    : true,
      show_imax    : true,
      show_pmax    : true,
      show_name    : true,
      show_ref     : true,
      show_custom1 : true,
      cell_width   : app_template.cell.width,
      cell_height  : app_template.cell.height,
   };
};


// Import external config, prevent abandonned config in older versions
// new in v1.2.0
Canvas.prototype.getConfig = function(new_config) {
   // get all existing configs
   for(let config_prop in this.config) {
      if (this.config.hasOwnProperty(config_prop)) {
         // if there is an corresponding config in the import
         if(undefined !== new_config[config_prop]) {
            // copy the config
            this.config[config_prop] = new_config[config_prop];
         }
      }
   }
};


// add any item to the canvas
Canvas.prototype.addItem = function(item) {
   // FIXME: find why the following line is needed when exporting as JPEG...
   this.fabricCanvas.setBackgroundColor('#FFFFFF');

   var parent        = item.getParent();

   var item_width    = app_template.item.width_coef * this.config.cell_width;
   var item_height   = app_template.item.height_coef * this.config.cell_height;
   var nodeNet_left  = app_template.nodeNet.left_coef * this.config.cell_width;


   // --------------------------------------------------------------------------
   // First, process the item itself

   // init col & line as pure integer or coefficient (not pixels)
   item.col  = 0;
   item.line = 0;

   // set the item coords if it has parent
   if (null !== parent && undefined !== parent) {
      item.col = parent.col + 1;

      // if the item is the first child, its line is the same as its parent
      if (0 === item.child_index) {
         item.line = parent.line;
      }
      // else if it is not the first, its line is set according to the precedentChild
      else {
         var precedentChild = this.tree.getItem(parent.childrenID[item.child_index - 1]);
         item.line = precedentChild.line + 1 + precedentChild.nextOffset;
      }
   }
   else {
      item.col = -1;
   }


   // create a rectangle with the correct template
   // and add it to the canvas
   var itemRect = new fabric.Rect(fabric_template[item.type]);
   itemRect.set({
      left  : (item.col  * this.config.cell_width ) + app_template.canvas.margin_left,
      top   : (item.line * this.config.cell_height) + app_template.canvas.margin_top ,
      width : item_width,
      height: item_height,
      fill  : item.characs.color
   });

   // Print the name of sources and loads
   var text = '';
   if (this.config.show_name) {
      text += item.characs.name;
   }
   if ('source' == item.type && this.config.show_ref && undefined !== item.characs.ref && '' !== item.characs.ref) {
      if ('' !== text) text += '\n';
      text += item.characs.ref;
   }
   if (this.config.show_custom1 && undefined !== item.characs.custom1 && '' !== item.characs.custom1) {
      if ('' !== text) text += '\n';
      text += item.characs.custom1;
   }

   var itemText = new fabric.Text(text, fabric_template.text);
   itemText.set({
      'originX'   : 'center',
      'originY'   : 'center',
      'textAlign' : 'center',
      'top'       : itemRect.top  + itemRect.height / 2,
      'left'      : itemRect.left + itemRect.width  / 2,
      'fill'      : getOpositeBorW(item.characs.color)
   });

   // group the rect and the name and add it to canvas
   var itemGroup = new fabric.Group([itemRect, itemText], fabric_template.group);
   itemGroup.item = item;
   itemGroup.rect = itemRect;
   itemGroup.name = itemText;
   this.fabricCanvas.fabric_obj[item.id] = itemGroup;
   this.fabricCanvas.add(itemGroup);

   // --------------------------------------------------------------------------
   // Add some text around the item

   // Process text around sources
      if ('source' == item.type) {
      if(this.config.show_vtyp || this.config.show_vmax) {
         // Print the Vout of sources
         var vtext = '';
         if(this.config.show_vtyp)                          vtext += item.getVoltage('typ', 'out', 3, true);
         if(this.config.show_vtyp && this.config.show_vmax) vtext += ' / ';
         if(this.config.show_vmax)                          vtext += item.getVoltage('max', 'out', 3, true);
         var itemText_vout = new fabric.Text(vtext, fabric_template.text);
         itemText_vout.set({
            'originX': 'left',
            'originY': 'bottom',
            'top'    : itemGroup.top  + itemGroup.height / 2 - app_template.text.margin_y,
            'left'   : itemGroup.left + itemGroup.width      + app_template.text.margin_x,
         });
         this.fabricCanvas.add(itemText_vout);

      }

      // Print the Iout and/or Pout of sources
      if(this.config.show_ityp || this.config.show_imax || this.config.show_ptyp || this.config.show_pmax) {

         // Prepare the text for Iout and/or Pout
         var iptext = "";
         if(this.config.show_ityp)                          iptext += item.getCurrent('typ', 'out', 3, true);
         if(this.config.show_ityp && this.config.show_imax) iptext += ' / ';
         if(this.config.show_imax)                          iptext += item.getCurrent('max', 'out', 3, true);

         if((this.config.show_ityp || this.config.show_imax) && (this.config.show_ptyp || this.config.show_pmax))
                                                            iptext += '\n';

         if(this.config.show_ptyp)                          iptext += item.getPower('typ', 'out', 3, true);
         if(this.config.show_ptyp && this.config.show_pmax) iptext += ' / ';
         if(this.config.show_pmax)                          iptext += item.getPower('max', 'out', 3, true);

         // Print the prepared text
         var itemText_ipout = new fabric.Text(iptext, fabric_template.text);
         itemText_ipout.set({
            'originX': 'left',
            'originY': 'top',
            'top'    : itemGroup.top  + itemGroup.height / 2 + app_template.text.margin_y,
            'left'   : itemGroup.left + itemGroup.width      + app_template.text.margin_x,
         });
         this.fabricCanvas.add(itemText_ipout);
      }
   }




   // --------------------------------------------------------------------------
   // Process the nets around the source

   // compute errors when the group and the rect are not the same size (ex: text overflow)
   var width_error  = (itemRect.get('width' ) - itemGroup.get('width' ) + 1) / 2;
   var height_error = (itemRect.get('height') - itemGroup.get('height') + 1) / 2;

   // if the item is a source and has children, process the child nets
   if ('source' == item.type && item.childrenID.length > 0) {

      // set the childNet to canvas at the correct coords
      var childNet = new fabric.Line([
         Math.round(itemGroup.get('left') + item_width   - width_error),
         Math.round(itemGroup.get('top' ) + item_height / 2 - fabric_template.net.strokeWidth / 2 - height_error),
         Math.round(itemGroup.get('left') + nodeNet_left - width_error),
         Math.round(itemGroup.get('top' ) + item_height / 2 - fabric_template.net.strokeWidth / 2 - height_error)
      ], fabric_template.net);
      this.fabricCanvas.add(childNet);
      childNet.sendToBack();
   }

   // set the parent net to canvas at the correct coords if it exist
   if (null !== parent && 'root' != parent.type) {
      // set the fabric item
      var parentNet = new fabric.Line([
         Math.round(itemGroup.get('left') - fabric_template.net.strokeWidth - width_error),
         Math.round(itemGroup.get('top' ) + item_height / 2 - fabric_template.net.strokeWidth / 2 - height_error),
         Math.round(itemGroup.get('left') - (this.config.cell_width - nodeNet_left) - width_error),
         Math.round(itemGroup.get('top' ) + item_height / 2 - fabric_template.net.strokeWidth / 2 - height_error),
      ], fabric_template.net);
      this.fabricCanvas.add(parentNet);
      parentNet.sendToBack();


      // if the item is the last child of its parent, process the childNode_net of its parentNet
      if (item.child_index == (parent.childrenID.length - 1) && parent.childrenID.length > 1) {
         // set the childNet_node to canvas at the correct coords
         var parentNode_net = new fabric.Line([
            parentNet.get('x2'),
            Math.round((parent.line * this.config.cell_height) + app_template.canvas.margin_top + item_height / 2 - fabric_template.net.strokeWidth / 2),
            parentNet.get('x2'),
            parentNet.get('y2')
         ], fabric_template.net);
         this.fabricCanvas.add(parentNode_net);
         parentNode_net.sendToBack();
      }
   }


   // --------------------------------------------------------------------------
   // Resize the canvas : it mus be the same size as the window to trig unselections

   // check if the item is outside the actual grid, and enlarge the grid if needed
   if (item.col  >= this.fabricCanvas.col ) this.fabricCanvas.col  = item.col  + 1;
   if (item.line >= this.fabricCanvas.line) this.fabricCanvas.line = item.line + 1;
   // compute the minimum size of the canvas according to the lines/cols
   var canvas_minwidth  = this.fabricCanvas.col  * this.config.cell_width;
   var canvas_minheight = this.fabricCanvas.line * this.config.cell_height + app_template.canvas.margin_top;
   // compute the minimum size of the canvas according to the window
   var canvas_minwidth2  = $(window).width()  - parseInt($('body').css('margin-left')); // - $('#canvas').offset().left;
   var canvas_minheight2 = $(window).height() - parseInt($('body').css('margin-top' )); // - $('#canvas').offset().top;
   // set the canvas size at either the grid or the window size
   this.fabricCanvas.setDimensions({
      'width' : (canvas_minwidth2  < canvas_minwidth ) ? canvas_minwidth  : canvas_minwidth2,
      'height': (canvas_minheight2 < canvas_minheight) ? canvas_minheight : canvas_minheight2
   });
};


// add the given item and all its children to the canvas
// passing the root will add everything
// passing a load will only add the load
Canvas.prototype.addItems = function(item) {
   // add the item to the canvas
   this.addItem(item);

   // recursively add all the item children to the canvas
   for (let childID of item.childrenID) {
      var child = item.tree.getItem(childID);
      this.addItems(child);
   }
};

// clean the canvas and reprint everything
Canvas.prototype.refresh = function() {
   // save the scroll position
   var scroll_position = [$(document).scrollTop(), $(document).scrollLeft()];
   // get the selected item
   var selected_item = this.getSelectedItem();
   // clear the canvas
   this.fabricCanvas.clear();
   this.fabricCanvas.line = 0;
   this.fabricCanvas.col  = 0;
   this.fabricCanvas.fabric_obj = [];
   // reprint the canvas by adding the root and all its children
   this.addItems(this.tree.getRoot());
   this.fabricCanvas.renderAll();
   // reselect the item if it has been deselected
   if (null !== selected_item) this.selectItem(selected_item);
   // set the scroll as saved before canvas modifications
   $(document).scrollTop (scroll_position[0]);
   $(document).scrollLeft(scroll_position[1]);
   // refresh the config
   this.refreshConfig();
};


// Refresh the config html inputs
Canvas.prototype.refreshConfig = function() {
   var that = this;
   $('.config_checkbox').each(function() {
      $(this).prop('checked', that.config[$(this).data('config')]);
   });

   $('.config_range').each(function() {
      $(this).val(that.config[$(this).data('config')]);
   });
};


// Select an item (by its fabric object)
Canvas.prototype.selectItem = function(item) {
   // get the fabric obj of the selected item
   var fabric_obj = this.fabricCanvas.fabric_obj[item.id].rect;

   // deselect the last item
   this.unselectItem(false);

   // set the correct style on the fabric rect
   fabric_obj.set(fabric_template.selected);
   this.fabricCanvas.renderAll();

   // save a ref to the precedent item
   this.selectedItem = item;

   // show/hide menus depending of the item type
   var ctrl = $('#item_control');
   ctrl.removeClass('item_control_source item_control_load');
   ctrl.addClass('item_control_' + item.type);
   ctrl.css({
      'box-shadow': 'inset 0 -3px 0 0 ' + item.characs.color
   });

   // if the item is a load
   if (item.isLoad()) {
      this.showParts(item);
   }
   else {
      this.hideParts();
   }

   // fadeIn the menu
   $('#item_control').fadeIn(200);
};


// Deselect an item..
Canvas.prototype.unselectItem = function(fade) {
   if (undefined !== this.selectedItem && null !== this.selectedItem) {
      this.fabricCanvas.fabric_obj[this.selectedItem.id].rect.set(fabric_template.deselected);
      this.fabricCanvas.renderAll();
   }
   this.selectedItem = null;

   if (fade) {
      $('#item_control').fadeOut(200);
      $('.item_info').fadeOut(200);
      this.hideParts();
   }
};


// return the selected item
Canvas.prototype.getSelectedItem = function() {
   return this.selectedItem;
};


// return the copied item
Canvas.prototype.getCopiedItem = function() {
   return this.copiedItem;
};


// Display info under an item
Canvas.prototype.displayInfo = function(item) {
   var text = '';

   var fabric_obj = this.fabricCanvas.fabric_obj[item.id];
   $('.item_info').hide();
   $('.item_info_data td:not(.item_info_name)').empty();

   var left        = 0;
   var top         = 0;
   var fade        = 0;
   var margin      = 10;
   var item_width  = app_template.item.width_coef * this.config.cell_width;
   var item_height = app_template.item.height_coef * this.config.cell_height;


   // if the item has an input
   if (0 !== item.parentID) {
      // print the values
      $('#vin_typ').text(item.getVoltage('typ', 'in', 3, true));
      $('#vin_max').text(item.getVoltage('max', 'in', 3, true));
      $('#iin_typ').text(item.getCurrent('typ', 'in', 3, true));
      $('#iin_max').text(item.getCurrent('max', 'in', 3, true));
      $('#pin_typ').text(item.getPower  ('typ', 'in', 3, true));
      $('#pin_max').text(item.getPower  ('max', 'in', 3, true));

      // move the info div next to the item
      left = this.canvas$.offset().left + fabric_obj.get('left') - $('#item_info_left').outerWidth(true) - margin;
      top  = this.canvas$.offset().top  + fabric_obj.get('top' ) + item_height / 2 - $('#item_info_left').outerHeight() / 2;
      $('#item_info_left').css({
         'left': left + 'px',
         'top': top + 'px'
      });

      // show the info div
      $('#item_info_left').fadeIn(fade);
   }

   // if the item has an output
   if ('load' != item.type) {
      $('#vout_typ').text(item.getVoltage('typ', 'out', 3, true));
      $('#vout_max').text(item.getVoltage('max', 'out', 3, true));
      $('#iout_typ').text(item.getCurrent('typ', 'out', 3, true));
      $('#iout_max').text(item.getCurrent('max', 'out', 3, true));
      $('#pout_typ').text(item.getPower  ('typ', 'out', 3, true));
      $('#pout_max').text(item.getPower  ('max', 'out', 3, true));

      // move the info div next to the item
      left = $('#canvas').offset().left + fabric_obj.get('left') + item_width + margin;
      top  = $('#canvas').offset().top  + fabric_obj.get('top' ) + item_height / 2 - $('#item_info_right').outerHeight() / 2;
      $('#item_info_right').css({
         'left': left + 'px',
         'top' : top  + 'px'
      });

      // show the info div
      $('#item_info_right').fadeIn(fade);

      // if the item has an input AND an output
      if (0 !== item.parentID) {
         // print the values
         $('#loss_typ').text(item.getPower('typ', 'loss', 3, true));
         $('#loss_max').text(item.getPower('max', 'loss', 3, true));

         // move the info div next to the item
         left = $('#canvas').offset().left + fabric_obj.get('left') + item_width / 2 - $('#item_info_center').outerWidth(true) / 2;
         top  = $('#canvas').offset().top  + fabric_obj.get('top')  + item_height + margin;
         $('#item_info_center').css({
            'left': left + 'px',
            'top' : top  + 'px'
         });

         // show the info div
         $('#item_info_center').fadeIn(fade);
      }
   }
};


// Export the canvas as a JPEG image within a dataURL object
Canvas.prototype.toJPEGdataURL = function() {
   // save the reference of the eventual selected item (may be null)
   var selected = this.getSelectedItem();
   this.unselectItem();

   // get the dataURL from the Fabric object (only the usefull part of the canvas)
   var dataURL = this.fabricCanvas.toDataURL({
      format   : 'jpeg',
      quality  : 1,
      width    : this.fabricCanvas.col  * this.config.cell_width,
      height   : this.fabricCanvas.line * this.config.cell_height + app_template.canvas.margin_top
   });

   // select any previous selected item
   if (null !== selected) this.selectItem(selected);

   // return the dataURL to be downloaded
   return dataURL;
};


// Display a tab containing all the parts consuming on the given load
Canvas.prototype.showParts = function(load) {
   $("#part_table tbody").empty();

   var noparts = true;
   this.partList.forEachPart(function(part) {
      if (part.isConsuming(load)) {
         noparts = false;
         $("#part_table tbody").append(
            `<tr>
               <td class="part_data part_name">${part.characs.name}</td>
               <td class="part_data part_ityp part_i">${part.getConsumption(load, 'typ')}</td>
               <td class="part_data part_imax part_i">${part.getConsumption(load, 'max')}</td>
            </tr>`);
      }
   });

   if (noparts) {
      $("#part_table tbody").append(
         `<tr>
            <td colspan="3" class="part_data part_nopart">No part found</td>
         </tr>`);
   }

   $("#part_table").fadeIn(200);
};


// Hide the tab containing the parts
Canvas.prototype.hideParts = function() {
   $("#part_table").fadeOut(200);
};
