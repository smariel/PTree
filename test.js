// -----------------------------------------------------------------------------
// Test file
// run with 'npm test' to check all the functions of PTree before deploying
//   AVA          https://github.com/avajs/ava#
//   Spectron     https://github.com/electron/spectron#-spectron
//   WebdriverIO  http://webdriver.io/api.html
// -----------------------------------------------------------------------------

/* eslint no-undef: 0 */
const refreshScreenshots = false; // needed after electron/chrome update
const checkConsoleLog    = false;

const test = require('ava');
const {Application} = require('spectron');
const Tree = require('./js/class.Tree.js');

test.serial('TEST1: PTree object creation', async t => {
  const browser = t.context.app.client;
  let ret = await browser.execute(() => ptree.tree.getRoot().type);

  t.is(ret, 'root');
});

test.serial('TEST2: item creation', async t => {
  const browser = t.context.app.client;
  let tree = new Tree(false);
  let ret;

  // create some items
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');
  await browser.clickElt('#bt_addload');
  ret = await browser.execute(() => ptree.tree.toString());
  tree.fromString(ret);
  t.is(tree.item_list.length, 4);
  t.is(tree.item_index, 4);
  t.is(tree.item_list[0].type, 'root');
  t.is(tree.item_list[1].type, 'source');
  t.is(tree.item_list[2].type, 'source');
  t.is(tree.item_list[3].type, 'load');


  // remove the loads
  await browser.clickElt('#bt_remove');
  ret = await browser.execute(() => ptree.tree.toString());
  tree.fromString(ret);
  t.is(tree.item_list.length, 3);
  t.is(tree.item_index, 4);
  t.is(tree.item_list[3], undefined);

  // remove every thing
  await browser.clickElt('#bt_clear');
  ret = await browser.execute(() => ptree.tree.toString());
  tree.fromString(ret);
  t.is(tree.item_list.length, 1);
  t.is(tree.item_index, 1);
  t.is(tree.item_list[1], undefined);
  t.is(tree.item_list[2], undefined);
  t.is(tree.item_list[3], undefined);
});

test.serial('TEST3: undo/redo', async t => {
  const browser = t.context.app.client;
  let tree = new Tree(false);
  let ret;

  // create an item
  await browser.clickElt('#bt_addrootsource');
  ret = await browser.execute(() => ptree.tree.toString());
  tree.fromString(ret);
  t.is(tree.item_list[1].type, 'source');

  // undo
  await browser.clickElt('#bt_undo');
  ret = await browser.execute(() => ptree.tree.toString());
  tree.fromString(ret);
  t.is(tree.item_list[1], undefined);

  // redo
  await browser.clickElt('#bt_redo');
  ret = await browser.execute(() => ptree.tree.toString());
  tree.fromString(ret);
  t.is(tree.item_list[1].type, 'source');
});

test.serial('TEST4: open file + canvas construction', async t => {
  const browser = t.context.app.client;

  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  t.true(await testScreenshot(t,'test4'));
});

test.serial('TEST5: save + new project', async t => {
  const browser = t.context.app.client;

  // create an item
  await browser.clickElt('#bt_addrootsource');

  // save the project
  await browser.execute(() => {
    ptree.filePath = `${__dirname}/../test_project.ptree`;
    return null;
  });
  await browser.clickElt('#bt_save');

  // clear the project and reopen it then export the tree
  await browser.clickElt('#bt_new');
  await browser.execute(() => {
    ptree.open(`${__dirname}/../test_project.ptree`);
    return null;
  });
  let ret = await browser.execute(() => ptree.tree.toString());
  let tree = new Tree(false);
  tree.fromString(ret);

  // check the tree
  t.is(tree.item_list.length, 2);
  t.is(tree.item_list[1].type, 'source');

  // delete the project file
  require('fs').unlinkSync(`${__dirname}/test_project.ptree`);
});

test.serial('TEST6: canvas manipulation', async t => {
  const browser = t.context.app.client;
  let ret;

  // open a reference PTree project
  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // move over a particular item to display infos and check them
  await browser.moveAt(375, 95);

  ret = await browser.execute(() => {
    return {
      vin_typ:  $('#vin_typ' ).text(),
      vin_max:  $('#vin_max' ).text(),
      iin_typ:  $('#iin_typ' ).text(),
      iin_max:  $('#iin_max' ).text(),
      pin_typ:  $('#pin_typ' ).text(),
      pin_max:  $('#pin_max' ).text(),
      vout_typ: $('#vout_typ').text(),
      vout_max: $('#vout_max').text(),
      iout_typ: $('#iout_typ').text(),
      iout_max: $('#iout_max').text(),
      pout_typ: $('#pout_typ').text(),
      pout_max: $('#pout_max').text(),
      loss_typ: $('#loss_typ').text(),
      loss_max: $('#loss_max').text(),
    };
  });

  t.is(ret.vin_typ,  '5V');
  t.is(ret.vin_max,  '5V');
  t.is(ret.iin_typ,  '621mA');
  t.is(ret.iin_max,  '1.4A');
  t.is(ret.pin_typ,  '3.1W');
  t.is(ret.pin_max,  '7W');
  t.is(ret.vout_typ, '1.8V');
  t.is(ret.vout_max, '1.82V');
  t.is(ret.iout_typ, '1.5A');
  t.is(ret.iout_max, '2.7A');
  t.is(ret.pout_typ, '2.7W');
  t.is(ret.pout_max, '4.91W');
  t.is(ret.loss_typ, '403mW');
  t.is(ret.loss_max, '2.09W');

  // click LOAD3 and check if it was selected
  await browser.clickAt(660, 275);
  ret = await browser.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret, 13);

  // click LDO4, move it down, move it up, chek its positions
  await browser.clickAt(375, 375);
  ret = await browser.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret[2], 7);
  t.is(ret[3], 8);
  await browser.clickElt('#bt_up');
  ret = await browser.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret[2], 8);
  t.is(ret[3], 7);
  await browser.clickElt('#bt_down');
  ret = await browser.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret[2], 7);
  t.is(ret[3], 8);

  // drag an item over an other and check the style of the "receiver" changed
  await browser.drag(375, 450, 375, 550);
  ret = await browser.execute(() => ptree.canvas.fabricCanvas.fabric_obj[10].rect.strokeWidth);
  t.is(ret, 7);

  // drop the item and check the id of its new parent
  await browser.drop();
  ret = await browser.execute(() => ptree.tree.getItem(9).getParent().id);
  t.is(ret, 10);

});

test.serial('TEST7: total power', async t => {
  const browser = t.context.app.client;

  // open a reference PTree project
  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // move over a particular item to display infos and check them
  let ret = await browser.execute(() => {
    return {
      totalpower_typ: $('.totalpower.typ').text(),
      totalpower_max: $('.totalpower.max').text(),
      totaleff_typ:   $('.totaleff.typ'  ).text(),
      totaleff_maw:   $('.totaleff.max'  ).text(),
    };
  });
  t.is(ret.totalpower_typ,'17.9');
  t.is(ret.totalpower_max,'33');
  t.is(ret.totaleff_typ,  '94');
  t.is(ret.totaleff_maw,  '87.4');
});

test.serial('TEST8: configurations', async t => {
  const browser = t.context.app.client;

  // open a reference PTree project
  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // open the config, wait for the animation to end, change the config
  await browser.clickElt('#bt_config');
  await wait(500);
  await browser.execute(() => {
    $('#config_textsize').val(30).trigger('change');
    $('#config_itemwidth').val(200).trigger('change');
    $('#config_itemheight').val(50).trigger('change');
    $('#config_zoom').val(150).trigger('change');
    $('#config_zoomexport').val(200).trigger('change');
    $('#config_sourcecolor').val('#4444DD').trigger('change');
    $('#config_loadcolor').val('#DDDD44').trigger('change');
    return null;
  });
  await browser.clickElt('#config_infoVtyp');
  await browser.clickElt('#config_infoVmax');
  await browser.clickElt('#config_infoItyp');
  await browser.clickElt('#config_infoImax');
  await browser.clickElt('#config_infoPtyp');
  await browser.clickElt('#config_infoPmax');
  await browser.clickElt('#config_name');
  await browser.clickElt('#config_ref');
  await browser.clickElt('#config_custom1');
  await browser.clickElt('#config_badges');
  await browser.clickElt('#config_alignload');
  await browser.clickElt('#config_proportional');
  await browser.clickElt('#bottom_close');
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');
  await browser.clickElt('#bt_addload');
  await wait(500);

  t.true(await testScreenshot(t,'test8-1'));


  // open the config, wait for the animation to end, reset
  await browser.clickElt('#bt_undo');
  await browser.clickElt('#bt_undo');
  await browser.clickElt('#bt_undo');
  await browser.execute(() => {
    ptree.setSaved();
    ptree.clearHistory();
    return null;
  });
  await browser.clickElt('#bt_config');
  await wait(500);
  await browser.clickElt('.mybtn-defaultConfig');
  await browser.clickElt('#bottom_close');
  await wait(500);

  t.true(await testScreenshot(t,'test8-2'));
});

test.serial('TEST9: sync external spreadsheet', async t => {
  const browser = t.context.app.client;
  let ret;

  // open a reference PTree project
  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // select a sheet and test the global power values
  await browser.execute(() => {
    ptree.selectSheet(`${__dirname}/../docs/test/test9-1.xlsx`);
    return null;
  });
  await wait(500);
  ret = await browser.execute(() => ptree.tree.getTotalPower());
  t.is(ret.typ,17.870114942528737);
  t.is(ret.max,33.00501251251251);

  // select an other sheet and test the global power values
  await browser.execute(() => {
    ptree.selectSheet(`${__dirname}/../docs/test/test9-2.xlsx`);
    return null;
  });
  await wait(500);
  ret = await browser.execute(() => ptree.tree.getTotalPower());
  t.is(ret.typ,20.610114942528735);
  t.is(ret.max,35.62501251251251);
});

test.serial('TEST10: edit source, DC/DC fixed', async t => {
  const browser = t.context.app.client;

  // add two sources
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');

  // ---------------------------------------------------------------------------
  // DCDC fixed

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#source_color').val('#aabb11').trigger('change');
      $('#source_regtype').val('0').trigger('change');
      $('#source_name').val('test_source_name').trigger('change');
      $('#source_ref').val('test_source_ref').trigger('change');
      $('#source_custom1').val('test_source_custom1').trigger('change');
      $('#input_vout_min').val('2.49').trigger('change');
      $('#input_vout_typ').val('2.5').trigger('change');
      $('#input_vout_max').val('2.51').trigger('change');
      $('#input_eff').val('75').trigger('change');
      $('#input_eff_i').val('0').trigger('change');
      return null;
    });
    await wait(500);
    await browser.clickElt('#add_eff');
    await wait(1000);
    await browser.clickElt('#edit_ok');
  });

  // focus the tree
  await browser.windowByIndex(0);

  // get the characs of the edited item
  let ret = await browser.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.name,              'test_source_name');
  t.is(ret.regtype,           '0');
  t.is(ret.ref,               'test_source_ref');
  t.is(ret.custom1,           'test_source_custom1');
  t.is(ret.vout_min,          '2.49');
  t.is(ret.vout_typ,          '2.5');
  t.is(ret.vout_max,          '2.51');
  t.is(ret.efficiency[0].i,   '0');
  t.is(ret.efficiency[0].eff, '75');
  t.is(ret.color,             '#aabb11');
});

test.serial('TEST11: edit source, LDO fixed', async t => {
  const browser = t.context.app.client;

  // add two sources
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#source_regtype').val('1').trigger('change');
      $('#input_vout_min').val('1.49').trigger('change');
      $('#input_vout_typ').val('1.5').trigger('change');
      $('#input_vout_max').val('1.51').trigger('change');
      $('#input_iq_min').val('0.001').trigger('change');
      $('#input_iq_typ').val('0.002').trigger('change');
      $('#input_iq_max').val('0.003').trigger('change');
      return null;
    });

    await browser.clickElt('#edit_ok');
  });

  // focus the tree
  await browser.windowByIndex(0);

  // get the characs of the edited item
  let ret = await browser.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.regtype,  '1');
  t.is(ret.vout_min, '1.49');
  t.is(ret.vout_typ, '1.5');
  t.is(ret.vout_max, '1.51');
  t.is(ret.iq_min,   '0.001');
  t.is(ret.iq_typ,   '0.002');
  t.is(ret.iq_max,   '0.003');
});

test.serial('TEST12: edit source, DC/DC adj', async t => {
  const browser = t.context.app.client;

  // add two sources
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#source_regtype').val('3').trigger('change');
      $('#source_r1').val('500000').trigger('change');
      $('#source_r2').val('100000').trigger('change');
      $('#source_rtol').val('0.1').trigger('change');
      $('#source_vref_min').val('0.59').trigger('change');
      $('#source_vref_typ').val('0.6').trigger('change');
      $('#source_vref_max').val('0.61').trigger('change');
      return null;
    });
    await wait(500);
    await browser.clickElt('#edit_ok');
  });

  // focus the tree
  await browser.windowByIndex(0);

  // get the characs of the edited item
  let ret = await browser.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.regtype,  '3');
  t.is(ret.vout_min, 3.5341058941058945);
  t.is(ret.vout_typ, 3.5999999999999996);
  t.is(ret.vout_max, 3.6661061061061053);
  t.is(ret.r1,       '500000');
  t.is(ret.r2,       '100000');
  t.is(ret.rtol,     '0.1');
  t.is(ret.vref_min, '0.59');
  t.is(ret.vref_typ, '0.6');
  t.is(ret.vref_max, '0.61');
});

test.serial('TEST13: edit source, LDO adj', async t => {
  const browser = t.context.app.client;

  // add two sources
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#source_regtype').val('4').trigger('change');
      $('#source_r1').val('500000').trigger('change');
      $('#source_r2').val('100000').trigger('change');
      $('#source_rtol').val('0.1').trigger('change');
      $('#source_vref_min').val('0.59').trigger('change');
      $('#source_vref_typ').val('0.6').trigger('change');
      $('#source_vref_max').val('0.61').trigger('change');
      $('#input_iq_min').val('0.001').trigger('change');
      $('#input_iq_typ').val('0.002').trigger('change');
      $('#input_iq_max').val('0.003').trigger('change');
      return null;
    });
    await wait(500);
    await browser.clickElt('#edit_ok');
  });

  // focus the tree
  await browser.windowByIndex(0);

  // get the characs of the edited item
  let ret = await browser.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.regtype,  '4');
  t.is(ret.vout_min, 3.5341058941058945);
  t.is(ret.vout_typ, 3.5999999999999996);
  t.is(ret.vout_max, 3.6661061061061053);
  t.is(ret.r1,       '500000');
  t.is(ret.r2,       '100000');
  t.is(ret.rtol,     '0.1');
  t.is(ret.vref_min, '0.59');
  t.is(ret.vref_typ, '0.6');
  t.is(ret.vref_max, '0.61');
  t.is(ret.iq_min,   '0.001');
  t.is(ret.iq_typ,   '0.002');
  t.is(ret.iq_max,   '0.003');
});

test.serial('TEST14: edit source, dummy', async t => {
  const browser = t.context.app.client;

  // add two sources
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#source_regtype').val('6').trigger('change');
      return null;
    });
    await wait(500);
    await browser.clickElt('#edit_ok');
  });

  // focus the tree
  await browser.windowByIndex(0);

  // get the characs of the edited item
  let ret = await browser.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.regtype,  '6');
});

test.serial('TEST15: edit source, perfect', async t => {
  const browser = t.context.app.client;

  // add two sources
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addsource');

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#source_regtype').val('7').trigger('change');
      $('#input_vout_min').val('1.49').trigger('change');
      $('#input_vout_typ').val('1.5').trigger('change');
      $('#input_vout_max').val('1.51').trigger('change');
      return null;
    });
    await wait(500);
    await browser.clickElt('#edit_ok');
  });

  // focus the tree
  await browser.windowByIndex(0);

  // get the characs of the edited item
  let ret = await browser.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.regtype,  '7');
  t.is(ret.vout_min, '1.49');
  t.is(ret.vout_typ, '1.5');
  t.is(ret.vout_max, '1.51');
});

test.serial('TEST16: edit load', async t => {
  const browser = t.context.app.client;
  let ret;
  // add a source and a load
  await browser.clickElt('#bt_addrootsource');
  await browser.clickElt('#bt_addload');

  // ---------------------------------------------------------------------------
  // LOAD RAW

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);
  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#load_color').val('#aabb11').trigger('change');
      $('#load_type').val('1').trigger('change');
      $('#load_name').val('test_load_name').trigger('change');
      $('#load_custom1').val('test_load_custom1').trigger('change');
      $('#load_ityp').val('0.123').trigger('change');
      $('#load_imax').val('1.234').trigger('change');
      return null;
    });
    await wait(500);
    await browser.clickElt('#edit_ok');
  });
  // focus the tree
  await browser.windowByIndex(0);
  // get the characs of the edited item and test them
  ret = await browser.execute(() => ptree.tree.getItem(2).characs);
  t.is(ret.name,     'test_load_name');
  t.is(ret.loadtype, '1');
  t.is(ret.custom1,  'test_load_custom1');
  t.is(ret.ityp,     '0.123');
  t.is(ret.imax,     '1.234');
  t.is(ret.color,    '#aabb11');


  // ---------------------------------------------------------------------------
  // LOAD IN PARTLIST

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);
  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#load_type').val('0').trigger('change');
      return null;
    });
    await browser.clickElt('#edit_ok');
  });
  // focus the tree
  await browser.windowByIndex(0);
  // get the characs of the edited item and test them
  ret = await browser.execute(() => ptree.tree.getItem(2).characs);
  t.is(ret.loadtype, '0');


  // ---------------------------------------------------------------------------
  // LOAD SYNC

  // edit the last source
  browser.$('#bt_edit').then(async elt => {await elt.click();});
  await wait(2000);
  // focus the itemEditor window, change the inputs values, valid the edition
  await browser.windowByIndex(1).then(async () => {
    await browser.execute(() => {
      $('#load_type').val('2').trigger('change');
      $('#load_celltyp').val('C3').trigger('change');
      $('#load_cellmax').val('D4').trigger('change');
      return null;
    });
    await browser.clickElt('#edit_ok');
  });
  // focus the tree
  await browser.windowByIndex(0);
  // get the characs of the edited item and test them
  ret = await browser.execute(() => ptree.tree.getItem(2).characs);
  t.is(ret.loadtype, '2');
  t.is(ret.celltyp, 'C3');
  t.is(ret.cellmax, 'D4');
});

test.serial('TEST17: popup', async t => {
  const browser = t.context.app.client;
  let ret;

  // add a source
  await browser.clickElt('#bt_addrootsource');
  // click on "new" and wait for the popup to open ("would you like to save ?")
  await browser.clickElt('#bt_new');
  await wait(1000);
  // cancel the popup
  await browser.windowByIndex(1).then(async () => {
    await browser.clickElt('.mybtn-ok');
  });
  // check that the source still exist
  await browser.windowByIndex(0);
  ret = await browser.execute(() => ptree.tree.item_list.length);
  t.is(ret, 2);

  // click on "new" and wait for the popup to open ("would you like to save ?")
  await browser.clickElt('#bt_new');
  await wait(1000);
  // validate the popup
  await browser.windowByIndex(1).then(async () => {
    await browser.clickElt('.mybtn-cancel');
  });
  // check that the source tree is empty
  await browser.windowByIndex(0);
  ret = await browser.execute(() => ptree.tree.item_list.length);
  t.is(ret, 1);
});

test.serial('TEST18: stats', async t => {
  const browser = t.context.app.client;
  let ret;

  // open a reference PTree project
  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // open the stats
  await browser.clickElt('#bt_stats');
  await wait(1000);

  // get the all window handles for window manipulation
  const windowHandles = await browser.getWindowHandles();

  // check that no item is selected
  await browser.switchToWindow(windowHandles[1]);
  ret = await browser.execute(() => stats.item);
  t.is(ret, null);

  // select an item and check the stats
  await browser.switchToWindow(windowHandles[0]);
  await browser.clickAt(100,65);

  // doughnut graph: take a screenshot of the project and compare to a ref
  await browser.switchToWindow(windowHandles[1]);
  await browser.moveToObject('.chartType > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-1'));

  // switch to bar graph
  await browser.clickElt('.chartType > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-2'));

  // normalize the bar graph
  await browser.clickElt('.normalize > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-3'));

  // functions
  await browser.clickElt('.topmenu a:nth-child(2)');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-4'));

  // tags
  await browser.clickElt('.topmenu a:nth-child(3)');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-5'));

  // child
  await browser.clickElt('.topmenu a:nth-child(1)');
  await wait(1000);
  // eslint-disable-next-line no-console
  console.log(''); // don't know why but this is needed... TODO: remove log...
  await browser.clickAt(75,325);
  await wait (1000);
  ret = await browser.execute(() => stats.item.id);
  t.is(ret, 2);

  await browser.switchToWindow(windowHandles[0]);
  ret = await browser.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret, 2);

  // parent
  await browser.switchToWindow(windowHandles[1]);
  await browser.clickElt('.goToParent');
  await wait(1000);
  ret = await browser.execute(() => stats.item.id);
  t.is(ret, 1);
  await browser.switchToWindow(windowHandles[0]);
  ret = await browser.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret, 1);

  // doughnut
  await browser.switchToWindow(windowHandles[1]);
  await browser.clickElt('.chartType > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-6'));

  // load in part list
  await browser.switchToWindow(windowHandles[0]);
  await browser.clickAt(660, 65);
  await browser.switchToWindow(windowHandles[1]);
  await wait (1000);
  t.true(await testScreenshot(t,'test18-7'));

  // load RAW
  await browser.switchToWindow(windowHandles[0]);
  await browser.clickAt(660, 155);
  await browser.switchToWindow(windowHandles[1]);
  await wait (1000);
  t.true(await testScreenshot(t,'test18-8'));

  // load sync
  await browser.switchToWindow(windowHandles[0]);
  // eslint-disable-next-line no-console
  console.log(''); // TODO: remove... why is it needed ??
  await browser.clickAt(660, 245);
  await browser.switchToWindow(windowHandles[1]);
  await wait(1000);
  ret = await testScreenshot(t,'test18-9');
  t.true(ret);


  // close the stats
  //await browser.switchToWindow(windowHandles[1]);
  await browser.closeWindow();
  await wait(500);
  await browser.switchToWindow(windowHandles[0]);
});

test.serial('TEST19: about', async t => {
  const browser = t.context.app.client;

  // open the about window
  await browser.execute(() => {
    ipcRenderer.send('About-openReq');
    return null;
  });
  await wait(1000);

  // get the all window handles for window manipulation
  const windowHandles = await browser.getWindowHandles();

  // get the title and compare to package.json
  await browser.switchToWindow(windowHandles[1]);
  let elt = await browser.$('.name');
  let title = await elt.getText();
  t.is(title, require('./package.json').name);

  // close the window
  await browser.closeWindow();
  await wait(500);
  await browser.switchToWindow(windowHandles[0]);
});

test.serial('TEST20: partlist', async t => {
  const browser = t.context.app.client;

  // open a reference PTree project
  await browser.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  await browser.clickElt('#bt_partlist');

  await wait(2000);

  // get the all window handles for window manipulation
  const windowHandles = await browser.getWindowHandles();

  await browser.switchToWindow(windowHandles[1]);

  await wait(500);

  // TODO
  // ouvrir part list, compter les loads
  // ajouter une load
  // modifier toutes les valeurs d'un part et checker partlist + tree + stats
  // ajouter un part
  // sélectionner un part
  // supprimer un part
  // sélectionner plusieurs parts
  // supprimer plusieurs parts
  // déselectionner les parts
  // naviguer avec tab
  // unde redo
  // export template
  // export table
  // open table / cancel
  // open table / replace
  // open table / add

  // close the window
  await browser.closeWindow();
  await browser.switchToWindow(windowHandles[0]);

  t.pass();
});


// TODO
// alerts
// show/hide items
// sequences


// Before each TEST
test.beforeEach(async t => {
  await wait(1000);

  t.context.app = new Application({
    path: require('electron'),
    args: [__dirname],
    webdriverOptions: {}
  });

  await t.context.app.start();
  await wait(500);

  const browser = t.context.app.client;

  browser.addCommand('clickElt', async function(selector){
    let elt = await this.$(selector);
    await elt.click();
  });

  browser.addCommand('clickAt', async function (coordX, coordY) {
    await this.performActions([{
      type: 'pointer',
      id: 'pointer1',
      parameters: {pointerType: 'mouse'},
      actions: [
        { type: 'pointerMove', duration: 100, x: coordX, y: coordY },
        { type: 'pointerDown', button: 0 },
        { type: 'pause',       duration: 10 }, // emulate human pause
        { type: 'pointerUp',   button: 0 },
      ]
    }]);
    return this.releaseActions();
  });

  browser.addCommand('moveAt', function (coordX, coordY) {
    return this.performActions([{
      type: 'pointer',
      id: 'pointer1',
      parameters: {pointerType: 'mouse'},
      actions: [{ type: 'pointerMove', duration: 0, x: coordX, y: coordY }]
    }]);
  });

  browser.addCommand('moveToObject', async function (selector) {
    let elt = await this.$(selector);
    await elt.moveTo();
  });

  browser.addCommand('buttonDown', function (button) {
    return this.performActions([{
      type: 'pointer',
      id: 'pointer1',
      parameters: {pointerType: 'mouse'},
      actions: [{ type: 'pointerDown', button: button},]
    }]);
  });

  browser.addCommand('buttonUp', function (button) {
    return this.performActions([{
      type: 'pointer',
      id: 'pointer1',
      parameters: {pointerType: 'mouse'},
      actions: [{ type: 'pointerUp', button: button},]
    }]);
  });

  browser.addCommand('drag', function (sourceX, sourceY, destX, destY) {
    return this.performActions([{
      type: 'pointer',
      id: 'pointer1',
      parameters: {pointerType: 'mouse'},
      actions: [
        { type: 'pointerMove', duration: 0, x: sourceX, y: sourceY },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 10 }, // emulate human pause
        { type: 'pointerMove', duration: 0, x: destX, y: destY }
      ]
    }]);
  });

  browser.addCommand('drop', async function () {
    await this.performActions([{
      type: 'pointer',
      id: 'pointer1',
      parameters: {pointerType: 'mouse'},
      actions: [{ type: 'pointerUp', button: 0},]
    }]);
    return this.releaseActions();
  });
});

// after each test, quit PTree
test.afterEach.always(async t => {
  const browser = t.context.app.client;

  // check the console log for errors
  if(checkConsoleLog) {
    await browser.getMainProcessLogs().then(function (logs) {
      for(let log of logs) {
        // ignore the PTree version warning
        if(/Running PTree v/.test(log)) continue;
        // ignore the WebdriverIO messages
        else if(/Port not available/.test(log)) continue;
        // ignore DevTools messages
        else if(/DevTools listening/.test(log)) continue;
        // ignore ChromeDriver messages
        else if(/Please protect ports used by ChromeDriver/.test(log)) continue;
        // ignore empty messages
        else if('' == log) continue;

        // fail the test and print the log
        t.fail(`Unexpected console log:\n${log}`);
      }
    });
  }

  // try to get the PID of main process
  let pid;
  try {
    pid = await t.context.app.mainProcess.pid().then((ret) => {return ret;});
  }
  catch (e) {
    // the app was already closed
    console.error(e);
    return t.fail('Test failed: the app closed before the end of the test');
  }

  // close the renderer window using its own js context
  await browser.execute(() => {
    ptree.setSaved();
  });

  await wait(500);

  await browser.execute(() => {
    window.close();
    return null;
  });

  await wait(500);

  try {
    // check if PID is running (throw error if not)
    process.kill(pid, 0);
  }
  catch(e) {
    // error catched : the process was not running
    // end the test with success !
    return t.pass();
  }

  // process is still running, stop it and fail the test
  t.context.app.mainProcess.exit(1);
  return t.fail('Test failed: the main window did not close');
});

function wait(millisec) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, millisec);
  });
}


async function testScreenshot(t, name) {
  const browser = t.context.app.client;

  // take a screenshot of the project and open it
  await browser.saveScreenshot(`${__dirname}/docs/test/screenshot.png`);
  let screenshotBuffer = require('fs').readFileSync(`${__dirname}/docs/test/screenshot.png`);
  // generate the "reference" screenshot if needed and open it
  if(refreshScreenshots) await browser.saveScreenshot(`${__dirname}/docs/test/${name}.png`);
  let refshotBuffer = require('fs').readFileSync(`${__dirname}/docs/test/${name}.png`);
  // compare (in two lines to avoid displaying the buffer in the console on error)
  let screenshotsAreEquals = refshotBuffer.equals(screenshotBuffer);
  if(!screenshotsAreEquals) require('fs').writeFileSync(`${__dirname}/docs/test/${name}-error.png`,screenshotBuffer);
  // delete the screenshot
  require('fs').unlinkSync(`${__dirname}/docs/test/screenshot.png`);
  // return the result
  return screenshotsAreEquals;
}
