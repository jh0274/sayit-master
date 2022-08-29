import fetch from './fetch';
const fuzzysort = require('fuzzysort')


export default function createDataClient(endpoint) {
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
    getRelatedConcepts,
    getConceptSuggestion,
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
    prepared = response.results
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

  async function getRelatedConcepts(queryId){
    console.log("queryId", queryId)
    let response = await fetch(`https://api.openalex.org/concepts/${queryId}?mailto=jimhawker8282@hotmail.com`);
    let responseJson = await JSON.parse(response)
    return responseJson
  }

}

