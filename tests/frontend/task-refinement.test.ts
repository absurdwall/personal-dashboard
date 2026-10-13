import assert from "node:assert/strict";
import test from "node:test";
import { taskPropertyProjection, performTaskUpdateRequest, TaskOperationIdentityStore, taskEditOperationKey } from "../../frontend/task-presentation.ts";
import { LatestRequest } from "../../frontend/latest-request.ts";

test("priority sorting preserves date order within each band and tag filters combine without mutation", () => {
  const tasks = [
    {id:"low", priority:"low", tagIds:["work"], date:"2026-10-13"},
    {id:"high-late", priority:"high", tagIds:["work"], date:"2026-10-15"},
    {id:"high-early", priority:"high", tagIds:["work"], date:"2026-10-13"},
    {id:"high-tie", priority:"high", tagIds:["work"], date:"2026-10-13"},
    {id:"legacy", date:null},
  ] as const;
  assert.deepEqual(taskPropertyProjection(tasks,"all",null,false).map(t=>t.id),["low","high-late","high-early","high-tie","legacy"]);
  assert.deepEqual(taskPropertyProjection(tasks,"all",null,true).map(t=>t.id),["high-early","high-tie","high-late","low","legacy"]);
  assert.deepEqual(taskPropertyProjection(tasks,"high","work",true).map(t=>t.id),["high-early","high-tie","high-late"]);
  assert.deepEqual(taskPropertyProjection(tasks,"none",null,false).map(t=>t.id),["legacy"]);
  assert.equal(tasks[0].priority,"low");
});

test("a saved title does not confirm stale priority or tags, and retries retain property identity", async () => {
  const edit = {targetBinding:"vault",taskId:"task",name:"Title",content:null,date:null,time:null,listId:"inbox",priority:"high",tagIds:["tag"]};
  const identities = new TaskOperationIdentityStore();
  const requests = new LatestRequest();
  const options = {expectedRevision:"r1",requests,identities,createChangeId:()=>"change",isCurrent:()=>true,
    invoke: async () => ({state:"ready" as const,targetBinding:"vault",tasks:[{...edit,id:"task",priority:"none",tagIds:[]}]})};
  const result = await performTaskUpdateRequest(edit,options);
  assert.equal(result.confirmed,false);
  assert.notEqual(taskEditOperationKey(edit),taskEditOperationKey({...edit,priority:"none"}));
  const retry = await performTaskUpdateRequest(edit,{...options,invoke:async()=>({state:"ready" as const,targetBinding:"vault",tasks:[{...edit,id:"task"}]})});
  assert.equal(retry.operation.changeId,"change");
  assert.equal(retry.confirmed,true);
});
