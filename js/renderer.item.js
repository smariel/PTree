// -----------------------------------------------------------------------------
// Global functions
// -----------------------------------------------------------------------------

// update the form
var updateView = function () {
	var regtype = $('#source_regtype').val();

	// If the reg vout is fixed
	if(regtype <= 2) {
		// hide the adj inputs and enable the fixed values
		$("#source_adjustable").hide();
		//$("#source_description").addClass("offset-s2");
		$(".input_vout").attr("disabled",false);
	}
	// if the reg vout is adjustable
	else if(regtype <= 5) {
		// disable the fixed value and show the adj inputs
		$("#source_adjustable").show();
		//$("#source_description").removeClass("offset-s2");
		$(".input_vout").attr("disabled",true);

		// update the voltage values
		updateVoltage();
	}

	// hide DC/DC and LDO inputs
	$(".source_dcdc").hide();
	$(".source_ldo").hide();

	// Show corresponding inputs if the reg is a DC/DC
	if('0' == regtype || '3' == regtype) {
		$(".source_dcdc").show();
	}
	// Show corresponding inputs if the reg is a LDO
	else if('1' == regtype || '4' == regtype) {
		$(".source_ldo").show();
	}
};


// update the voltage values
var updateVoltage = function() {
		var r1 = $("#source_r1").val();
		var r2 = $("#source_r2").val();
		var rtol = $("#source_rtol").val();
		var vref = $("#source_vref").val();

		var rtolmax = 1 + rtol/100;
		var rtolmin = 1 - rtol/100;

		var vmin = vref*((r1*rtolmin)/(r2*rtolmax)+1);
		var vtyp = vref*(r1/r2+1);
		var vmax = vref*((r1*rtolmax)/(r2*rtolmin)+1);

		$("#input_vout_min").val(round(vmin,3));
		$("#input_vout_typ").val(round(vtyp,3));
		$("#input_vout_max").val(round(vmax,3));
};


// fill the form inputs with the item data by passing its reference to a dedicated function
var fillData = function(item) {
	// get an array of keys for each characs
	var keys = Object.keys(item.characs);


	// hide both load and the source form
	$('form').hide();

	// fill the values of each input
	for(var i=0; i<keys.length; ++i) {
		$('#'+item.type+'_control .form-control[data-itemdata='+keys[i]+']').val(item.characs[keys[i]]);
	}

	updateView();

	// finaly show the form
	$('#'+item.type+'_control').show();

};


// send data to main.js and close the window
var close = function(data){
	ipcRenderer.send('edit-window-close',JSON.stringify(data));
	window.close();
};


// update the item with the new data
var updateItem = function(item) {
	// get an array of keys for each characs
	var keys = Object.keys(item.characs);

	// get the values of each input
	for(var i=0; i<keys.length; ++i) {
		item.characs[keys[i]] = $('#'+item.type+'_control .form-control[data-itemdata='+keys[i]+']').val();
	}
};


// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------

// request ipcRenderer to communicate with main.js
const {ipcRenderer} = require('electron');

// global object that contains the data to process
var itemData = {};

// prepare to fill the form when data will be received from the main process
ipcRenderer.on('edit-window-open-resp', function(event, data){
	itemData = JSON.parse(data);
	fillData(itemData);
});

// request data to the main process
ipcRenderer.send('edit-window-open-req');


// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

// BT cancel clicked
$('#edit_cancel').click(function(){
	// send the old data and close the window
	close(itemData);
});


// BT OK clicked
$('#edit_ok').click(function(){
	// update the item object with the form values
	updateItem(itemData);

	// send the new data and close the window
	close(itemData);
});


// Modify the available inputs when the user change the regtype
$('#source_regtype').change(updateView);


// update vmin/vtyp/vmax on the go
$(".source_adj").keyup(updateVoltage);


// Replace "," by "." on numeric inputs
$(".input_num").keypress(function(event) {
	if("44" == event.which){
		event.preventDefault();
		$(this).val($(this).val() + '.');
	}
});


// Trigger key press
$(document).keydown(function(event){
	// ESCAPE
	if(27 == event.which) {
		// send the old data and close the window
		close(itemData);
	}
	// ENTER
	else if(13 == event.which) {
		// update the item by passing its reference to a dedicated function
		updateItem(itemData);
		// send the old data and close the window
		close(itemData);
	}
});
