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
const airlines = require('airline-codes');

const host = 'flightxml.flightaware.com';
const wwoApiKey = '';
const auth = '<You API Key>';
const today = new Date();
const reportDate = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear();

exports.flightStatusWebhook = (req, res) => {
  // Get the city and date from the request
  var userFlightInput = req.body.result.parameters['airlinenamesandnumber'];

  console.log("user input is " + userFlightInput);

  var flightNumber = getAirlineCodeAndFlightNumber(userFlightInput);
   // flight number is a required param
  var date = req.body.result.parameters['date']; // flight date is a optional param

  console.log("date comign is " + reportDate);


  console.log("flight number is " + flightNumber);
  
  // Call the  API
  if(flightNumber) {
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
  }
  else {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'speech': "Flight not mentioned correctly", 'displayText': "Flight not mentioned correctly" }));
  }

};

function getAirlineCodeAndFlightNumber (userFlightInput) {
  var flightDetails = userFlightInput;
  console.log("entereed getAirlineCodeAndFlightNumber method  " + flightDetails);

  var flightNumberForApi,checkForUserEnteredCode,checkForUserEnteredFullName
  if(flightDetails.length > 0) {
    console.log("made in if block");

    var regex = /(\d+)/g;
    var airlineName = flightDetails.split(/[0-9]/)[0];
    var airlineNum = flightDetails.match(regex)[0];

    console.log("arilien name hardcoded is "  + airlines.findWhere({ iata: "UA" }).get('name'));


    console.log("airlineName" + airlineName);
    airlineName = airlineName.trim();
    console.log("airlineName after quotes" + airlineName);


    try {
      checkForUserEnteredCode = airlines.findWhere({ iata: airlineName }).get('name');
      console.log("airline reported " + checkForUserEnteredCode);
    }

    catch(err) {
      console.log("error with checkForUserEnteredCode is " + err);
    }
    try {
      checkForUserEnteredFullName = airlines.findWhere({ name: airlineName }).get('iata');
    }
    catch(err) {
      console.log("error with checkForUserEnteredFullName is " + err);
    }


    if(checkForUserEnteredCode) {
      flightNumberForApi = airlineName + airlineNum;
    }
    else if(checkForUserEnteredFullName) {
      flightNumberForApi = checkForUserEnteredFullName + airlineNum;
    }

    console.log("checkForUserEnteredCode and  checkForUserEnteredFullName   " + checkForUserEnteredCode + " , " + checkForUserEnteredFullName);
    console.log("value for flight from function returned " + flightNumberForApi);

  }
  return flightNumberForApi;
}
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
