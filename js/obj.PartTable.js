// -----------------------------------------------------------------------------
// PartTable constructor
// 	A PartTable contains a partlist associated with a tree
//		It provides methods to manipulate those parts within a <table> element
// -----------------------------------------------------------------------------

var PartTable = function() {
	this.partList = new PartList();
	this.tree = new Tree();

	this.listenEvents();
};


// refresh the table with new values
PartTable.prototype.refresh = function() {
	// empty the table content
	$('.partTable tbody').empty();

	// print the content of the table
	for(let part of this.partList.part_list) {
		// Part characteristics
		var tags = ''; // TODO
		var tr = `<tr data-partid="${part.id}">
			<td class="td_charac">${part.id}</td>
			<td class="td_charac">${part.characs.name}</td>
			<td class="td_charac">${part.characs.ref}</td>
			<td class="td_charac">${tags}</td>
		`;

		// Part consumptions on each load
		// Can't use tree.forEachLoad() without creating an anonymous function in this loop
		for(let item of this.tree.item_list) {
			if(item !== undefined && item.isLoad()) {
				let consumption = part.characs.consumptions[item.id];
				let typ = 0;
				let max = 0;
				if(undefined !== consumption) {
					typ = consumption.typ;
					max = consumption.max;
				}
				tr += `<td class="tr_current tr_typ">${typ}</td><td class="tr_current tr_max">${max}</td>`;
			}
		}

		// Part total power consumption
		// TODO
		tr += `<td class="tr_power tr_typ">${0}</td><td class="tr_power tr_max">${0}</td>`;


		// Print
		tr += `</tr>`;
		$('.partTable tbody').append(tr);
	}
};


// Listen to all event on the page
PartTable.prototype.listenEvents = function() {
	var that = this;
	$(".addPart").click(function(){
		that.partList.addPart();
		that.refresh();
	});
};
