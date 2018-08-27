// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('bootstrap');
require('chart.js');

// Send an IPC sync msg to main.js: request init data
const initData = require('electron').ipcRenderer.sendSync('ItemEditor-initDataReq');

// init the global object that will handle this renderer
let itemEditor = {};

// reconstruct the item to work on
let item = new Item(0,null,null,null);
item.fromString(initData.itemStr);

// When jQuery is ready
$(() => {
   // init the ItemEditor
   itemEditor = new ItemEditor(item);
});
