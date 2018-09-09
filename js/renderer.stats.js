// -----------------------------------------------------------------------------
// Stats window renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('bootstrap');
const Stats         = require('../js/class.Stats.js');
const {ipcRenderer} = require('electron');

// global object that will handle this renderer
let stats;

// When jQuery is ready
$(() => {
  // On reception of the init data
  ipcRenderer.on('Stats-initDataResp', (event, initData) => {
    // Init the main Stats object
    stats = new Stats();
    stats.import(initData);
    stats.update();
  });

  // Send an IPC async msg to main.js: request init data
  ipcRenderer.send('Stats-initDataReq');

  // enable all tooltips
  $('[data-toggle="tooltip"]').tooltip({
    delay: {show: 1000, hide: 0},
    trigger: 'hover'
  });
});
