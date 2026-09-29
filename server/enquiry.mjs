// Server-only module. Never place this file in the public asset directory.
const DESTINATION = 'scott.3639business@gmail.com';
const ORIGIN = 'https://thewelcomebook.co.uk';
const LIMITS = {name:120, email:254, propertyName:160, propertyLocation:160, style:30, message:5000, website:200};
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
const reply = (status, data) => Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff', ...(status===429 ? {'Retry-After':'60'} : {})}});
const failure = status => reply(status, {ok:false});

export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(k => !Object.hasOwn(LIMITS,k))) return null;
  const clean = {};
  for (const [key,max] of Object.entries(LIMITS)) {
    const value = data[key] ?? '';
    if (typeof value !== 'string' || value.length > max) return null;
    if ((key === 'message' ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) return null;
    clean[key] = value.trim();
  }
  if (!clean.name || !clean.message || !emailPattern.test(clean.email) || clean.email.split('@')[0].length > 64 || !['Country','Coast','Modern','Not sure yet'].includes(clean.style) || clean.website) return null;
  return clean;
}

async function readBounded(request) {
  if (Number(request.headers.get('Content-Length')) > 32768) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks=[]; let size=0;
  while (true) {
    const {done,value}=await reader.read(); if (done) break;
    size+=value.length;
    if (size>32768) {await reader.cancel();throw new Error('size');}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size); let offset=0;
  for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}

export async function handleEnquiry(request, env, send = fetch) {
  if (request.method !== 'POST') return failure(405);
  if (new URL(request.url).origin !== ORIGIN || request.headers.get('Origin') !== ORIGIN) return failure(403);
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return failure(415);
  // Fail closed: a static preview, missing credentials or missing protection cannot send.
  if (env.ENQUIRIES_ENABLED !== 'true' || !env.RESEND_API_KEY || !emailPattern.test(env.ENQUIRY_FROM || '') || !env.ENQUIRY_RATE_LIMITER) return failure(503);
  try {
    const ip=request.headers.get('CF-Connecting-IP');
    if (!ip) return failure(503);
    const allowed=await env.ENQUIRY_RATE_LIMITER.limit({key:`welcome-enquiry:${ip}`});
    if (!allowed.success) return failure(429);
    let data;
    try {data=validate(await readBounded(request));} catch {return failure(400);}
    if (!data) return failure(400);
    const labels={name:'NAME',email:'EMAIL',propertyName:'PROPERTY NAME',propertyLocation:'PROPERTY LOCATION',style:'STYLE',message:'MESSAGE'};
    const text=Object.entries(labels).map(([key,label])=>`${label}:\n${data[key] || '(not supplied)'}`).join('\n\n')+'\n\nSOURCE:\nThe Welcome Book website';
    const payload={from:env.ENQUIRY_FROM,to:[DESTINATION],reply_to:data.email,subject:`New Welcome Book enquiry — ${data.propertyName || 'Property not specified'}`,text};
    // Identical retries share a provider idempotency key (24-hour retention).
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
    const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const result=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`welcome-${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    if (!result.ok) return failure(502);
    const accepted=await result.json();
    if (typeof accepted.id !== 'string' || !accepted.id) return failure(502);
    return reply(200,{ok:true});
  } catch {return failure(503);}
}

export default {
  async fetch(request,env) {
    if (new URL(request.url).pathname === '/api/enquiry') return handleEnquiry(request,env);
    return env.ASSETS.fetch(request);
  }
};
