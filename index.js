// /**
//  * Cloud Function.
//  *
//  * @param {object} event The Cloud Functions event.
//  * @param {function} callback The callback function.
//  */
// exports.helloWorld = function helloWorld (event, callback) {
//   console.log(`My Cloud Function: ${event.data.message}`);
//   var airlines = require('airline-codes');
//   console.log(airlines.findWhere({ iata: 'WS' }).get('name'));
//   callback();
// };
// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';
//const airlines = require('airline-codes');


const http = require('http');

const host = 'flightxml.flightaware.com';
const wwoApiKey = '';
const auth = 'Basic cHJpeWFua2F2Ojk1MzRjZGZmYmMzZTQwYmIxNTNjZmRhOGU1MTcxOTAyMTM0MzNmODM=';
// const flightNumber = 'UA123'
const today = new Date();
const reportDate = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear();

exports.flightStatusWebhook = (req, res) => {
  // Get the city and date from the request
  let flightNumber = req.body.result.parameters['flight-number']; // flight number is a required param
  var date = req.body.result.parameters['date']; // flight date is a optional param
 // console.log(airlines.findWhere({ iata: 'WS' }).get('name'));

  // var today = new Date();
 //  var reportDate = today.getMonth() + "/" + today.getMonth() + "/" + today.getFullYear();
  console.log("date comign is " + reportDate);


console.log("flight number is " + flightNumber);
  //console.log("date  is " + date1);
  // Get the date for the weather forecast (if present)
  //let date = '';
  // console.log("patasmters are " + req.param('date'));
  //console.log("REQUEST BODY are " + req.body);
  //console.log("pREQUEST BODY Param " + req.body.parameters);

  //console.log("patasmters are " + req.body.result.parameters);
  //console.log("patasmters are " + req.body.result.parameters);
  // if (req.body.result.parameters['date']) {
//     date = req.body.result.parameters['date'];
//     console.log('Date: ' + date);
//   }

  // Call the weather API
  callFlightAwareApi(flightNumber).then((output) => {
    // Return the results of the weather API to API.AI
    res.setHeader('Content-Type', 'application/json');
	res.setHeader('Authorization', auth);
    res.send(JSON.stringify({ 'speech': output, 'displayText': output }));
  }).catch((error) => {
    // If there is an error let the user know
    res.setHeader('Content-Type', 'application/json');
	//res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'speech': error, 'displayText': error }));
  });
};

function callFlightAwareApi (flightNumber) {
  return new Promise((resolve, reject) => {
    // Create the path for the HTTP request to get the weather
	  let path = '/json/FlightXML3/FlightInfoStatus?ident=' + flightNumber;
	  path = path.replace(" ","");
    console.log('API Request: ' + host + path);

    // Make the HTTP request to get the weather
    http.get({host: host, path: path, headers: {'Authorization': auth}}, (res) => {
      let body = ''; // var to store the response chunks
      res.on('data', (d) => { body += d; }); // store each response chunk
      res.on('end', () => {
        // After all the data has been received parse the JSON for desired data
        let response = JSON.parse(body);

		var processedEstimateData, processedRecord, output;
		if(response['FlightInfoStatusResult'] && response['FlightInfoStatusResult']['flights'] && response['FlightInfoStatusResult']['flights'].length > 0) {
			for (var i = 0; i < response.FlightInfoStatusResult.flights.length; i++) {
				var entryDate = new Date(response['FlightInfoStatusResult']['flights'][i]['estimated_arrival_time']['date']);
				var reportingDate = new Date(reportDate);
				if(entryDate.getTime() === reportingDate.getTime()) {
					processedRecord = response['FlightInfoStatusResult']['flights'][i];
					console.log("status is " + processedRecord['status']);

					processedEstimateData = response['FlightInfoStatusResult']['flights'][i]['estimated_arrival_time'];
					console.log("entry is " + processedEstimateData['date']);
				}
			}

	        let estimated_arrival = processedEstimateData['date'];
	        let estimated_arrival_time = processedEstimateData['time'];
			let estimated_arrival_timezone = processedEstimateData['tz'];
			let estimated_status = processedRecord['status'];
			if (estimated_status !== 'Arrived'){
				output = flightNumber + " is " + estimated_status + '. Estimated arrival time is ' + estimated_arrival_time + " " + estimated_arrival_timezone;
			}
			else
			{
				output = flightNumber + " has " + estimated_status + ' at ' + estimated_arrival_time + " " + estimated_arrival_timezone;
		}
		}
		else
		{
			output = "Sorry no data reported";
		}

        //${location['query']} are ${currentConditions} with a projected high of
        //${forecast['maxtempC']}°C or ${forecast['maxtempF']}°F and a low of
        //${forecast['mintempC']}°C or ${forecast['mintempF']}°F on
        //${forecast['date']}.`;






        // Resolve the promise with the output text
        console.log(output);
        resolve(output);
      });
      res.on('error', (error) => {
		console.log('API Request Error is : ' + error);
        reject(error);
      });
    });
  });
}
