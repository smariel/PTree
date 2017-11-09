// -----------------------------------------------------------------------------
// Stats constructor
//    A Stats object contains a partlist and a tree
//    It provides methods to manipulate a Canvas with those datas
// -----------------------------------------------------------------------------

var Stats = function(item, tree, partList) {
   this.item      = null;
   this.tree      = new Tree();
   this.partList  = new PartList();
   this.chartType = 'doughnut';
   this.charts    = {
      typ: null,
      max: null
   };

   this.listenEvents();
   this.update();
};


// update the Canvas by displaying the stats of the saved item
Stats.prototype.update = function() {
   // if there is no item, display a message
   if(null === this.item || undefined === this.item) {
      this.empty();
   }
   // if there is an item, display two charts
   else {
      // display the title
      $('.title').html(`${this.item.characs.name}`);

      // display a "go to parent" button if needed
      let parent = this.item.getParent();
      if(null !== parent && !parent.isRoot()) {
         $('.goToParent > button').attr('title', parent.characs.name).tooltip('fixTitle');
         $('.goToParent').fadeIn(200);
      }
      else {
         $('.goToParent').fadeOut(200);
      }

      // create two charts and fill them
      let datasets = {typ:[], max:[]};
      let labels = [];
      let clickCallback = null;
      var that = this;

      // plot the charts
      if(this.item.isSource()) {
         // prepare data for the chart
         for (let childID of this.item.childrenID) {
            let child = this.tree.getItem(childID);
            datasets.typ.push(round(child.getInputPower('typ'), 2));
            datasets.max.push(round(child.getInputPower('max'), 2));
            labels.push(child.characs.name);
         }

         // prepare the callback for the "click" event
         clickCallback = function(event,elements) {
            if(elements.length > 0) {
               that.item = that.tree.getItem(that.item.childrenID[elements[0]._index]);
               that.updateTreeSelection();
               that.update();
               // TODO : do something with the Chart.js error
            }
         };
      }
      else if(this.item.isLoad()) {
         // check each part of the partlist to get the charts data
         this.partList.forEachPart(function(part){
            // if the part is consuming on this load, add it to the canvas
            if(part.isConsuming(that.item)) {
               datasets.typ.push(part.getConsumption(that.item, 'typ'));
               datasets.max.push(part.getConsumption(that.item, 'max'));
               labels.push(part.characs.name);
            }
         });
      }

      // create two charts and fill them
      this.plotChart('typ', datasets.typ, labels, clickCallback);
      this.plotChart('max', datasets.max, labels, clickCallback);
   }
};


// remove both canvas and print a default text
Stats.prototype.empty = function() {
   if(null !== this.charts.typ) this.charts.typ.destroy();
   if(null !== this.charts.max) this.charts.max.destroy();
   this.item = null;
   $('.title').text('No selection');
};


// Fill a canvas with a chart and the given data
Stats.prototype.plotChart = function(typmax, dataset, labels, clickCallback) {
   // destroy any previous chart
   if(null !== this.charts[typmax]) {
      this.charts[typmax].destroy();
   }

   let chartConfig = {
      type: this.chartType,
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
            display: ('doughnut' === this.chartType),
            position: 'bottom'
         },
         onClick: (undefined !== clickCallback) ? clickCallback : null
      }
   };

   if ('bar' === this.chartType) {
      chartConfig.options.scales = {
         yAxes: [{
            id: 'y-axis-0',
            ticks: {
               beginAtZero: true,
               min: 0,
            },
         }]
      };
   }

   // create an empty chart
   this.charts[typmax] = new Chart($(`.canvas_${typmax}`), chartConfig);



   // fill the canvas with value and some style/colors
   this.charts[typmax].data = {
      datasets: [{
         data: dataset,
         backgroundColor: getHSLcolorset([348,100,54],dataset.length),
         hoverBackgroundColor: getHSLcolorset([3,82,67],dataset.length),
      }],
      labels: labels
   };

   // print the data on the chart with some cool effects
   this.charts[typmax].update();
};


// update the Stats data from raw data
Stats.prototype.import = function(data) {
   this.tree.fromString(data.treeData);
   this.partList.fromString(data.partListData);
   this.item = this.tree.getItem(data.itemID);
};


// send an update to the PTree
Stats.prototype.updateTreeSelection = function() {
   const {ipcRenderer} = require('electron');
   ipcRenderer.send('tree-selectItem', this.item.id);
};


// Listen to all event on the page
Stats.prototype.listenEvents = function() {
   var that = this;

   // use ipcRender to communicate with main main process
   const {ipcRenderer} = require('electron');

   // update the chart every time a message is received from main.js
   ipcRenderer.on('stats-selectItem', function(event, data){
      that.import(data);
      that.update();
   });

   // click on the "go to parent" button
   $('.goToParent').click(function(){
      that.item = that.item.getParent();
      that.update();
      that.updateTreeSelection();
   });

   // click on the "change chart type" button
   $('.chartType').click(function(){
      if('doughnut' === that.chartType) {
         that.chartType = "bar";
         $('.chartType .fa').removeClass('fa-bar-chart').addClass('fa-pie-chart');
         $('.chartType > button').attr('title', 'pie').tooltip('fixTitle').tooltip('show');
      }
      else if('bar' === that.chartType) {
         that.chartType = "doughnut";
         $('.chartType .fa').removeClass('fa-pie-chart').addClass('fa-bar-chart');
         $('.chartType > button').attr('title', 'bar').tooltip('fixTitle').tooltip('show');
      }
      that.update();
   });
};
