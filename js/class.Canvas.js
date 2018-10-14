// -----------------------------------------------------------------------------
// Canvas Class
//    Describes the canvas item (using Fabric.js) associated with a Tree Item
//    Provides method to manipulate the Canvas with the Tree data
//    Events on the Fabric item are also listen in the constructor
// -----------------------------------------------------------------------------

const {fabric} = require('fabric');
const Util = require('../js/class.Util.js');

class Canvas {

  constructor(html_id, tree, partList) {
    this.tree         = tree;              // a reference to the tree
    this.partList     = partList;          // a reference to the partlist
    this.html_id      = html_id;           // the html ID of the canvas
    this.canvas$      = $('#' + html_id);  // reference to the jquery object
    this.selectedItem = null;              // by default, no selected item
    this.copiedItem   = null;              // by default, no copied item
    this.size         = {line:0,col:0};    // grid size, default is empty: 0,0
    this.config       = {};                // config will be set below

    // canvas main characs that will be updated by the user
    this.setDefaultConfig();

    // Create the canvas with Fabric
    this.fabricCanvas = new fabric.Canvas(this.html_id, Canvas.fabric_template.canvas);
    this.fabricCanvas.dragedItem = null;
    this.fabricCanvas.selection = false;
  }


  // Set the canvas config to default
  // update v1.2.0: add show_V, I & P
  setDefaultConfig() {
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
      align_load   : false,
      proportional : false,
      zoom         : 100,
      cell_width   : Canvas.app_template.cell.width,
      cell_height  : Canvas.app_template.cell.height,
      text_size    : Canvas.app_template.text.size
    };
  }


  // Import external config, prevent abandonned config in older versions
  // new in v1.2.0
  setConfig(new_config) {
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
  }


  // add any item to the canvas
  addItem(item) {
    // Needed when exporting to jpeg (no alpha)
    this.fabricCanvas.setBackgroundColor('#FFFFFF');

    let parent        = item.getParent();

    let item_width    = Canvas.app_template.item.width_coef   * this.config.cell_width;
    let item_height   = Canvas.app_template.item.height_coef  * this.config.cell_height;
    let nodeNet_left  = Canvas.app_template.nodeNet.left_coef * this.config.cell_width;


    // create a rectangle with the correct template
    // and add it to the canvas
    let itemRect = new fabric.Rect(Canvas.fabric_template[item.type]);
    let item_col = (this.config.align_load && item.isLoad()) ? this.size.col : item.col;
    itemRect.set({
      left  : (item_col  * this.config.cell_width ) + Canvas.app_template.canvas.margin_left,
      top   : (item.line * this.config.cell_height) + Canvas.app_template.canvas.margin_top ,
      width : item_width,
      height: item_height,
      fill  : item.characs.color
    });

    // Print the name of sources and loads
    let text = '';
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

    let itemText = new fabric.Text(text, Canvas.fabric_template.text);
    itemText.set({
      'originX'   : 'center',
      'originY'   : 'center',
      'textAlign' : 'center',
      'top'       : itemRect.top  + itemRect.height / 2,
      'left'      : itemRect.left + itemRect.width  / 2,
      'fill'      : Util.getOpositeBorW(item.characs.color),
      'fontSize'  : this.config.text_size
    });

    // group the rect and the name and add it to canvas
    let itemGroup = new fabric.Group([itemRect, itemText], Canvas.fabric_template.group);
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
        let vtext = '';
        if(this.config.show_vtyp)                          vtext += item.getVoltage('typ', 'out', 3, true);
        if(this.config.show_vtyp && this.config.show_vmax) vtext += ' / ';
        if(this.config.show_vmax)                          vtext += item.getVoltage('max', 'out', 3, true);
        let itemText_vout = new fabric.Text(vtext, Canvas.fabric_template.text);
        itemText_vout.set({
          'originX'  : 'left',
          'originY'  : 'bottom',
          'top'      : itemGroup.top  + itemGroup.height / 2 - Canvas.app_template.text.margin_y,
          'left'     : itemGroup.left + itemGroup.width      + Canvas.app_template.text.margin_x,
          'fontSize' : this.config.text_size
        });
        this.fabricCanvas.add(itemText_vout);

      }

      // Print the Iout and/or Pout of sources
      if(this.config.show_ityp || this.config.show_imax || this.config.show_ptyp || this.config.show_pmax) {

        // Prepare the text for Iout and/or Pout
        let iptext = '';
        if(this.config.show_ityp)                          iptext += item.getCurrent('typ', 'out', 3, true);
        if(this.config.show_ityp && this.config.show_imax) iptext += ' / ';
        if(this.config.show_imax)                          iptext += item.getCurrent('max', 'out', 3, true);

        if((this.config.show_ityp || this.config.show_imax) && (this.config.show_ptyp || this.config.show_pmax))
          iptext += '\n';

        if(this.config.show_ptyp)                          iptext += item.getPower('typ', 'out', 3, true);
        if(this.config.show_ptyp && this.config.show_pmax) iptext += ' / ';
        if(this.config.show_pmax)                          iptext += item.getPower('max', 'out', 3, true);

        // Print the prepared text
        let itemText_ipout = new fabric.Text(iptext, Canvas.fabric_template.text);
        itemText_ipout.set({
          'originX' : 'left',
          'originY' : 'top',
          'top'     : itemGroup.top  + itemGroup.height / 2 + Canvas.app_template.text.margin_y,
          'left'    : itemGroup.left + itemGroup.width      + Canvas.app_template.text.margin_x,
          'fontSize': this.config.text_size
        });
        this.fabricCanvas.add(itemText_ipout);
      }
    }


    // --------------------------------------------------------------------------
    // Process the nets around the source

    // compute errors when the group and the rect are not the same size (ex: text overflow)
    let width_error  = (itemRect.get('width' ) - itemGroup.get('width' ) + 1) / 2;
    let height_error = (itemRect.get('height') - itemGroup.get('height') + 1) / 2;


    let totalpower = this.tree.getRoot().getOutputPower('typ');

    // if the item is a source and has children, process the output nets
    if (item.isSource() && item.childrenID.length > 0) {
      // init the style of the net
      let outputNetStyle = Object.assign({},Canvas.fabric_template.net);

      // adjust the proportions of the net according to the power ratio
      if(this.config.proportional) {
        let outputNetRatio = item.getOutputPower('typ')/totalpower;
        outputNetStyle.stroke      = Util.pickColorHex(Canvas.app_template.proportion.color_max, Canvas.app_template.proportion.color_min, outputNetRatio);
        outputNetStyle.strokeWidth = outputNetRatio * Canvas.app_template.proportion.width_max + Canvas.app_template.proportion.width_min;
      }

      // if the item is hidden, the output net is dashed
      if(!item.isVisible()) {
        outputNetStyle.strokeDashArray = [6, 6];
      }

      // create the fabric item
      let outputNet = new fabric.Line([
        Math.round(itemGroup.get('left') + item_width   - width_error),
        Math.round(itemGroup.get('top' ) + item_height / 2 - outputNetStyle.strokeWidth / 2 - height_error),
        Math.round(itemGroup.get('left') + nodeNet_left - width_error),
        Math.round(itemGroup.get('top' ) + item_height / 2 - outputNetStyle.strokeWidth / 2 - height_error)
      ], outputNetStyle);

      // add the net to the canvas
      this.fabricCanvas.add(outputNet);
      outputNet.sendToBack();
    }

    // set the parent net to canvas at the correct coords if it exist
    if (!item.isRoot() && !item.isChildOfRoot()) {
      // init the style of the net
      let inputNetStyle = Object.assign({},Canvas.fabric_template.net);
      let offset = (this.config.align_load && item.isLoad()) ? (this.size.col - parent.col -1) * this.config.cell_width : 0;

      // adjust the proportions of the net according to the power ratio
      if(this.config.proportional) {
        let inputNetRatio = item.getInputPower('typ')/totalpower;
        inputNetStyle.stroke      = Util.pickColorHex(Canvas.app_template.proportion.color_max, Canvas.app_template.proportion.color_min, inputNetRatio);
        inputNetStyle.strokeWidth = inputNetRatio * Canvas.app_template.proportion.width_max + Canvas.app_template.proportion.width_min;
      }

      // create the fabric item
      let inputNet = new fabric.Line([
        Math.round(itemGroup.get('left') - inputNetStyle.strokeWidth - width_error),
        Math.round(itemGroup.get('top' ) + item_height / 2 - inputNetStyle.strokeWidth / 2 - height_error),
        Math.round(itemGroup.get('left') - (this.config.cell_width - nodeNet_left) - width_error - offset),
        Math.round(itemGroup.get('top' ) + item_height / 2 - inputNetStyle.strokeWidth / 2 - height_error),
      ], inputNetStyle);

      // add the net to the canvas
      this.fabricCanvas.add(inputNet);
      inputNet.sendToBack();


      // if the item is the last child of its parent, process the childNodeNet of its inputNet
      if (item.child_index == (parent.childrenID.length - 1) && parent.childrenID.length > 1) {
        // init the style of the net
        let verticalNetStyle = Object.assign({},Canvas.fabric_template.net);

        // adjust the proportions of the net according to the power ratio
        if(this.config.proportional) {
          let verticalNetRatio = item.getParent().getOutputPower('typ')/totalpower;
          verticalNetStyle.stroke      = Util.pickColorHex(Canvas.app_template.proportion.color_max, Canvas.app_template.proportion.color_min, verticalNetRatio);
          verticalNetStyle.strokeWidth = verticalNetRatio * Canvas.app_template.proportion.width_max + Canvas.app_template.proportion.width_min;
        }

        // set the outputNet_node to canvas at the correct coords
        let verticalNet = new fabric.Line([
          inputNet.get('x2'),
          Math.round((parent.line * this.config.cell_height) + Canvas.app_template.canvas.margin_top + item_height / 2 - verticalNetStyle.strokeWidth / 2),
          inputNet.get('x2'),
          inputNet.get('y2') - verticalNetStyle.strokeWidth
        ], verticalNetStyle);

        // add the net to the canvas
        this.fabricCanvas.add(verticalNet);
      }
    }
  }


  // add the given item and all its children to the canvas
  // passing the root will add everything
  // passing a load will only add the load
  addItems(item) {
    // add the item to the canvas
    this.addItem(item);

    if(item.isVisible()) {
      // recursively add all the item children to the canvas
      for (let childID of item.childrenID) {
        let child = item.tree.getItem(childID);
        this.addItems(child);
      }
    }
  }


  // compute the coordinate (line,col) of all items on the grid
  // also keep the max line and col as the canva size
  // this function is recursive, starting from the Root and continue with all items
  setItemsCoord(item) {
    // if item is not given, start with the root and reinit the size
    if (undefined === item || item.isRoot()) {
      this.size = {line:0,col:0};
      item = this.tree.getRoot();
      item.line = 0;
      item.col  = -1;
    }
    // else, if it is any item
    else {
      let parent = item.getParent();

      // the col of an item must be the parent col+1
      item.col = parent.col + 1;

      // if the item is the first child, its line is the same as its parent
      if (0 === item.child_index) {
        item.line = parent.line;
      }
      // else if it is not the first, its line is set according to the precedentChild
      else {
        let precedentChild = this.tree.getItem(parent.childrenID[item.child_index - 1]);
        // if the precedent child is visible
        if(precedentChild.isVisible()) {
          // the item line is next one, plus an offset depending of the precedent child descendants
          item.line = precedentChild.line + 1 + precedentChild.nextOffset;
        }
        // if the precedent child is hidden
        else {
          // the item line is the next one, without offset
          item.line = precedentChild.line + 1;
        }
      }

      // remind if this line is the max of the canvas
      if(item.line > this.size.line) this.size.line = item.line;
      // remind if this col is the max of the canvas
      // also, if the max col is a source and the load must be aligned, add +1 to keep extra space for the cols
      if(item.col  > this.size.col ) this.size.col  = (this.config.align_load && item.isSource()) ? item.col + 1 : item.col ;
    }

    // continue, recursively, with all the item children
    for (let childID of item.childrenID) {
      let child = item.tree.getItem(childID);
      this.setItemsCoord(child);
    }
  }


  // clean the canvas and reprint everything
  refresh() {
    // save the scroll position
    let scroll_position = [$(document).scrollTop(), $(document).scrollLeft()];

    // get the selected item
    let selected_item = this.getSelectedItem();

    // init the canvas
    this.fabricCanvas.clear();
    this.fabricCanvas.line = 0;
    this.fabricCanvas.col  = 0;
    this.fabricCanvas.fabric_obj = [];

    // compute the coords of all items
    this.setItemsCoord();

    // reprint the canvas by adding the root and all its children
    this.addItems(this.tree.getRoot());

    // adjust the canvas size and zoom
    this.resize();

    // render the Fabric item
    this.fabricCanvas.renderAll();

    // reselect the item if it has been deselected
    if (null !== selected_item) this.selectItem(selected_item);

    // set the scroll as like it was before canvas modifications
    $(document).scrollTop (scroll_position[0]);
    $(document).scrollLeft(scroll_position[1]);

    // refresh the total power
    this.refreshTotalPower();

    // refresh the config
    this.refreshConfig();
  }


  // Refresh the total power and efficiency table
  refreshTotalPower() {
    // refresh the total power
    const totalpower = this.tree.getTotalPower();
    $('.totalpower.typ').text(Util.numberToSi(totalpower.typ,3));
    $('.totalpower.max').text(Util.numberToSi(totalpower.max,3));

    // refresh the total efficiency
    const efficiency = this.tree.getTotalEfficiency();
    $('.totaleff.typ').text(Util.numberToSi(efficiency.typ,3));
    $('.totaleff.max').text(Util.numberToSi(efficiency.max,3));
  }


  // Refresh the config html inputs
  refreshConfig() {
    $('.config_checkbox').each((index, elt) => {
      $(elt).prop('checked', this.config[$(elt).data('config')]);
    });

    $('.config_range').each((index, elt) => {
      let val = this.config[$(elt).data('config')];
      $(elt).val(val);
      $(elt).prev('.range_val').text(val);
    });
  }


  // resize the canvas size to fit its content and refresh its zoom factor
  resize() {
    // get the zoom factor
    let zoom = this.config.zoom/100;

    // compute the minimum size of the canvas according to the lines/cols
    let canvas_minwidth1  = (this.size.col +1) * this.config.cell_width  * zoom;
    let canvas_minheight1 = (this.size.line+1) * this.config.cell_height * zoom + Canvas.app_template.canvas.margin_top + Canvas.app_template.canvas.margin_bottom;

    // compute the minimum size of the canvas according to the window
    let canvas_minwidth2  = $(window).width()  - parseInt($('body').css('margin-left'));
    let canvas_minheight2 = $(window).height() - parseInt($('body').css('margin-top' ));

    // define the canvas size at either the grid or the window size
    let canvas_minwidth  = (canvas_minwidth2  < canvas_minwidth1 ) ? canvas_minwidth1  : canvas_minwidth2;
    let canvas_minheight = (canvas_minheight2 < canvas_minheight1) ? canvas_minheight1 : canvas_minheight2;

    // set the canvas size, eventualy zoomed
    this.fabricCanvas.setDimensions({
      'width' : canvas_minwidth ,
      'height': canvas_minheight,
    });

    // set the fabric canvas zoom
    this.fabricCanvas.setZoom(zoom);
  }


  // Select an item (by its fabric object)
  selectItem(item) {
    // get the fabric obj of the selected item
    let fabric_obj = this.fabricCanvas.fabric_obj[item.id].rect;

    // deselect the last item
    this.unselectItem(false);

    // set the correct style on the fabric rect
    fabric_obj.set(Canvas.fabric_template.selected);
    this.fabricCanvas.renderAll();

    // save a ref to the precedent item
    this.selectedItem = item;

    // show/hide menus depending of the item type
    let ctrl = $('#item_control');
    ctrl.removeClass('item_control_source item_control_load');
    ctrl.addClass('item_control_' + item.type);
    ctrl.css({
      'box-shadow': 'inset 0 -3px 0 0 ' + item.characs.color
    });

    // if the item is a load
    if (item.isLoad() && item.isInPartlist()) {
      this.showParts(item);
    }
    else {
      this.hideParts();
    }

    // upade the show/hide button
    if(item.isSource()) {
      $('#bt_hide').show();
      $('#bt_hide > a').html((item.isVisible()) ? '<span class="fa fa-lg fa-eye-slash"></span> Hide' : '<span class="fa fa-lg fa-eye"></span> Show');
    }
    else {
      $('#bt_hide').hide();
    }

    // fadeIn the menu
    $('#item_control').fadeIn(200);
  }


  // Deselect an item..
  unselectItem(fade) {
    if (undefined !== this.selectedItem && null !== this.selectedItem) {
      this.fabricCanvas.fabric_obj[this.selectedItem.id].rect.set(Canvas.fabric_template.deselected);
      this.fabricCanvas.renderAll();
    }
    this.selectedItem = null;

    if (fade) {
      $('#item_control').fadeOut(200);
      $('.item_info').fadeOut(200);
      this.hideParts();
    }
  }


  // return the selected item
  getSelectedItem() {
    return this.selectedItem;
  }


  // return the copied item
  getCopiedItem() {
    return this.copiedItem;
  }


  // Display info under an item
  displayInfo(item) {
    let fabric_obj = this.fabricCanvas.fabric_obj[item.id];
    $('.item_info').hide();
    $('.item_info_data td:not(.item_info_name)').empty();

    let left        = 0;
    let top         = 0;
    let fade        = 0;
    let margin      = 10;
    let item_width  = Canvas.app_template.item.width_coef * this.config.cell_width;
    let item_height = Canvas.app_template.item.height_coef * this.config.cell_height;
    let zoom = this.config.zoom/100;

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
      left = this.canvas$.offset().left + fabric_obj.get('left')*zoom                        - $('#item_info_left').outerWidth(true) - margin;
      top  = this.canvas$.offset().top  + fabric_obj.get('top' )*zoom + item_height*zoom / 2 - $('#item_info_left').outerHeight() / 2;
      $('#item_info_left').css({
        'left': left + 'px',
        'top' : top  + 'px'
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
      left = this.canvas$.offset().left + fabric_obj.get('left')*zoom + item_width*zoom + margin;
      top  = this.canvas$.offset().top  + fabric_obj.get('top' )*zoom + item_height*zoom / 2 - $('#item_info_right').outerHeight() / 2;
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
        left = this.canvas$.offset().left + fabric_obj.get('left')*zoom + item_width *zoom / 2 - $('#item_info_center').outerWidth(true) / 2;
        top  = this.canvas$.offset().top  + fabric_obj.get('top') *zoom + item_height*zoom + margin;
        $('#item_info_center').css({
          'left': left + 'px',
          'top' : top  + 'px'
        });

        // show the info div
        $('#item_info_center').fadeIn(fade);
      }
    }
  }


  // Export the canvas as a JPEG image within a dataURL object
  toJPEGdataURL() {
    // save the reference of the eventual selected item (may be null)
    let selected = this.getSelectedItem();
    this.unselectItem();

    // save and reset the zoom factor
    let zoom = this.config.zoom;
    this.config.zoom = 100;
    this.refresh();

    // get the dataURL from the Fabric object (only the usefull part of the canvas)
    let dataURL = this.fabricCanvas.toDataURL({
      format     : 'jpeg',
      quality    : 1,
      multiplier : 1.5
    });

    // select any previous selected item
    if (null !== selected) this.selectItem(selected);

    // set back the zoom
    this.config.zoom = zoom;
    this.refresh();

    // return the dataURL to be downloaded
    return dataURL;
  }


  // Display a tab containing all the parts consuming on the given load
  showParts(load) {
    $('#part_table tbody').empty();

    let noparts = true;
    this.partList.forEachPart((part) => {
      if (part.isConsuming(load)) {
        noparts = false;
        $('#part_table tbody').append(
          `<tr>
          <td class="part_data part_name">${part.characs.name}</td>
          <td class="part_data part_ityp part_i">${part.getConsumption(load, 'typ')}</td>
          <td class="part_data part_imax part_i">${part.getConsumption(load, 'max')}</td>
          </tr>`
        );
      }
    });

    if (noparts) {
      $('#part_table tbody').append(
        `<tr>
        <td colspan="3" class="part_data part_nopart">No part found</td>
        </tr>`
      );
    }

    $('#part_table').fadeIn(200);
  }


  // Hide the tab containing the parts
  hideParts() {
    $('#part_table').fadeOut(200);
  }
}

// Default values for canvas
Canvas.app_template = {
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
  proportion : {
    width_min : 1,
    width_max : 10,
    color_min : '#D0D0D0',
    color_max : '#000000'
  },
  text: {
    margin_x : 10,
    margin_y : 3,
    size     : 14
  }
};

// Default values for fabric items
Canvas.fabric_template = {
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
    width      : Canvas.app_template.cell.width * Canvas.app_template.item.width_coef,
    height     : Canvas.app_template.cell.height * Canvas.app_template.item.height_coef,
    selectable : false
  },
  load: {
    fill       : '#00bfa5', // materializ teal accent-4
    width      : Canvas.app_template.cell.width * Canvas.app_template.item.width_coef,
    height     : Canvas.app_template.cell.height * Canvas.app_template.item.height_coef,
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
    fontSize   : Canvas.app_template.text.size,
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
    stroke          : '#616161',
    strokeDashArray : [15, 8]
  }
};

module.exports = Canvas;
