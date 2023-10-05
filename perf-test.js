import { check, group, sleep } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "15s", target: `${__ENV.VUS}` }, // simulate ramp-up of traffic from 1 to ${__ENV.VUS} users over 15 minutes.
    { duration: "15s", target: `${__ENV.VUS}` }, // stay at ${__ENV.VUS} users for 60m minutes
    { duration: "15s", target: 0 }, // ramp-down to 0 users over 20 minutes
  ],
  //vus: `${__ENV.VUS}`,
  //iterations: 1,
  //duration: "3600s",
  setupTimeout: "300s",
  tags: {
    scenario: `${__ENV.VUS}-${__ENV.HOSTNAME}`,
  },
};

function safeGet(url, parse = true) {
  const { status, body } = http.get(url);
  if (status != 200) {
    console.log("erreur !!!!");
    throw new Error(`Setup failed : GET ${url} ${status}`);
  }
  return parse ? JSON.parse(body) : body;
}

function getSampleDatas(url, nbSampleDatas) {
  let arrayData = new Array(nbSampleDatas);
  for (let i = 0; i < nbSampleDatas; i++) {
    arrayData[i] = safeGet(url.replace("${ITER}", i), false);
  }
  return arrayData;
}

export function setup() {
  // number of sample data in our scenario (data-0.json, data-1.json, ..., data-91.json)
  const nbSampleDatas = `${__ENV.NB_SAMPLE_DATAS}`;
  const baseSampleDataUrl = `${__ENV.BASE_SAMPLE_DATAS_URL}`;
  const idCampaign = `${__ENV.CAMPAIGN_ID}`;
  const idQuestionnaire = `${__ENV.QUESTIONNAIRE_ID}`;
  const minSurveyUnitId = `${__ENV.MIN_SURVEY_UNIT_ID}`;
  const maxSurveyUnitId = `${__ENV.MAX_SURVEY_UNIT_ID}`;
  const apiUrl = `${__ENV.PROTOCOL}://${__ENV.HOSTNAME}/api`;
  const maxIterations = 18;

  console.log("...........apiUrl: " + apiUrl);
  console.log("....nbSampleDatas: " + nbSampleDatas);
  console.log("baseSampleDataUrl: " + baseSampleDataUrl);
  console.log(".......idCampaign: " + idCampaign);
  console.log("..idQuestionnaire: " + idQuestionnaire);
  console.log("..minSurveyUnitId: " + minSurveyUnitId);
  console.log("..maxSurveyUnitId: " + maxSurveyUnitId);
  console.log("....maxIterations: " + maxIterations);

  const arrData = getSampleDatas(
    baseSampleDataUrl + "data/data-${ITER}.json",
    nbSampleDatas
  );

  const arrParadata = getSampleDatas(
    baseSampleDataUrl + "paradata/paradata-${ITER}.json",
    nbSampleDatas
  );

  const arrStateData = getSampleDatas(
    baseSampleDataUrl + "state-data/state-data-${ITER}.json",
    nbSampleDatas
  );

  return {
    idCampaign,
    idQuestionnaire,
    minSurveyUnitId,
    maxSurveyUnitId,
    maxIterations,
    arrData,
    arrParadata,
    arrStateData,
    apiUrl,
  };
}

export default function (data) {
  /****Init : get model, metadata and nomenclatures****/
  group("Init questionnaire", function () {
    const { idCampaign, idQuestionnaire, apiUrl } = data;

    const res = http.get(`${apiUrl}/campaign/${idCampaign}/questionnaires`);
    check(res, {
      "get questionnaire model": (r) => r.status === 200,
    });

    const res2 = http.get(`${apiUrl}/campaign/${idCampaign}/metadata`);
    check(res2, {
      "get campaign metadata": (r) => r.status === 200,
    });

    const res3 = http.get(
      `${apiUrl}/questionnaire/${idQuestionnaire}/required-nomenclatures`
    );

    check(res3, {
      "get required-nomenclatures": (r) => r.status === 200,
    });

    res3.json().forEach(function (elt) {
      const res4 = http.get(`${apiUrl}/nomenclature/${elt}`);
      check(res4, { "status 200 get nomenclature": (r) => r.status === 200 });
    });
  });

  /****Filling out questionnaire and paradata****/
  group("Filling out questionnaire", function () {
    /*console.log("...........apiUrl: " + data.apiUrl);
    console.log("........stateData: " + data.arrStateData);
    console.log("baseSampleDataUrl: " + data.baseSampleDataUrl);
    console.log(".......idCampaign: " + data.idCampaign);
    console.log("..idQuestionnaire: " + data.idQuestionnaire);
    console.log("..minSurveyUnitId: " + data.minSurveyUnitId);
    console.log("..maxSurveyUnitId: " + data.maxSurveyUnitId);
    console.log("....maxIterations: " + data.maxIterations);
    
    */
    const { minSurveyUnitId, maxSurveyUnitId, maxIterations } = data;
    const randomSurveyUnitId = Math.floor(
      Math.random() * (maxSurveyUnitId - minSurveyUnitId + 1) + minSurveyUnitId
    );
    const apiUrl = data.apiUrl;

    function fillingOutQuestions(
      surveyUnitId,
      maxIterations,
      currentIteration = 0
    ) {
      //console.log(currentIteration + " " + maxIterations);
      if (currentIteration < maxIterations) {
        const iterationData = data.arrData[currentIteration];
        const iterationParadata = data.arrParadata[currentIteration];
        const iterationStateData = data.arrStateData[currentIteration];

        const params = { headers: { "Content-type": "application/json" } };

        const res5 = http.put(
          `${apiUrl}/survey-unit/${surveyUnitId}/data`,
          iterationData,
          params
        );
        check(res5, { "get survey-unit data": (r) => r.status === 200 });

        const res6 = http.post(`${apiUrl}/paradata`, iterationParadata, params);
        check(res6, { "post survey-unit paradata": (r) => r.status === 200 });
        /*
        console.log(`${apiUrl}/survey-unit/${surveyUnitId}/state-data`);
        console.log(surveyUnitId);
        console.log(iterationStateData);
        console.log("end");
        */
        const res7 = http.put(
          `${apiUrl}/survey-unit/${surveyUnitId}/state-data`,
          iterationStateData,
          params
        );
        check(res7, { "put survey-unit state-data": (r) => r.status === 200 });

        // sleep 50 sec with a random positive/negative delay of 1s
        sleep(5 + Math.random() * 2 - 1);

        fillingOutQuestions(surveyUnitId, maxIterations, currentIteration + 1);
      }
    }

    fillingOutQuestions(randomSurveyUnitId, maxIterations);
  });
}
