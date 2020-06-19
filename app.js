import mu from 'mu';
import { ok } from 'assert';

const app = mu.app;
const bodyParser = require('body-parser');
const repository = require('./repository');
const cors = require('cors');
const syncforeach = require('sync-foreach');
const DESIGN_AGENDA_STATUS = 'http://kanselarij.vo.data.gift/id/agendastatus/2735d084-63d1-499f-86f4-9b69eb33727f'

app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(cors());

app.get('/getPostponedSubcases', async (req, res) => {
  try {
    const subcases = await repository.getPostponedSubcases();
    res.header('Content-Type', 'application/vnd.api+json');
    res.send({ data: subcases });
  } catch (error) {
    console.error(error);
    res.send({ status: ok, statusCode: 500, body: { error } });
  }
});

app.get('/getSubcasePhases', async (req, res) => {
  const subcaseId  = req.query.subcaseId;
  if(!subcaseId){
    res.send({statusCode: 400, body: 'subcaseId missing'});
    return;
  }

  try {
    const activityUris = await repository.queryActivitiesOfSubcase(subcaseId);
    
    if (activityUris && activityUris.length > 1 ) {
      syncforeach(activityUris, (next, activityUri, index, array) => {
        var addEventsAndStuff;
        (addEventsAndStuff = async function(){
          const result = await repository.getPhasesOfActivities(activityUri.activity, activityUri.subcase);

          if ((parseInt(activityUri.totalAgendaitems) == 1) && (result[0].agendaStatus == DESIGN_AGENDA_STATUS)) {
            // Do nothing, there should not be phaseData for this activity since it does not have an agendaitem on an approved agenda
          } else {
            result.sort((a,b) => a.agendaNumber < b.agendaNumber); // We want the latest agenda first in the list
            array[index].phaseData = result[0];
          }
          next();
      })();
    }).done(() => {
        res.send({statusCode: 200, body: activityUris});
    })
    } else {
      res.send({statusCode: 400, body: 'subcaseId has no activities'});
    }
  } catch (e) {
    console.log('error', e);
    res.send({statusCode: 500, body: 'something went wrong while getting the phases of subcase', e});
  }
});
