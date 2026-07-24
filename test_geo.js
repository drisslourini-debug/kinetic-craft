const fetch = require('node-fetch');

async function run() {
  const res = await fetch("https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=Alpenblickstrasse%206%208725&type=locations&origins=address");
  const data = await res.json();
  console.log(JSON.stringify(data.results[0].attrs, null, 2));
}

run();
