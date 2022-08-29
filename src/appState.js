import buildGraph from './lib/buildGraph';
import Progress from './Progress';

const queryState = require('query-state');

const qs = queryState(
  {
    query: '',
    queryId: ''
  },
  {
    useSearch: true
  }
);

let lastBuilder;
const appStateFromQuery = qs.get();
const appState = {
  hasGraph: false,
  maxDepth: appStateFromQuery.maxDepth || 2,
  progress: new Progress(),
  graph: null,
  query: appStateFromQuery.query,
  queryId: appStateFromQuery.queryId
};

if (appState.query) {
  performSearch(appState.query, appState.queryId);
}

export default appState;

qs.onChange(updateAppState);

function updateAppState(newState) {
  appState.query = newState.query;
  appState.queryId = newState.queryId;
}

export function performSearch(queryString, queryId) {
  console.log("queryString", queryString)
  console.log("queryId", queryId)
  appState.hasGraph = true;
  appState.progress.reset();

  qs.set('query', queryString);
  qs.set('queryId', queryId);
  if (lastBuilder) {
    lastBuilder.dispose();
  }

  lastBuilder = buildGraph(queryString, queryId, appState.maxDepth, appState.progress);
  lastBuilder.graph.rootId = queryString;
  appState.graph = Object.freeze(lastBuilder.graph);
  return lastBuilder.graph;
}
