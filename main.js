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

	appWindows.tree.webContents.openDevTools();

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
		{
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
				},
				{
					type: 'separator'
				},
				{
					role: 'resetzoom'
				},
				{
					role: 'zoomin'
				},
				{
					role: 'zoomout'
				},
				{
					type: 'separator'
				},
				{
					role: 'togglefullscreen'
				}
			]
		},
	];

	if (process.platform === 'darwin') {
		template.unshift({
			label: app.getName(),
			submenu: [
				{
					role: 'about'
				},
				{
					type: 'separator'
				},
				{
					role: 'services',
					submenu: []
				},
				{
					type: 'separator'
				},
				{
					role: 'hide'
				},
				{
					role: 'hideothers'
				},
				{
					role: 'unhide'
				},
				{
					type: 'separator'
				},
				{
					role: 'quit'
				}
			]
		});
		// Edit menu.
		template[1].submenu.push(
			{
				type: 'separator'
			},
			{
				label: 'Speech',
				submenu: [
					{
						role: 'startspeaking'
					},
					{
						role: 'stopspeaking'
					}
				]
			}
		);
		// Window menu.
		template[2].submenu = [
			{
				label: 'Close',
				accelerator: 'CmdOrCtrl+W',
				role: 'close'
			},
			{
				label: 'Minimize',
				accelerator: 'CmdOrCtrl+M',
				role: 'minimize'
			},
			{
				label: 'Zoom',
				role: 'zoom'
			},
			{
				type: 'separator'
			},
			{
				label: 'Bring All to Front',
				role: 'front'
			}
		];
	}
	menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
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
