// -----------------------------------------------------------------------------
// PartTable constructor
// 	A PartTable contains a partlist associated with a tree
//		It provides methods to manipulate those parts within a <table> element
// -----------------------------------------------------------------------------

var PartTable = function() {
	this.partList		= new PartList();
	this.tree			= new Tree();
	this.editing		= null;
	this.shiftPressed = false;

	this.listenEvents();
};


// refresh the table with new values
PartTable.prototype.refresh = function() {
	// empty the table content
	$('.partTable tbody').empty();

	// init TableSorter on the empty table
	$('.partTable').tablesorter({sortList: [[0,0]]});

	// print the content of the table
	for(let part of this.partList.part_list) {
		// Init the total power
		let ptyp = 0;
		let pmax = 0;

		// Part characteristics
		let tr = `<tr data-partid='${part.id}'>
			<td class='td_charac'>${part.id}</td>
			<td class='td_charac td_editable' data-charac='name'>${part.characs.name}</td>
			<td class='td_charac td_editable' data-charac='ref'>${part.characs.ref}</td>
		`;

		// Part consumptions on each load
		// Can't use tree.forEachLoad() without creating an anonymous function in this loop
		for(let item of this.tree.item_list) {
			if(item !== undefined && item.isLoad()) {
				// get the consumption on this item
				let ityp = part.getConsumption(item, 'typ');
				let imax = part.getConsumption(item, 'max');
				// add this consumption to the total power (do NOT use part.getPower() because the code is redondant with this loop)
				ptyp += parseFloat(ityp) * item.getInputVoltage('typ');
				pmax += parseFloat(imax) * item.getInputVoltage('max');
				// add two table cells to the table line
				tr += `<td class='td_current td_typ td_editable' data-typmax='typ' data-loadid='${item.id}'>${ityp}</td><td class='td_current td_max td_editable' data-typmax='max' data-loadid='${item.id}'>${imax}</td>`;
			}
		}

		// Part total power consumption
		tr += `<td class='td_power td_typ'>${ptyp}</td><td class='td_power td_max'>${pmax}</td>`;

		// Print the line
		tr += `</tr>`;
		$('.partTable tbody').append(tr);
	}

	// Let TableSorter know that the table has changed
	$('.partTable').trigger('update');
};


// print a UI to edit a charac
PartTable.prototype.editCharac = function(part, charac) {
	// if a previous element whas in edition
	if ('current' === this.editing) {
		this.validateEdition();
	}
	else if ('charac' === this.editing) {
		// get the previous edited element
		let editedPart		= this.getEditedPart();
		let editedCharac	= this.getEditedCharac();

		// if the edited element is the same, do nothing
		if(part.id === editedPart.id && charac === editedCharac) {
			return;
		}
		// else, validate the edition and continue
		else {
			this.validateEdition();
		}
	}

	// mark as editing
	this.editing = 'charac';

	// print an input element
	var value		= part.characs[charac];
	var html			= `<input class='edition' type='text' value='${value}' data-partid='${part.id}' />`;
	var selector	= `tr[data-partid=${part.id}] > .td_charac[data-charac=${charac}]`;
	$(selector).html(html);
	$('.edition').focus();
	$('.edition').get(0).setSelectionRange(0, value.length);
};


// print a UI to edit a current
PartTable.prototype.editCurrent = function(part, load, typmax) {
	// if a previous element whas in edition
	if ('charac' === this.editing) {
		this.validateEdition();
	}
	else if ('current' === this.editing) {
		// get the previous edited element
		let editedPart   = this.getEditedPart();
		let editedLoad   = this.getEditedLoad();
		let editedTypMax = this.getEditedTypMax();

		// if the edited element is the same, do nothing
		if(part.id === editedPart.id && load.id === editedLoad.id && typmax === editedTypMax) {
			return;
		}
		// else, validate the edition and continue
		else {
			this.validateEdition();
		}
	}

	// mark as editing
	this.editing = 'current';

	// print an input element
	var value		= part.getConsumption(load,typmax).toString();
	var html			= `<input class='edition input_num' type='text' value='${value}' data-loadid='${load.id}' data-partid='${part.id}' data-typmax='${typmax}' />`;
	var selector	= `tr[data-partid=${part.id}] > .td_${typmax}[data-loadid=${load.id}]`;
	$(selector).html(html);
	$('.edition').focus();
	$('.edition').get(0).setSelectionRange(0, value.length);
};


// rempve the UI from editing by validating (or not) the data
PartTable.prototype.clearCharac = function (validate){
	// get datas from html elements
	var part		= this.getEditedPart();
	var charac	= this.getEditedCharac();

	// validate or not the data
	var value = validate ? this.getEditedValue() : part.characs[charac];

	// update the charac with the new value
	part.characs[charac] = value;

	// refresh the part table
	$('.edition').parent().html(value);
	$('.partTable').trigger('update');

	this.editing = null;
};


// rempve the UI from editing by validating (or not) the data
PartTable.prototype.clearCurrent = function (validate){
	// get datas from html elements
	var part		= this.getEditedPart();
	var load		= this.getEditedLoad();
	var typmax	= this.getEditedTypMax();

	// validate or not the data
	var value = validate ? this.getEditedValue() : part.getConsumption(load, typmax);

	// update the consumption with the new value
	part.setConsumption(value, load, typmax);

	// refresh the part table
	$('.edition').parent().html(value);
	var power = part.getPower(this.tree);
	$(`tr[data-partid=${part.id}] > td.td_power.td_typ`).html(power.typ);
	$(`tr[data-partid=${part.id}] > td.td_power.td_max`).html(power.max);
	$('.partTable').trigger('update');

	this.editing = null;
};


// validate the occuring edition
PartTable.prototype.validateEdition = function() {
	if ('charac' === this.editing) {
		this.clearCharac(true);
	}
	else if ('current' === this.editing) {
		this.clearCurrent(true);
	}
};


// cancel the occuring edition
PartTable.prototype.cancelEdition = function() {
	if ('charac' === this.editing) {
		this.clearCharac(false);
	}
	else if ('current' === this.editing) {
		this.clearCurrent(false);
	}
};


// get the edited part
PartTable.prototype.getEditedPart = function () {
	var partID = $('.edition').data('partid');
	var part = this.partList.getPart(partID);
	return part;
};


// get the edited load
PartTable.prototype.getEditedLoad = function () {
	var loadID = $('.edition').data('loadid');
	var load = this.tree.getItem(loadID);
	return load;
};


// get the edited TypMax
PartTable.prototype.getEditedTypMax = function () {
	return $('.edition').data('typmax');
};


// get the edited value
PartTable.prototype.getEditedValue = function () {
	var value = $('.edition').val();

	if ('current' === this.editing) {
		value = parseFloat(value);
	}

	return value;
};


// get the edited characteristic
PartTable.prototype.getEditedCharac = function () {
	return $('.edition').parent().data('charac');
};


// Listen to all event on the page
PartTable.prototype.listenEvents = function() {
	var that = this;

	// send back data when the window is clossing
	window.onbeforeunload = function() {
		// request ipcRenderer to communicate with main.js
		const {ipcRenderer} = require('electron');
		// send data to main.js
		ipcRenderer.send('partTable-window-close',that.partList.toString());
	};


	// add a new empty part to the PartList
	$('.addPart').click(function(){
		that.partList.addPart();
		that.refresh();
	});


	// edit a charac
	$('.partTable').on('click', '.td_charac', function() {
		var charac	= $(this).data('charac');
		var partID	= $(this).parent().data('partid');
		var part		= that.partList.getPart(partID);

		that.editCharac(part, charac);
	});


	// edit a current
	$('.partTable').on('click', '.td_current', function() {
		var partID	= $(this).parent().data('partid');
		var loadID	= $(this).data('loadid');
		var typmax	= $(this).data('typmax');
		var part		= that.partList.getPart(partID);
		var load		= that.tree.getItem(loadID);

		that.editCurrent(part, load, typmax);
	});


	// trig KEYDOWN and KEYUP on the edition of any value in the partTable
	$('.partTable').on('keydown', '.edition', function(e){
		// , (=> .)
		if("188" == event.which || "110" == event.which){
			event.preventDefault();
			$(this).val($(this).val() + '.');
		}
		// ENTER (=> validate)
		else if (13 === e.keyCode) {
			that.validateEdition();
		}
		// ESCAPE (=> cancel)
		else if (27 === e.keyCode) {
			that.cancelEdition();
		}
		// TAB (=> validate and edit next)
		else if (9 === e.keyCode) {
			event.preventDefault();
			let part		= that.getEditedPart();
			let load		= that.getEditedLoad();
			var typmax	= that.getEditedTypMax();
			var charac	= that.getEditedCharac();
			var editing = that.editing;

			that.validateEdition();

			// shift+tab = previous
			if(that.shiftPressed) {
				if('charac' === editing && 'ref' === charac) {
					that.editCharac(part, 'name');
				}
				else if ('current' === editing) {
					if('max' === typmax) {
						that.editCurrent(part, load, 'typ');
					}
					else {
						let prevload = null;
						that.tree.forEachLoad(function(loopload){
							if(load !== undefined && load.id === loopload.id) {
								if(null !== prevload) {
									that.editCurrent(part, prevload, 'max');
								}
								else if(null === prevload) {
									that.editCharac(part, 'ref');
								}

								return;
							}
							prevload = loopload;
						});
					}
				}



			}
			// tap = next
			else {
				if('charac' === editing) {
					if('name' === charac) {
						that.editCharac(part, 'ref');
					}
					else if ('ref' === charac) {
						let done = false;
						that.tree.forEachLoad(function(loopload){
							if(!done) {
								that.editCurrent(part, loopload, 'typ');
								done = true;
							}
						});
					}
				}
				else if ('current' === editing) {
					if('typ' === typmax) {
						that.editCurrent(part, load, 'max');
					}
					else {
						let prevload = null;
						that.tree.forEachLoad(function(loopload){
							if(null !== prevload && load.id === prevload.id) {
								that.editCurrent(part, loopload, 'typ');
								return;
							}
							prevload = loopload;
						});
					}
				}
			}
		}
	});

	// Shift is released
	$(document).keydown(function(e){
		// SHIFT
		if (16 === e.keyCode) {
			that.shiftPressed = true;
		}
	});

	// Shift is released
	$(document).keyup(function(e){
		// SHIFT
		if (16 === e.keyCode) {
			that.shiftPressed = false;
		}
	});



};
