$(function() {
   // ask main.js for the data to print in the popup
   const {ipcRenderer} = require('electron');
   var popupData = ipcRenderer.sendSync('popup-open', null);
   $('.content').html(popupData.content);
   $('.mybtn-ok').html(popupData.btn_ok);
   $('.mybtn-cancel').html(popupData.btn_cancel);

   // prepare the close function to send back OK or CANCEL to main.js
   var close = function (isOK) {
      const {ipcRenderer} = require('electron');
      ipcRenderer.send('popup-close', isOK);
      window.close();
   };

   // close with OK
   $('.mybtn-ok').click(function () {
      close (true);
   });

   // close with CANCEL
   $('.mybtn-cancel').click(function () {
      close (false);
   });

   // Trigger key press
   $(document).keydown(function(event) {
      // ESCAPE
      if (27 == event.which) {
         close(false);
      }
      // ENTER
      else if (13 == event.which) {
         close(true);
      }
   });

});
