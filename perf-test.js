import { check, group, sleep } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "15s", target: `${__ENV.VUS}` }, // simulate ramp-up of traffic from 1 to ${__ENV.VUS} users over 15 minutes.
    { duration: "60s", target: `${__ENV.VUS}` }, // stay at ${__ENV.VUS} users for 60m minutes
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
    throw new Error(`Setup failed : GET ${url} ${status}`);
  }
  return parse ? JSON.parse(body) : body;
}

function getSampleDatas(url, nbSampleDatas) {
  return new Array(nbSampleDatas).fill(0).map(function (_, i) {
    return safeGet(url.replace("${ITER}", i), false);
  });
}

export function setup() {
  // number of sample data in our scenario (data-0.json, data-1.json, ..., data-91.json)
  const nbSampleDatas = `${__ENV.NB_SAMPLE_DATAS}`;
  const baseSampleDataUrl = `${__ENV.BASE_SAMPLE_DATAS_URL}`;
  const idCampaign = `${__ENV.CAMPAIGN_ID}`;
  const minSurveyUnitId = `${__ENV.MIN_SURVEY_UNIT_ID}`;
  const maxSurveyUnitId = `${__ENV.MAX_SURVEY_UNIT_ID}`;
  const apiUrl = `${__ENV.PROTOCOL}://${__ENV.HOSTNAME}/api/`;

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
    minSurveyUnitId,
    maxSurveyUnitId,
    arrData,
    arrParadata,
    arrStateData,
    apiUrl,
  };
}

export default function (data) {
  /****Init : get model, metadata and nomenclatures****/
  group("Init questionnaire", function () {
    const { idCampaign } = data;
    const { apiUrl } = data;

    const res = http.get(`${apiUrl}/campaign/${idCampaign}/questionnaire`);
    check(res, {
      "status 200 get questionnaire model": (r) => r.status === 200,
    });

    const res2 = http.get(`${apiUrl}/campaign/${idCampaign}/metadata`);
    check(res2, {
      "status 200 get campaign metadata": (r) => r.status === 200,
    });

    const res3 = http.get(
      `${apiUrl}/campaign/${idCampaign}/required-nomenclatures`
    );
    check(res3, {
      "status 200 get required-nomenclatures": (r) => r.status === 200,
    });

    res3.json().forEach(function (elt) {
      const res4 = http.get(`${apiUrl}/nomenclature/${elt}`);
      check(res4, { "status 200 get nomenclature": (r) => r.status === 200 });
    });
  });

  /****Filling out questionnaire and paradata****/
  group("Filling out questionnaire", function () {
    const minId = data.minSurveyUnitId;
    const maxId = data.maxSurveyUnitId;
    const randomSurveyUnitId = Math.floor(
      Math.random() * (maxId - minId + 1) + minId
    );
    const apiUrl = data.apiUrl;

    function fillingOutQuestions(
      surveyUnitId,
      maxIterations,
      currentIteration = 0
    ) {
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
        check(res5, { "status 200 put": (r) => r.status === 200 });

        const res6 = http.post(`${apiUrl}/paradata`, iterationParadata, params);
        check(res6, { "status 200 post": (r) => r.status === 200 });

        const res7 = http.put(
          `${apiUrl}/survey-unit/${surveyUnitId}/state-data`,
          iterationStateData,
          params
        );
        check(res7, { "status 200 post": (r) => r.status === 200 });

        // sleep 50 sec with a random positive/negative delay of 1s
        sleep(50 + Math.random() * 2 - 1);

        fillingOutQuestions(surveyUnitId, maxIterations, currentIteration + 1);
      }
    }

    fillingOutQuestions(randomSurveyUnitId, data.maxIterations);
  });
}
