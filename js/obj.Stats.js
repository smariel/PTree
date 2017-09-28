// -----------------------------------------------------------------------------
// Stats constructor
//    A Stats object contains a partlist and a tree
//    It provides methods to manipulate a Canvas with those datas
// -----------------------------------------------------------------------------

var Stats = function() {
   this.tree     = new Tree();
   this.partList = new PartList();
   this.charts   = {
      typ: null,
      max: null
   };

   this.listenEvents();
};

// update the Canvas by displaying the stats of the given item
Stats.prototype.updateCanvas = function(item) {
   // if there are no item, display a message
   if(null === item || undefined === item) {
      this.selected = null;
      $('.title').text('No selection');
   }
   // if the item is a source, display two doughnuts (typ and max) of the child consumptions
   else if(item.isSource()) {
      this.updateCanvasFromSource(item);
   }
   else if(item.isLoad()) {
      this.updateCanvasFromLoad(item);
   }
};

// update the Canvas by displaying the stats of the given Source
Stats.prototype.updateCanvasFromSource = function(source) {
   var that = this;
   // print the title
   $('.title').html(`${source.characs.name} - ${source.characs.ref}`);

   // prepare the callback for the "click" event
   let clickCallback = function(event,elements) {
      if(elements.length>0) {
         let itemID = elements[0]._chart.data.datasets[0].itemsID[elements[0]._index];
         that.updateCanvas(that.tree.getItem(itemID));
         // TODO: manage the Chartjs error.
      }
   };

   // create two charts and fill them
   for(let typmax of ['typ', 'max']) {
      if(null !== this.charts[typmax]) {
         this.charts[typmax].destroy();
      }

      // create an empty chart
      this.charts[typmax] = new Chart($(`.canvas_${typmax}`), {
         type: 'doughnut',
         options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
               padding: {
                  left: ('typ' == typmax)?20:0,
                  right: 20
               }
            },
            title: {
               display: true,
               position: 'top',
               text: `${('typ' == typmax) ? 'Typical' : 'Maximum'} current (A)`
            },
            legend: {
               display: true,
               position: 'bottom'
            },
            onClick:clickCallback
         }
      });

      // fill the chart with data
      let dataset = [];
      let labels = [];
      for (let childID of source.childrenID) {
         let child = this.tree.getItem(childID);
         dataset.push(round(child.getInputPower(typmax), 2));
         labels.push(child.characs.name);
      }

      // change the chart style with auto colors
      this.charts[typmax].data = {
         datasets: [{
            data: dataset,
            backgroundColor: getHSLcolorset([348,100,54],dataset.length),
            hoverBackgroundColor: getHSLcolorset([3,82,67],dataset.length),
            itemsID: source.childrenID
         }],
         labels: labels
      };

      // print the data on the chart with some cool effects
      this.charts[typmax].update();
   }
};

// update the Canvas by displaying the stats of the given Source
Stats.prototype.updateCanvasFromLoad = function(source) {
   //TODO
};

// Listen to all event on the page
Stats.prototype.listenEvents = function() {
   var that = this;

   // use ipcRender to communicate with main main process
   const {ipcRenderer} = require('electron');

   ipcRenderer.on('stats-selectItem', function(event, data){
      that.tree.fromString(data.treeData);
      that.partList.fromString(data.partListData);
      that.updateCanvas(that.tree.getItem(data.itemID));
   });
};
