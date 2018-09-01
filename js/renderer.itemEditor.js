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
const Item       = require('../js/class.Item.js');
const ItemEditor = require('../js/class.ItemEditor.js');

// Send an IPC sync msg to main.js: request init data
const initData = require('electron').ipcRenderer.sendSync('ItemEditor-initDataReq');

// init the global object that will handle this renderer
// eslint-disable-next-line no-unused-vars
let itemEditor = {};

// reconstruct the item to work on
let item = new Item(0,null,null,null);
item.fromString(initData.itemStr);

// When jQuery is ready
$(() => {
  // init the ItemEditor
  itemEditor = new ItemEditor(item);
});
