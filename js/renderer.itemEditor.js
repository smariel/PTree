// -----------------------------------------------------------------------------
// ItemEditor renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('bootstrap');
require('chart.js');
const Item          = require('../js/class.Item.js');
const ItemEditor    = require('../js/class.ItemEditor.js');
const {ipcRenderer} = require('electron');

// global object that will handle this renderer
// eslint-disable-next-line no-unused-vars
let itemEditor;

// When jQuery is ready
$(() => {
  // On reception of the init data
  ipcRenderer.on('ItemEditor-initDataResp', (event, initData) => {
    // reconstruct the item to work on
    let item = new Item(0,null,null,null);
    item.fromString(initData.itemStr);

    // init the ItemEditor
    itemEditor = new ItemEditor(item);
  });

  // Send an IPC async msg to main.js: request init data
  ipcRenderer.send('ItemEditor-initDataReq');
});
