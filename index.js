const functions = require('firebase-functions');
const admin = require('firebase-admin');

//Twilio config
const accountSid = process.env.ACCOUNT_ID;
const authToken = process.env.AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

//enable cors
const cors = require('cors')({ origin: true });


admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
var dbref = db.collection(process.env.DB_NAME).doc(process.env.SERVICE_NAME);

/* 
  Create a new service by passing a friendly Name. It should be a one time process for your app. 
  Although you can configure multiple services but it's good to produce one service per app.
*/
exports.createService = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const service_name = request.query.serviceName
    client.verify.services.create({ friendlyName: service_name })
      .then(service => {
        console.log(service);
        dbref.set(JSON.parse(JSON.stringify(service))).then(ref => {
          console.log('Added document with ID: ', ref.id);
          console.log("service", service);
          response.status(201).json(service)
          return
        }).catch(err => {
          console.log(err)
          response.status(400).json({ "msg": "something went wrong" })
        });
        return
      }).catch(err => {
        console.log(err)
        response.status(400).send({ msg: "something went wrong." })
      })
  })
})

//Send verification token to the clients
exports.sendVerificationToken = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const mobile_num = request.query.mobileNum;
    console.log("mobile Number", mobile_num)
    dbref.get().then(doc => {
      if (!doc.exists) {
        response.status(404).send({ "msg": "No record found" })
        return
      }
      console.log("sid", doc.data().sid)
      client.verify.services(doc.data().sid)
        .verifications
        .create({ to: mobile_num, channel: 'sms' })
        .then(verification => {
          response.status(200).send(verification)
          return
        }).catch(err => {
          console.log("sendVerification", err)
          response.status(400).send({ "msg": "something went wrong." })
        });
      return
    }).catch(err => {
      console.log(err)
      response.status(400).send({ "msg": "something went wrong" })
    })
  })

})

// Verify the token sent by the client
exports.verifyToken = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    var mobileNum = request.query.mobileNum;
    var code = request.query.code;
    console.log("mobile num", mobileNum, code)
    dbref.get().then(doc => {
      if (!doc.exists) {
        response.status(404).send({ "msg": "no record found" })
        return
      }
      console.log("sid", doc.data().sid)
      client.verify.services(doc.data().sid)
        .verificationChecks
        .create({ to: mobileNum, code: code })
        .then(verification_check => {
          response.status(200).send(verification_check)
          return
        }).catch(err => {
          console.log(err)
          response.status(200).send({ "msg": "something went wrong." })
        });
      return
    }).catch(err => {
      console.log(err)
      response.status(200).send({ "msg": "something went wrong." })
    })
  })
})
