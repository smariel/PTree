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
    this.tree             = tree;              // a reference to the tree
    this.partList         = partList;          // a reference to the partlist
    this.html_id          = html_id;           // the html ID of the canvas
    this.canvas$          = $('#' + html_id);  // reference to the jquery object
    this.selectedItem     = null;              // by default, no selected item
    this.copiedItem       = null;              // by default, no copied item
    this.rightClickedItem = null,              // by default, no clicked item
    this.size             = {line:0,col:0};    // grid size, default is empty: 0,0
    this.config           = {};                // config will be set below

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
      show_badges  : true,
      align_load   : false,
      proportional : false,
      loss_color   : false,
      zoom         : 100,
      zoom_export  : 100,
      cell_width   : 280,
      cell_height  : 90,
      text_size    : 14,
      color_source : '#FF1744', // materialze red accent-3,
      color_load   : '#00bfa5', // materializ teal accent-4
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


  // add the given item and all its children to the canvas
  // passing the root will add everything
  // passing a load will only add the load
  addItems(item) {
    // add the item to the canvas
    if(!item.isRoot()) this.addItem(item);

    if(item.isVisible()) {
      // recursively add all the item children to the canvas
      for (let childID of item.childrenID) {
        let child = item.tree.getItem(childID);
        this.addItems(child);
      }
    }
  }


  // add any item to the canvas
  addItem(item) {
    // Needed when exporting to jpeg (no alpha)
    this.fabricCanvas.setBackgroundColor('#FFFFFF');

    // prepare usefull values
    let itemTemplate = item.getFabricTemplate();
    let item_color   = (this.config.loss_color) ? item.lossColor : item.characs.color;
    if (this.config.align_load && item.isLoad()) item.col = this.size.col;

    // compute the main dimensions
    let itemGeometry = {};
    itemGeometry.height     = Math.round(Canvas.app_template.item.height_coef  * this.config.cell_height);
    itemGeometry.skew_error = (undefined === itemTemplate.skewX) ? 0 : Math.round(itemGeometry.height/Math.tan(-itemTemplate.skewX));
    itemGeometry.width      = Math.round(Canvas.app_template.item.width_coef   * this.config.cell_width) - itemGeometry.skew_error;
    itemGeometry.x1         = (item.col  * this.config.cell_width ) + Canvas.app_template.canvas.margin_left;
    itemGeometry.y1         = (item.line * this.config.cell_height) + Canvas.app_template.canvas.margin_top;
    itemGeometry.x2         = itemGeometry.x1 + itemGeometry.width;
    itemGeometry.y2         = itemGeometry.y1 + itemGeometry.height;
    itemGeometry.xvnet      = itemGeometry.x1 + Math.round(this.config.cell_width * Canvas.app_template.verticalNet.left_coef);
    itemGeometry.xhalf      = itemGeometry.x1 + Math.round(itemGeometry.width /2 + itemGeometry.skew_error/2);
    itemGeometry.yhalf      = itemGeometry.y1 + Math.round(itemGeometry.height/2);


    // create a rectangle with the correct template
    // and add it to the canvas
    let itemRect = new fabric.Rect(itemTemplate);
    itemRect.set({
      left  : itemGeometry.x1,
      top   : itemGeometry.y1,
      width : itemGeometry.width,
      height: itemGeometry.height,
      fill  : item_color,
    });

    // Print the name of sources and loads
    let text = '';
    if (this.config.show_name) {
      text += item.characs.name;
    }
    if (this.config.show_ref && item.isSource() && '' !== item.characs.ref && undefined !== item.characs.ref) {
      if ('' !== text) text += '\n';
      text += item.characs.ref;
    }
    if (this.config.show_custom1 && '' !== item.characs.custom1 && undefined !== item.characs.custom1) {
      if ('' !== text) text += '\n';
      text += item.characs.custom1;
    }

    let itemText = new fabric.Text(text, Canvas.fabric_template.text);
    itemText.set({
      originX   : 'center',
      originY   : 'center',
      textAlign : 'center',
      top       : itemGeometry.yhalf,
      left      : itemGeometry.xhalf,
      fill      : Util.getOpositeBorW(item_color),
      fontSize  : this.config.text_size
    });

    // group the rect and the name and add it to canvas
    let itemGroup      = new fabric.Group([itemRect, itemText], Canvas.fabric_template.group);
    itemGroup.item     = item;
    itemGroup.rect     = itemRect;
    itemGroup.name     = itemText;
    itemGroup.geometry = itemGeometry;
    this.fabricCanvas.fabric_obj[item.id] = itemGroup;
    this.fabricCanvas.add(itemGroup);

    // Add some text around the item
    this.addTexts(item, itemGeometry);

    // Process the nets around the source
    this.addNets(item, itemGeometry);

    // Print the badges
    this.addBadges(item, itemGeometry);
  }


  // add the texts around an item to the canvas
  addTexts(item, itemGeometry) {
    // Process text around sources
    if (item.isSource()) {
      if(this.config.show_vtyp || this.config.show_vmax) {
        // Print the Vout of sources
        let vtext = '';
        if(this.config.show_vtyp)                          vtext += item.getVoltage('typ', 'out', 3, true);
        if(this.config.show_vtyp && this.config.show_vmax) vtext += ' / ';
        if(this.config.show_vmax)                          vtext += item.getVoltage('max', 'out', 3, true);
        let itemText_vout = new fabric.Text(vtext, Canvas.fabric_template.text);
        itemText_vout.set({
          originX  : 'left',
          originY  : 'top',
          top      : itemGeometry.yhalf - Canvas.app_template.text.margin_y - this.config.text_size,
          left     : itemGeometry.x2    + Canvas.app_template.text.margin_x + itemGeometry.skew_error,
          fontSize : this.config.text_size
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
          originX : 'left',
          originY : 'top',
          top     : itemGeometry.yhalf + Canvas.app_template.text.margin_y - 2,
          left    : itemGeometry.x2    + Canvas.app_template.text.margin_x + itemGeometry.skew_error,
          fontSize: this.config.text_size
        });
        this.fabricCanvas.add(itemText_ipout);
      }
    }
  }


  // add the nets of an item to the canvas
  addNets(item, itemGeometry) {
    // if the item is a source and has children, process the output nets
    if (item.isSource() && item.childrenID.length > 0) {
      let oNet = {};
      let vNet = {};
      oNet.style = Object.assign({},Canvas.fabric_template.net);
      vNet.style = Object.assign({},Canvas.fabric_template.net);

      // adjust the proportions of the net according to the power ratio
      if(this.config.proportional) {
        let totalpower         = this.tree.getRoot().getOutputPower('typ');
        let oNetRatio          = item.getOutputPower('typ') / totalpower;
        oNet.style.stroke      = vNet.style.stroke      = Util.pickColorHex(Canvas.app_template.proportion.color_max, Canvas.app_template.proportion.color_min, oNetRatio);
        oNet.style.strokeWidth = vNet.style.strokeWidth = Math.round(oNetRatio * Canvas.app_template.proportion.width_max + Canvas.app_template.proportion.width_min);
      }

      // if the item is hidden, the output net is dashed and the vNet is not shown
      if(!item.isVisible()) {
        oNet.style.strokeDashArray = [6, 6];
      }

      // prepare the output net position and style
      // outside of the condition to re-use data for the input net (may be optimized...)
      oNet.x1 = itemGeometry.x2;
      oNet.y1 = itemGeometry.yhalf - Math.round(oNet.style.strokeWidth/2);
      oNet.x2 = itemGeometry.xvnet - oNet.style.strokeWidth;
      oNet.y2 = oNet.y1;

      // create the fabric line and add it to the canvas
      oNet.fabricLine = new fabric.Line([oNet.x1, oNet.y1, oNet.x2, oNet.y2], oNet.style);
      this.fabricCanvas.add(oNet.fabricLine);
      oNet.fabricLine.sendToBack();

      if(item.childrenID.length > 1) {
        // prepare the vertical net position and style
        let lastChild = this.tree.getItem(item.childrenID[item.childrenID.length-1]);
        vNet.x1 = itemGeometry.xvnet - vNet.style.strokeWidth;
        vNet.y1 = itemGeometry.yhalf;
        vNet.x2 = vNet.x1;
        vNet.y2 = vNet.y1 + Math.round((lastChild.line - item.line) * this.config.cell_height) - vNet.style.strokeWidth;

        // create the fabric line and add it to the canvas
        vNet.fabricLine = new fabric.Line([vNet.x1, vNet.y1, vNet.x2, vNet.y2], vNet.style);
        this.fabricCanvas.add(vNet.fabricLine);
        vNet.fabricLine.sendToBack();
      }
    }

    // if the item is a load or a source that is not child of root (= a source that has an input)
    if(item.isLoad() || !item.isChildOfRoot()) {
      let iNet = {};
      iNet.style = Object.assign({},Canvas.fabric_template.net);

      // adjust the proportions of the net according to the power ratio
      if(this.config.proportional) {
        let totalpower         = this.tree.getRoot().getOutputPower('typ');
        let iNetRatio          = item.getInputPower('typ') / totalpower;
        iNet.style.stroke      = Util.pickColorHex(Canvas.app_template.proportion.color_max, Canvas.app_template.proportion.color_min, iNetRatio);
        iNet.style.strokeWidth = Math.round(iNetRatio * Canvas.app_template.proportion.width_max + Canvas.app_template.proportion.width_min);
      }

      // prepare the input net position and style
      let parent = this.tree.getItem(item.parentID);
      iNet.x1 = itemGeometry.xvnet - iNet.style.strokeWidth - this.config.cell_width*(item.col - parent.col);
      iNet.y1 = itemGeometry.yhalf - Math.round(iNet.style.strokeWidth/2);
      iNet.x2 = itemGeometry.x1 - iNet.style.strokeWidth + itemGeometry.skew_error;
      iNet.y2 = iNet.y1;

      // create the fabric line and add it to the canvas
      iNet.fabricLine = new fabric.Line([iNet.x1, iNet.y1, iNet.x2, iNet.y2], iNet.style);
      this.fabricCanvas.add(iNet.fabricLine);
      iNet.fabricLine.sendToBack();
    }
  }


  // add the badges of an item to the canvas
  addBadges(item, itemGeometry) {
    if(this.config.show_badges) {
      // input badge
      if(!item.isRoot() && !item.isChildOfRoot() && '' !== item.characs.badge_in) {
        // circle
        let badge_in = new fabric.Circle(Canvas.fabric_template.badge);
        badge_in.set({
          originX : 'center',
          originY : 'center',
          left    : itemGeometry.x1,
          top     : itemGeometry.yhalf,
        });

        // text
        let badge_in_text = new fabric.Text(item.characs.badge_in, Canvas.fabric_template.text);
        badge_in_text.set({
          originX   : 'center',
          originY   : 'center',
          textAlign : 'center',
          left      : itemGeometry.x1,
          top       : itemGeometry.yhalf,
          fontSize  : 12
        });

        // group the circle and the text and add it to canvas
        let badge_in_group = new fabric.Group([badge_in, badge_in_text], {evented: false});
        this.fabricCanvas.add(badge_in_group);
      }

      // output badge
      if(item.isSource() && '' !== item.characs.badge_out) {
        // circle
        let badge_out = new fabric.Circle(Canvas.fabric_template.badge);
        badge_out.set({
          originX : 'center',
          originY : 'center',
          left    : itemGeometry.x2,
          top     : itemGeometry.yhalf,
        });

        // text
        let badge_out_text = new fabric.Text(item.characs.badge_out, Canvas.fabric_template.text);
        badge_out_text.set({
          originX   : 'center',
          originY   : 'center',
          textAlign : 'center',
          left      : itemGeometry.x2,
          top       : itemGeometry.yhalf,
          fontSize  : 12
        });

        // group the circle and the text and add it to canvas
        let badge_out_group = new fabric.Group([badge_out, badge_out_text], {evented: false});
        this.fabricCanvas.add(badge_out_group);
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


  // compute the custom color of each items
  // sources color according to their loss
  // loads color set to black
  setItemsLossColor() {
    // get the maximum power loss
    let max_loss = 0;
    this.tree.forEachSource((source) => {
      let loss = source.getPowerLoss('typ');
      if(loss > max_loss) max_loss = loss;
    });

    // set the color to each item
    let default_color = Util.getMetalColor(0);
    this.tree.forEachItem((item) => {
      if(item.isSource()) {
        if(item.isChildOfRoot()) {
          item.lossColor = '#000000';
        }
        else {
          item.lossColor = (0 === max_loss) ? default_color : Util.getMetalColor(item.getPowerLoss('typ')/max_loss);
        }
      }
      else {
        item.lossColor = '#000000';
      }
    });

    $('#color_legend_max').text(`${Util.numberToSi(max_loss,3)}W`);
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

    // compite the item custom loss color
    if(this.config.loss_color) {
      this.setItemsLossColor();
      $('#color_legend').show();
    }
    else {
      $('#color_legend').hide();
    }

    // compute the coords of all items
    this.setItemsCoord();

    // reprint the canvas by adding the root and all its children
    this.addItems(this.tree.getRoot());

    // adjust the canvas size and zoom
    this.resize();

    // render the Fabric item
    this.fabricCanvas.renderAll();

    // reselect the item if it has been deselected (only in canvas)
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

    // refresh the total losses
    const dcdcloss = this.tree.getTotalDCDCloss();
    $('.totaldcdcloss.typ').text(Util.numberToSi(dcdcloss.typ,3));
    $('.totaldcdcloss.max').text(Util.numberToSi(dcdcloss.max,3));

    // refresh the total losses
    const ldoloss = this.tree.getTotalLDOloss();
    $('.totalldoloss.typ').text(Util.numberToSi(ldoloss.typ,3));
    $('.totalldoloss.max').text(Util.numberToSi(ldoloss.max,3));
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

    $('.config_color').each((index, elt) => {
      let val = this.config[$(elt).data('config')];
      $(elt).val(val);
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

    // set the correct style on the fabric rect
    fabric_obj.set(Canvas.fabric_template.selected);
    this.fabricCanvas.renderAll();

    // save a ref to the precedent item
    this.selectedItem = item;
  }


  // Deselect an item..
  unselectItem() {
    if (undefined !== this.selectedItem && null !== this.selectedItem) {
      this.fabricCanvas.fabric_obj[this.selectedItem.id].rect.set(Canvas.fabric_template.deselected);
      this.fabricCanvas.renderAll();
    }
    this.selectedItem = null;
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
    let zoom = this.config.zoom/100;

    // if the item has an input
    if (!item.isChildOfRoot()) {
      // print the values
      $('#vin_typ').text(item.getVoltage('typ', 'in', 3, true));
      $('#vin_max').text(item.getVoltage('max', 'in', 3, true));
      $('#iin_typ').text(item.getCurrent('typ', 'in', 3, true));
      $('#iin_max').text(item.getCurrent('max', 'in', 3, true));
      $('#pin_typ').text(item.getPower  ('typ', 'in', 3, true));
      $('#pin_max').text(item.getPower  ('max', 'in', 3, true));

      // move the info div next to the item
      left = this.canvas$.offset().left + fabric_obj.geometry.x1*zoom    - $('#item_info_left').outerWidth(true) - margin;
      top  = this.canvas$.offset().top  + fabric_obj.geometry.yhalf*zoom - $('#item_info_left').outerHeight() / 2;
      $('#item_info_left').css({
        'left': left + 'px',
        'top' : top  + 'px'
      });

      // show the info div
      $('#item_info_left').fadeIn(fade);
    }

    // if the item has an output
    if (!item.isLoad()) {
      $('#vout_typ').text(item.getVoltage('typ', 'out', 3, true));
      $('#vout_max').text(item.getVoltage('max', 'out', 3, true));
      $('#iout_typ').text(item.getCurrent('typ', 'out', 3, true));
      $('#iout_max').text(item.getCurrent('max', 'out', 3, true));
      $('#pout_typ').text(item.getPower  ('typ', 'out', 3, true));
      $('#pout_max').text(item.getPower  ('max', 'out', 3, true));

      // move the info div next to the item
      left = this.canvas$.offset().left + fabric_obj.geometry.x2*zoom    + margin;
      top  = this.canvas$.offset().top  + fabric_obj.geometry.yhalf*zoom - $('#item_info_left').outerHeight() / 2;
      $('#item_info_right').css({
        'left': left + 'px',
        'top' : top  + 'px'
      });

      // show the info div
      $('#item_info_right').fadeIn(fade);

      // if the item has an input AND an output
      if (!item.isChildOfRoot()) {
        // print the values
        $('#loss_typ').text(item.getPower('typ', 'loss', 3, true));
        $('#loss_max').text(item.getPower('max', 'loss', 3, true));
        $('#eff_typ').text(`${Util.numberToSi(item.getEfficiency('typ')*100, 3)}%`);
        $('#eff_max').text(`${Util.numberToSi(item.getEfficiency('max')*100, 3)}%`);

        // move the info div next to the item
        left = this.canvas$.offset().left + fabric_obj.geometry.xhalf*zoom - $('#item_info_center').outerWidth(true) / 2;
        top  = this.canvas$.offset().top  + fabric_obj.geometry.y2*zoom    + margin;
        $('#item_info_center').css({
          'left': left + 'px',
          'top' : top  + 'px'
        });

        // show the info div
        $('#item_info_center').fadeIn(fade);
      }
    }
  }

  // Export the canvas as a JPEG image within an ObjectURL
  // must export to blob then convert to ObjectURL instead of DataURL
  // because Chrome can't download a DataURL>2MB but has no limit for ObjectURL
  toJPEGdataURL() {
    // save the reference of the eventual selected item (may be null)
    let selected = this.getSelectedItem();

    // save the zoom factor and apply the zoom for export
    let zoom = this.config.zoom;
    this.config.zoom = this.config.zoom_export;
    this.refresh();

    return new Promise(resolve => {
      this.canvas$[0].toBlob((blob) => {
        // set back the zoom
        this.config.zoom = zoom;
        this.refresh();

        // convert the blob to ObjectURL
        let dataURL = URL.createObjectURL(blob);

        // select any previous selected item (only in canvas)
        if (null !== selected) this.selectItem(selected);

        resolve(dataURL);
      }, 'image/jpeg', 1);

    });
  }
}

// Default values for canvas
Canvas.app_template = {
  canvas: {
    margin_top    : 30,
    margin_left   : 30,
    margin_bottom : 70,
  },
  item: {
    width_coef  : 0.45,
    height_coef : 0.75,
  },
  verticalNet: {
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
    margin_y : 5,
  }
};

// Default values for fabric items
Canvas.fabric_template = {
  canvas: {
    backgroundColor: '#FFFFFF',
    fireRightClick : true
  },
  group: {
    selectable : false
  },
  badge: {
    fill          : '#FFFFFF',
    radius        : 12,
    stroke        : '#424242',
    strokeWidth   : 2,
    selectable    : false,
    evented       : false
  },
  net: {
    stroke        : '#424242',
    strokeWidth   : 2,
    strokeLineCap : 'square',
    selectable    : false
  },
  text: {
    fontFamily : 'Arial',
    selectable : false,
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
