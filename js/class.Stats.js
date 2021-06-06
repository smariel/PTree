// -----------------------------------------------------------------------------
// Stats Class
//    A Stats object contains a partlist and a tree
//    It provides methods to manipulate a Canvas with those datas
// -----------------------------------------------------------------------------

const Tree     = require('../js/class.Tree.js');
const PartList = require('../js/class.PartList.js');
const Util     = require('../js/class.Util.js');

class Stats {

  constructor(item = null, tree = new Tree(), partList=new PartList()) {
    this.item      = item;
    this.tree      = tree;
    this.partList  = partList;
    this.chartType = 'doughnut';
    this.normalize = false;
    this.charts    = {
      typ: null,
      max: null
    };

    this.listenEvents();
    this.update();
  }


  // update the Canvas according to the active tab
  update() {
    const chartType = $('.selected').data('type');
    if('tree' === chartType) {
      this.updateTree();
    }
    else if('functions' === chartType) {
      this.updateFunctions();
    }
    else if('tags' === chartType) {
      this.updateTags();
    }
  }


  // update the Canvas by displaying the stats of the selected item
  updateTree() {
    // if there is no item, display a message
    if(null === this.item || undefined === this.item) {
      this.empty();
      return;
    }

    // display the title
    $('.title').html(`${this.item.characs.name}`);

    // display a 'go to parent' button if needed
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
    let max = 0;

    // if the item is a source
    if(this.item.isSource()) {
      // prepare data for the chart
      for (let childID of this.item.childrenID) {
        let child = this.tree.getItem(childID);
        let valtyp = Util.smartRound(child.getInputCurrent('typ'), 2);
        let valmax = Util.smartRound(child.getInputCurrent('max'), 2);
        datasets.typ.push(valtyp);
        datasets.max.push(valmax);
        labels.push(child.characs.name);
        if(valmax > max) max = valmax;
        if(valtyp > max) max = valtyp;
      }

      // prepare the callback for the 'click' event
      clickCallback = (event,elements) => {
        if(elements.length > 0) {
          this.item = this.tree.getItem(this.item.childrenID[elements[0]._index]);
          this.updateTreeSelection();
        }
      };
    }
    // else if the item is a load
    else if(this.item.isLoad()) {
      // if the currents are in the partlist
      if(this.item.isInPartlist()) {
        // check each part of the partlist to get the charts data
        this.partList.forEachPart((part) => {
          // if the part is consuming on this load, add it to the chart
          if(part.isConsuming(this.item)) {
            let valtyp = Util.smartRound(part.getConsumption(this.item, 'typ'),2);
            let valmax = Util.smartRound(part.getConsumption(this.item, 'max'),2);
            datasets.typ.push(valtyp);
            datasets.max.push(valmax);
            labels.push(part.characs.name);
            if(valmax > max) max = valmax;
            if(valtyp > max) max = valtyp;
          }
        });

        // if there is no parts
        if(0 === labels.length) {
          this.empty('No part');
          return;
        }
      }
      // else if the current is Raw or in the Spreadsheet
      else if(this.item.isRaw() || this.item.isSynced()) {
        datasets.typ.push(this.item.characs.ityp);
        datasets.max.push(this.item.characs.imax);
        labels.push(this.item.isRaw()?'Raw current':'Spreadsheet');
      }
    }

    // create two charts and fill them
    this.plotChart('typ', datasets.typ, labels, max, 'current (A)', clickCallback);
    this.plotChart('max', datasets.max, labels, max, 'current (A)', clickCallback);
  }


  // update the Canvas by displaying the stats of the functions
  updateFunctions() {
    let datasets  = {typ:[], max:[]};
    let labels    = [];
    let functions = {};
    let i         = 0;
    let max       = 0;
    let tree      = this.tree;


    // display the title
    $('.title').html('Global Power');

    // hide the 'go to parent' button
    $('.goToParent').fadeOut(200);


    this.partList.forEachPart((part) => {
      if('' === part.characs.function) return;
      let func  = part.characs.function;
      let power = part.getPower(tree);

      if(undefined === functions[func]) {
        functions[func] = i;
        i++;
        datasets.typ.push(power.typ);
        datasets.max.push(power.max);
        labels.push(func);
      }
      else {
        datasets.typ[functions[func]] += power.typ;
        datasets.max[functions[func]] += power.max;
      }

      if(power.typ > max) max = power.typ;
      if(power.max > max) max = power.max;
    });

    if(0 === labels.length) {
      this.empty('No function');
    }
    else {
      // create two charts and fill them, without click callback
      this.plotChart('typ', datasets.typ, labels, max, 'power (W)', null);
      this.plotChart('max', datasets.max, labels, max, 'power (W)', null);
    }
  }


  // update the Canvas by displaying the stats of the tags
  updateTags() {
    let datasets  = {typ:[], max:[]};
    let labels    = [];
    let tags      = {};
    let i         = 0;
    let max       = 0;
    let tree      = this.tree;


    // display the title
    $('.title').html('Global Power');

    // hide the 'go to parent' button
    $('.goToParent').fadeOut(200);


    this.partList.forEachPart((part) => {
      if('' === part.characs.tags) return;
      let power     = part.getPower(tree);
      let part_tags = part.characs.tags.split(/[\s]/);

      for(let tag of part_tags) {
        if(undefined === tags[tag]) {
          tags[tag] = i;
          i++;
          datasets.typ.push(power.typ);
          datasets.max.push(power.max);
          labels.push(tag);
        }
        else {
          datasets.typ[tags[tag]] += power.typ;
          datasets.max[tags[tag]] += power.max;
        }

        if(power.typ > max) max = power.typ;
        if(power.max > max) max = power.max;
      }
    });

    if(0 === labels.length) {
      this.empty('No tag');
    }
    else {
      // create two charts and fill them, without click callback
      this.plotChart('typ', datasets.typ, labels, max, 'power (W)', null);
      this.plotChart('max', datasets.max, labels, max, 'power (W)', null);
    }
  }

  // remove both canvas and print a default text
  empty(title = 'No selection') {
    if(null !== this.charts.typ) this.charts.typ.destroy();
    if(null !== this.charts.max) this.charts.max.destroy();
    this.item = null;
    $('.title').text(title);
  }


  // Fill a canvas with a chart and the given data
  plotChart(typmax, dataset, labels, max, unit, clickCallback=null) {
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
          text: `${('typ' == typmax) ? 'Typical' : 'Maximum'} ${unit}`
        },
        legend: {
          display: ('doughnut' === this.chartType),
          position: 'bottom'
        },
        onClick: clickCallback
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

    // load chart.js safely and create an empty chart
    const Chart = require('chart.js');
    Chart.platform.disableCSSInjection = true;
    this.charts[typmax] = new Chart($(`.canvas_${typmax}`), chartConfig);



    // fill the canvas with value and some style/colors
    this.charts[typmax].data = {
      datasets: [{
        data: dataset,
        backgroundColor: Util.getHSLcolorset([348,100,54],dataset.length),
        hoverBackgroundColor: Util.getHSLcolorset([3,82,67],dataset.length),
      }],
      labels: labels
    };

    // print the data on the chart with some cool effects
    this.charts[typmax].update();
  }


  // update the Stats data from raw data
  import(data) {
    this.tree.import(data.treeData);
    this.partList.import(data.partListData);
    this.item = this.tree.getItem(data.itemID);
  }


  // Select a new item
  updateTreeSelection() {
    // Send an IPC async msg to main.js: request to select the given item
    require('electron').ipcRenderer.send('PTree-selectItemReq', this.item.id);
  }


  // Listen to all event on the page
  listenEvents() {
    // IPC async msg received from main.js
    // request to update the Stats with the given data
    require('electron').ipcRenderer.on('Stats-updateItemCmd', (event, data) => {
      this.import(data);
      this.update();
    });

    // click on the 'go to parent' button
    $('.goToParent').click(() => {
      let parent = this.item.getParent();
      if(!parent.isRoot()) {
        this.item = parent;
        this.update();
        this.updateTreeSelection();
      }
    });

    // click on the 'change chart type' button
    $('.chartType').click(() => {
      if('doughnut' === this.chartType) {
        this.chartType = 'bar';
        $('.chartType .fa').removeClass('fa-bar-chart').addClass('fa-pie-chart');
        $('.chartType > button').attr('title', 'pie').tooltip('fixTitle').tooltip('show');
        $('.normalize').fadeIn(200);
      }
      else if('bar' === this.chartType) {
        this.chartType = 'doughnut';
        $('.chartType .fa').removeClass('fa-pie-chart').addClass('fa-bar-chart');
        $('.chartType > button').attr('title', 'bar').tooltip('fixTitle').tooltip('show');
        $('.normalize').fadeOut(200);
      }
      this.update();
    });

    // click on the 'normalize' button
    $('.normalize').click(() => {
      if(this.normalize) {
        this.normalize = false;
        $('.normalize .fa').removeClass('fa-compress').addClass('fa-expand');
        $('.normalize > button').attr('title', 'normalize').tooltip('fixTitle').tooltip('show');
      }
      else {
        this.normalize = true;
        $('.normalize .fa').removeClass('fa-expand').addClass('fa-compress');
        $('.normalize > button').attr('title', 'adjust').tooltip('fixTitle').tooltip('show');
      }
      this.update();
    });

    // click on a button of the top menu
    $('.topmenu > a').click((evt) => {
      if(!$(evt.currentTarget).hasClass('selected')) {
        $('.selected').removeClass('selected');
        $(evt.currentTarget).addClass('selected');
        this.update();
      }
    });
  }
}

module.exports = Stats;
