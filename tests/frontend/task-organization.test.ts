import assert from 'node:assert/strict';
import test from 'node:test';
import {taskHierarchyRows,performTaskUpdateRequest,TaskOperationIdentityStore,taskEditOperationKey} from '../../frontend/task-presentation.ts';
import {LatestRequest} from '../../frontend/latest-request.ts';

test('visible Task hierarchy retains independent rows and treats hidden parent as a root',()=>{
 const parent={id:'parent',parentId:null,name:'Parent'};
 const child={id:'child',parentId:'parent',name:'Child'};
 const grandchild={id:'grandchild',parentId:'child',name:'Grandchild'};
 const other={id:'other',parentId:null,name:'Other'};
 assert.deepEqual(taskHierarchyRows([parent,other,grandchild,child]).map(row=>[row.task.id,row.depth]),[['parent',0],['child',1],['grandchild',2],['other',0]]);
 assert.deepEqual(taskHierarchyRows([child,grandchild]).map(row=>[row.task.id,row.depth]),[['child',0],['grandchild',1]]);
 assert.equal(child.parentId,'parent');
});

test('parent patches have distinct preserve/clear identities and need observed parent readback',async()=>{
 const edit={targetBinding:'vault',taskId:'child',name:'Child',content:null,date:null,time:null,listId:'inbox',parentId:'parent'};
 const options={expectedRevision:'r1',requests:new LatestRequest(),identities:new TaskOperationIdentityStore(),createChangeId:()=> 'relation',isCurrent:()=>true,invoke:async()=>({state:'ready' as const,targetBinding:'vault',tasks:[{...edit,id:'child',parentId:null}]})};
 assert.equal((await performTaskUpdateRequest(edit,options)).confirmed,false);
 assert.notEqual(taskEditOperationKey({...edit,parentId:undefined}),taskEditOperationKey({...edit,parentId:null}));
 assert.equal((await performTaskUpdateRequest({...edit,parentId:null},options)).confirmed,true);
});
