
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGNta2RpdnVod2tmYXFubmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzQzMzEsImV4cCI6MjA5NzkxMDMzMX0.hfjfnewJZSGaxa5R_wWxs4EAlSo3LAiseelqCJUsc1s";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const duration = document.getElementById("duration");
const count = document.getElementById("count");

const generateBtn = document.getElementById("generate");
const copyBtn = document.getElementById("copy");

const table = document.getElementById("keysTable");

const totalKeys = document.getElementById("totalKeys");
const activeKeys = document.getElementById("activeKeys");
const usedKeys = document.getElementById("usedKeys");
const bannedUsers = document.getElementById("bannedUsers");

let generatedKeys = [];

function randomKey(){

const chars="ABCDEFGHJKLMNPQRSTUVWXYZ123456789";

let key="";

for(let i=0;i<32;i++){

key+=chars[Math.floor(Math.random()*chars.length)];

}

return key;

}

function calculateExpire(text){

const now=new Date();

switch(text){

case "1 دقيقة":
now.setMinutes(now.getMinutes()+1);
break;

case "1 ساعة":
now.setHours(now.getHours()+1);
break;

case "1 يوم":
now.setDate(now.getDate()+1);
break;

case "1 أسبوع":
now.setDate(now.getDate()+7);
break;

case "1 شهر":
now.setMonth(now.getMonth()+1);
break;

case "1 سنة":
now.setFullYear(now.getFullYear()+1);
break;

}

return now.toISOString();

}
