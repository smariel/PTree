// -----------------------------------------------------------------------------
// Stats window renderer script
// -----------------------------------------------------------------------------

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('chart.js');
require('bootstrap');

// Send an IPC sync msg to main.js: request init data
const initData = require('electron').ipcRenderer.sendSync('Stats-initDataReq');

// init the global object that will handle this renderer
let stats = {};

// When jQuery is ready
$(() => {
   // Init the main Stats object
   stats = new Stats();
   stats.import(initData);
   stats.update();

   // enable all tooltips
   $('[data-toggle="tooltip"]').tooltip({
      delay: {show: 1000, hide: 0},
      trigger: 'hover'
   });
});
