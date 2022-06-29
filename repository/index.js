import { query, sparqlEscapeUri, sparqlEscapeString } from 'mu';

const getPostponedSubcases = async () => {
    const postPonedSubcaseQuery = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluitvorming: <http://data.vlaanderen.be/ns/besluitvorming#>
      PREFIX  dossier: <https://data.vlaanderen.be/ns/dossier#>
      
      SELECT ?id WHERE { 
          ?subcase a dossier:Procedurestap ;
            mu:uuid ?id .
          ?activity a besluitvorming:Agendering .
          ?activity besluitvorming:vindtPlaatsTijdens ?subcase .
          ?activity besluitvorming:genereertAgendapunt ?agendapunt .
          ?agendapunt besluitvorming:ingetrokken ?retracted . 
          FILTER(?retracted ="true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>)  
      } GROUP BY ?subcase`;

    let data = await query(postPonedSubcaseQuery);
    return parseSparqlResults(data, 'subcases');
};

const queryActivitiesOfSubcase = async (subcaseId) => {
  const activitiesOfSubcaseQuery = `
    PREFIX  ext:  <http://mu.semte.ch/vocabularies/ext/>
    PREFIX  mu:  <http://mu.semte.ch/vocabularies/core/>
    PREFIX  besluitvorming:  <http://data.vlaanderen.be/ns/besluitvorming#>
    PREFIX  besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX  dossier: <https://data.vlaanderen.be/ns/dossier#>

    Select ?activity ?subcase ?startDatum (COUNT(?agendaitem) as ?totalAgendaitems) WHERE {
      ?subcase a dossier:Procedurestap ;
        mu:uuid ${sparqlEscapeString(subcaseId)} .
      ?activity besluitvorming:vindtPlaatsTijdens ?subcase .
      ?activity a besluitvorming:Agendering ;
        dossier:startDatum ?startDatum ;
        besluitvorming:genereertAgendapunt ?agendaitem .
    } GROUP BY ?activity ?subcase ?startDatum ORDER BY ?startDatum
  `;

  const queryResult = await query(activitiesOfSubcaseQuery);
  return parseSparqlResults(queryResult);
};

const getPhasesOfActivities = async (activityUri, subcaseUri) => {
  const phasesOfActivitiesQuery =`
    PREFIX  ext:  <http://mu.semte.ch/vocabularies/ext/>
    PREFIX  mu:  <http://mu.semte.ch/vocabularies/core/>
    PREFIX  besluitvorming:  <http://data.vlaanderen.be/ns/besluitvorming#>
    PREFIX  besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX  dossier: <https://data.vlaanderen.be/ns/dossier#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX brc: <http://kanselarij.vo.data.gift/id/concept/beslissings-resultaat-codes/>

    SELECT ?agendaitem ?previousAgenda ?agendaStatus ?agendaNumber ?geplandeStart ?decisionResultId WHERE {
      ${sparqlEscapeUri(activityUri)} a besluitvorming:Agendering ;
                besluitvorming:vindtPlaatsTijdens ${sparqlEscapeUri(subcaseUri)} ;
                besluitvorming:genereertAgendapunt ?agendaitem .
      ?agenda dct:hasPart ?agendaitem ;
              besluitvorming:isAgendaVoor ?meeting ;
              besluitvorming:volgnummer ?agendaNumber ;
              besluitvorming:agendaStatus ?agendaStatus .
      OPTIONAL { ?agenda prov:wasRevisionOf ?previousAgenda . }
      ?meeting besluit:geplandeStart ?geplandeStart .

      OPTIONAL {
        ?decisionActivity ^besluitvorming:heeftBeslissing/besluitvorming:heeftOnderwerp ?agendaitem .
        ?decisionActivity besluitvorming:resultaat ?decisionResult .
        ?decisionResult mu:uuid ?decisionResultId .
      }
    }
  `;
  const data = await query(phasesOfActivitiesQuery);
  return parseSparqlResults(data);
};

const parseSparqlResults = (data) => {
  const vars = data.head.vars;
  return data.results.bindings.map(binding => {
    let obj = {};
    vars.forEach(varKey => {
      if (binding[varKey]) {
        obj[varKey] = binding[varKey].value;
      }
    });
    return obj;
  })
};

module.exports = {
    getPostponedSubcases,
    queryActivitiesOfSubcase,
    getPhasesOfActivities
};
