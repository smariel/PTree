// -----------------------------------------------------------------------------
// PTree Class
//    A PTree object represent the whole PowerTree application
//    It contains every methods, data, UI and sub-objects
//    It only needs a selector on the Canvas HTML item
//    See synop.jpg for more informations
// -----------------------------------------------------------------------------

const Tree     = require('../js/class.Tree.js');
const PartList = require('../js/class.PartList.js');
const Canvas   = require('../js/class.Canvas.js');
const Util     = require('../js/class.Util.js');

class PTree {

  constructor(canvas_selector) {
    this.tree         = new Tree();
    this.partList     = new PartList();
    this.canvas       = new Canvas(canvas_selector, this.tree, this.partList);
    this.statsAreOpen = false;
    this.filePath     = null;
    this.unsaved      = false;
    this.history      = {list: [], index: 0};

    this.setSheet(null);
    this.listenCanvas();
    this.listenTopMenu();
    this.listenConfigMenu();
    this.listenDOM();
    this.listenKeyboard();
    this.listenMessages();
    this.clearHistory();
    this.canvas.refresh();
    this.updateClearButtons();

    // set the window title
    window.document.title = 'Untitled';
  }


  // Reset the PTree object
  reset() {
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
    window.document.title = 'Untitled';
  }


  // load the app data from a file
  open(path=null) {
    if(null === path) {
      const {dialog} = require('electron').remote;
      const paths = dialog.showOpenDialog({
        title: 'Open...',
        properties: ['openFile'],
        filters: [
          { name: 'PTree project file', extensions: ['ptree'] },
          { name: 'JSON',               extensions: ['json']  },
          { name: 'All Files',          extensions: ['*']     }
        ]
      });

      // save the new path only if its not undefined (canceled)
      if (undefined !== paths) { this.filePath = paths[0]; }
      else { return; }
    }
    else {
      this.filePath = path;
    }

    // read the content of the file using node.js fs module
    const fs = require('fs');
    fs.readFile(this.filePath, 'utf8', (err, datastr) => {
      if (null !== err) {
        alert(err);
      }
      else {
        // reconstruct the tree from the data
        this.fromString(datastr).then(() => {
          // update the app environement
          this.clearHistory();
          this.canvas.refresh();
          this.setSaved();
          this.updateClearButtons();

          // update the window title
          window.document.title = this.filePath;
        });
      }
    });
  }


  // save the app data into a file
  save(saveas = false) {
    // do not try a simple save if it's not needed
    if(!saveas && !this.unsaved) {
      return false;
    }

    // if the app as no file to work on
    // or if the app data must be save as a new file
    if (saveas || null === this.filePath) {

      let name = ('string' === typeof this.filePath) ? require('path').parse(this.filePath).name+'_copy.ptree' : 'Untitled.ptree';

      // prompt the user
      const {dialog} = require('electron').remote;
      const path = dialog.showSaveDialog({
        title: 'Save as...',
        defaultPath: name,
        filters: [
          { name: 'PTree project file', extensions: ['ptree'] },
          { name: 'JSON',               extensions: ['json']  },
          { name: 'All Files',          extensions: ['*']     }
        ]
      });

      // save the new path only if its not undefined (canceled)
      if (undefined !== path) this.filePath = path;
      else return false;
    }

    // open the file or create it if it does not exist using node.js fs module
    const fs = require('fs');
    fs.open(this.filePath, 'w+', (err, fd) => {
      if (null === err) {
        // write the data
        let extradata = {version: require('../package.json').version};
        let data = this.toString(extradata);
        fs.writeSync(fd, data);

        // mark the workspace as saved
        this.setSaved();

        // update the window title
        window.document.title = this.filePath;
      }
      else {
        alert(err);
      }
    });

    return true;
  }


  // set the workspace as unsaved
  setUnsaved() {
    this.unsaved = true;
    $('#bt_save').removeClass('disabled');
  }


  // set the workspace as unsaved
  setSaved() {
    this.unsaved = false;
    $('#bt_save').addClass('disabled');
  }


  // empty the history and add only one data
  clearHistory() {
    // save the actual tree into the history
    const data = this.tree.toString();
    this.history.list  = [data];
    this.history.index = 0;
    this.updateUndoRedoButtons();
  }


  // save the app data into the history
  saveHistory() {
    // save the actual tree into the history
    const data = this.tree.toString();
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
  }


  // load data from the history at the given index (to undo/redo)
  loadHistory(index) {
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
  }


  // undo an action
  undo() {
    // is there a previous tree ?
    if (this.history.index > 0) {
      // load the previous tree in the history
      --this.history.index;
      this.loadHistory(this.history.index);
      this.canvas.unselectItem(true);
    }
  }


  // redo un action
  redo() {
    // is there a next tree ?
    if(this.history.index < this.history.list.length - 1) {
      // load the next tree in the history
      ++this.history.index;
      this.loadHistory(this.history.index);
      this.canvas.unselectItem(true);
    }
  }


  // open the part list and return the data
  async openPartList() {
    // prepare the request to open the partlist
    let requestOpenPartList = () => {
      return new Promise(resolve => {
        const {ipcRenderer} = require('electron');

        // listen to the response from main.js and resolve the promise
        ipcRenderer.once('PartList-editResp', (event, datastr) => {
          resolve(datastr);
        });

        // Send an IPC async msg to the main.js: request to edit the part list
        ipcRenderer.send('PartList-editReq', this.tree.toString(), this.partList.toString());
      });
    };

    // open the partlist and wait for the data
    let partListString = await requestOpenPartList();

    // if the part list was edited, update
    if(null !== partListString) {
      this.partList.fromString(partListString);
      this.tree.refreshConsumptions(this.partList, this.usersheet.sheet);
      this.canvas.refresh();
      this.setUnsaved();
    }
  }


  // Set the spreadsheet to sync with
  setSheet(usersheet) {
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
  }


  // Select a new spreadsheet to sync with
  async selectSheet(path=null) {
    // ask the user for a sheet
    let usersheet = await Util.getSpreadsheet(path, true, 'PTree');
    if (null === usersheet) return;
    // save the sheet and refresh Consumptions
    this.setSheet(usersheet);
    this.tree.refreshConsumptions(null, this.usersheet.sheet);
    this.canvas.refresh();
    this.setUnsaved();
  }


  // reload data from the spreadsheet
  async reloadSheet() {
    // if the file exist
    const fs = require('fs');
    if(fs.existsSync(this.usersheet.path)) {
      // reload the Spreadsheet from the file
      this.usersheet.sheet = await Util.getSpreadsheet(this.usersheet.path);
    }
  }


  // Return the PTree as a string
  // add extra properties to the string if needed
  toString(extra={}) {
    let data = {
      tree     : this.tree.toString(),
      partList : this.partList.toString(),
      usersheet: this.usersheet,
      config   : this.canvas.config
    };

    Object.assign(data, extra);

    return JSON.stringify(data);
  }


  async fromString(datastr) {
    // Try to parse the string
    let data = {};
    try {
      data = JSON.parse(datastr);
    }
    catch(parseError) {
      console.warn(parseError);
      alert ('Impossible to open this file.');
      return false;
    }

    // if the version number does not exist; prompt the user
    if(undefined === data.version) {
      let popupData = {
        title      : 'Incorrect file',
        width      : 500,
        height     : 135,
        sender     : 'PTree',
        content    : `<strong>This file does not appear to be a valid Power Tree.</strong><br />
                      This could result in an unexpected behavior. <br />
                      Do you still want to proceed ? `,
        btn_ok     : 'Proceed',
        btn_cancel : 'Cancel'
      };
      let popupRet = await Util.popup(popupData);
      if(!popupRet) return false;
    }

    // comapare the version of PTree with the version of the file (ignore 3rd digit)
    let packagejson = require('../package.json');
    let comp = Util.compareVersions(packagejson.version, data.version, 2);

    // The file was made with an older PTree
    if(comp === 1) {
      /*let popupData = {
        title      : 'Old file',
        width      : 520,
        height     : 225,
        sender     : 'PTree',
        content    : `<strong>This file was made with an older version of PTree.</strong><br />
                      This could result in an unexpected behavior. <br />
                      Do you still want to proceed ?<br />
                      <br />
                      <em>File: ${data.version}<br />
                      PTree: ${packagejson.version}</em>`,
        btn_ok     : 'Proceed',
        btn_cancel : 'Cancel'
      };
      let popupRet = await Util.popup(popupData);
      if(!popupRet) return false;*/
    }
    // The file was made with a newer PTree
    else if(comp === -1) {
      let popupData = {
        title      : 'Incorrect file',
        width      : 520,
        height     : 245,
        sender     : 'PTree',
        content    : `<strong>This file was made with a newer version of PTree.</strong><br />
                      This could result in an unexpected behavior. <br />
                      Do you want to download the new version of PTree ?<br />
                      <br />
                      <em>File: ${data.version}<br />
                      PTree: ${packagejson.version}</em>`,
        btn_ok     : 'Download',
        btn_cancel : 'Continue'
      };
      let popupRet = await Util.popup(popupData);
      if(popupRet) {
        // open the PTree home page in an external browser
        const {shell} = require('electron');
        shell.openExternal(packagejson.homepage);
      }
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
  }


  // Check GitHub for update
  checkUpdate() {
    // get informations about the latest release using GitHub API
    $.get('https://api.github.com/repos/smariel/ptree/releases/latest', async (github_data) => {
      // get the version of the latest release
      let latest_version = github_data.tag_name.substr(1);

      // get the current version
      const packagejson = require('../package.json');
      let this_version = packagejson.version;

      // if this version is older than the latest on github
      let version_comp = Util.compareVersions(this_version,latest_version);
      if(version_comp < 0) {
        // open a popup and propose the user to download
        let popupData = {
          title      : 'New version available',
          width      : 600,
          height     : 370,
          sender     : 'PTree',
          content    : `<p><strong>A new version of PTree is available !</strong><br />
                        You are using PTree v${this_version}. <br />
                        Would you like to download v${latest_version}? <br />
                        </p>
                        <div class="overflow"><h4>Release notes:</h4><p>${require('marked')(github_data.body)}</p></div>`,
          btn_ok     : 'Download',
          btn_cancel : 'Not now'
        };
        // if the user clicked on 'download'
        let popupRet = await Util.popup(popupData);
        if(popupRet) {
          // open the PTree home page in an external browser
          const {shell} = require('electron');
          shell.openExternal(packagejson.homepage);
        }
      }
      // else if this version is newer than the latest on github
      else if(version_comp > 0) {
        console.warn(`Running PTree v${this_version} which is newer than the last official v${latest_version} on GitHub`);
      }
    });
  }


  // enable or disable the undo/redo buttons
  updateUndoRedoButtons() {
    if (0 === this.history.index) {
      $('#bt_undo').addClass('disabled');
    }
    else {
      $('#bt_undo').removeClass('disabled');
    }

    if (this.history.index >= (this.history.list.length - 1)) {
      $('#bt_redo').addClass('disabled');
    }
    else {
      $('#bt_redo').removeClass('disabled');
    }
  }


  // enable or disable the clear buttons
  updateClearButtons() {
    if (0 === this.tree.getRoot().childrenID.length) {
      $('#bt_clear').addClass('disabled');
    }
    else {
      $('#bt_clear').removeClass('disabled');
    }
  }


  // Show/Hide up & down button depending on the position of the selected item
  updateUpDownButtons() {
    let item = this.canvas.getSelectedItem();

    if (null === item || 0 === item.child_index) {
      $('#bt_up').addClass('disabled');
    }
    else {
      $('#bt_up').removeClass('disabled');
    }

    if (null === item || item.getParent().childrenID.length - 1 == item.child_index) {
      $('#bt_down').addClass('disabled');
    }
    else {
      $('#bt_down').removeClass('disabled');
    }
  }


  // Show stats in the stat window (if it is open) for the given itemID
  updateStats(itemID) {
    if(this.statsAreOpen) {
      // Send an IPC async msg to main.js: request to update the item in Stats
      require('electron').ipcRenderer.send('Stats-updateItemReq', {
        itemID:       itemID,
        treeData:     this.tree.toString(),
        partListData: this.partList.toString()
      });
    }
  }


  // Toggle the option panel
  toggleOptions() {
    this.canvas.refreshConfig();
    $('#bottom_menu').slideToggle(300, 'swing');
  }


  // export the canvas as a JPEG Image
  async exportImg() {
    let name = ('string' === typeof this.filePath) ? require('path').parse(this.filePath).name+'.jpg' : 'ptree.jpg';
    let objectURL = await this.canvas.toJPEGdataURL();
    Util.downloadDataURL(objectURL, name);
  }


  // export a full report of the tree in a XLSX file
  exportReport() {
    // get the XLSX file name from the PTree file name
    let fileName = ('string' === typeof this.filePath) ? require('path').parse(this.filePath).name+'.xlsx' : 'ptree.xlsx';

    // create an XLSX empty workbook
    const XLSX = require('xlsx');
    let XLSX_workbook = XLSX.utils.book_new();

    // init an array of array for the regulator values
    let reg_values = [];

    // push the title line
    reg_values.push([
      'NAME',
      'PART NUMBER',
      'TYPE',
      'VIN TYP (V)',
      'VIN MAX (V)',
      'IIN TYP (A)',
      'IIN MAX (A)',
      'PIN TYP (W)',
      'PIN MAX (W)',
      'VOUT TYP (V)',
      'VOUT MAX (V)',
      'IOUT TYP (A)',
      'IOUT MAX (A)',
      'POUT TYP (W)',
      'POUT MAX (W)',
      'LOSS TYP (W)',
      'LOSS MAX (W)',
      'EFFICIENCY TYP (%)',
      'EFFICIENCY MAX (%)'
    ]);

    // push the data of each regulator as a new line
    this.tree.forEachSource((source) => {
      reg_values.push([
        source.characs.name,
        source.characs.ref,
        source.getType(),
        source.getInputVoltage('typ'),
        source.getInputVoltage('max'),
        source.getInputCurrent('typ'),
        source.getInputCurrent('max'),
        source.getInputPower('typ'),
        source.getInputPower('max'),
        source.getOutputVoltage('typ'),
        source.getOutputVoltage('max'),
        source.getOutputCurrent('typ'),
        source.getOutputCurrent('max'),
        source.getOutputPower('typ'),
        source.getOutputPower('max'),
        source.getPowerLoss('typ'),
        source.getPowerLoss('max'),
        source.getEfficiency('typ')*100,
        source.getEfficiency('max')*100
      ]);
    });

    // add the regulator array (of arrays) as a new worksheet in the work book
    const reg_worksheet = XLSX.utils.aoa_to_sheet(reg_values);
    XLSX.utils.book_append_sheet(XLSX_workbook, reg_worksheet, 'Regulators');


    // init an array of array for the regulator values
    let load_values = [];

    // push the title line
    load_values.push([
      'NAME',
      'TYPE',
      'VIN TYP (V)',
      'VIN MAX (V)',
      'IIN TYP (A)',
      'IIN MAX (A)',
      'PIN TYP (W)',
      'PIN MAX (W)'
    ]);

    // push the data of each load as a new line
    this.tree.forEachLoad((load) => {
      load_values.push([
        load.characs.name,
        load.getType(),
        load.getInputVoltage('typ'),
        load.getInputVoltage('max'),
        load.getInputCurrent('typ'),
        load.getInputCurrent('max'),
        load.getInputPower('typ'),
        load.getInputPower('max'),
      ]);
    });

    // add the load array (of arrays) as a new worksheet in the work book
    const load_worksheet = XLSX.utils.aoa_to_sheet(load_values);
    XLSX.utils.book_append_sheet(XLSX_workbook, load_worksheet, 'Loads');


    // download the workbook
    let wopts = {
      bookType: 'xlsx',
      bookSST:  false,
      type:     'array'
    };
    let wbout = XLSX.write(XLSX_workbook, wopts);
    Util.downloadData(wbout, fileName);
  }


  // listen to all events on canvas
  listenCanvas() {
    // click (mouse button pressed) on an object in the canvas
    this.canvas.fabricCanvas.on('mouse:down', (evt) => {
      let fabric_obj = evt.target;
      // if the fabric obj is an 'item', select it
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
        // select the item
        this.canvas.selectItem(fabric_obj.item);
        this.updateUpDownButtons();
        this.canvas.fabricCanvas.dragedItem = fabric_obj.item;
        this.canvas.fabricCanvas.defaultCursor = 'move';
        // show stats if they are already open
        this.updateStats(fabric_obj.item.id);
      }
      else {
        this.canvas.unselectItem(true);
        this.updateStats(null);
      }

      $('#bottom_menu').slideUp(300, 'swing');
    });

    // mouse button released (click or drop) on an object in the canvas
    this.canvas.fabricCanvas.on('mouse:up', (evt) => {
      let fabric_obj = evt.target;
      let dragedItem = this.canvas.fabricCanvas.dragedItem;

      // if the event occured on a fabric obj (on an 'item')
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item && null !== dragedItem) {
        let receiverItem = fabric_obj.item;
        // if the receiver item is different than the dragged item
        if (receiverItem.id !== dragedItem.id) {
          // if the receiver item is a source
          if (receiverItem.isSource()) {
            // if the receiver item is not a child of the dragged items
            if (!receiverItem.isChildOf(dragedItem)) {
              // move the item into the receiver and refresh the Tree
              dragedItem.moveTo(receiverItem);
              this.canvas.refresh();
              this.saveHistory();
              this.updateUpDownButtons();
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
          this.canvas.refresh();
          this.saveHistory();
        }
      }

      // in every cases, change the cursor to default and forget the dragedItem
      this.canvas.fabricCanvas.defaultCursor = 'default';
      this.canvas.fabricCanvas.dragedItem = null;
    });


    // mouse enter in an object on the canvas
    this.canvas.fabricCanvas.on('mouse:over', (evt) => {
      let fabric_obj = evt.target;
      // if the fabric obj is an 'item'
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
        let receiverItem = fabric_obj.item;
        let dragedItem = this.canvas.fabricCanvas.dragedItem;
        // if an item is being draged
        if (null !== dragedItem) {
          // change the receiver style if it can receive the dragged item
          if (fabric_obj.item.id !== dragedItem.id && receiverItem.isSource() && !receiverItem.isChildOf(dragedItem)) {
            fabric_obj.rect.set(Canvas.fabric_template.receiver);
            this.canvas.fabricCanvas.renderAll();
          }
        }
        // if no item is dragged, show the item infos
        else {
          this.canvas.displayInfo(receiverItem);
        }
      }
    });


    // mouse exit from an object on the canvas
    this.canvas.fabricCanvas.on('mouse:out', (evt) => {
      let fabric_obj = evt.target;
      // if the fabric obj is an 'item'
      if (null !== fabric_obj && undefined !== fabric_obj && undefined !== fabric_obj.item) {
        // if an item is being dragged
        if (null !== this.canvas.fabricCanvas.dragedItem) {
          // if the draged item is different than the exited item, reset the style
          if (fabric_obj.item.id !== this.canvas.fabricCanvas.dragedItem.id) {
            fabric_obj.rect.set(Canvas.fabric_template.deselected);
            this.canvas.fabricCanvas.renderAll();
          }
          // if the draged item IS the exited one, fadeOut the item infos
          else {
            $('.item_info').fadeOut(0);
          }
        }
        else {
          $('.item_info').fadeOut(0);
        }
      }
    });


    // Edit item on double click
    this.canvas.canvas$.parent().dblclick(async () => {
      if(null !== this.canvas.getSelectedItem()) {
        await this.canvas.getSelectedItem().edit(this.partList, this.usersheet.sheet);
        this.canvas.refresh();
        this.saveHistory();
      }
    });


    // Mouse wheel turning
    this.canvas.canvas$.parent().on('wheel',(evt) => {
      if(evt.originalEvent.ctrlKey) {
        $('#config_zoom').trigger(evt);
      }
    });
  }


  // listen DOM events (except for the top and config menu)
  listenDOM() {
    // refresh the canvas when the window is resized
    // could be slow, may be recoded
    $(window).resize(() => {
      this.canvas.refresh();
    });

    // the user dropped an object anywhere on the window
    document.addEventListener('drop', async (event) => {
      event.preventDefault();

      // extract the valid paths to ptree project files
      let ptree_files = [];
      for(let file of event.dataTransfer.files) {
        // check the path with Node.js Fs and Path native modules
        if(require('fs').statSync(file.path).isFile() && '.ptree' == require('path').extname(file.path)) {
          ptree_files.push(file);
        }
      }

      // one object droped, open it
      if(1 === ptree_files.length) {
        this.open(ptree_files[0].path);
      }
      // multiple objects droped
      else if(ptree_files.length > 1) {
        // ask the user which file to use
        let popupData = {
          type       : 'list',
          title      : 'Which file to open',
          width      : 500,
          height     : 140,
          sender     : 'PTree',
          content    : 'Multiple files where droped. Which PTree object should be open ?<br />Please choose one: <select id="list"></select>',
          btn_ok     : 'Open',
          list       : ptree_files.map((f) => {return {val:f.path, text:f.name};})
        };

        // open the selected file
        this.open(await Util.popup(popupData));
      }
    });
  }


  // listen to all events on the top-menu of the Tree view
  listenTopMenu() {
    // open a new window to manipulate the part list
    $('#bt_partlist').click(() => {
      this.openPartList();
    });


    // open a new window to see stats
    $('#bt_stats').click(() => {
      // Send an IPC async msg to the main.js: request to open the stats window
      require('electron').ipcRenderer.send('Stats-openReq', {
        itemID:       (null === this.canvas.getSelectedItem()) ? null : this.canvas.getSelectedItem().id,
        treeData:     this.tree.toString(),
        partListData: this.partList.toString()
      });
      this.statsAreOpen = true;
    });


    // create a new project
    $('#bt_new').click(async () => {
      // if current project is unsaved, popup
      if(this.unsaved) {
        let popupData = {
          title      : 'Save before continue?',
          width      : 500,
          height     : 135,
          sender     : 'PTree',
          content    : `<strong>You have made changes which were not saved.</strong><br />
          Are you sure you want to continue?`,
          btn_ok     : 'Cancel',
          btn_cancel : 'Continue without saving'
        };

        // Cancel was clicked
        let popupRet = await Util.popup(popupData);
        if(popupRet) return false;
      }

      this.reset();
    });


    // create a new tree within the same project
    $('#bt_clear').click((evt) => {
      if (!$(evt.currentTarget).hasClass('disabled')) {
        this.canvas.unselectItem(true);
        this.tree.clear();
        this.canvas.refresh();
        this.updateClearButtons();
        this.saveHistory();
        this.updateStats(null);
      }
    });


    // add a perfet source to the root when the button is clicked
    $('#bt_addrootsource').click(() => {
      let newItem = this.tree.addSourceToRoot();
      newItem.characs.color = this.canvas.config.color_source;
      newItem.characs.regtype = 7;
      this.canvas.refresh();
      this.updateClearButtons();
      this.saveHistory();
      this.canvas.selectItem(newItem);
    });


    // remove the item when clicked
    $('#bt_remove').click(() => {
      this.canvas.getSelectedItem().remove();
      this.canvas.unselectItem(true);
      this.canvas.refresh();
      this.updateClearButtons();
      this.saveHistory();
      this.updateStats(null);
    });


    // show the correct modal for edition
    $('#bt_edit').click(async () => {
      await this.canvas.getSelectedItem().edit(this.partList, this.usersheet.sheet);
      this.canvas.refresh();
      this.saveHistory();
    });


    // Add a child source to the selected item
    $('#bt_addsource').click(() => {
      let selectedItem = this.canvas.getSelectedItem();
      let newItem = this.tree.addSource(selectedItem);
      newItem.characs.color = this.canvas.config.color_source;
      this.canvas.refresh();
      this.saveHistory();
      if(selectedItem.isVisible()) this.canvas.selectItem(newItem);
    });


    // Add a child load to the selected item
    $('#bt_addload').click(() => {
      let selectedItem = this.canvas.getSelectedItem();
      let newItem = this.tree.addLoad(selectedItem);
      newItem.characs.color = this.canvas.config.color_load;
      this.canvas.refresh();
      this.saveHistory();
      if(selectedItem.isVisible()) this.canvas.selectItem(newItem);
    });


    // invert the item position with the previous one
    $('#bt_up').click(() => {
      let item = this.canvas.getSelectedItem();
      item.moveUp();
      this.canvas.refresh();
      this.updateUpDownButtons();
      this.saveHistory();
    });


    // invert the item position with the next one
    $('#bt_down').click(() => {
      let item = this.canvas.getSelectedItem();
      item.moveDown();
      this.canvas.refresh();
      this.updateUpDownButtons();
      this.saveHistory();
    });


    // hide the selected item in the canvas
    $('#bt_hide').click(() => {
      this.canvas.getSelectedItem().toggle();
      this.canvas.refresh();
      this.saveHistory();
    });


    // undo action
    $('#bt_undo').click(() => {
      this.undo();
    });


    // redo action
    $('#bt_redo').click(() => {
      this.redo();
    });


    // open a tree from a filename
    $('#bt_open').click(() => {
      this.open();
    });


    // save the tree into a file
    $('#bt_save').click(() => {
      this.save(false);
    });


    // save the tree into a file
    $('#bt_saveas').click(() => {
      this.save(true);
    });


    // export the canvas as an Image
    $('#bt_export_img').click(() => {
      this.exportImg();
    });


    // export a report of the tree
    $('#bt_export_report').click(() => {
      this.exportReport();
    });


    // toggle the config bar
    $('#bt_config').click(() => {
      this.toggleOptions();
    });
  }


  // listen events related to the config menu
  listenConfigMenu() {
    // refresh the config when inputs changed
    $('.config_input').change((evt) => {
      if ('checkbox' == $(evt.currentTarget).attr('type')) {
        this.canvas.config[$(evt.currentTarget).data('config')] = $(evt.currentTarget).prop('checked');
      }
      else if ('range' == $(evt.currentTarget).attr('type')) {
        let val = parseFloat($(evt.currentTarget).val());
        this.canvas.config[$(evt.currentTarget).data('config')] = val;
        $(evt.currentTarget).prev('.range_val').text(val);
      }
      else if ('color' == $(evt.currentTarget).attr('type')) {
        this.canvas.config[$(evt.currentTarget).data('config')] = $(evt.currentTarget).val();
      }
      else {
        return;
      }

      this.canvas.refresh();
    });

    // modify the range inputs on wheel up/down
    $('.config_range').on('wheel',(evt) => {
      // prevent scrolling
      evt.preventDefault();

      // get actual values
      let step   = parseFloat($(evt.currentTarget).prop('step'));
      let val    = parseFloat($(evt.currentTarget).val());
      let newval = val;

      // wheel down, decrement
      if(evt.originalEvent.deltaY > 0) {
        // get the min
        let min = parseFloat($(evt.currentTarget).prop('min'));
        // if already the min, do nothing
        if(val == min) return;
        // decrement from one step
        newval = val - step;
        // if below the min, stay to the min
        if(newval < min) newval = min;
      }
      // wheel up, increment
      else if(evt.originalEvent.deltaY < 0) {
        // get the max
        let max = parseFloat($(evt.currentTarget).prop('max'));
        // if already the max
        if(val == max) return;
        // increment from one step
        newval = val + step;
        // if above the max, stay to the max
        if(newval > max) newval = max;
      }

      // update the value
      $(evt.currentTarget).val(newval);
      // fire the CHANGE event
      $(evt.currentTarget).trigger('change');
      // fade out all item infos (to avoid strange display)
      $('.item_info').fadeOut(0);
    });

    // set the config to default
    $('.mybtn-defaultConfig').click(() => {
      this.canvas.setDefaultConfig();
      this.canvas.refresh();
    });

    // select a sheet to sync with
    $('#bt_select_sheet').click(() => {
      this.selectSheet();
    });

    // refresh the sheet to sync with
    $('#bt_refresh_sheet').click(() => {
      this.reloadSheet();
      this.tree.refreshConsumptions(null, this.usersheet.sheet);
      this.canvas.refresh();
      this.setUnsaved();
    });

    // refresh the sheet to sync with
    $('#bt_remove_sheet').click(() => {
      this.setSheet(null);
      this.tree.refreshConsumptions(null, this.usersheet.sheet);
      this.canvas.refresh();
      this.setUnsaved();
    });

    // close the config menu when click on the cross
    $('#bottom_close').click(() => {
      this.toggleOptions();
    });
  }


  // listen to all keyboard shortcuts
  listenKeyboard() {
    const Mousetrap = require('mousetrap');
    // Mousetrap: return false to prevent default browser behavior and stop event from bubbling

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

    // Open
    Mousetrap.bind(['command+o', 'ctrl+o'], () => {
      this.open();
      return false;
    });

    // Save
    Mousetrap.bind(['command+s', 'ctrl+s'], () => {
      this.save(false);
      return false;
    });

    // Save as
    Mousetrap.bind(['command+shift+s', 'ctrl+shift+s'], () => {
      this.save(true);
      return false;
    });


    // exportImg
    Mousetrap.bind(['command+e', 'ctrl+e'], () => {
      this.exportImg();
      return false;
    });

    // Options
    Mousetrap.bind(['command+,', 'ctrl+,'], () => {
      this.toggleOptions();
      return false;
    });

    // Cut / Delete
    Mousetrap.bind(['command+x', 'ctrl+x', 'backspace', 'del'], () => {
      if(null !== this.canvas.getSelectedItem()) {
        this.canvas.getSelectedItem().remove();
        this.canvas.unselectItem(true);
        this.canvas.refresh();
        this.updateClearButtons();
        this.saveHistory();
        this.updateStats(null);
      }
      return false;
    });

    // Copy
    Mousetrap.bind(['command+c', 'ctrl+c'], () => {
      if(null !== this.canvas.getSelectedItem()) {
        this.canvas.copiedItem = this.canvas.getSelectedItem();
      }
      return false;
    });

    // Paste
    Mousetrap.bind(['command+v', 'ctrl+v'], () => {
      let selectedItem = this.canvas.getSelectedItem();
      let copiedItem = this.canvas.getCopiedItem();

      // if there is something to copy
      if(null !== copiedItem) {
        // if copy of any item into a source
        if(null !== selectedItem && selectedItem.isSource()) {
          this.tree.copyItem(selectedItem, copiedItem);
        }
        // else if copy of a source in the root
        else if(null === selectedItem && copiedItem.isSource()) {
          this.tree.copyItem(this.tree.getRoot(), copiedItem);
        }
        else {
          return false;
        }
      }

      this.canvas.refresh();
      this.updateClearButtons();
      this.saveHistory();
      this.updateStats(null);

      return false;
    });
  }


  // listen to all events (messages) from main.js
  listenMessages() {
    // use ipcRenderer to communicate with main process
    const {ipcRenderer} = require('electron');

    // IPC async msg received from main.js: select the given item
    ipcRenderer.on('PTree-selectItemCmd', (event, itemID) => {
      this.canvas.selectItem(this.tree.getItem(itemID));
      this.updateStats(itemID);
      this.updateUpDownButtons();
    });

    // IPC async msg received from main.js: open the given file
    ipcRenderer.on('PTree-openFileCmd', (event, fileToOpen) => {
      this.open(fileToOpen);
    });

    // IPC async msg received from main.js: prepare to close
    ipcRenderer.on('PTree-beforeCloseCmd', async () => {
      // if the project is not saved
      if(this.unsaved) {
        // ask the user to save
        let popupData = {
          title      : 'Save before exit?',
          width      : 500,
          height     : 135,
          sender     : 'PTree',
          content    : `<strong>You have made changes which were not saved.</strong><br />
          Do you want to save them before exit?`,
          btn_ok     : 'Save and exit',
          btn_cancel : 'Exit without saving'
        };
        let saveBeforeExit = await Util.popup(popupData);

        // if the user want to save, save the project
        if (saveBeforeExit) {
          // if the user canceled the save
          if(!this.save()) {
            // do not exit
            return;
          }
        }
      }

      // Send an IPC async msg to the main.js: ready to close
      ipcRenderer.send('PTree-beforeCloseReturn', true);
    });
  }
}

module.exports = PTree;
