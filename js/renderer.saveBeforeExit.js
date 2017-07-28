$(function() {
   var close = function (performSave) {
      const {ipcRenderer} = require('electron');
      ipcRenderer.send('saveBeforeExit-close', performSave);
      window.close();
   };

   $('.mybtn-save').click(function () {
      close (true);
   });

   $('.mybtn-cancel').click(function () {
      close (false);
   });
});
