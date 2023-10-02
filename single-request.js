import http from "k6/http";
import { sleep } from "k6";

export const options = {
  iterations: 2,
};

export default function () {
  let resp = http.get("http://queen-api:8080/api/survey-unit/11");
  console.log(`status: "${resp.body}"`);
  //http.get("http://queen-api:8080/api/survey-unit/42");
  //http.get("http://queen-api:8080/api/survey-unit/12");
  //sleep(3);
  //http.get("http://queen-api:8080/api/survey-unit/11");
}
