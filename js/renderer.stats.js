// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('chart.js');
require('bootstrap');

// When jQuery is ready
$(function() {
   // enable all tooltips
   $('[data-toggle="tooltip"]').tooltip({
      delay: {
         show: 1000,
         hide: 0
      },
      trigger: 'hover'
   });

   // Create the main Stats object
   var stats = new Stats();

   // prepare to receive the init data from the main process
   require('electron').ipcRenderer.on('stats-window-open', function(event, data) {
      stats.import(data);
      stats.update();
   });
});
