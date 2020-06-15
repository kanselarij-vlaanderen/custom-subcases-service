import mu from 'mu';

const getPostponedSubcases = async () => {

    const query = `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX besluitvorming: <http://data.vlaanderen.be/ns/besluitvorming#>
      PREFIX dbpedia: <http://dbpedia.org/ontology/>  
      
      SELECT ?id WHERE { 
          ?subcase a dbpedia:UnitOfWork ;
            mu:uuid ?id ;
            besluitvorming:vindtPlaatsTijdens ?activity .
          ?activity besluitvorming:genereertAgendapunt ?agendapunt .
            
          ?agendapunt besluitvorming:ingetrokken ?retracted . 
          FILTER(?retracted ="true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean>)  
      } GROUP BY ?subcase`;

    let data = await mu.query(query);
    return parseSparqlResults(data, 'subcases');
}

const parseSparqlResults = (data) => {
    const vars = data.head.vars;
    return data.results.bindings.map(binding => {
        let obj = {};
        vars.forEach(varKey => {
            if (binding[varKey]) {
                obj[varKey] = binding[varKey].value;
            }
        });
        return obj.id;
    })
};
module.exports = {
    getPostponedSubcases
};
