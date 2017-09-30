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

   // use ipcRender to communicate with main main process
   const {ipcRenderer} = require('electron');
   // prepare to receive the init data from the main process
   ipcRenderer.on('stats-window-open-resp', function(event, data) {
      stats.import(data);
      stats.update();
   });
   // request the main process for the init data (that will be processed by the function above)
   ipcRenderer.send('stats-window-open-req');
});
