// -----------------------------------------------------------------------------
// PTree Class
//    A PTree object represent the whole PowerTree application
//    It contains every methods, data, UI and sub-objects
//    It only needs a selector on the Canvas HTML item
//    See synop.jpg for more informations
// -----------------------------------------------------------------------------

const Tree           = require('../js/class.Tree.js');
const PartList       = require('../js/class.PartList.js');
const Canvas         = require('../js/class.Canvas.js');
const Util           = require('../js/class.Util.js');
const {SequenceList} = require('../js/class.Sequence.js');

class PTree {

  constructor(canvas_selector) {
    this.tree         = new Tree();
    this.partList     = new PartList();
    this.canvas       = new Canvas(canvas_selector, this.tree, this.partList);
    this.sequenceList = new SequenceList();
    this.statsAreOpen = false;
    this.filePath     = null;
    this.readOnly     = false;
    this.unsaved      = false;
    this.history      = {list: [], index: 0};
    this.ctxMenu      = null;
    this.enableLock   = false;
    this.enableBackup = true;

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
    this.setSaved();

    // set the window title
    window.document.title = 'Untitled';
  }


  // Reset the PTree object
  reset() {
    // create new data
    this.tree.import(new Tree().export());
    this.partList.import(new PartList().export());
    this.canvas.setDefaultConfig();
    this.sequenceList = new SequenceList();
    this.unlockFile();
    this.statsAreOpen = false;
    this.filePath     = null;
    this.unsaved      = true;
    this.history      = {list: [], index: 0};
    this.readOnly     = false;
    this.ctxMenu      = null;

    // update the app environement
    this.unselectItem(true);
    this.clearHistory();
    this.canvas.refresh();
    this.setUnsaved();
    this.updateClearButtons();

    // update the window title
    window.document.title = 'Untitled';
  }


  // load the app data from a file
  async open(path=null) {
    // if a path was not given, ask the user to choose a file
    if(null === path) {
      const {dialog} = require('electron').remote;
      const paths = dialog.showOpenDialogSync({
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
    // else if a path was given, just use it
    else {
      this.filePath = path;
    }

    const fs = require('fs');

    // check if a backcup of the file exist
    let backupFile = `${this.filePath}.backup`;
    if(fs.existsSync(backupFile)) {
      // ask user what to do
      let popupData = {
        title      : 'Bacup found',
        width      : 500,
        height     : 135,
        sender     : 'PTree',
        content    : `<strong>A backup if this file was found.</strong><br />
                      Do you want to open the backup of the selected file ?<br />`,
        btn_ok     : 'Open backup',
        btn_cancel : 'Open selected file'
      };
      let popupRet = await Util.popup(popupData);

      // if the user want to open the backup
      if(popupRet) {
        // find a name for the backup
        const path = require('path');
        for(let i=1; i<=50; i++) {
          let copy = (1==i)? '' : i;
          let newFile = `${path.dirname(this.filePath)}/${path.parse(this.filePath).name}_copy${copy}.ptree`;
          if(!fs.existsSync(newFile)) {
            this.filePath = newFile;
            break;
          }
          else if (50 == i) {
            alert('error');
            console.error('Cant find a name for the file');
            return;
          }
        }

        // rename the backup
        fs.renameSync(backupFile, this.filePath);
      }
    }

    // read the content of the file using node.js fs module
    fs.readFile(this.filePath, 'utf8', (err, datastr) => {
      if (null !== err) {
        alert(err);
      }
      else {
        // reconstruct the tree from the data
        this.fromString(datastr).then(() => {
          // update the window title
          window.document.title = this.filePath;

          // if the file is beeing edited by someone else
          if(fs.existsSync(`${this.filePath}.lock`)) {
            // set as readonly
            this.readOnly = true;
            window.document.title += ' [read only]';
            alert('This file is beeing edited by an other user. \n\nThis may also be due to a crash. If you think so, you can delete the ".lock" file next to the project file');
          }
          // if the file is not edited
          else {
            // create a .lock file to tell other users
            this.lockFile();
          }

          // update the app environement
          this.clearHistory();
          this.canvas.refresh();
          this.setSaved();
          this.updateClearButtons();
        });
      }
    });
  }


  // save the app data into a file
  async save(saveas = false) {
    const fs = require('fs');

    // do not try a simple save if it's not needed
    if(!saveas && !this.unsaved) {
      return false;
    }

    // if the app as no file to work on
    // or if the app data must be save as a new file
    // of if the file is readOnly
    if (saveas || null === this.filePath || this.readOnly) {

      let defaultPath = ('string' === typeof this.filePath) ? this.filePath.substring(0, this.filePath.length-6)+'_copy.ptree' : 'Untitled.ptree';

      // prompt the user
      const {dialog} = require('electron').remote;
      const path = dialog.showSaveDialogSync({
        title: 'Save as...',
        defaultPath: defaultPath,
        filters: [
          { name: 'PTree project file', extensions: ['ptree'] },
          { name: 'JSON',               extensions: ['json']  },
          { name: 'All Files',          extensions: ['*']     }
        ]
      });

      // if the dialog was not canceled
      if (undefined !== path) {
        // if a lock file exist for this new file
        let lockFile = `${path}.lock`;
        if(fs.existsSync(lockFile)) {
          alert('Unable to create or overwrite this file beceause it is edited by an other user.');
          return false;
        }
        else {
          // unlock the precedent file
          this.unlockFile();

          // save the new path
          this.filePath = path;
        }
      }
      else return false;
    }

    // open the file or create it if it does not exist using node.js fs module
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

        // lock the file
        this.lockFile();
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


  // lock the project file
  lockFile() {
    if(this.enableLock && !this.readOnly) {
      // create a .lock file to tell other users
      const fs = require('fs');
      fs.closeSync(fs.openSync(`${this.filePath}.lock`, 'w'));
      this.readOnly = false;
    }
  }


  // unlock a file
  unlockFile() {
    if(!this.readOnly) {
      const fs = require('fs');
      // if there is a ptree project file
      if('string' === typeof this.filePath) {
        let lockFile = `${this.filePath}.lock`;
        // if a lock file exist for this project
        if(fs.existsSync(lockFile)) {
          // delete this file
          fs.unlinkSync(lockFile);
        }
      }
    }
  }


  // create a backup file of the current context
  backup() {
    if(this.enableBackup) {
      const fs = require('fs');

      // if there is a ptree project file
      if('string' === typeof this.filePath) {
        // set the path of the backup file
        let backupFile = `${this.filePath}.backup`;
        // open the file or create it if it does not exist using node.js fs module
        fs.open(backupFile, 'w+', (err, fd) => {
          if (null === err) {
            // write the data
            let extradata = {version: require('../package.json').version};
            let data = this.toString(extradata);
            fs.writeSync(fd, data);
          }
          else {
            console.error('Error while trying to backup:'+err);
          }
        });
      }
    }
  }


  // empty the history and add only one data
  clearHistory() {
    // save the actual tree into the history
    const data = this.tree.export();
    this.history.list  = [data];
    this.history.index = 0;
    this.updateUndoRedoButtons();
  }


  // save the app data into the history
  saveHistory() {
    // save the actual tree into the history
    const data = this.tree.export();
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
    // create a backup
    this.backup();
  }


  // load data from the history at the given index (to undo/redo)
  loadHistory(index) {
    // unselect any item in the canvas
    this.unselectItem();
    // if stats are open, unselect the item
    this.updateStats(null);
    // restore the tree
    this.tree.import(this.history.list[index]);
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
      this.unselectItem(true);
    }
  }


  // redo un action
  redo() {
    // is there a next tree ?
    if(this.history.index < this.history.list.length - 1) {
      // load the next tree in the history
      ++this.history.index;
      this.loadHistory(this.history.index);
      this.unselectItem(true);
    }
  }


  // copy the given item
  copyItem(item) {
    this.canvas.copiedItem = item;
  }


  // paste an item into a parent (may be null to copy a source on root)
  pasteItem(parent, itemToCopy) {
    // if there is something to copy
    if(null !== itemToCopy) {
      // if the future parent is a source
      if(null !== parent && parent.isSource()) {
        this.tree.copyItem(parent, itemToCopy);
      }
      // else if the parent is null or root, and the item is a source
      else if((null === parent || parent.isRoot()) && itemToCopy.isSource()) {
        // copy to the root
        this.tree.copyItem(this.tree.getRoot(), itemToCopy);
      }
      // else, do nothing
      else {
        return false;
      }

      this.canvas.refresh();
      this.updateClearButtons();
      this.saveHistory();
      this.updateStats(null);
    }
  }


  // create a new source
  addSource(parent) {
    let newItem;
    if(undefined === parent || null === parent || parent.isRoot()) {
      // add a perfect source to the root with default values
      newItem = this.tree.addSourceToRoot();
      newItem.characs.regtype = '7';
      newItem.characs.vout_min = '4.5';
      newItem.characs.vout_typ = '5';
      newItem.characs.vout_max = '5.5';
      newItem.characs.name  = `Source #${newItem.id}`;
    }
    else {
      // add a DC/DC to the parent
      newItem = this.tree.addSource(parent);
      newItem.characs.regtype = '0';
      newItem.characs.name  = `Reg #${newItem.id}`;
    }

    newItem.characs.color = this.canvas.config.color_source;
    this.canvas.refresh();
    this.updateClearButtons();
    this.saveHistory();
    this.selectItem(newItem);
    this.scrollToItem(newItem);
  }


  // create a new load
  addLoad(parent) {
    if(undefined === parent || null === parent || parent.isRoot()) {
      return;
    }

    let newItem = this.tree.addLoad(parent);
    newItem.characs.name  = `Load #${newItem.id}`;
    newItem.characs.color = this.canvas.config.color_load;
    this.canvas.refresh();
    this.updateClearButtons();
    this.saveHistory();
    this.selectItem(newItem);
    this.scrollToItem(newItem);
  }


  // select the given item
  selectItem(item) {
    // deselect the last item
    this.unselectItem(false);

    // select the new item in the canvas
    this.canvas.selectItem(item);

    // update menus and stats
    this.updateUpDownButtons(item);
    this.updateShowHideButtons(item);
    this.updateStats(item.id);

    // show/hide sub-menus depending of the item type
    let ctrl = $('#item_control');
    ctrl.removeClass('item_control_source item_control_load');
    ctrl.addClass('item_control_' + item.type);
    ctrl.css({'box-shadow': 'inset 0 -3px 0 0 ' + item.characs.color});

    // if the item is a load
    if (item.isLoad() && item.isInPartlist() && this.canvas.config.show_loadpart) {
      this.showParts(item);
    }
    else {
      this.hideParts();
    }

    // fadeIn the menu
    $('#item_control').fadeIn(200);
  }


  // unselect the given item
  unselectItem(fade) {
    this.canvas.unselectItem();
    if (fade) {
      $('#item_control').fadeOut(200);
      $('.item_info').fadeOut(200);
      this.hideParts();
    }
  }


  // edit an item
  async editItem(item) {
    await item.edit(this.partList, this.usersheet.sheet);
    this.sequenceList.forEachSequence((sequence) => {
      sequence.forEachStep((step) => {
        step.refreshSignals(item);
      });
    });
    this.canvas.refresh();
    this.saveHistory();
  }


  // toggle item visibility
  toggleItem(item) {
    item.toggle();
    this.updateShowHideButtons(item);
    this.canvas.refresh();
    this.saveHistory();
  }


  // remove the given item from the tree
  removeItem(item) {
    if(null !== item && (item.isSource() || item.isLoad())) {
      item.remove();
      this.unselectItem(true);
      this.canvas.refresh();
      this.updateClearButtons();
      this.saveHistory();
      this.updateStats(null);
    }
  }


  // move up the given item
  moveUpItem(item) {
    item.moveUp();
    this.canvas.refresh();
    this.updateUpDownButtons();
    this.saveHistory();
  }


  // move down the given item
  moveDownItem(item) {
    item.moveDown();
    this.canvas.refresh();
    this.updateUpDownButtons();
    this.saveHistory();
  }


  // scroll to the given item
  scrollToItem(item) {
    // get the fabric object
    let fabric_obj = this.canvas.fabricCanvas.fabric_obj[item.id];
    // if the fabric object does not exist, exit with error
    if(undefined == fabric_obj) {
      console.error('The given object does not exist in the canvas');
      return false;
    }

    // compute the real coordinate of the item
    let zoom = this.canvas.config.zoom/100;
    let itemCoord = {
      x: Math.round(this.canvas.canvas$.offset().left + fabric_obj.geometry.xhalf*zoom),
      y: Math.round(this.canvas.canvas$.offset().top  + fabric_obj.geometry.yhalf*zoom)
    };

    // change the scroll to set the item on the center of the window
    window.scrollTo(itemCoord.x - window.innerWidth/2, itemCoord.y - window.innerHeight/2);

    return true;
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


  // open the part list and return the data
  async openPartList() {
    // prepare the request to open the partlist
    let requestOpenPartList = () => {
      return new Promise(resolve => {
        const {ipcRenderer} = require('electron');

        // listen to the response from main.js and resolve the promise
        ipcRenderer.once('PartList-editResp', (event, data) => {
          resolve(data);
        });

        // Send an IPC async msg to the main.js: request to edit the part list
        ipcRenderer.send('PartList-editReq', this.tree.export(), this.partList.export());
      });
    };

    // open the partlist and wait for the data
    let partListing = await requestOpenPartList();

    // if the part list was edited, update
    if(partListing) {
      this.partList.import(partListing);
      this.tree.refreshConsumptions(this.partList, this.usersheet.sheet);
      this.canvas.refresh();
      this.setUnsaved();
    }
  }


  // open the sequence editor and return the data
  async openSequenceEditor() {
    // prepare the request to open the sequence editor
    let requestOpenSeqEditor = () => {
      return new Promise(resolve => {
        const {ipcRenderer} = require('electron');

        // listen to the response from main.js and resolve the promise
        ipcRenderer.once('Sequence-editResp', (event, data) => {
          resolve(data);
        });

        // Send an IPC async msg to the main.js: request to edit the part list
        ipcRenderer.send('Sequence-editReq', this.tree.export(), this.sequenceList.export());
      });
    };

    // open the sequence editor and wait for the data
    let sequenceList = await requestOpenSeqEditor();

    // if a sequence list is returned
    if(sequenceList) {
      this.sequenceList = SequenceList.import(sequenceList);
      this.setUnsaved();
    }
  }


  // Set the spreadsheet to sync with
  setSheet(usersheet) {
    // default value
    if(!usersheet) {
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
      tree         : this.tree.export(),
      partList     : this.partList.export(),
      sequenceList : this.sequenceList.export(),
      usersheet    : this.usersheet,
      config       : this.canvas.config
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
    // should not occur
    else if(null === comp) {
      alert('Unexpected error');
      return false;
    }

    // copy the new data in this tree
    this.tree.import(data.tree);
    this.partList.import(data.partList);
    if(undefined !== data.sequenceList) {
      this.sequenceList = SequenceList.import(data.sequenceList);
    }
    else {
      this.sequenceList = new SequenceList();
    }
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
  updateUpDownButtons(item) {
    if(undefined === item) item = this.canvas.getSelectedItem();

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


  // Show or Hide the "Show/Hide" button depending of the selected item
  updateShowHideButtons(item) {
    if(undefined === item) item = this.canvas.getSelectedItem();

    // only display the button if a source is selected
    if(item.isSource()) {
      $('#bt_hide').show();
      $('#bt_hide > a').html((item.isVisible()) ? '<span class="fa fa-lg fa-eye-slash"></span> Hide' : '<span class="fa fa-lg fa-eye"></span> Show');
      if(item.childrenID.length > 0) {
        $('#bt_hide').removeClass('disabled');
      }
      else {
        $('#bt_hide').addClass('disabled');
      }
    }
    else {
      $('#bt_hide').hide();
    }
  }

  getCtxMenuTemplate(item) {
    // create the default menu template
    let ctxMenuTemplate = [
      {label: 'Select',        click: () => {this.selectItem(this.canvas.rightClickedItem);}},
      {label: 'Edit',          click: () => {this.editItem  (this.canvas.rightClickedItem);}},
      {label: 'Show/Hide',     click: () => {this.toggleItem(this.canvas.rightClickedItem);}},
      {type:  'separator'},
      {label: 'Move up',       click: () => {this.moveUpItem  (this.canvas.rightClickedItem);}},
      {label: 'Move Down',     click: () => {this.moveDownItem(this.canvas.rightClickedItem);}},
      {type:  'separator'},
      {label: 'Copy',          click: () => {this.copyItem  (this.canvas.rightClickedItem);}},
      {label: 'Paste',         click: () => {this.pasteItem (this.canvas.rightClickedItem, this.canvas.copiedItem);}},
      {label: 'Remove',        click: () => {this.removeItem(this.canvas.rightClickedItem);}},
      {type:  'separator'},
      {label: 'Append Source', click: () => {this.addSource(this.canvas.rightClickedItem);}},
      {label: 'Append Load',   click: () => {this.addLoad(this.canvas.rightClickedItem);}},
    ];

    // ref to the menu items to be modified, for code readability
    let menu_select     = ctxMenuTemplate[0];
    let menu_edit       = ctxMenuTemplate[1];
    let menu_toggle     = ctxMenuTemplate[2];
    let menu_separator1 = ctxMenuTemplate[3];
    let menu_moveup     = ctxMenuTemplate[4];
    let menu_movedown   = ctxMenuTemplate[5];
    let menu_separator2 = ctxMenuTemplate[6];
    let menu_copy       = ctxMenuTemplate[7];
    let menu_paste      = ctxMenuTemplate[8];
    let menu_remove     = ctxMenuTemplate[9];
    let menu_separator3 = ctxMenuTemplate[10];
    let menu_addSource  = ctxMenuTemplate[11];
    let menu_addLoad    = ctxMenuTemplate[12];

    // modify menus according to the given item
    if(item.isSource()) {
      menu_toggle.label       = item.isVisible() ? 'Hide' : 'Show';
      menu_toggle.enabled     = (item.childrenID.length > 0);
      menu_moveup.enabled     = (item.child_index > 0);
      menu_movedown.enabled   = (item.child_index < (item.getParent().childrenID.length - 1));
    }
    else if(item.isLoad()) {
      menu_toggle.visible     = false;
      menu_moveup.enabled     = (item.child_index > 0);
      menu_movedown.enabled   = (item.child_index < (item.getParent().childrenID.length - 1));
      menu_paste.visible      = false;
      menu_separator3.visible = false;
      menu_addSource.visible  = false;
      menu_addLoad.visible    = false;
    }
    else if(item.isRoot()) {
      menu_select.visible     = false;
      menu_edit.visible       = false;
      menu_toggle.visible     = false;
      menu_separator1.visible = false;
      menu_moveup.visible     = false;
      menu_movedown.visible   = false;
      menu_separator2.visible = false;
      menu_copy.visible       = false;
      menu_paste.enabled      = (null !== this.canvas.copiedItem && this.canvas.copiedItem.isSource());
      menu_remove.visible     = false;
      menu_addSource.label    = 'Add Source';
      menu_addLoad.visible    = false;
    }

    return ctxMenuTemplate;
  }


  // Show stats in the stat window (if it is open) for the given itemID
  updateStats(itemID) {
    if(this.statsAreOpen) {
      // Send an IPC async msg to main.js: request to update the item in Stats
      require('electron').ipcRenderer.send('Stats-updateItemReq', {
        itemID:       itemID,
        treeData:     this.tree.export(),
        partListData: this.partList.export()
      });
    }
  }


  // Toggle the option panel
  toggleOptions() {
    this.canvas.refreshConfig();
    $('#bottom_menu').slideToggle(300, 'swing');
  }


  // export the canvas as a PNG Image
  async exportImg() {
    let name = ('string' === typeof this.filePath) ? require('path').parse(this.filePath).name+'.png' : 'ptree.png';
    let objectURL = await this.canvas.toPNGdataURL();
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
      // if left click
      if(1 === evt.button) {
        // if the fabric obj is an 'item', select it
        if (fabric_obj && undefined !== fabric_obj.ptree_item) {
          // select the item
          this.selectItem(fabric_obj.ptree_item);
          // start drag
          this.canvas.fabricCanvas.dragedItem = fabric_obj.ptree_item;
          this.canvas.fabricCanvas.defaultCursor = 'move';
        }
        else {
          this.unselectItem(true);
          this.updateStats(null);
        }

        $('#bottom_menu').slideUp(300, 'swing');
      }
      // else if right click
      else if (3 === evt.button) {
        // if the fabric obj is an 'item'
        if (fabric_obj && undefined !== fabric_obj.ptree_item) {
          // save a ref to the targeted item
          this.canvas.rightClickedItem = fabric_obj.ptree_item;
        }
        // if the fabric obj is NOT an item
        else {
          // save a ref to the root
          this.canvas.rightClickedItem = this.tree.getRoot();
        }

        // get a ctxMenu template that fit to the clicked item
        let ctxMenuTemplate = this.getCtxMenuTemplate(this.canvas.rightClickedItem);

        // create a menu and show it
        const { remote } = require('electron');
        const { Menu }   = remote;
        this.ctxMenu = Menu.buildFromTemplate(ctxMenuTemplate);
        this.ctxMenu.popup();
      }
    });

    // mouse button released (click or drop) on an object in the canvas
    this.canvas.fabricCanvas.on('mouse:up', (evt) => {
      let fabric_obj = evt.target;
      let dragedItem = this.canvas.fabricCanvas.dragedItem;

      // if the event occured on a fabric obj (on an 'item')
      if (fabric_obj && undefined !== fabric_obj.ptree_item && null !== dragedItem) {
        let receiverItem = fabric_obj.ptree_item;
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
      // if there is a fabric object
      if (fabric_obj && undefined !== fabric_obj.objType) {
        let receiverItem = fabric_obj.ptree_item;

        // if the fabric obj is an 'item'
        if('item' == fabric_obj.objType) {
          let dragedItem = this.canvas.fabricCanvas.dragedItem;
          // if an item is being draged
          if (null !== dragedItem) {
            // change the receiver style if it can receive the dragged item
            if (fabric_obj.ptree_item.id !== dragedItem.id && receiverItem.isSource() && !receiverItem.isChildOf(dragedItem)) {
              fabric_obj.rect.set(Canvas.fabric_template.receiver);
              this.canvas.fabricCanvas.renderAll();
            }
          }
          // if no item is dragged, show the item infos
          else {
            this.canvas.displayInfo(receiverItem);
          }
        }
        // if the fabric obj is an 'alert'
        else if('alert' == fabric_obj.objType) {
          this.canvas.displayAlert(receiverItem);
        }
      }
    });


    // mouse exit from an object on the canvas
    this.canvas.fabricCanvas.on('mouse:out', (evt) => {
      let fabric_obj = evt.target;


      // if there is a fabric object
      if (fabric_obj && undefined !== fabric_obj.objType) {
        // if the fabric obj is an 'item'
        if('item' == fabric_obj.objType) {
          // if an item is being dragged
          if (null !== this.canvas.fabricCanvas.dragedItem) {
            // if the draged item is different than the exited item, reset the style
            if (fabric_obj.ptree_item.id !== this.canvas.fabricCanvas.dragedItem.id) {
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
        // if the fabric obj is an 'alert'
        else if('alert' == fabric_obj.objType) {
          $('#item_alert').hide();
        }
      }
    });


    // Edit item on double click
    this.canvas.canvas$.parent().dblclick(async () => {
      let item = this.canvas.getSelectedItem();
      if(null !== item) {
        this.editItem(item);
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
        treeData:     this.tree.export(),
        partListData: this.partList.export()
      });
      this.statsAreOpen = true;
    });


    // open a new window to see the sequence
    $('#bt_sequence').click(() => {
      this.openSequenceEditor();
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
        this.unselectItem(true);
        this.tree.clear();
        this.canvas.refresh();
        this.updateClearButtons();
        this.saveHistory();
        this.updateStats(null);
      }
    });


    // add a perfet source to the root when the button is clicked
    $('#bt_addrootsource').click(() => {
      this.addSource(null);
    });


    // remove the item when clicked
    $('#bt_remove').click(() => {
      this.removeItem(this.canvas.getSelectedItem());
    });


    // show the correct modal for edition
    $('#bt_edit').click(() => {
      this.editItem(this.canvas.getSelectedItem());
    });


    // Add a child source to the selected item
    $('#bt_addsource').click(() => {
      this.addSource(this.canvas.getSelectedItem());
    });


    // Add a child load to the selected item
    $('#bt_addload').click(() => {
      this.addLoad(this.canvas.getSelectedItem());
    });


    // invert the item position with the previous one
    $('#bt_up').click(() => {
      this.moveUpItem(this.canvas.getSelectedItem());
    });


    // invert the item position with the next one
    $('#bt_down').click(() => {
      this.moveDownItem(this.canvas.getSelectedItem());
    });


    // hide the selected item in the canvas
    $('#bt_hide').click(() => {
      this.toggleItem(this.canvas.getSelectedItem());
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
      else if ('color' == $(evt.currentTarget).attr('type') || 'SELECT' == evt.currentTarget.nodeName) {
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
    $('#bt_refresh_sheet').click(async () => {
      await this.reloadSheet();
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
      this.removeItem(this.canvas.getSelectedItem());
      return false;
    });

    // Copy
    Mousetrap.bind(['command+c', 'ctrl+c'], () => {
      let item = this.canvas.getSelectedItem();
      if(null !== item) this.copyItem(item);
      return false;
    });

    // Paste
    Mousetrap.bind(['command+v', 'ctrl+v'], () => {
      let parent     = this.canvas.getSelectedItem();
      let itemToCopy = this.canvas.getCopiedItem();
      this.pasteItem(parent, itemToCopy);
      return false;
    });
  }


  // listen to all events (messages) from main.js
  listenMessages() {
    // use ipcRenderer to communicate with main process
    const {ipcRenderer} = require('electron');

    // IPC async msg received from main.js: select the given item
    ipcRenderer.on('PTree-selectItemCmd', (event, itemID) => {
      this.selectItem(this.tree.getItem(itemID));
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

      // remove the lock file
      this.unlockFile();

      // remove the backup file
      const fs = require('fs');
      let backupFile = `${this.filePath}.backup`;
      // if a lock file exist for this project
      if(fs.existsSync(backupFile)) {
        // delete this file
        fs.unlinkSync(backupFile);
      }

      // Send an IPC async msg to the main.js: ready to close
      ipcRenderer.send('PTree-beforeCloseReturn', true);
    });
  }
}

module.exports = PTree;
