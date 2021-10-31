const express = require ('express');
const mongoose = require ('mongoose');
const cors = require ('cors');
const swaggerJsDoc = require ('swagger-jsdoc');
const swaggerUi = require ('swagger-ui-express');
const jwt = require ('jsonwebtoken');


require ('dotenv').config ();

const API_URL = 'http://localhost:5000/';
var globalConnectionStack = [];

// https://github.com/devexpat/Simple-Hack-Use-multipple-mongodb-databases-in-a-nodejs-express-mongodb-application/blob/master/index.js

const app = express ();

const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'CRM API',
      version: '1.0.0',
      description: 'API INFO',
      servers: ['http://localhost:5000'],
    },
  },
  apis: ['app.js'],
};

const swaggerDocs = swaggerJsDoc (swaggerOptions);
console.log (swaggerDocs);
app.use ('/api-docs', swaggerUi.serve, swaggerUi.setup (swaggerDocs));

app.use (express.json ());
app.use (cors ());
app.use (express.urlencoded ({extended: false}));

const PORT = process.env.PORT || 5000;

app.use (async function (req, res, next) {
  var authHeader = req.headers.authorization;
  var type;
  var connection_uri;

  if(!type && authHeader){
    const token = authHeader && authHeader.split (' ')[1];
    if(token==null){
       return res.sendStatus (401);
    }
    type = await jwt.verify(token,process.env.JSON_SECRET,async(err,user)=>{
      if(user){
        req.user = user;
        return user.user.orgId;
      }
    })
  }else{
    type = await 'users'
  }

  if (type != null) {
    connection_uri = `mongodb+srv://baski:admin123@cluster0.hlca8.mongodb.net/${type}?retryWrites=true&w=majority`;
    if (typeof globalConnectionStack[type] === 'undefined') {
      connection_uri = await `mongodb+srv://baski:admin123@cluster0.hlca8.mongodb.net/${type}?retryWrites=true&w=majority`;
      globalConnectionStack[type] = {};
      globalConnectionStack[type].db =  mongoose.createConnection (connection_uri);
    }
  }
  return next ();
});

/**
 * @swagger
 * /greetme:
 *   get:
 *    description: Get
 *    responses:
 *      '200':
 *        description: Success
 * 
 */
app.get ('/greetme/:dbName', async (req, res, next) => {
  res.status (200).json ({message: 'Own by UtilLabs'});
});

app.post ('/signup', async (req, res, next) => {
  //users
  const type = 'users'
  let fields = {};
  var schema;

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is not expected'});
  } else {

    const {username,password} = req.body;

    try {
      fields.username = {type: String, unique: true};
      fields.password = {type: String};
      fields.hasVerified = {type: Boolean};
      fields.access_token = {type: String};
      fields.orgId = {type: String};

      console.log ('AUTH', type);

      var newObj = new mongoose.Schema (fields);
      schema = await globalConnectionStack[type].db.model ('auth', newObj);
    } catch (e) {
      console.log("Error",e)
      schema = await globalConnectionStack[type].db.model ('auth');
    }

    let user_exist = await schema.findOne({'username':username})
    if(user_exist){
      res.status(400).json({status:false,msg:"Username Taken! choose another"})
    }else{

      req.body.hasVerified = false;
      const record = new schema (req.body).save (function (err, resp) {
        console.log ('RES', resp);
        if (err) {
          console.log (err);
          return res
            .status (400)
            .json ({status: false, msg: 'Error to create record'});
        } else {
          res.status (200).json ({msg: resp, status: true});

        // return res.status(200).json ({
        //   status: true,
        //   msg: req.body
        // });
        }
      });
    }
  }
});

app.post ('/login', async (req, res) => {
  let type = 'users';
  let schema,orgId;
  let users={}

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is expected'});
  } else {
    const {username,password} = req.body;
    const user = {name: username};

      try {
      users.username = {type: String, unique: true};
      users.password = {type: String};
      users.hasVerified = {type: Boolean};
      users.access_token = {type: String};
      users.orgId = {type: String};

      var newObj = new mongoose.Schema (users);
      schema = await globalConnectionStack[type].db.model ('auth', newObj);
      console.log ('Try');

    } catch (e) {
      console.log("Error",e)
      schema = await globalConnectionStack[type].db.model ('auth');
      console.log ('Catch');
    }
    
    let userResp = await schema.findOne({'username':username})
    if(userResp){
      if(userResp.password===password){

        orgId = `${userResp.username}DB`;

        userResp.orgId = orgId
        const user = { user: userResp}
        let accessToken;

        if(userResp.access_token){
          accessToken = await userResp.access_token;
        }else{
          accessToken = await generateAccessToken (user);
        }
        
        const refreshToken = jwt.sign (user, process.env.JSON_SECRET);
        
        if(!userResp.hasVerified){          
          await schema.findOneAndUpdate({'username':username}, {'access_token':accessToken,'orgId':orgId,'hasVerified':true})

          type = orgId;
          var connection_uri = `mongodb+srv://baski:admin123@cluster0.hlca8.mongodb.net/${type}?retryWrites=true&w=majority`;
          globalConnectionStack[type] = {};
          // mongoose.disconnect();
          globalConnectionStack[type].db = mongoose.createConnection (connection_uri);

          let fields = {};
          fields.Id = {type: String};
          fields.Name = {type: String};

          var newObj = new mongoose.Schema (fields);
          var accSchema = await   globalConnectionStack[type].db.model ("account", newObj);
          var contactSchema = await globalConnectionStack[type].db.model ('contact', newObj);
          var leadSchema = await globalConnectionStack[type].db.model ('lead', newObj);
          var userSchema = await globalConnectionStack[type].db.model ('user', newObj);
          let body = {Id:userResp._id,Name:username}
          await new userSchema(body).save();
        }else{
          await schema.findOneAndUpdate({'username':username}, {'access_token':accessToken})        
        }

        return res.status(200).json({status:true,accessToken: accessToken, refreshToken: refreshToken,orgId:orgId});
      }else{
        res.status (400).json ({status: false, msg: "Incorrect Password"});
      }
    }else{
      res.status (400).json ({status: false, msg: "Account doesn't exist"});
    }
  }
});


/**
 * @swagger 
 * /object:
 *   post:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            modelName:
 *              type: string
 *              example: account
 *                 
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */

//createObject
app.post ('/object', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  let fields = {};
  if (req.body.fields) {
    fields = req.body.fields;
  } else {
    fields.Id = {type: String};
    fields.Name = {type: String};
  }

  try {
    var newObj = new mongoose.Schema (fields);
    globalConnectionStack[type].db.model (req.body.modelName, newObj);
    return res.status (200).json ({
      status: true,
      msg: 'New Object Created',

      request: [
        {
          type: 'GET',
          url: `${API_URL}record/${req.body.modelName}`,
        },

        {
          type: 'POST',
          url: `${API_URL}record/${req.body.modelName}`,
        },
        {
          type: 'GET',
          url: `${API_URL}record/${req.body.modelName}/{id}`,
        },
        {
          type: 'PATCH',
          url: `${API_URL}record/${req.body.modelName}/{id}`,
        },
        {
          type: 'DELETE',
          url: `${API_URL}record/${req.body.modelName}/{id}`,
        },
        {
          type: 'POST',
          url: `${API_URL}field/${req.body.modelName}`,
        },
        {
          type: 'GET',
          url: `${API_URL}field/${req.body.modelName}`,
        },
      ],
    });
  } catch (error) {
    console.log (error);
    return res.status (400).json ({status: false, msg: error});
  }
});
//

/**
 * @swagger
 * /object:
 *   get:
 *    description: Get all objects
 *    responses:
 *      '200':
 *        description: Success
 * 
 */

//getObject

app.get ('/object', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  console.log ('ReqBody', req.body);
  const collections = Object.keys (globalConnectionStack[type].db.collections);
  return res.status (200).json ({status: true, msg: collections});
});

/**
 * @swagger
 * /field/{obj}:
 *   get:
 *    desciption: Get fields
 *    parameters:
 *     - in: path
 *       name: obj_name
 *       schema:
 *        type: string
 *       required: true
 *    responses:
 *      '200': 
 *        description: Success
 */

//getFields
app.get ('/field/:obj', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;
  

  try {
    var schema = await globalConnectionStack[type].db.model (req.params.obj)
      .schema;
    if (schema) {
      const fields = Object.values (schema.paths);

      return res.status (200).json ({status: true, msg: fields});
    } else {
      return res
        .status (400)
        .json ({status: false, msg: 'Error to find your object'});
    }
  } catch (error) {
    console.log (error);
    return res
      .status (400)
      .json ({status: false, msg: 'Error to find your object'});
  }
});

/**
 * @swagger 
 * /field/{obj}:
 *   post:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *            fieldName:
 *              type: string
 *              example: email
 *            fieldType:
 *              type: string
 *              example: String
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */

//createField
app.post ('/field/:obj', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  try {
    var schema = await globalConnectionStack[type].db.model (req.params.obj)
      .schema;
    let fields;

    if (req.body.fieldType) {
      switch (req.body.fieldType) {
        case 'String':
          fields = {[req.body.fieldName]: {type: String}};
          break;
        case 'Number':
          fields = {[req.body.fieldName]: {type: Number}};
          break;
      }
    }
    schema.add (fields);
    res.status (200).json ({
      status: true,
      msg: 'New Field created',
      request: [
        {
          type: 'GET',
          url: `${API_URL}field/${req.params.obj}`,
        },
      ],
    });
  } catch (error) {
    console.log (error);
    return res.status (400).json ({status: false, msg: error});
  }
});

/**
 * @swagger 
 * /record/{obj}:
 *   post:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *            Name:
 *              type: string
 *              example: Name of Record
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */

//createRecord
app.post ('/record/:obj', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is not expected'});
  } else {
    var schema = await globalConnectionStack[type].db.model (req.params.obj);
    const record = new schema (req.body).save (function (err, resp) {
      console.log ('RES', resp);
      if (err) {
        console.log (err);
        return res
          .status (400)
          .json ({status: false, msg: 'Error to create record'});
      } else
        return res.status (200).json ({
          status: true,
          msg: req.body,
          endPoint: [
            {
              type: 'GET',
              url: `${API_URL}record/${req.params.obj}`,
            },
            {
              type: 'GET',
              url: `${API_URL}record/${req.params.obj}/${resp._id}`,
            },
          ],
        });
    });
  }
});

/**
 * @swagger
 * /record/{obj}:
 *   get:
 *    desciption: Get fields
 *    parameters:
 *     - in: path
 *       name: obj
 *       schema:
 *        type: string
 *       required: true
 *    responses:
 *      '200': 
 *        description: Success
 */

//getRecord
app.get ('/record/:obj', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }

  const type = req.user.user.orgId

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is not expected'});
  } else {
    var schema;
    try{
      let fields = {};
      fields.Id = {type: String};
      fields.Name = {type: String};
      var newObj = new mongoose.Schema (fields);
      schema = await  globalConnectionStack[type].db.model (req.params.obj, newObj);
    }catch(error){
      schema = await globalConnectionStack[type].db.model(req.params.obj);
    }
    
    schema
      .find ()
      .exec ()
      .then (doc => {
        if (doc.length > 0) {
          let data = [];
          doc.forEach (d => {
            let body = d.toObject ();
            body.url = `${API_URL}record/${req.params.obj}/${d._id}`;
            console.log ('Body', body);
            data.push (body);
          });
          return res.status (200).json ({status: true, msg: data});
        } else
          return res
            .status (200)
            .json ({status: true, msg: 'record not found'});
      })
      .catch (err => {
        return res
          .status (404)
          .json ({success: false, message: 'Something went wrong', msg: err});
      });
  }
});

//getRecordById
app.get ('/record/:obj/:id', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is not expected'});
  } else {
    
    var schema = await globalConnectionStack[type].db.model (req.params.obj);

    let resp = await schema.findOne ({_id: req.params.id});
    request = [
      {
        type: 'GET',
        url: `${API_URL}record/${req.params.obj}`,
      },
    ];

    if (resp) {
      res.status (200).json ({status: true, msg: resp, request: request});
    } else {
      return res.status (400).json ({status: false, msg: 'Record not found'});
    }
  }
});

/**
 * @swagger 
 * /record/{obj}/{id}:
 *   patch:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *        type: string
 *        required: true
 * 
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *            Name:
 *              type: string
 *              example: Name of Record
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */

//patchRecord
app.patch ('/record/:obj/:id', async (req, res, next) => {
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is not expected'});
  } else {
    var schema = await globalConnectionStack[type].db.model (req.params.obj);

    let resp = await schema.findOne ({_id: req.params.id});
    if (resp) {
      resp = req.body;
      schema.findByIdAndUpdate ({_id: req.params.id}, resp, null, function (
        err,
        docs
      ) {
        console.log ('Docs ', docs);
        if (err) return res.status (400).json ({status: false, msg: err});
        else return res.status (200).json ({status: true, msg: resp});
      });
    } else {
      return res.status (400).json ({status: false, msg: 'Record not found'});
    }
  }
});

/**
 * @swagger 
 * /record/{obj}/{id}:
 *   delete:
 *    consumes:
 *    - application/json
 *    produces:
 *      - application/json
 *      - text/xml
 *      - text/html
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *        type: string
 *        required: true
 * 
 *      - name: body
 *        in: body
 *        required: true
 *        schema:
 *          # Body schema with atomic property examples
 *          type: object
 *          properties:
 *            obj_name:
 *              type: string
 *              example: account
 *      
 *    responses:
 *      200:
 *        description: New object created
 *      500:
 *        description: Error to create new object
 *  
 */

//deleteRecord
app.delete ('/record/:obj/:id', async (req, res, next) => {
  
  if(!req.user){
     return res.status (400).json ({status: false, msg: 'unAuthorized'}); 
  }
  const type = req.user.user.orgId;

  if (!req.body) {
    return res.status (400).json ({status: false, msg: 'Body is not expected'});
  } else {
    var schema = await globalConnectionStack[type].db.model (req.params.obj);
    let resp = await schema.findOne ({_id: req.params.id});
    if (resp) {
      resp = req.body;
      schema.findByIdAndRemove ({_id: req.params.id}, function (err, docs) {
        console.log ('Docs ', docs);
        if (err) return res.status (400).json ({status: false, msg: err});
        else
          return res.status (200).json ({status: true, msg: 'Record deleted'});
      });
    } else {
      return res.status (400).json ({status: false, msg: 'Record not found'});
    }
  }
});

async function generateAccessToken (user) {
  return jwt.sign (user, process.env.JSON_SECRET);
}

app.listen (PORT, () => {
  console.log (`Server running at http://localhost:` + PORT);
});
