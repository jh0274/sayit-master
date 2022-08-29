import fetch from './fetch';
const fuzzysort = require('fuzzysort')


export default function createDataClient(endpoint) {
  const fileNames = getFileNames();
  const downloaded = new Map();
  const indexed = new Map();
  const list = [];
  let prepared = [];

  console.log("endpoint", endpoint)
  // endpoint is "https://anvaka.github.io/sayit-data/2/" for prod
  let sizeCount = 1;
  let sizes = new Map();
  // sizes from 2/15 to 14/15 based on popularity?
  fetch(endpoint + 'count.json', {responseType: 'json'})
    .then(rows => {
      rows.forEach((row, index) => {
        row.forEach(subreddit => {
          sizes.set(subreddit, index + 2);
        })
      });
      console.log("sizes", sizes)
      sizeCount = rows.length + 2;
      console.log("sizecount", sizeCount)
    })

  return {
    getRelated,
    getRelatedConcepts,
    getConceptSuggestion,
    getSuggestion,
    getSize
  }

  function getSize(subName) {
    let size = sizes.get(subName);
    return (size || 1)/sizeCount;
  }

  async function getConceptSuggestion(query){
    query = query.toLocaleLowerCase()
    let response = await fetch(`https://api.openalex.org/autocomplete/concepts?q=${query}`);
    response = await JSON.parse(response)
    let prepared = response.results
    console.log("prepared", prepared)
    let mapped = prepared.map(x =>({
      //html: "fuzzy <b>not</b> working",
      html: fuzzysort.highlight(fuzzysort.single(query,x.display_name), "<b>", "</b>"),
      text: x.display_name,
      id: x.id.substring(x.id.lastIndexOf("/") + 1)
    }))
    console.log("mapped", mapped)
    return mapped
  }

  function getSuggestion(query) {
    let firstLetter = query[0].toLocaleLowerCase();
    let results = downloaded.get(firstLetter);
    if (results) {
      console.log("prepared for suggestion", prepared)
      results = fuzzysort.go(query, prepared, {limit: 10})
      console.log("results", results)
      return Promise.resolve(results.map(x => ({
        html: fuzzysort.highlight(x, '<b>', '</b>'),
        text: x.target
      })));
    } else {
      return downloadAndIndexFile(firstLetter).then(() => {
        return getSuggestion(query);
      })
    }
  }

  async function getRelatedConcepts(queryId){
    console.log("queryId", queryId)
    let response = await fetch(`https://api.openalex.org/concepts/${queryId}?mailto=jimhawker8282@hotmail.com`);
    let responseJson = await JSON.parse(response)
    return responseJson
  }

  function getRelated(query) {
    let sims = indexed.get(query.toLocaleLowerCase());
    if (sims) return Promise.resolve(sims);

    return getFileForQuery(query);
  }

  function downloadAndIndexFile(firstLetter) {
    let url = endpoint + fileNames.get(firstLetter);
    console.log('download ', firstLetter);
    return fetch(url, {responseType: 'json'})
      .then(response => {
        downloaded.set(firstLetter, response);
        response.forEach(row => {
          let keyName = row[0].toLocaleLowerCase();
          if (indexed.get(keyName)) return;

          list.push(row[0]);
          indexed.set(keyName, row);
        });
        prepared = list.map(l => fuzzysort.prepare(l));
        console.log("prepared data", prepared)
      })
  }

  function getFileForQuery(query) {
    let firstLetter = query[0].toLocaleLowerCase();
    let results = downloaded.get(firstLetter);
    if (results) return Promise.resolve([]);

    return downloadAndIndexFile(firstLetter).then(() => {
        let sims = indexed.get(query.toLocaleLowerCase())
        console.log("similar nodes",sims)
        return sims || [];
      })
  }

}

function getFileNames() {
  let fileNamesIndex = new Map();
[
  '0_z0123456789jqx.json', '10_m.json', '11_l.json', '12_i.json', '13_h.json', '14_g.json', '15_f.json', '16_e.json', '17_d.json', '18_c.json', '19_b.json', '1_yk.json', '20_a.json', '2_w.json', '3_vo.json', '4_u.json', '5_t.json', '6_s.json', '7_r.json', '8_p.json', '9_n.json'
].forEach(name => {
    const fileName = name.replace(/^\d\d?_/, '').replace(/\.json$/, '');
    for (var i = 0; i < fileName.length; ++i) {
      let letter = fileName[i];
      fileNamesIndex.set(letter, name);
    }
  });
  return fileNamesIndex;
}
