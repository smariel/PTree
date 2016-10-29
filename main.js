const electron = require('electron');


// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Module to send/receive message with all renderers
const {ipcMain} = require('electron');


// Keep a global reference of the window object to avaoid JS garbage collected to close them automatically
let appWindows = {
	tree: null,
	item: null
};


// When Electron has finished initialization
app.on('ready', () => {
	// Create the browser window.
	appWindows.tree = new BrowserWindow({width: 1200, height: 800});

	// and load the index.html of the app.
	appWindows.tree.loadURL(`file://${__dirname}/html/tree.html`);

	//appWindows.tree.webContents.openDevTools();

	// Emitted when the window is closed.
	appWindows.tree.on('closed', function () {
		// Dereference the window object
		appWindows.tree = null;
	});
});


// Quit the app when all windows are closed.
app.on('window-all-closed', function () {
	app.quit();
});


// bind an event handler on an request to edit an item
// this request is sent synchronusly by an item object on the tree view
// so the tree view script is blocked untill it received a response
ipcMain.on('edit-request', function(treeEvent, itemdata) {
	var item = JSON.parse(itemdata);

	// Create the item window
	appWindows.item = new BrowserWindow({
		width:  ('source' == item.type) ? 1000 : 400,
		height: ('source' == item.type) ? 440  : 280,
		parent: appWindows.tree,
		modal:  true,
		resizable: false
	});

	//appWindows.item.webContents.openDevTools();

	// Load the *.html of the window.
	appWindows.item.loadURL(`file://${__dirname}/html/item.html`);

	// bind an event handler on a message syncrhonusly sent by the edit-window on its opening
	ipcMain.once('edit-window-open', function(itemEvent, uselessData) {
		// sent the item data to the edit window
		itemEvent.returnValue = itemdata;
	});

	// bind an event handler on a message syncrhonusly sent by the edit-window on its closing
	ipcMain.once('edit-window-close', function(itemEvent, newitemdata) {
		// get the new data
		itemdata = newitemdata;
	});

	// emitted when the edit window is closed.
	appWindows.item.on('closed', function () {
		// sent the (new or old) data to the tree window
		treeEvent.returnValue = itemdata;
		// Dereference the window object
		appWindows.item = null;
	});
});
