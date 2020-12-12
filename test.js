// -----------------------------------------------------------------------------
// Test file
// run with 'npm test' to check all the functions of PTree before deploying
//   AVA          https://github.com/avajs/ava#
//   Spectron     https://github.com/electron/spectron#-spectron
//   WebdriverIO  http://webdriver.io/api.html
// -----------------------------------------------------------------------------

/* eslint no-console: 0 */
/* eslint no-undef:   0 */
const refreshScreenshots = false; // needed after electron/chrome update
const checkConsoleLog    = false;

const test = require('ava');
const {Application} = require('spectron');
const Tree = require('./js/class.Tree.js');

test.serial('TEST1: PTree object creation', async t => {
  let ret = await t.context.app.client.execute(() => ptree.tree.getRoot().type);

  t.is(ret.value, 'root');
});

test.serial('TEST2: item creation', async t => {
  let tree = new Tree(false);
  let ret;

  // create some items
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');
  await t.context.app.client.click('#bt_addload');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list.length, 4);
  t.is(tree.item_index, 4);
  t.is(tree.item_list[0].type, 'root');
  t.is(tree.item_list[1].type, 'source');
  t.is(tree.item_list[2].type, 'source');
  t.is(tree.item_list[3].type, 'load');


  // remove the loads
  await t.context.app.client.click('#bt_remove');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list.length, 3);
  t.is(tree.item_index, 4);
  t.is(tree.item_list[3], undefined);

  // remove every thing
  await t.context.app.client.click('#bt_clear');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list.length, 1);
  t.is(tree.item_index, 1);
  t.is(tree.item_list[1], undefined);
  t.is(tree.item_list[2], undefined);
  t.is(tree.item_list[3], undefined);
});

test.serial('TEST3: undo/redo', async t => {
  let tree = new Tree(false);
  let ret;

  // create an item
  await t.context.app.client.click('#bt_addrootsource');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list[1].type, 'source');

  // undo
  await t.context.app.client.click('#bt_undo');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list[1], undefined);

  // redo
  await t.context.app.client.click('#bt_redo');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list[1].type, 'source');
});

test.serial('TEST4: open file + canvas construction', async t => {
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  t.true(await testScreenshot(t,'test4'));
});

test.serial('TEST5: save + new project', async t => {
  // create an item
  await t.context.app.client.click('#bt_addrootsource');

  // save the project
  await t.context.app.client.execute(() => {
    ptree.filePath = `${__dirname}/../test_project.ptree`;
    return null;
  });
  await t.context.app.client.click('#bt_save');

  // clear the project and reopen it then export the tree
  await t.context.app.client.click('#bt_new');
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../test_project.ptree`);
    return null;
  });
  let ret = await t.context.app.client.execute(() => ptree.tree.toString());
  let tree = new Tree(false);
  tree.fromString(ret.value);

  // check the tree
  t.is(tree.item_list.length, 2);
  t.is(tree.item_list[1].type, 'source');

  // delete the project file
  require('fs').unlinkSync(`${__dirname}/test_project.ptree`);
});

test.serial('TEST6: canvas manipulation', async t => {
  const app = t.context.app;
  let ret;

  // open a reference PTree project
  await app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // move over a particular item to display infos and check them
  await t.context.app.client.moveToObject('body',375,95);
  ret = await t.context.app.client.execute(() => {
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

  t.is(ret.value.vin_typ,  '5V');
  t.is(ret.value.vin_max,  '5V');
  t.is(ret.value.iin_typ,  '621mA');
  t.is(ret.value.iin_max,  '1.38A');
  t.is(ret.value.pin_typ,  '3.1W');
  t.is(ret.value.pin_max,  '6.92W');
  t.is(ret.value.vout_typ, '1.8V');
  t.is(ret.value.vout_max, '1.82V');
  t.is(ret.value.iout_typ, '1.5A');
  t.is(ret.value.iout_max, '2.7A');
  t.is(ret.value.pout_typ, '2.7W');
  t.is(ret.value.pout_max, '4.86W');
  t.is(ret.value.loss_typ, '403mW');
  t.is(ret.value.loss_max, '2.06W');

  // click item and check if it was selected
  await t.context.app.client.leftClick('body',655,250);
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret.value, 13);

  // click item, move it down, move it up, chek its positions
  await t.context.app.client.leftClick('body',380,340);
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret.value[2], 7);
  t.is(ret.value[3], 8);
  await t.context.app.client.click('#bt_up');
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret.value[2], 8);
  t.is(ret.value[3], 7);
  await t.context.app.client.click('#bt_down');
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret.value[2], 7);
  t.is(ret.value[3], 8);

  // drag an item over an other and check the style of the "receiver" changed
  await t.context.app.client.moveToObject('body',380,425);
  await t.context.app.client.buttonDown(0);
  await t.context.app.client.moveToObject('body',380,515);
  ret = await t.context.app.client.execute(() => ptree.canvas.fabricCanvas.fabric_obj[10].rect.strokeWidth);
  t.is(ret.value, 7);

  // drop the item and check the id of its new parent
  await t.context.app.client.buttonUp(0);
  ret = await t.context.app.client.execute(() => ptree.tree.getItem(9).getParent().id);
  t.is(ret.value, 10);
});

test.serial('TEST7: total power', async t => {
  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // move over a particular item to display infos and check them
  let ret = await t.context.app.client.execute(() => {
    return {
      totalpower_typ: $('.totalpower.typ').text(),
      totalpower_max: $('.totalpower.max').text(),
      totaleff_typ:   $('.totaleff.typ'  ).text(),
      totaleff_maw:   $('.totaleff.max'  ).text(),
    };
  });
  t.is(ret.value.totalpower_typ,'17.9');
  t.is(ret.value.totalpower_max,'32.9');
  t.is(ret.value.totaleff_typ,  '94');
  t.is(ret.value.totaleff_maw,  '87.5');
});

test.serial('TEST8: configurations', async t => {
  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // open the config, wait for the animation to end, change the config
  await t.context.app.client.click('#bt_config');
  await wait(500);
  await t.context.app.client.execute(() => {
    $('#config_textsize').val(30).trigger('change');
    $('#config_itemwidth').val(200).trigger('change');
    $('#config_itemheight').val(50).trigger('change');
    $('#config_zoom').val(150).trigger('change');
    $('#config_zoomexport').val(200).trigger('change');
    $('#config_sourcecolor').val('#4444DD').trigger('change');
    $('#config_loadcolor').val('#DDDD44').trigger('change');
    return null;
  });
  await t.context.app.client.click('#config_infoVtyp');
  await t.context.app.client.click('#config_infoVmax');
  await t.context.app.client.click('#config_infoItyp');
  await t.context.app.client.click('#config_infoImax');
  await t.context.app.client.click('#config_infoPtyp');
  await t.context.app.client.click('#config_infoPmax');
  await t.context.app.client.click('#config_name');
  await t.context.app.client.click('#config_ref');
  await t.context.app.client.click('#config_custom1');
  await t.context.app.client.click('#config_alignload');
  await t.context.app.client.click('#config_proportional');
  await t.context.app.client.click('#bottom_close');
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');
  await t.context.app.client.click('#bt_addload');
  await wait(500);

  t.true(await testScreenshot(t,'test8-1'));


  // open the config, wait for the animation to end, reset
  await t.context.app.client.click('#bt_undo');
  await t.context.app.client.click('#bt_undo');
  await t.context.app.client.click('#bt_undo');
  await t.context.app.client.execute(() => {
    ptree.setSaved();
    ptree.clearHistory();
    return null;
  });
  await t.context.app.client.click('#bt_config');
  await wait(500);
  await t.context.app.client.click('.mybtn-defaultConfig');
  await t.context.app.client.click('#bottom_close');
  await wait(500);

  t.true(await testScreenshot(t,'test8-2'));
});

test.serial('TEST9: sync external spreadsheet', async t => {
  let ret;

  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // select a sheet and test the global power values
  await t.context.app.client.execute(() => {
    ptree.selectSheet(`${__dirname}/../docs/test/test9-1.xlsx`);
    return null;
  });
  await wait(500);
  ret = await t.context.app.client.execute(() => ptree.tree.getTotalPower());
  t.is(ret.value.typ,17.870114942528737);
  t.is(ret.value.max,32.91557692307692);

  // select an other sheet and test the global power values
  await t.context.app.client.execute(() => {
    ptree.selectSheet(`${__dirname}/../docs/test/test9-2.xlsx`);
    return null;
  });
  await wait(500);
  ret = await t.context.app.client.execute(() => ptree.tree.getTotalPower());
  t.is(ret.value.typ,20.610114942528735);
  t.is(ret.value.max,35.535576923076924);
});

test.serial('TEST10: edit source, DC/DC fixed', async t => {
  // add two sources
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');

  // ---------------------------------------------------------------------------
  // DCDC fixed

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
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
    await t.context.app.client.click('#add_eff');
    await wait(1000);
    await t.context.app.client.click('#edit_ok');
  });

  // focus the tree
  await t.context.app.client.windowByIndex(0);

  // get the characs of the edited item
  let ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.value.name,              'test_source_name');
  t.is(ret.value.regtype,           '0');
  t.is(ret.value.ref,               'test_source_ref');
  t.is(ret.value.custom1,           'test_source_custom1');
  t.is(ret.value.vout_min,          '2.49');
  t.is(ret.value.vout_typ,          '2.5');
  t.is(ret.value.vout_max,          '2.51');
  t.is(ret.value.efficiency[0].i,   '0');
  t.is(ret.value.efficiency[0].eff, '75');
  t.is(ret.value.color,             '#aabb11');
});

test.serial('TEST11: edit source, LDO fixed', async t => {
  // add two sources
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
      $('#source_regtype').val('1').trigger('change');
      $('#input_vout_min').val('1.49').trigger('change');
      $('#input_vout_typ').val('1.5').trigger('change');
      $('#input_vout_max').val('1.51').trigger('change');
      $('#input_iq_min').val('0.001').trigger('change');
      $('#input_iq_typ').val('0.002').trigger('change');
      $('#input_iq_max').val('0.003').trigger('change');
      return null;
    });

    await t.context.app.client.click('#edit_ok');
  });

  // focus the tree
  await t.context.app.client.windowByIndex(0);

  // get the characs of the edited item
  let ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.value.regtype,  '1');
  t.is(ret.value.vout_min, '1.49');
  t.is(ret.value.vout_typ, '1.5');
  t.is(ret.value.vout_max, '1.51');
  t.is(ret.value.iq_min,   '0.001');
  t.is(ret.value.iq_typ,   '0.002');
  t.is(ret.value.iq_max,   '0.003');
});

test.serial('TEST12: edit source, DC/DC adj', async t => {
  // add two sources
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
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
    await t.context.app.client.click('#edit_ok');
  });

  // focus the tree
  await t.context.app.client.windowByIndex(0);

  // get the characs of the edited item
  let ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.value.regtype,  '3');
  t.is(ret.value.vout_min, 3.5341058941058945);
  t.is(ret.value.vout_typ, 3.5999999999999996);
  t.is(ret.value.vout_max, 3.6661061061061053);
  t.is(ret.value.r1,       '500000');
  t.is(ret.value.r2,       '100000');
  t.is(ret.value.rtol,     '0.1');
  t.is(ret.value.vref_min, '0.59');
  t.is(ret.value.vref_typ, '0.6');
  t.is(ret.value.vref_max, '0.61');
});

test.serial('TEST13: edit source, LDO adj', async t => {
  // add two sources
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
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
    await t.context.app.client.click('#edit_ok');
  });

  // focus the tree
  await t.context.app.client.windowByIndex(0);

  // get the characs of the edited item
  let ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.value.regtype,  '4');
  t.is(ret.value.vout_min, 3.5341058941058945);
  t.is(ret.value.vout_typ, 3.5999999999999996);
  t.is(ret.value.vout_max, 3.6661061061061053);
  t.is(ret.value.r1,       '500000');
  t.is(ret.value.r2,       '100000');
  t.is(ret.value.rtol,     '0.1');
  t.is(ret.value.vref_min, '0.59');
  t.is(ret.value.vref_typ, '0.6');
  t.is(ret.value.vref_max, '0.61');
  t.is(ret.value.iq_min,   '0.001');
  t.is(ret.value.iq_typ,   '0.002');
  t.is(ret.value.iq_max,   '0.003');
});

test.serial('TEST14: edit source, dummy', async t => {
  // add two sources
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
      $('#source_regtype').val('6').trigger('change');
      return null;
    });
    await wait(500);
    await t.context.app.client.click('#edit_ok');
  });

  // focus the tree
  await t.context.app.client.windowByIndex(0);

  // get the characs of the edited item
  let ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.value.regtype,  '6');
});

test.serial('TEST15: edit source, perfect', async t => {
  // add two sources
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);

  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
      $('#source_regtype').val('7').trigger('change');
      $('#input_vout_min').val('1.49').trigger('change');
      $('#input_vout_typ').val('1.5').trigger('change');
      $('#input_vout_max').val('1.51').trigger('change');
      return null;
    });
    await wait(500);
    await t.context.app.client.click('#edit_ok');
  });

  // focus the tree
  await t.context.app.client.windowByIndex(0);

  // get the characs of the edited item
  let ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);

  // test the edited values
  t.is(ret.value.regtype,  '7');
  t.is(ret.value.vout_min, '1.49');
  t.is(ret.value.vout_typ, '1.5');
  t.is(ret.value.vout_max, '1.51');
});

test.serial('TEST16: edit load', async t => {
  let ret;
  // add a source and a load
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addload');

  // ---------------------------------------------------------------------------
  // LOAD RAW

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);
  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
      $('#load_color').val('#aabb11').trigger('change');
      $('#load_type').val('1').trigger('change');
      $('#load_name').val('test_load_name').trigger('change');
      $('#load_custom1').val('test_load_custom1').trigger('change');
      $('#load_ityp').val('0.123').trigger('change');
      $('#load_imax').val('1.234').trigger('change');
      return null;
    });
    await wait(500);
    await t.context.app.client.click('#edit_ok');
  });
  // focus the tree
  await t.context.app.client.windowByIndex(0);
  // get the characs of the edited item and test them
  ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);
  t.is(ret.value.name,     'test_load_name');
  t.is(ret.value.loadtype, '1');
  t.is(ret.value.custom1,  'test_load_custom1');
  t.is(ret.value.ityp,     '0.123');
  t.is(ret.value.imax,     '1.234');
  t.is(ret.value.color,    '#aabb11');


  // ---------------------------------------------------------------------------
  // LOAD IN PARTLIST

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);
  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
      $('#load_type').val('0').trigger('change');
      return null;
    });
    await t.context.app.client.click('#edit_ok');
  });
  // focus the tree
  await t.context.app.client.windowByIndex(0);
  // get the characs of the edited item and test them
  ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);
  t.is(ret.value.loadtype, '0');


  // ---------------------------------------------------------------------------
  // LOAD SYNC

  // edit the last source
  t.context.app.client.click('#bt_edit');
  await wait(2000);
  // focus the itemEditor window, change the inputs values, valid the edition
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.execute(() => {
      $('#load_type').val('2').trigger('change');
      $('#load_celltyp').val('C3').trigger('change');
      $('#load_cellmax').val('D4').trigger('change');
      return null;
    });
    await t.context.app.client.click('#edit_ok');
  });
  // focus the tree
  await t.context.app.client.windowByIndex(0);
  // get the characs of the edited item and test them
  ret = await t.context.app.client.execute(() => ptree.tree.getItem(2).characs);
  t.is(ret.value.loadtype, '2');
  t.is(ret.value.celltyp, 'C3');
  t.is(ret.value.cellmax, 'D4');
});

test.serial('TEST17: popup', async t => {
  let ret;

  // add a source
  await t.context.app.client.click('#bt_addrootsource');
  // click on "new" and wait for the popup to open ("would you like to save ?")
  await t.context.app.client.click('#bt_new');
  await wait(1000);
  // cancel the popup
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.click('.mybtn-ok');
  });
  // check that the source still exist
  await t.context.app.client.windowByIndex(0);
  ret = await t.context.app.client.execute(() => ptree.tree.item_list.length);
  t.is(ret.value, 2);

  // click on "new" and wait for the popup to open ("would you like to save ?")
  await t.context.app.client.click('#bt_new');
  await wait(1000);
  // validate the popup
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.click('.mybtn-cancel');
  });
  // check that the source tree is empty
  await t.context.app.client.windowByIndex(0);
  ret = await t.context.app.client.execute(() => ptree.tree.item_list.length);
  t.is(ret.value, 1);
});

test.serial('TEST18: stats', async t => {
  let ret;

  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  // open the stats
  await t.context.app.client.click('#bt_stats');
  await wait(1000);

  // check that no item is selected
  await t.context.app.client.windowByIndex(1).then(async () => {
    let ret = await t.context.app.client.execute(() => stats.item);
    t.is(ret.value, null);
  });

  // select an item and check the stats
  await t.context.app.client.windowByIndex(0);
  await t.context.app.client.leftClick('body',100,65);

  // doughnut graph: take a screenshot of the project and compare to a ref
  await t.context.app.client.windowByIndex(1);
  await t.context.app.client.moveToObject('.chartType > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-1'));

  // switch to bar graph
  await t.context.app.client.click('.chartType > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-2'));

  // normalize the bar graph
  await t.context.app.client.click('.normalize > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-3'));

  // functions
  await t.context.app.client.click('.topmenu a:nth-child(2)');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-4'));

  // tags
  await t.context.app.client.click('.topmenu a:nth-child(3)');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-5'));

  // child
  await t.context.app.client.click('.topmenu a:nth-child(1)');
  await wait(1000);
  await t.context.app.client.leftClick('body',75,290);
  await wait (1000);
  ret = await t.context.app.client.execute(() => stats.item.id);
  t.is(ret.value, 2);
  await t.context.app.client.windowByIndex(0);
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret.value, 2);

  // parent
  await t.context.app.client.windowByIndex(1);
  t.context.app.client.click('.goToParent');
  await wait(1000);
  ret = await t.context.app.client.execute(() => stats.item.id);
  t.is(ret.value, 1);
  await t.context.app.client.windowByIndex(0);
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret.value, 1);

  // doughnut
  await t.context.app.client.windowByIndex(1);
  await t.context.app.client.click('.chartType > button');
  await wait(1000);
  t.true(await testScreenshot(t,'test18-6'));

  // load in part list
  await t.context.app.client.windowByIndex(0);
  await t.context.app.client.leftClick('body',660,65);
  await t.context.app.client.windowByIndex(1);
  await wait (1000);
  t.true(await testScreenshot(t,'test18-7'));

  // load RAW
  await t.context.app.client.windowByIndex(0);
  await t.context.app.client.leftClick('body',660,155);
  await t.context.app.client.windowByIndex(1);
  await wait (1000);
  t.true(await testScreenshot(t,'test18-8'));

  // load sync
  await t.context.app.client.windowByIndex(0);
  await t.context.app.client.leftClick('body',660,245);
  await t.context.app.client.windowByIndex(1);
  await wait (1000);
  t.true(await testScreenshot(t,'test18-9'));

  // close the stats
  await t.context.app.client.windowByIndex(1).then(async () => {
    await t.context.app.client.close();
  });
  await t.context.app.client.windowByIndex(0);
});

test.serial('TEST19: about', async t => {
  // open the about window
  await t.context.app.client.execute(() => {
    ipcRenderer.send('About-openReq');
    return null;
  });
  await wait(1000);

  // get the title and compare to package.json
  await t.context.app.client.windowByIndex(1);
  let title = await t.context.app.client.getText('.name');
  t.is(title, require('./package.json').name);

  // close the window
  await t.context.app.client.close();
  await t.context.app.client.windowByIndex(0);
});

test.serial('TEST20: partlist', async t => {
  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
    return null;
  });

  await t.context.app.client.click('#bt_partlist');

  await wait(2000);
  await t.context.app.client.windowByIndex(1);

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
  // sequences

  // close the window
  await t.context.app.client.close();
  await t.context.app.client.windowByIndex(0);

  t.pass();
});


// TODO
// show/hide items


// Before each TEST
test.beforeEach(async t => {
  await wait(1000);

  t.context.app = new Application({
    path: require('electron'),
    args: [__dirname],
    webdriverOptions: {
      // TODO: remove this when spectron will update WebdriverIO
      'deprecationWarnings': false
    }
  });

  await t.context.app.start();
  await wait(500);
});

// after each test, quit PTree
test.afterEach.always(async t => {
  // check the console log for errors
  if(checkConsoleLog) {
    await t.context.app.client.getMainProcessLogs().then(function (logs) {
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
  await t.context.app.client.execute(() => {
    ptree.setSaved();
  });

  await wait(500);

  await t.context.app.client.execute(() => {
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
  // take a screenshot of the project
  let screenshotBuffer = await t.context.app.client.saveScreenshot();
  // generate the "reference" screenshot if needed
  if(refreshScreenshots) require('fs').writeFileSync(`${__dirname}/docs/test/${name}.png`,screenshotBuffer);
  // open the reference screenshot
  let refshotBuffer = require('fs').readFileSync(`${__dirname}/docs/test/${name}.png`);
  // compare (in two lines to avoid displaying the buffer in the console on error)
  let screenshotsAreEquals = refshotBuffer.equals(screenshotBuffer);
  if(!screenshotsAreEquals) require('fs').writeFileSync(`${__dirname}/docs/test/${name}-error.png`,screenshotBuffer);
  // return the result
  return screenshotsAreEquals;
}
