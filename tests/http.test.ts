import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin,jsonBody,failure,phone,customer} from '../src/lib/http.ts';
test('cross-site mutations are rejected',()=>{process.env.APP_URL='https://app.example';assert.throws(()=>sameOrigin(new Request('https://app.example/api/manage',{headers:{origin:'https://attacker.example'}})));assert.doesNotThrow(()=>sameOrigin(new Request('https://app.example/api/manage',{headers:{origin:'https://app.example'}})));});
test('missing origin is rejected',()=>{process.env.APP_URL='https://app.example';assert.throws(()=>sameOrigin(new Request('https://app.example')));});
test('oversized JSON and wrong content type are rejected',async()=>{await assert.rejects(()=>jsonBody(new Request('https://app.example',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(16001)})));await assert.rejects(()=>jsonBody(new Request('https://app.example',{method:'POST',body:'{}'})));});
test('server errors do not expose internal error text',async()=>{const r=failure(new Error('database credentials leaked'));const data=await r.json();assert(!JSON.stringify(data).includes('credentials'));});
test('unconfigured public booking fails closed with 503',()=>assert.equal(failure(new Error('SERVER_NOT_CONFIGURED')).status,503));
test('invalid customer contact is rejected',()=>{assert.equal(phone.safeParse('abc').success,false);assert.equal(customer.safeParse('X').success,false);assert.equal(phone.safeParse('5521999999999').success,true);});
