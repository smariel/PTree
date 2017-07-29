const debug = false;

const electron = require('electron');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Module to send/receive message with all renderers
const {ipcMain} = require('electron');


// Keep a global reference of the window object to avaoid JS garbage collected to close them automatically
let appWindows = {
	tree          : null,
	item          : null,
	partTable     : null,
   saveBeforeExit: null
};


// When Electron has finished initialization
app.on('ready', () => {
	// Create the browser window.
	appWindows.tree = new BrowserWindow({width: 1200, height: 800});

	// and load the index.html of the app.
	appWindows.tree.loadURL(`file://${__dirname}/html/tree.html`);

   // Open the dev tools...
	if (debug) appWindows.tree.webContents.openDevTools();

	// Emitted when the window is closed.
	appWindows.tree.on('closed', function () {
		// Dereference the window object
		appWindows.tree = null;
	});


	const {Menu} = require('electron');

	const template = [
		{
			label: 'Edit',
			submenu: [
				{
					role: 'undo'
				},
				{
					role: 'redo'
				},
				{
					type: 'separator'
				},
				{
					role: 'cut'
				},
				{
					role: 'copy'
				},
				{
					role: 'paste'
				},
				{
					role: 'delete'
				},
				{
					role: 'selectall'
				}
			]
		},
		{
			role: 'window',
			submenu: [
				{
					role: 'minimize'
				},
				{
					role: 'close'
				}
			]
		},
		{
			role: 'help',
			submenu: [
				{
					label: 'Equation Summary',
					click () { require('electron').shell.openItem('docs/equations.pdf'); }
				},
			]
		},
      (debug) ? {
		label: 'View',
			submenu: [
				{
					label: 'Reload',
					accelerator: 'CmdOrCtrl+R',
					click (item, focusedWindow) {
						if (focusedWindow) focusedWindow.reload();
					}
				},
				{
					label: 'Toggle Developer Tools',
					accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
					click (item, focusedWindow) {
						if (focusedWindow) focusedWindow.webContents.toggleDevTools();
					}
				}
			]
		} : {},
	];

	if (process.platform === 'darwin') {
		template.unshift({
			label: app.getName(),
			submenu: [
				{
					role: 'about'
				},
				{
					role: 'hide'
				},
				{
					role: 'quit'
				}
			]
		});
	}

	menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
});


// Quit the app when all windows are closed.
app.on('window-all-closed', function () {
	app.quit();
});


// bind an event handler on a request to edit an item
// this request is sent synchronusly by an item object on the tree view
// so the tree view script is blocked untill it received a response
ipcMain.on('edit-request', function (itemEvent, itemdata) {
	// parse the data to resize the window
	var item = JSON.parse(itemdata);

	// Create the item window
	appWindows.item = new BrowserWindow({
		width           : ('source' == item.type) ? 800 : 400,
		height          : ('source' == item.type) ? 440 : 330,
		parent          : appWindows.tree,
		modal           : true,
		resizable       : false,
      autoHideMenuBar : true
	});

	// Open the dev tools...
	if (debug) appWindows.item.webContents.openDevTools();

	// Load the *.html of the window.
	appWindows.item.loadURL(`file://${__dirname}/html/item.html`);

	// wait for the edit window to request the data, then send them
	ipcMain.once('edit-window-open-req', function(event_wopen, arg){
		event_wopen.sender.send('edit-window-open-resp', itemdata);
	});

	// wait for the edit window to send data when it closes
	ipcMain.once('edit-window-close', function(event_wclose, newitemdata) {
		// save those datas before sending them when the close event is trigged
		itemdata = newitemdata;
	});

	// Emitted when the window is closed.
	appWindows.item.on('closed', function () {
		// sent the (new or old) data to the tree window
		itemEvent.returnValue = itemdata;
		// Dereference the window object
		appWindows.item = null;
	});
});


// bind an event handler on a request to open the part list
// this request is sent synchronusly by the tree window
// so the tree script is blocked untill it received a response
ipcMain.on('partTable-request', function (partEvent, treeData, partlistData) {

	// Create the partTable window
	appWindows.partTable = new BrowserWindow({
		width           : 1024,
		height          : 768,
		parent          : appWindows.tree,
		modal           : process.platform !== 'darwin',
		resizable       : true,
      autoHideMenuBar : true
	});

	// Open the dev tools...
	if (debug) appWindows.partTable.webContents.openDevTools();

	// Load the *.html of the window.
	appWindows.partTable.loadURL(`file://${__dirname}/html/partTable.html`);

	// wait for the window to request the data then send them
	ipcMain.once('partTable-window-open-req', function(event_wopen, arg){
		event_wopen.sender.send('partTable-window-open-resp', treeData, partlistData);
	});

	// wait for the edit window to send data when it closes
	ipcMain.once('partTable-window-close', function(event_wclose, newPartlistData) {
		// save the new data before sending them when the close event is trigged
		partlistData = newPartlistData;
	});

	// Emitted when the window is closed.
	appWindows.partTable.on('closed', function () {
		// sent the (new or old) data to the tree window
		partEvent.returnValue = partlistData;
		// Dereference the window object
		appWindows.partlistData = null;
	});
});



// bind an event handler on a request to open the "Save Before Exit" window
// this request is sent synchronusly by the tree window
// so the tree script is blocked untill it received a response (saving or not)
ipcMain.on('saveBeforeExit-request', function (saveEvent) {
   // Create the window
   appWindows.saveBeforeExit = new BrowserWindow({
      width          : 500,
      height         : 180,
      parent         : appWindows.tree,
      modal          : true,
      autoHideMenuBar: true,
      resizable      : false,
      minimizable    : false,
      maximizable    : false,
      alwaysOnTop    : true
   });

   // init a default value to be returned
   var performSave = false;

	// Load the *.html of the window.
	appWindows.saveBeforeExit.loadURL(`file://${__dirname}/html/saveBeforeExit.html`);

   // wait for the window to send data when it closes
	ipcMain.once('saveBeforeExit-close', function(event_wclose, data) {
      performSave = data;
	});

   // Emitted when the window is closed.
	appWindows.saveBeforeExit.on('closed', function () {
		// send the command to the tree renderer which is waiting to close
		saveEvent.returnValue = performSave;
		// Dereference the window object
      appWindows.saveBeforeExit = null;
	});
});
