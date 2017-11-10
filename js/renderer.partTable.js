$(function() {
   // enable all tooltips
   $('[data-toggle="tooltip"]').tooltip({
      delay: {
         show: 1000,
         hide: 0
      },
      trigger: 'hover'
   });

   // init the two mains object of the partlist
   var partTable = new PartTable();

   // use ipcRender to communicate with main main process
   const {ipcRenderer} = require('electron');

   // prepare to receive the init data from the main process
   ipcRenderer.on('partTable-window-open-resp', function(event, treeData, partListData) {

      // reconstruct a Tree and a PartList object
      partTable.tree.fromString(treeData);
      partTable.partList.fromString(partListData);
      partTable.clearHistory();

      // complete the header of the table withe the list of loads
      partTable.tree.forEachLoad(function(load) {
         if(load.characs.inpartlist) {
            let th1 =  `<th colspan="2" class="th_current">
                           <span class="item_charac item_name">${load.characs.name}</span>
                           <span class="item_charac item_ref">${load.getParent().characs.name}</span>
                           <span class="item_charac item_vout">${numberToSi(load.getInputVoltage('typ'),3)}V</span>
                        </th>`;
            $('.tr_top > .th_power:last-child').before(th1);

            let th2 = '<th class="th_current th_typ">I<sub>TYP</sub></th>';
            let th3 = '<th class="th_current th_max">I<sub>MAX</sub></th>';

            $('.tr_bottom > .th_charac:nth-child(5)').after(th2, th3);
         }
      });

      // refresh the table to fill all data
      partTable.refresh();
   });

   // request the main process for the init data (that will be processed by the function above)
   ipcRenderer.send('partTable-window-open-req');

});
