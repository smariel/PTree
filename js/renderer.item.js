// -----------------------------------------------------------------------------
// Global functions
// -----------------------------------------------------------------------------

// update the form
var updateRegType = function() {
   var regtype = $('#source_regtype').val();

   // default display
   $('#source_adjustable').hide();
   $('#form-group-vout').show();

   // If the reg vout is fixed
   if (regtype <= 2) {
      //$('#source_description').addClass('offset-s2');
      $('.input_vout').attr('disabled', false);
   }
   // if the reg vout is adjustable
   else if (regtype <= 5) {
      // disable the fixed value and show the adj inputs
      $('#source_adjustable').show();
      //$('#source_description').removeClass('offset-s2');
      $('.input_vout').attr('disabled', true);

      // update the voltage values
      updateVoltage();
   }
   // if the reg is dummy
   else if (regtype == 6) {
      $('#form-group-vout').hide();
   }
   // if the reg is perfect
   else if (regtype == 7) {
      $('.input_vout').attr('disabled', false);
   }

   // hide DC/DC and LDO inputs
   $('.source_dcdc').hide();
   $('.source_ldo').hide();

   // Show corresponding inputs if the reg is a DC/DC
   if ('0' == regtype || '3' == regtype) {
      $('.source_dcdc').show();
   }
   // Show corresponding inputs if the reg is a LDO
   else if ('1' == regtype || '4' == regtype) {
      $('.source_ldo').show();
   }

   updateEfficiency();
};


// update the voltage values
var updateVoltage = function() {
   var r1       = $('#source_r1').val();
   var r2       = $('#source_r2').val();
   var rtol     = $('#source_rtol').val();
   var vref_min = $('#source_vref_min').val();
   var vref_typ = $('#source_vref_typ').val();
   var vref_max = $('#source_vref_max').val();

   var rtolmax = 1 + rtol / 100;
   var rtolmin = 1 - rtol / 100;

   var vmin = vref_min * ((r1 * rtolmin) / (r2 * rtolmax) + 1);
   var vtyp = vref_typ * (r1 / r2 + 1);
   var vmax = vref_max * ((r1 * rtolmax) / (r2 * rtolmin) + 1);

   $('#input_vout_min').val(round(vmin, 3));
   $('#input_vout_typ').val(round(vtyp, 3));
   $('#input_vout_max').val(round(vmax, 3));
};


// fill the efficiency chart
var updateEfficiency = function() {
   // create a chart dataset from the item datas
   var datas = $('#effChart').data('efficiency');
   let dataset = [];
   for(let data of datas) {
      dataset.push({x:data.i, y:data.eff});
   }

   // prepare the configuration of the chart
   let chartConfig = {
      type: 'scatter',
      data: {
         datasets: [{
            data: dataset,
            showLine : true,
            tension : 0,
            pointStyle: 'circle',
            radius: 4
         }]
      },
      options: {
         legend: {
            display: false
         },
         // Client event
         onClick: function(event, elements){
            // if click on a point, delete it and redraw the chart
            if(elements.length > 0) {
               $('#effChart').data('efficiency').splice(elements[0]._index,1);
               updateEfficiency();
            }
         }
      },
   };

   // erase the old chart
   if(null !== effChart) {
      effChart.destroy();
      effChart = {};
   }

   // create a new Chart.js
   effChart =  new Chart($('#effChart'), chartConfig);
};


// Add a new efficiency on the chart
var addEfficiency = function() {
   // get the new data from the form
   let new_data = {
      eff: parseFloat($("#input_eff").val()),
      i: parseFloat($("#input_eff_i").val())
   };

   // get the old data
   let eff_datas = $('#effChart').data('efficiency');

   // if the new datas are numbers
   if(!isNaN(new_data.eff) && !isNaN(new_data.i)) {
      // add the data to the array, keeping ordered by ascending currend
      let new_index = null;
      if(eff_datas.length === 0)
      {
         // no efficiency, first point in the empty chart
         new_index = 0;
         eff_datas.push(new_data);
      }
      else if(new_data.i <= eff_datas[0].i) {
         // lowest Amp, first point in the chart
         new_index = 0;
         eff_datas.splice(new_index,0,new_data);
      }
      else if (new_data.i >= eff_datas[eff_datas.length-1].i) {
         // Highest Amp, last point in the chart
         new_index = eff_datas.length - 1;
         eff_datas.push(new_data);
      }
      else {
         // Somwhere in the midle of the chart
         for(let n=1; n<eff_datas.length; n++) {
            if(new_data.i >= eff_datas[n-1].i && new_data.i < eff_datas[n].i) {
               new_index = n;
               eff_datas.splice(new_index,0,new_data);
               break;
            }
         }
      }

      // convert datas to string
      if(null !== new_index) {
         eff_datas[new_index].i   = eff_datas[new_index].i.toString();
         eff_datas[new_index].eff = eff_datas[new_index].eff.toString();
      }

      // update the chart
      updateEfficiency();

      // remove the data from the format
      $("#input_eff").val("");
      $("#input_eff_i").val("");
   }
};


// fill the form inputs with the item data by passing its reference to a dedicated function
var fillData = function(item) {
   // hide both load and the source form
   $('form').hide();

   // get the values of each input
   for (let charac in item.characs) {
      if (item.characs.hasOwnProperty(charac)) {
         // get the jquery element identified by its data
         let input = $('#' + item.type + '_control *[data-itemdata=' + charac + ']');
         // if the element is a checkbox
         if('checkbox' === input.attr('type') && item.characs[charac]) {
            input.prop('checked','checked');
         }
         // if the element is the efficiency canvas
         else if ('effChart' === input.attr('id')) {
            // if the efficiency is an array (>= v1.1.0)
            if(typeof item.characs.efficiency === 'object') {
               input.data('efficiency', item.characs.efficiency.slice(0));
            }
            // if the efficiency is a single number (< v1.1.0)
            else {
               input.data('efficiency', [{i:1, eff:item.characs.efficiency}]);
            }
         }
         // if the element is a normal input
         else {
            input.val(item.characs[charac]);
         }

         input.data('original',item.characs[charac]);
      }
   }

   // Update the html
   if('source' === item.type) {
      updateRegType();
   }
   else if ('load' === item.type) {
      updateLoadCurrent();
   }

   // finaly show the form
   $('#' + item.type + '_control').show();
};


// send data to main.js and close the window
var close = function(data) {
   ipcRenderer.send('edit-window-close', JSON.stringify(data));
   window.close();
};


// update the item with the new data
var updateItem = function(item) {
   // get the values of each input
   for (let charac in item.characs) {
      if (item.characs.hasOwnProperty(charac)) {
         let input = $('#' + item.type + '_control *[data-itemdata=' + charac + ']');
         if(('ityp' === charac || 'imax' === charac) && input.prop('disabled')) {
            continue;
         }
         else if('checkbox' === input.attr('type')) {
            item.characs[charac] = input.prop('checked');
         }
         else if ('effChart' === input.attr('id')) {
            item.characs[charac] = input.data('efficiency').slice(0);
         }
         else {
            item.characs[charac] = input.val();
         }
      }
   }
};


// Upadte the load current helper
var updateLoadCurrent = function() {
   $('.loadtype').hide();

   loadtype = $('#load_type').val();
   $(`.loadtype${loadtype}`).show();
};


// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------

// request ipcRenderer to communicate with main.js
const {ipcRenderer} = require('electron');

// global object that contains the data to process
var itemData = {};

// global object that contains the Chart.js context
var effChart = null;

// prepare to fill the form when data will be received from the main process
ipcRenderer.on('edit-window-open', function(event, data) {
   itemData = JSON.parse(data);
   fillData(itemData);
});



// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

// BT cancel clicked
$('#edit_cancel').click(function() {
   // send the old data and close the window
   close(itemData);
});


// BT OK clicked
$('#edit_ok').click(function() {
   // update the item object with the form values
   updateItem(itemData);

   // send the new data and close the window
   close(itemData);
});


// BT + (efficiency) clicked
$('#add_eff').click(addEfficiency);


// Modify the available inputs when the user change the regtype
$('#source_regtype').change(updateRegType);


// Permit current edition if the checkbox is unchecked
$('#load_type').change(updateLoadCurrent);


// update vmin/vtyp/vmax on the go
$('.source_adj').keyup(updateVoltage);


// Replace ',' by '.' on numeric inputs
$('.input_num').keypress(function(event) {
   if ('44' == event.which) {
      event.preventDefault();
      $(this).val($(this).val() + '.');
   }
});


// Trigger key press
$(document).keydown(function(event,a) {
   // ESCAPE
   if (27 == event.which) {
      // send the old data and close the window
      close(itemData);
   }
   // ENTER
   else if (13 == event.which) {
      // editing efficiency, add it
      if(event.target.id === "input_eff" || event.target.id === "input_eff_i") {
         addEfficiency();
      }
      // else, validate the editon
      else {
         // update the item by passing its reference to a dedicated function
         updateItem(itemData);
         // send the old data and close the window
         close(itemData);
      }
   }
});
