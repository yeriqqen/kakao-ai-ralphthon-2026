import test from 'node:test';
import assert from 'node:assert/strict';
import { sourcedPlaces, safePlaceUrl } from '../lib/v2-discovery.mjs';
import { createRoom, applyPlan, publicRoom, authorizeCall } from '../lib/v2-state.mjs';
const place={ name:'Source clinic',address:'Sourced street',url:'https://clinic.example/contact',detail:'Listing for a clinic',phone:'' };
const response={output:[{type:'web_search_call',status:'completed',action:{sources:[{url:place.url}]}}]};
test('discovery rejects invented source URLs, missing addresses and unsafe links',()=>{assert.equal(sourcedPlaces({places:[place,{...place,name:'Invented',url:'https://made-up.example'},{...place,name:'No address',address:''},{...place,url:'javascript:alert(1)'}]},response).length,1);assert.equal(safePlaceUrl('javascript:alert(1)'), '');});
test('discovery cannot claim search without completed web evidence',()=>{assert.deepEqual(sourcedPlaces({places:[place]},{output:[]}),[]);});
test('selected real listing retains inquiry authorization and unresolved answers',()=>{const room=createRoom();room.selectedPlace={...place,id:'sourced',sourced:true};room.places=[room.selectedPlace];applyPlan(room,{institutions:[{id:'placeholder',name:'Fictional clinic',reason:'Ask availability'}],requiredQuestions:[{id:'staff',text:'Is a female doctor available?',korean:'여의사 선생님이 계신가요?'}],readyToCall:true});assert.equal(room.institutions[0].id,'sourced');assert.equal(room.institutions[0].fictional,false);assert.equal(room.call.authorized,false);assert.equal(room.requiredQuestions[0].status,'unresolved');authorizeCall(room,'sourced');assert.equal(room.call.status,'pending');assert.equal(room.call.accepted,false);assert.equal(publicRoom(room).selectedPlace.name,place.name);});
