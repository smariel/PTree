// -----------------------------------------------------------------------------
// PartListEditor renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('bootstrap');
require('mousetrap');
const Tree           = require('../js/class.Tree.js');
const PartList       = require('../js/class.PartList.js');
const PartListEditor = require('../js/class.PartListEditor.js');
const {ipcRenderer}  = require('electron');

// global object that will handle this renderer
let partListEditor;

// When jQuery is ready
$(() => {
  // On reception of the init data
  ipcRenderer.once('PartListEditor-initDataResp', (event, initData) => {
    // Reconstruct the partList
    let partList = new PartList();
    partList.import(initData.partList);
    // Reconstruct the tree
    let tree = new Tree();
    tree.import(initData.tree);
    // init the PartListEditor
    partListEditor = new PartListEditor(partList, tree);

    // complete the header of the table withe the list of loads
    partListEditor.tree.forEachLoad((load) => {
      if(load.isInPartlist()) {
        let th1 =  `<th colspan="2" class="th_current">${load.characs.name}</th>`;
        $('.tr_top > .th_power:last-child').before(th1);

        let th2 = '<th class="th_current th_typ">I<sub>TYP</sub></th>';
        let th3 = '<th class="th_current th_max">I<sub>MAX</sub></th>';

        $('.tr_bottom > .th_charac:nth-child(5)').after(th2, th3);
      }
    });

    // refresh the table to fill all data
    partListEditor.refresh();
  });

  // Send an IPC async msg to main.js: request init data
  ipcRenderer.send('PartListEditor-initDataReq');

  // enable all tooltips
  $('[data-toggle="tooltip"]').tooltip({
    delay: {show: 1000, hide: 0},
    trigger: 'hover'
  });
});
