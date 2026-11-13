import assert from 'node:assert/strict';
import test from 'node:test';
import { runEnquiryNavMigration } from '../setup-enquiry-nav.mjs';

const fixture = () => {
  let component = {id:42, name:'nav_settings', schema:{home_label:{type:'text'}, custom:{type:'boolean'}}};
  const calls = [];
  return {calls, get:()=>component,
    api:{listComponents:async()=>[structuredClone(component)], updateComponent:async(id,value)=>{
      assert.equal(id,42); calls.push('update'); component=structuredClone(value);
    }},
    backup:async value=>{ calls.push('backup'); assert.equal(value.schema.custom.type,'boolean'); },
  };
};

test('enquiry schema migration is additive, backed up, opt-in and idempotent', async()=>{
  const f=fixture();
  assert.deepEqual(await runEnquiryNavMigration(f), {changed:true,applied:false});
  assert.deepEqual(f.calls,[]);
  assert.deepEqual(await runEnquiryNavMigration({...f,apply:true}), {changed:true,applied:true});
  assert.deepEqual(f.calls,['backup','update']);
  assert.equal(f.get().schema.custom.type,'boolean');
  assert.equal(f.get().schema.show_enquire.default_value,'false');
  assert.equal(f.get().schema.enquire_href.type,'multilink');
  assert.deepEqual(await runEnquiryNavMigration({...f,apply:true}), {changed:false,applied:false});
});

test('enquiry schema refuses conflicts, concurrent edits and unbacked writes', async()=>{
  const f=fixture();
  f.get().schema.enquire_href={type:'text'};
  await assert.rejects(runEnquiryNavMigration({...f,apply:true}), /conflicts/);
  assert.deepEqual(f.calls,[]);
  const g=fixture();
  const list=g.api.listComponents;
  let count=0;
  g.api.listComponents=async()=>{if(++count===2)g.get().schema.concurrent={type:'text'};return list();};
  await assert.rejects(runEnquiryNavMigration({...g,apply:true}), /changed/);
  assert.deepEqual(g.calls,[]);
  const h=fixture();
  await assert.rejects(runEnquiryNavMigration({...h,apply:true,backup:undefined}), /backup/);
});
