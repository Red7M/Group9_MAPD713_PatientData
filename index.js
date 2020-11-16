var DEFAULT_PORT = 5000
var DEFAULT_HOST = '127.0.0.1'
var SERVER_NAME = 'Patient Data REST API'

var http = require ('http');
var mongoose = require ("mongoose");

var port = process.env.PORT;
var ipaddress = process.env.IP; // TODO: figure out which IP to use for the heroku

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.  
var uristring = 
  process.env.MONGODB_URI || 
  'mongodb://127.0.0.1:27017/data';

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, {useNewUrlParser: true});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log("!!!! Connected to db: " + uristring)
});


// This is the schema.  Note the types, validation and trim
// statements.  They enforce useful constraints on the data.

// Patient Schema
var patientSchema = new mongoose.Schema({
		first_name: String, 
		last_name: String, 
		address: String,
		date_of_birth: String,
		department: String,
		doctor: String
});
// Records Schema
var recordSchema = new mongoose.Schema({
  _id: String,
  date: String,
  nurse_name: String,
  type: String,
  category: String,
  diastolic: String,
  systolic: String
});

// Compiles the schema into a model, opening (or creating, if
// nonexistent) the 'Patients' and 'Record' collection 
// in the MongoDB database
var Patient = mongoose.model('Patient', patientSchema);
var Record = mongoose.model('Record', recordSchema);

var errors = require('restify-errors');
var restify = require('restify')
  // Create the restify server
  , server = restify.createServer({ name: SERVER_NAME})

	if (typeof ipaddress === "undefined") {
		//  Log errors on OpenShift but continue w/ 127.0.0.1 - this
		//  allows us to run/test the app locally.
		console.warn('No process.env.IP var, using default: ' + DEFAULT_HOST);
		ipaddress = DEFAULT_HOST;
	};

	if (typeof port === "undefined") {
		console.warn('No process.env.PORT var, using default port: ' + DEFAULT_PORT);
		port = DEFAULT_PORT;
	};
  
  
  server.listen(port, ipaddress, function () {
  console.log('Server %s listening at %s', server.name, server.url)
  console.log('Resources:')
  console.log(' /patients')
  console.log(' /patients/:id')
  console.log(' /patients/:id/records')
})


  server
    // Allow the use of POST
    .use(restify.plugins.fullResponse())

    // Maps req.body to req.params
    .use(restify.plugins.bodyParser())

  // Get all patients in the system
  server.get('/patients', function (req, res, next) {
    console.log('GET request: patients');
    // Find every entity within the given collection
    Patient.find({}).exec(function (error, result) {
      if (error) return next(new Error(JSON.stringify(error.errors)))
      res.send(result);
    });
  })


  // Get a single patient by their patient id
  server.get('/patients/:id', function (req, res, next) {
    console.log('GET request: patients/' + req.params.id);

    // Find a single patient by their id
    Patient.find({ _id: req.params.id }).exec(function (error, patient) {
      if (patient) {
        // Send the patient if no issues
        res.send(patient)
      } else {
        // Send 404 header if the patient doesn't exist
        res.send(404)
      }
    })
  })


  // Create a new patient
  server.post('/patients', function (req, res, next) {
    console.log('POST request: patients params=>' + JSON.stringify(req.params));
    console.log('POST request: patients body=>' + JSON.stringify(req.body));
    // Make sure name is defined
    if (req.body.first_name === undefined) {
      // If there are any errors, pass them to next in the correct format
      return next(new errors.BadRequestError('first_name must be supplied'))
    }
    if (req.body.last_name === undefined) {
      // If there are any errors, pass them to next in the correct format
      return next(new errors.BadRequestError('last_name must be supplied'))
    }

    // Creating new patient.
    var newPatient = new Patient({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      address: req.body.address,
      date_of_birth: req.body.date_of_birth,
      department: req.body.department,
      doctor: req.body.doctor
    });

    // Create the patient and saving to db
    newPatient.save(function (error, result) {
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new Error(JSON.stringify(error.errors)))
      // Send the patient if no issues
      res.send(201, result)
    })
  })

  // Create a new record for an existing patient
  server.post('/patients/:id/records', function(req, res, next) {
    console.log('POST request: patients records params=>' + JSON.stringify(req.params));
    console.log('POST request: patients records body=>' + JSON.stringify(req.body));

    // Creating new record for existing patient
    var patientRecords = new Record({
      _id: req.params.id,
      date: req.body.date,
      nurse_name: req.body.nurse_name,
      type: req.body.type,
      category: req.body.category,
      diastolic: req.body.diastolic,
      systolic: req.body.systolic
    });

    // Create patient record and save to db
    patientRecords.save(function (error, result) {
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new Error(JSON.stringify(error.errors)))
      // Send the patient if no issues
      res.send(201, result)
    })
  })

   // Get existing patient records by their patient id
   server.get('/patients/:id/records', function (req, res, next) {
    console.log('GET request: patients/' + req.params.id + '/records');
    // Find a single patient records by their id
    Record.find({_id: req.params.id}).exec(function (error, records) {
      if (records) {
        // Send records with no issues
        res.send(records)
      } else {
        // Send 404 header if the record doesn't exist
        res.send(404)
      }
    })
  })


  // Delete patient with the given id
  server.del('/patients/:id', function (req, res, next) {
    console.log('DEL request: patients/' + req.params.id);
    Patient.remove({ _id: req.params.id }, function (error, result) {
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new Error(JSON.stringify(error.errors)))

      // Send a 200 OK response
      res.send()
    });
  })