import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker, {handleEnquiry} from '../server/enquiry.mjs';
const good={name:'Test Owner',email:'customer@example.com',propertyName:'TEST — Welcome Book Form',propertyLocation:'Somerset',style:'Country',message:'A test enquiry.',website:''};
const env={ENQUIRIES_ENABLED:'true',RESEND_API_KEY:'test-only-not-a-credential',ENQUIRY_FROM:'sender@example.com',ENQUIRY_RATE_LIMITER:{limit:async()=>({success:true})}};
function request(data=good,headers={},method='POST') {return new Request('https://thewelcomebook.co.uk/api/enquiry',{method,headers:{Origin:'https://thewelcomebook.co.uk','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},...(method==='POST'?{body:typeof data==='string'?data:JSON.stringify(data)}:{})});}
let sent=[];
const send=async(url,options)=>{sent.push({url,options,payload:JSON.parse(options.body)});return Response.json({id:'mock-message-id'});};
test('accepted mail has exact recipient, safe sender, Reply-To, all fields and stable retry key',async()=>{
 sent=[];const response=await handleEnquiry(request(),env,send);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
 const {payload}=sent[0];assert.deepEqual(payload.to,['scott.3639business@gmail.com']);assert.equal(payload.reply_to,good.email);assert.equal(payload.from,env.ENQUIRY_FROM);assert.equal(payload.subject,'New Welcome Book enquiry — TEST — Welcome Book Form');assert.equal(payload.html,undefined);
 for(const v of ['NAME:','EMAIL:','PROPERTY NAME:','PROPERTY LOCATION:','STYLE:','MESSAGE:','SOURCE:\nThe Welcome Book website',...Object.values(good).filter(Boolean)]) assert.ok(payload.text.includes(v),v);
 await handleEnquiry(request(),env,send);assert.equal(sent[0].options.headers['Idempotency-Key'],sent[1].options.headers['Idempotency-Key']);
});
test('invalid inputs never reach mail provider',async()=>{
 for(const invalid of [null,[],{},'{bad', {...good,name:'  '},{...good,email:'bad'},{...good,email:'x@example.com\r\nBcc:bad@example.com'},{...good,message:''},{...good,message:'a'.repeat(5001)},{...good,propertyName:'a\nb'},{...good,style:'Anything'},{...good,website:'spam'},{...good,to:'other@example.com'},{...good,name:23},'x'.repeat(32769)]) {
  let calls=0;const r=await handleEnquiry(request(invalid),env,async()=>{calls++;throw Error();});assert.equal(r.status,400);assert.equal(calls,0);
 }
});
test('origin, method, content type, missing configuration and rate limit fail closed',async()=>{
 for(const [req,e,status] of [[request(good,{Origin:'https://other.example'}),env,403],[request(good,{},'GET'),env,405],[request(good,{'Content-Type':'text/plain'}),env,415],[request(),{},503],[request(),{...env,ENQUIRIES_ENABLED:'false'},503],[request(),{...env,ENQUIRY_RATE_LIMITER:null},503],[request(),{...env,ENQUIRY_RATE_LIMITER:{limit:async()=>({success:false})}},429]]) assert.equal((await handleEnquiry(req,e,()=>{throw Error('must not send');})).status,status);
});
test('provider refusal, timeout, malformed response never return success or technical detail',async()=>{
 for(const provider of [async()=>new Response('secret diagnostic',{status:500}),async()=>{throw Error('secret');},async()=>Response.json({}),async()=>new Response('invalid')]) {
  const r=await handleEnquiry(request(),env,provider);assert.ok(r.status>=500);assert.deepEqual(await r.json(),{ok:false});assert.equal(r.headers.get('Cache-Control'),'no-store');
 }
});
test('user markup remains inert plain text; other routes use assets',async()=>{
 sent=[];await handleEnquiry(request({...good,message:'<script>alert(1)</script>'}),env,send);assert.equal(sent[0].payload.html,undefined);
 const r=await worker.fetch(new Request('https://thewelcomebook.co.uk/'),{ASSETS:{fetch:async()=>new Response('unchanged site')}});assert.equal(await r.text(),'unchanged site');
});
