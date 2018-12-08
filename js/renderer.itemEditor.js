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
const Source        = require('../js/class.Source.js');
const Load          = require('../js/class.Load.js');
const ItemEditor    = require('../js/class.ItemEditor.js');
const {ipcRenderer} = require('electron');

// global object that will handle this renderer
// eslint-disable-next-line no-unused-vars
let itemEditor;

// When jQuery is ready
$(() => {
  // On reception of the init data
  ipcRenderer.once('ItemEditor-initDataResp', (event, initData) => {
    // reconstruct the item to work on
    let item_properties = JSON.parse(initData.itemStr);
    let item;
    if('source' == item_properties.type) {
      item = new Source(0, null, null);
    }
    else if('load' == item_properties.type) {
      item = new Load(0, null, null);
    }
    item.import(item_properties);

    // init the ItemEditor
    itemEditor = new ItemEditor(item);
  });

  // Send an IPC async msg to main.js: request init data
  ipcRenderer.send('ItemEditor-initDataReq');
});
