$(function() {
   // Create the main Stats object
   var stats = new Stats();

   // use ipcRender to communicate with main main process
   const {ipcRenderer} = require('electron');
   // prepare to receive the init data from the main process
   ipcRenderer.on('stats-window-open-resp', function(event, treeData, partListData, selectedItem) {
      // reconstruct a Tree and a PartList object
      stats.tree.fromString(treeData);
      stats.partList.fromString(partListData);
      // display something
      stats.updateCanvas(stats.tree.getItem(selectedItem));
   });
   // request the main process for the init data (that will be processed by the function above)
   ipcRenderer.send('stats-window-open-req');
});
