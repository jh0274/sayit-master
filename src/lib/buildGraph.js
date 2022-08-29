import bus from '../bus';
import redditDataClient from './redditDataClient';

export default function buildGraph(entryWord, entryId, MAX_DEPTH, progress) {
  entryWord = entryWord && entryWord.trim();
  if (!entryWord) return;

  entryWord = entryWord.toLocaleLowerCase();

  let cancelled = false;
  let pendingResponse;
  let graph = require('ngraph.graph')();
  graph.maxDepth = MAX_DEPTH;
  let queue = [];
  let requestDelay = 0;
  progress.startDownload();

  startQueryConstruction();

  return {
    dispose,
    graph
  }

  function dispose() {
    cancelled = true;
    if (pendingResponse) {
      // pendingResponse.cancel();
      pendingResponse = null;
    }
  }

  function startQueryConstruction() {
    console.log("entryId",entryId)
    if(entryId!==undefined){
      fetchNextConcept(entryWord, entryId);
    } else{
      console.log("ERROR")
    }
  }

  function loadSiblingConcepts(results) {
    const parent = results[0].display_name;
    let max = Math.max(...results.map(o => o.score));
    console.log("parent", parent);
    var parentNode = graph.getNode(parent);

    if (!parentNode) {
      parentNode = graph.addNode(parent, {
        depth: 0,
        size:  1
        //redditDataClient.getSize(parent)
      });
    }

    results.forEach((other, idx) => {
      if (idx === 0) return;

      const hasOtherNode = graph.hasNode(other.display_name);
      if (hasOtherNode) {
        console.log("hasothernode", hasOtherNode)
        const hasOtherLink = graph.getLink(other.display_name, parent) || graph.getLink(parent, other.display_name);
        console.log("otherlink?",hasOtherLink)
        if (!hasOtherLink) {
          graph.addLink(parent, other.display_name);
        }
        return;
      }

      let depth = parentNode.data.depth + 1;
      graph.addNode(other.display_name, {depth, size: other.score/max});
      console.log(parent, other.display_name)
      graph.addLink(parent, other.display_name);
      console.log("depth", depth, "maxdepth", MAX_DEPTH)
      if (depth < MAX_DEPTH) {
        queue.push(other);
        console.log(queue, "queue status")
      }
    });

    setTimeout(loadNextConcept, requestDelay);
  }

  function loadNextConcept(){
    if (cancelled) return;
    if (queue.length === 0) {
      console.log("in here")
      bus.fire('graph-ready', graph);
      return;
    }
    console.log("qlength", queue.length)
    let nextConcept = queue.shift();
    fetchNextConcept(nextConcept.display_name, nextConcept.id);
    console.log("nextconcept", nextConcept.display_name)
    progress.updateLayout(queue.length, nextConcept.display_name);

  }

   async function fetchNextConcept(query, queryId){
    let concepts = []
    try {
      console.log("queryId", queryId)
      pendingResponse = await redditDataClient.getRelatedConcepts(queryId)
      //console.log("pendingResponse", pendingResponse)
      let max = Math.max(...pendingResponse.related_concepts.map(o => o.score));
      const parent = {
        id: pendingResponse.id,
        wikidata: null,
        display_name: pendingResponse.display_name,
        level: pendingResponse.level,
        score: max
      }
      concepts = [parent].concat(pendingResponse.related_concepts)
      console.log("concepts", concepts)
    }
    catch (e) {
      const err = 'Failed to download ' + query + '; Message: ' + e;
      console.log(err)
      progress.downloadError(err)
      loadNextConcept();
    }
    onPendingReadyConcepts(concepts, queryId)
  }


  function onPendingReadyConcepts(res, query) {
    //fill 'query' variable with 'most similar' nodes to get their children
    if (!res || !res.length) res = [query];
    //console.log("res", res)
    loadSiblingConcepts(res);
  }
}
