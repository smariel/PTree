// Global object that handle this renderer
var itemEditor = new ItemEditor();

// fill the form when data will be received from the main process
require('electron').ipcRenderer.on('itemEditor-window-open', function(event, datastr) {
   let item = new Item(0,null,null,null);
   item.fromString(datastr);
   itemEditor.setItem(item);
   itemEditor.updateHTML_form();
});
