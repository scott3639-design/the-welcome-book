import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function setup({mode='production',valid=true,result=true,fail=false}={}) {
 const fields=Object.fromEntries(['name','message'].map(k=>[k,{value:'Test',setCustomValidity(v){this.error=v;},addEventListener(){}}]));
 const status={hidden:true,focus(){this.focused=true;},scrollIntoView(){}};
 const button={disabled:false};const style={value:'Country',addEventListener(){}};
 const form={dataset:{delivery:mode},elements:{namedItem:k=>fields[k]},querySelector:()=>button,addEventListener:(n,f)=>form.submit=f,reportValidity:()=>valid&&!Object.values(fields).some(f=>f.error),setAttribute(){},removeAttribute(){},reset(){this.wasReset=true;}};
 let calls=0;
 const context={document:{querySelector:s=>({'#enquiry-form':form,'#form-status':status,'#style':style}[s]),querySelectorAll:()=>[]},FormData:class{*[Symbol.iterator](){yield ['name','Test'];}},AbortSignal,fetch:async()=>{calls++;if(fail)throw Error('private diagnostic');return {ok:result,json:async()=>({ok:result})};}};
 vm.runInNewContext(source,context);
 return {form,status,fields,button,calls:()=>calls,submit:()=>form.submit({preventDefault(){}})};
}
test('client rejects invalid and whitespace-only required values',async()=>{
 const invalid=setup({valid:false});await invalid.submit();assert.equal(invalid.calls(),0);
 const empty=setup();empty.fields.name.value='  ';await empty.submit();assert.equal(empty.calls(),0);assert.ok(empty.fields.name.error);
});
test('preview never submits',async()=>{const p=setup({mode:'preview'});await p.submit();assert.equal(p.calls(),0);assert.match(p.status.textContent,/not been sent/);});
test('success announced, clears form and restores button',async()=>{const p=setup();await p.submit();assert.match(p.status.textContent,/Your enquiry has been sent/);assert.ok(p.form.wasReset);assert.ok(p.status.focused);assert.equal(p.button.disabled,false);});
test('error preserves entered values and never claims success',async()=>{for(const opts of [{result:false},{fail:true}]){const p=setup(opts);await p.submit();assert.match(p.status.textContent,/couldn't be sent/);assert.ok(!p.form.wasReset);assert.equal(p.fields.name.value,'Test');assert.equal(p.button.disabled,false);}});
test('duplicate click while sending issues only one request',async()=>{const p=setup();await Promise.all([p.submit(),p.submit()]);assert.equal(p.calls(),1);});
