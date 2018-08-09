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
   this.normalize = false;
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
      let max = 0;

      // plot the charts
      if(this.item.isSource()) {
         // prepare data for the chart
         for (let childID of this.item.childrenID) {
            let child = this.tree.getItem(childID);
            let valtyp = smartRound(child.getInputCurrent('typ'), 2);
            let valmax = smartRound(child.getInputCurrent('max'), 2);
            datasets.typ.push(valtyp);
            datasets.max.push(valmax);
            labels.push(child.characs.name);
            if(valmax > max) max = valmax;
            if(valtyp > max) max = valtyp;
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
               let valtyp = smartRound(part.getConsumption(that.item, 'typ'),2);
               let valmax = smartRound(part.getConsumption(that.item, 'max'),2);
               datasets.typ.push(valtyp);
               datasets.max.push(valmax);
               labels.push(part.characs.name);
               if(valmax > max) max = valmax;
               if(valtyp > max) max = valtyp;
            }
         });

         if(!this.item.isInPartlist() || 0 === labels.length) {
            this.empty('No part');
            return;
         }
      }

      // create two charts and fill them
      this.plotChart('typ', datasets.typ, labels, max, clickCallback);
      this.plotChart('max', datasets.max, labels, max, clickCallback);
   }
};


// remove both canvas and print a default text
Stats.prototype.empty = function(title = 'No selection') {
   if(null !== this.charts.typ) this.charts.typ.destroy();
   if(null !== this.charts.max) this.charts.max.destroy();
   this.item = null;
   $('.title').text(title);
};


// Fill a canvas with a chart and the given data
Stats.prototype.plotChart = function(typmax, dataset, labels, max, clickCallback) {
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

      if(this.normalize && undefined !== max && 0 !== max) {
         chartConfig.options.scales.yAxes[0].ticks.suggestedMax = max;
      }
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
         $('.normalize').fadeIn(200);
      }
      else if('bar' === that.chartType) {
         that.chartType = "doughnut";
         $('.chartType .fa').removeClass('fa-pie-chart').addClass('fa-bar-chart');
         $('.chartType > button').attr('title', 'bar').tooltip('fixTitle').tooltip('show');
         $('.normalize').fadeOut(200);
      }
      that.update();
   });

   // click on the "normalize" button
   $('.normalize').click(function(){
      if(that.normalize) {
         that.normalize = false;
         $('.normalize .fa').removeClass('fa-compress').addClass('fa-expand');
         $('.normalize > button').attr('title', 'normalize').tooltip('fixTitle').tooltip('show');
      }
      else {
         that.normalize = true;
         $('.normalize .fa').removeClass('fa-expand').addClass('fa-compress');
         $('.normalize > button').attr('title', 'adjust').tooltip('fixTitle').tooltip('show');
      }
      that.update();
   });
};
